import assert from "node:assert/strict";
import test from "node:test";

import { createPreviewLoopBuffer } from "./preview-loop.ts";

class TestAudioBuffer {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly sampleRate: number;
  private readonly channels: Float32Array[];

  constructor({ numberOfChannels, length, sampleRate }: AudioBufferOptions) {
    this.numberOfChannels = numberOfChannels ?? 1;
    this.length = length ?? 1;
    this.sampleRate = sampleRate ?? 44_100;
    this.channels = Array.from({ length: this.numberOfChannels }, () => new Float32Array(this.length));
  }

  getChannelData(channel: number) {
    return this.channels[channel];
  }

  copyToChannel(source: Float32Array, channel: number, startInChannel = 0) {
    this.channels[channel].set(source, startInChannel);
  }
}

test("a scrub-hang a kiválasztott időtől indul és a loop végén visszakever az elejére", () => {
  const previousAudioBuffer = globalThis.AudioBuffer;
  Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: TestAudioBuffer });
  try {
    const source = new TestAudioBuffer({ numberOfChannels: 1, length: 600, sampleRate: 1_000 });
    const sourceData = source.getChannelData(0);
    for (let index = 0; index < sourceData.length; index += 1) sourceData[index] = index;

    const loop = createPreviewLoopBuffer(source as unknown as AudioBuffer, 0.2) as unknown as TestAudioBuffer;
    const loopData = loop.getChannelData(0);

    assert.equal(loop.length, 10);
    assert.equal(loopData[0], 200);
    assert.ok(Math.abs(loopData[loopData.length - 1] - loopData[0]) <= 1);
  } finally {
    Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: previousAudioBuffer });
  }
});
