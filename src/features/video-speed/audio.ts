import { AudioSampleSink, BlobSource, Input, MP4, QTFF, WEBM } from "mediabunny";

import {
  estimateOutputDuration,
  outputTimeAtSourceTime,
} from "./curve";
import type { ProcessedAudio, SpeedCurve, VideoSpeedMetadata } from "./types";

const supportedFormats = [MP4, QTFF, WEBM];
const maximumPitchPreservingSpeed = 8;

function createInput(file: File) {
  return new Input({
    formats: supportedFormats,
    source: new BlobSource(file, {
      maxCacheSize: 8 * 1024 * 1024,
      useStreamReader: true,
    }),
  });
}

function createAudioBuffer(
  numberOfChannels: number,
  length: number,
  sampleRate: number,
): AudioBuffer {
  return new AudioBuffer({ numberOfChannels, length, sampleRate });
}

async function decodeAudio(file: File, metadata: VideoSpeedMetadata): Promise<AudioBuffer | undefined> {
  if (!metadata.hasAudio || !metadata.audioSampleRate || !metadata.audioChannels) {
    return undefined;
  }

  const input = createInput(file);
  try {
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!audioTrack || !(await audioTrack.canDecode())) {
      throw new Error("A hangsáv ebben a böngészőben nem dekódolható.");
    }

    const [firstTimestamp, duration] = await Promise.all([
      audioTrack.getFirstTimestamp(),
      audioTrack.computeDuration(),
    ]);
    const sampleRate = await audioTrack.getSampleRate();
    const numberOfChannels = await audioTrack.getNumberOfChannels();
    const buffer = createAudioBuffer(
      numberOfChannels,
      Math.ceil(duration * sampleRate) + 1,
      sampleRate,
    );
    const sink = new AudioSampleSink(audioTrack);

    for await (const sample of sink.samples()) {
      try {
        const decoded = sample.toAudioBuffer();
        const destinationFrame = Math.max(
          0,
          Math.round((sample.timestamp - firstTimestamp) * sampleRate),
        );
        for (let channel = 0; channel < numberOfChannels; channel += 1) {
          const channelData = decoded.getChannelData(channel);
          if (destinationFrame < buffer.length) {
            buffer.copyToChannel(
              channelData.subarray(0, buffer.length - destinationFrame),
              channel,
              destinationFrame,
            );
          }
        }
      } finally {
        sample.close();
      }
    }

    return buffer;
  } finally {
    input.dispose();
  }
}

function sliceAudioBuffer(buffer: AudioBuffer, startFrame: number, endFrame: number): AudioBuffer {
  const length = Math.max(1, endFrame - startFrame);
  const sliced = createAudioBuffer(
    buffer.numberOfChannels,
    length,
    buffer.sampleRate,
  );
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    sliced.copyToChannel(buffer.getChannelData(channel).subarray(startFrame, endFrame), channel);
  }
  return sliced;
}

function resampleAudioBuffer(buffer: AudioBuffer, outputLength: number): AudioBuffer {
  const result = createAudioBuffer(
    buffer.numberOfChannels,
    Math.max(1, outputLength),
    buffer.sampleRate,
  );
  const scale = buffer.length / result.length;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const source = buffer.getChannelData(channel);
    const target = result.getChannelData(channel);
    for (let index = 0; index < target.length; index += 1) {
      const sourcePosition = Math.min(source.length - 1, index * scale);
      const left = Math.floor(sourcePosition);
      const right = Math.min(source.length - 1, left + 1);
      const fraction = sourcePosition - left;
      target[index] = source[left] + (source[right] - source[left]) * fraction;
    }
  }
  return result;
}

function copyBufferAt(
  target: Float32Array[],
  source: AudioBuffer,
  destinationFrame: number,
) {
  for (let channel = 0; channel < target.length; channel += 1) {
    target[channel].set(source.getChannelData(channel), destinationFrame);
  }
}

async function renderPitchPreservedAudio(
  input: AudioBuffer,
  speed: number,
): Promise<AudioBuffer> {
  if (speed > maximumPitchPreservingSpeed) {
    throw new Error(
      "A hangmagasság megtartása legfeljebb 8× sebességig használható. Csökkentsd a görbét, vagy kapcsold ki ezt az opciót.",
    );
  }
  const { processOffline } = await import("@soundtouchjs/audio-worklet");
  const processorUrl = (await import("@soundtouchjs/audio-worklet/processor?url"))
    .default;
  return processOffline({
    input,
    processorUrl,
    playbackRate: speed,
    pitch: 1,
  });
}

/**
 * A hangot a videógörbével azonos, rövid forrásszakaszokra bontjuk. Ez biztosítja,
 * hogy a változó tempó a videó és a hangsáv végén is ugyanoda érkezzen.
 */
export async function renderCurveAudio({
  file,
  metadata,
  curve,
  preservePitch,
  signal,
  onProgress,
}: {
  file: File;
  metadata: VideoSpeedMetadata;
  curve: SpeedCurve;
  preservePitch: boolean;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
}): Promise<ProcessedAudio | undefined> {
  if (signal?.aborted) throw new DOMException("Az export megszakítva.", "AbortError");
  const source = await decodeAudio(file, metadata);
  if (!source) return undefined;

  const outputDuration = estimateOutputDuration(curve, metadata.duration);
  const outputLength = Math.max(1, Math.ceil(outputDuration * source.sampleRate));
  const channels = Array.from(
    { length: source.numberOfChannels },
    () => new Float32Array(outputLength),
  );
  const sourceSegmentSeconds = 0.25;
  const segmentCount = Math.max(1, Math.ceil(metadata.duration / sourceSegmentSeconds));
  let outputOffset = 0;

  for (let index = 0; index < segmentCount; index += 1) {
    if (signal?.aborted) throw new DOMException("Az export megszakítva.", "AbortError");
    const sourceStart = (index / segmentCount) * metadata.duration;
    const sourceEnd = ((index + 1) / segmentCount) * metadata.duration;
    const startFrame = Math.floor(sourceStart * source.sampleRate);
    const endFrame = Math.min(source.length, Math.ceil(sourceEnd * source.sampleRate));
    if (endFrame <= startFrame) continue;

    const targetDuration =
      outputTimeAtSourceTime(curve, metadata.duration, sourceEnd) -
      outputTimeAtSourceTime(curve, metadata.duration, sourceStart);
    const targetLength = Math.max(1, Math.round(targetDuration * source.sampleRate));
    const segment = sliceAudioBuffer(source, startFrame, endFrame);
    const averageSpeed = segment.duration / targetDuration;
    const rendered = preservePitch
      ? await renderPitchPreservedAudio(segment, averageSpeed)
      : resampleAudioBuffer(segment, targetLength);
    const remaining = channels[0].length - outputOffset;
    if (remaining <= 0) break;

    if (rendered.length > remaining) {
      const trimmed = sliceAudioBuffer(rendered, 0, remaining);
      copyBufferAt(channels, trimmed, outputOffset);
      outputOffset += trimmed.length;
    } else {
      copyBufferAt(channels, rendered, outputOffset);
      outputOffset += rendered.length;
    }
    onProgress?.((index + 1) / segmentCount);
  }

  return {
    channels: channels.map((channel) => channel.buffer),
    sampleRate: source.sampleRate,
    numberOfFrames: outputOffset,
  };
}
