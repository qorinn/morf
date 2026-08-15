import assert from "node:assert/strict";
import test from "node:test";

import { createAveragedVoicedToneBuffer, createPreviewLoopBuffer, createPreviewScrubBuffer, findNaturalLoop } from "./preview-loop.ts";

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

    assert.equal(loop.length, 100);
    assert.equal(loopData[0], 200);
    assert.ok(Math.abs(loopData[loopData.length - 1] - loopData[0]) <= 1);
  } finally {
    Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: previousAudioBuffer });
  }
});

test("a sustain-kereső többperiódusos, összeilleszthető hangablakot választ", () => {
  const previousAudioBuffer = globalThis.AudioBuffer;
  Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: TestAudioBuffer });
  try {
    const source = new TestAudioBuffer({ numberOfChannels: 1, length: 2_000, sampleRate: 1_000 });
    const samples = source.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin((index / 20) * Math.PI * 2);
    }
    const loop = findNaturalLoop(source as unknown as AudioBuffer, 1);

    assert.ok(loop);
    assert.ok(loop.duration >= 0.08);
    assert.ok(loop.duration <= 0.24);
    assert.ok(Number.isFinite(loop.score));
    assert.ok(loop.score < 0.01);
  } finally {
    Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: previousAudioBuffer });
  }
});

test("az átlagolt hangjegy egyetlen alapperiódust készít", () => {
  const previousAudioBuffer = globalThis.AudioBuffer;
  Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: TestAudioBuffer });
  try {
    const source = new TestAudioBuffer({ numberOfChannels: 1, length: 4_000, sampleRate: 2_000 });
    const samples = source.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.sin((index / 20) * Math.PI * 2);

    const loop = createAveragedVoicedToneBuffer(source as unknown as AudioBuffer, 1) as unknown as TestAudioBuffer;
    assert.ok(loop);
    assert.equal(loop.length, 20);
  } finally {
    Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: previousAudioBuffer });
  }
});

test("az átlagolt hangjegy az alaphangot választja erős felhang mellett is", () => {
  const previousAudioBuffer = globalThis.AudioBuffer;
  Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: TestAudioBuffer });
  try {
    const source = new TestAudioBuffer({ numberOfChannels: 1, length: 4_000, sampleRate: 2_000 });
    const samples = source.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin((index / 20) * Math.PI * 2) + Math.sin((index / 10) * Math.PI * 2) * 0.92;
    }

    const loop = createAveragedVoicedToneBuffer(source as unknown as AudioBuffer, 1) as unknown as TestAudioBuffer;
    assert.ok(loop);
    assert.equal(loop.length, 20);
  } finally {
    Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: previousAudioBuffer });
  }
});

test("a kézi tekerés hangja a húzás irányát követi", () => {
  const previousAudioBuffer = globalThis.AudioBuffer;
  Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: TestAudioBuffer });
  try {
    const source = new TestAudioBuffer({ numberOfChannels: 1, length: 600, sampleRate: 1_000 });
    const sourceData = source.getChannelData(0);
    for (let index = 0; index < sourceData.length; index += 1) sourceData[index] = index;

    const forward = createPreviewScrubBuffer(source as unknown as AudioBuffer, 0.2, 1, 0.004) as unknown as TestAudioBuffer;
    const backward = createPreviewScrubBuffer(source as unknown as AudioBuffer, 0.2, -1, 0.004) as unknown as TestAudioBuffer;

    assert.deepEqual(Array.from(forward.getChannelData(0)), [200, 201, 202, 203]);
    assert.deepEqual(Array.from(backward.getChannelData(0)), [200, 199, 198, 197]);
  } finally {
    Object.defineProperty(globalThis, "AudioBuffer", { configurable: true, value: previousAudioBuffer });
  }
});
