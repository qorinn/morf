import assert from "node:assert/strict";
import test from "node:test";

import {
  estimateSelectedFrameCount,
  frameFileName,
  normalizeFrameRate,
  selectFramesByFps,
  shouldSelectFrame,
} from "./sampling.ts";
import type { FrameRecordV1 } from "./types.ts";

function frames(timestamps: number[]): FrameRecordV1[] {
  return timestamps.map((timestamp, index) => ({
    index: index + 1,
    timestamp,
    duration: 1 / 30,
    fileName: `frame-${index + 1}.png`,
    byteSize: 100,
  }));
}

test("alapból minden eredeti frame-et kiválaszt", () => {
  const source = frames([0, 1 / 30, 2 / 30, 3 / 30]);
  assert.deepEqual(selectFramesByFps(source, null), source);
});

test("az FPS-szűrés nem szintetizál frame-et", () => {
  const source = frames([0, 0.04, 0.08, 0.12, 0.16, 0.2]);
  assert.deepEqual(
    selectFramesByFps(source, 10).map((frame) => frame.timestamp),
    [0, 0.12],
  );
});

test("változó időközű frame-eket időbélyeg alapján ritkít", () => {
  const source = frames([0, 0.02, 0.09, 0.11, 0.21, 0.35]);
  assert.deepEqual(
    selectFramesByFps(source, 5).map((frame) => frame.timestamp),
    [0, 0.21],
  );
});

test("folytatáskor a checkpoint utolsó frame-je nem duplikálódik", () => {
  assert.equal(shouldSelectFrame(1, 1, null), true);
  assert.equal(shouldSelectFrame(1.01, 1, 30), false);
  assert.equal(shouldSelectFrame(1 + 1 / 30, 1, 30), true);
});

test("az FPS nem lehet nagyobb a forrásénál", () => {
  assert.equal(normalizeFrameRate(60, 29.97), 29.97);
  assert.equal(normalizeFrameRate(15, 29.97), 15);
  assert.equal(normalizeFrameRate(null, 29.97), null);
});

test("a becslés a tartomány és az effektív FPS alapján készül", () => {
  assert.equal(estimateSelectedFrameCount(10, 30, null), 300);
  assert.equal(estimateSelectedFrameCount(10, 30, 5), 50);
});

test("biztonságos és determinisztikus frame-fájlnevet készít", () => {
  assert.equal(
    frameFileName("../Nyaralás: 2026.mov", 42),
    "Nyaralás-2026-frame-00000042.png",
  );
});
