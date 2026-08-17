/// <reference lib="webworker" />

import { expose, transfer } from "comlink";
import {
  AudioSample,
  AudioSampleSource,
  BlobSource,
  BufferTarget,
  Input,
  MP4,
  Mp4OutputFormat,
  Output,
  Quality,
  QTFF,
  VideoSample,
  VideoSampleSink,
  VideoSampleSource,
  WEBM,
  canEncodeAudio,
  canEncodeVideo,
} from "mediabunny";

import { outputTimeAtSourceTime } from "@/features/video-speed/curve";
import type {
  InspectSpeedVideoResult,
  VideoSpeedExportRequest,
  VideoSpeedExportResult,
  VideoSpeedExportProgress,
  VideoSpeedMetadata,
  VideoSpeedTextCopy,
  VideoSpeedWorkerApi,
} from "@/features/video-speed/types";

const supportedFormats = [MP4, QTFF, WEBM];
const audioChunkFrames = 48_000 * 5;
const highQuality = new Quality("high");
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

function assertNotCancelled(copy: VideoSpeedTextCopy) {
  if (cancelRequested) throw new DOMException(copy.exportCancelled, "AbortError");
}

async function inspectVideo(
  file: File,
  copy: VideoSpeedTextCopy,
): Promise<InspectSpeedVideoResult> {
  if (!/\.(mp4|m4v|mov|webm)$/i.test(file.name)) {
    return { valid: false, ...copy.unsupportedFileType };
  }

  const input = createInput(file);
  try {
    if (!(await input.canRead())) {
      return { valid: false, ...copy.unreadableContainer };
    }
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) {
      return { valid: false, ...copy.trackNotDecodable };
    }

    const audioTrack = await input.getPrimaryAudioTrack();
    const hasAudio = Boolean(audioTrack && (await audioTrack.canDecode()));
    const [duration, width, height, packetStats, videoCodec, audioCodec, audioSampleRate, audioChannels] =
      await Promise.all([
        videoTrack.computeDuration(),
        videoTrack.getDisplayWidth(),
        videoTrack.getDisplayHeight(),
        videoTrack.computePacketStats(500),
        videoTrack.getCodec(),
        hasAudio && audioTrack ? audioTrack.getCodec() : Promise.resolve(null),
        hasAudio && audioTrack ? audioTrack.getSampleRate() : Promise.resolve(null),
        hasAudio && audioTrack ? audioTrack.getNumberOfChannels() : Promise.resolve(null),
      ]);
    const metadata: VideoSpeedMetadata = {
      fileName: file.name,
      fileSize: file.size,
      duration,
      width,
      height,
      frameRate: packetStats.averagePacketRate || 30,
      videoCodec,
      hasAudio,
      audioCodec,
      audioSampleRate,
      audioChannels,
    };
    const canEncode = await canEncodeVideo("avc", { width, height, quality: highQuality });
    return { valid: true, metadata, canEncode };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : copy.inspectFailed.message,
      suggestion: copy.inspectFailed.suggestion,
    };
  } finally {
    input.dispose();
  }
}

async function exportVideo(
  request: VideoSpeedExportRequest,
  onProgress: (progress: VideoSpeedExportProgress) => void,
): Promise<VideoSpeedExportResult> {
  cancelRequested = false;
  const input = createInput(request.file);
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  let outputStarted = false;

  try {
    onProgress({ phase: "preparing", sourceTimestamp: 0, sourceDuration: request.metadata.duration });
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) {
      throw new Error(request.copy.exportTrackNotDecodable);
    }
    if (!(await canEncodeVideo("avc", {
      width: request.metadata.width,
      height: request.metadata.height,
      quality: highQuality,
    }))) {
      throw new Error(request.copy.h264Unsupported);
    }

    const videoSource = new VideoSampleSource({
      codec: "avc",
      quality: highQuality,
      keyFrameInterval: 2,
    });
    output.addVideoTrack(videoSource, { frameRate: request.metadata.frameRate });

    if (request.audio) {
      const audio = request.audio;
      const canEncodeAac = await canEncodeAudio("aac", {
        numberOfChannels: audio.channels.length,
        sampleRate: audio.sampleRate,
        quality: highQuality,
      });
      if (!canEncodeAac) {
        throw new Error(request.copy.aacUnsupported);
      }
      const audioSource = new AudioSampleSource({ codec: "aac", quality: highQuality });
      output.addAudioTrack(audioSource);
      await output.start();
      outputStarted = true;
      for (let startFrame = 0; startFrame < audio.numberOfFrames; startFrame += audioChunkFrames) {
        assertNotCancelled(request.copy);
        const frameCount = Math.min(audioChunkFrames, audio.numberOfFrames - startFrame);
        const data = new Float32Array(frameCount * audio.channels.length);
        audio.channels.forEach((buffer, channel) => {
          data.set(new Float32Array(buffer, startFrame * 4, frameCount), channel * frameCount);
        });
        const sample = new AudioSample({
          data,
          format: "f32-planar",
          numberOfChannels: audio.channels.length,
          sampleRate: audio.sampleRate,
          timestamp: startFrame / audio.sampleRate,
        });
        try {
          await audioSource.add(sample);
        } finally {
          sample.close();
        }
      }
    } else {
      await output.start();
      outputStarted = true;
    }

    const sink = new VideoSampleSink(videoTrack);
    for await (const sample of sink.samples()) {
      assertNotCancelled(request.copy);
      const sourceTimestamp = Math.max(0, sample.timestamp);
      const outputTimestamp = outputTimeAtSourceTime(
        request.curve,
        request.metadata.duration,
        sourceTimestamp,
      );
      const outputEnd = outputTimeAtSourceTime(
        request.curve,
        request.metadata.duration,
        sourceTimestamp + sample.duration,
      );
      const frame = sample.toVideoFrame();
      const transformed = new VideoSample(frame, {
        timestamp: outputTimestamp,
        duration: Math.max(1 / 1000, outputEnd - outputTimestamp),
      });
      try {
        await videoSource.add(transformed);
      } finally {
        transformed.close();
        sample.close();
      }
      onProgress({
        phase: "encoding",
        sourceTimestamp,
        sourceDuration: request.metadata.duration,
      });
    }

    onProgress({
      phase: "finalizing",
      sourceTimestamp: request.metadata.duration,
      sourceDuration: request.metadata.duration,
    });
    await output.finalize();
    const buffer = target.buffer;
    if (!buffer) throw new Error(request.copy.outputNotCreated);
    onProgress({
      phase: "completed",
      sourceTimestamp: request.metadata.duration,
      sourceDuration: request.metadata.duration,
    });
    return transfer({ buffer, mimeType: "video/mp4" }, [buffer]);
  } catch (error) {
    if (outputStarted && output.state !== "finalized") await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    input.dispose();
  }
}

const api: VideoSpeedWorkerApi = {
  inspectVideo,
  exportVideo,
  cancel() {
    cancelRequested = true;
  },
};

expose(api);
