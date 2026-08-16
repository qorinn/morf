/// <reference lib="webworker" />

import { expose, transfer } from "comlink";
import {
  AudioSampleSink,
  AudioSampleSource,
  BlobSource,
  BufferTarget,
  canEncodeAudio,
  canEncodeVideo,
  Input,
  MatroskaInputFormat,
  MP4,
  MovOutputFormat,
  Mp4OutputFormat,
  MPEG_TS,
  Output,
  Quality,
  QTFF,
  VideoSampleSink,
  VideoSampleSource,
  WebMOutputFormat,
  WEBM,
} from "mediabunny";

import {
  outputFormatDetails,
  supportedVideoFileName,
  targetAudioBitrate,
  targetVideoBitrate,
  targetVideoDimensions,
} from "@/features/video-converter/converter";
import type {
  VideoConverterInspectResult,
  VideoConverterRequest,
  VideoConverterResult,
  VideoConverterProgress,
  VideoConverterWorkerApi,
  VideoOutputFormat,
} from "@/features/video-converter/types";

const supportedFormats = [MP4, QTFF, WEBM, new MatroskaInputFormat(), MPEG_TS];
let cancelRequested = false;

function createInput(file: File) {
  return new Input({
    formats: supportedFormats,
    source: new BlobSource(file, {
      maxCacheSize: 8 * 1024 * 1024,
      useStreamReader: true,
    }),
  });
}

function assertNotCancelled() {
  if (cancelRequested) throw new DOMException("A konvertálás megszakítva.", "AbortError");
}

function createOutputFormat(outputFormat: VideoOutputFormat) {
  switch (outputFormat) {
    case "webm": return new WebMOutputFormat();
    case "mov": return new MovOutputFormat();
    case "mp4": return new Mp4OutputFormat();
  }
}

function videoQuality(request: VideoConverterRequest, width: number, height: number) {
  return new Quality({
    bitrate: targetVideoBitrate(width, height, request.metadata.frameRate, request.outputFormat, request.quality),
    bitrateMode: "variable",
  });
}

async function inspectVideo(file: File): Promise<VideoConverterInspectResult> {
  if (!supportedVideoFileName(file.name)) {
    return {
      valid: false,
      message: "Ez a fájltípus nem támogatott.",
      suggestion: "Válassz MP4, MOV, WebM, MKV vagy MPEG-TS videót. Az AVI-t ez a böngészős eszköz nem tudja megnyitni.",
    };
  }

  const input = createInput(file);
  try {
    if (!(await input.canRead())) {
      return {
        valid: false,
        message: "A videó konténere nem olvasható.",
        suggestion: "Próbálj szabványos MP4, MOV, WebM, MKV vagy MPEG-TS fájlt.",
      };
    }
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) {
      return {
        valid: false,
        message: "A videósáv ebben a böngészőben nem dekódolható.",
        suggestion: "Próbáld H.264-es MP4 vagy VP9-es WebM videóval friss Chrome-ban vagy Edge-ben.",
      };
    }
    const audioTrack = await input.getPrimaryAudioTrack();
    const hasAudio = Boolean(audioTrack && (await audioTrack.canDecode()));
    const [duration, width, height, packetStats, videoCodec, audioCodec, audioSampleRate, audioChannels] = await Promise.all([
      videoTrack.computeDuration(),
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
      videoTrack.computePacketStats(500),
      videoTrack.getCodec(),
      hasAudio && audioTrack ? audioTrack.getCodec() : Promise.resolve(null),
      hasAudio && audioTrack ? audioTrack.getSampleRate() : Promise.resolve(null),
      hasAudio && audioTrack ? audioTrack.getNumberOfChannels() : Promise.resolve(null),
    ]);
    const frameRate = packetStats.averagePacketRate || 30;
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      duration,
      width,
      height,
      frameRate,
      videoCodec,
      hasAudio,
      audioCodec,
    };
    const encoders = Object.fromEntries(await Promise.all((["mp4", "webm", "mov"] as VideoOutputFormat[]).map(async (outputFormat) => {
      const details = outputFormatDetails(outputFormat);
      const quality = new Quality({
        bitrate: targetVideoBitrate(width, height, frameRate, outputFormat, "balanced"),
        bitrateMode: "variable",
      });
      const video = await canEncodeVideo(details.videoCodec, { width, height, quality });
      const audio = !hasAudio || !audioSampleRate || !audioChannels
        ? true
        : await canEncodeAudio(details.audioCodec, {
          numberOfChannels: audioChannels,
          sampleRate: audioSampleRate,
          quality: new Quality({ bitrate: targetAudioBitrate(outputFormat), bitrateMode: "variable" }),
        });
      return [outputFormat, { video, audio }];
    }))) as VideoConverterInspectResult extends { valid: true; encoders: infer Encoders } ? Encoders : never;
    return { valid: true, metadata, encoders };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : "A videót nem sikerült megnyitni.",
      suggestion: "Próbáld másik videófájllal vagy friss Chrome-mal, illetve Edge-dzsel.",
    };
  } finally {
    input.dispose();
  }
}

async function convertVideo(
  request: VideoConverterRequest,
  onProgress: (progress: VideoConverterProgress) => void,
): Promise<VideoConverterResult> {
  cancelRequested = false;
  const input = createInput(request.file);
  const target = new BufferTarget();
  const output = new Output({ format: createOutputFormat(request.outputFormat), target });
  let outputStarted = false;
  try {
    const dimensions = targetVideoDimensions(
      request.metadata.width,
      request.metadata.height,
      request.scalePercent,
    );
    const details = outputFormatDetails(request.outputFormat);
    const quality = videoQuality(request, dimensions.width, dimensions.height);
    onProgress({ phase: "preparing", sourceTimestamp: 0, sourceDuration: request.metadata.duration });

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) throw new Error("A videósáv nem dekódolható.");
    if (!(await canEncodeVideo(details.videoCodec, { width: dimensions.width, height: dimensions.height, quality }))) {
      throw new Error(`${details.label} kimenethez ebben a böngészőben nem elérhető a videókódoló.`);
    }

    const videoSource = new VideoSampleSource({
      codec: details.videoCodec,
      quality,
      keyFrameInterval: 2,
      transform: { width: dimensions.width, height: dimensions.height, fit: "fill" },
    });
    output.addVideoTrack(videoSource, { frameRate: request.metadata.frameRate });

    const audioTrack = request.metadata.hasAudio ? await input.getPrimaryAudioTrack() : null;
    let audioSource: AudioSampleSource | undefined;
    if (audioTrack && (await audioTrack.canDecode())) {
      const [sampleRate, numberOfChannels] = await Promise.all([
        audioTrack.getSampleRate(),
        audioTrack.getNumberOfChannels(),
      ]);
      const audioQuality = new Quality({ bitrate: targetAudioBitrate(request.outputFormat), bitrateMode: "variable" });
      if (!(await canEncodeAudio(details.audioCodec, { numberOfChannels, sampleRate, quality: audioQuality }))) {
        throw new Error(`${details.label} kimenethez ebben a böngészőben nem elérhető a hangkódoló.`);
      }
      audioSource = new AudioSampleSource({ codec: details.audioCodec, quality: audioQuality });
      output.addAudioTrack(audioSource);
    }

    await output.start();
    outputStarted = true;
    const videoSink = new VideoSampleSink(videoTrack);
    for await (const sample of videoSink.samples()) {
      assertNotCancelled();
      const sourceTimestamp = Math.max(0, sample.timestamp);
      try {
        await videoSource.add(sample);
      } finally {
        sample.close();
      }
      onProgress({
        phase: "encoding",
        sourceTimestamp,
        sourceDuration: request.metadata.duration,
      });
    }

    if (audioTrack && audioSource) {
      const audioSink = new AudioSampleSink(audioTrack);
      for await (const sample of audioSink.samples()) {
        assertNotCancelled();
        try {
          await audioSource.add(sample);
        } finally {
          sample.close();
        }
      }
    }

    onProgress({ phase: "finalizing", sourceTimestamp: request.metadata.duration, sourceDuration: request.metadata.duration });
    await output.finalize();
    const buffer = target.buffer;
    if (!buffer) throw new Error("A videókimenet nem készült el.");
    onProgress({ phase: "completed", sourceTimestamp: request.metadata.duration, sourceDuration: request.metadata.duration });
    return transfer({ buffer, mimeType: details.mimeType }, [buffer]);
  } catch (error) {
    if (outputStarted && output.state !== "finalized") await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    input.dispose();
  }
}

const api: VideoConverterWorkerApi = {
  inspectVideo,
  convertVideo,
  cancel() {
    cancelRequested = true;
  },
};

expose(api);
