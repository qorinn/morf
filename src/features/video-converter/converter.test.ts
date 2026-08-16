import assert from "node:assert/strict";
import test from "node:test";

import {
  clampScalePercent,
  createVideoConverterFileName,
  estimateOutputBytes,
  outputFormatDetails,
  supportedVideoFileName,
  targetVideoDimensions,
} from "./converter.ts";

test("a felbontás százalék szerint csökken, páros pixelméretre", () => {
  assert.deepEqual(targetVideoDimensions(1920, 1080, 50), { width: 960, height: 540 });
  assert.deepEqual(targetVideoDimensions(1919, 1079, 75), { width: 1438, height: 808 });
  assert.equal(clampScalePercent(1), 10);
  assert.equal(clampScalePercent(101), 100);
});

test("a becslés a kisebb felbontással kisebb fájlt jelez", () => {
  const metadata = { duration: 30, width: 1920, height: 1080, frameRate: 30, hasAudio: true };
  const full = estimateOutputBytes(metadata, "mp4", 100, "balanced");
  const reduced = estimateOutputBytes(metadata, "mp4", 50, "balanced");
  const webm = estimateOutputBytes(metadata, "webm", 100, "balanced");
  assert.ok(reduced < full);
  assert.ok(webm < full);
});

test("a fájlnév az új formátumot és optimalizált utótagot kapja", () => {
  assert.equal(createVideoConverterFileName("nyaralas.MOV", "webm"), "nyaralas-optimalizalt.webm");
  assert.equal(createVideoConverterFileName("video", "mp4"), "video-optimalizalt.mp4");
});

test("a workerhez engedett videókonténerek és kimeneti kodekpárok egyértelműek", () => {
  ["forras.mp4", "forras.m4v", "forras.MOV", "forras.webm", "forras.mkv", "forras.m2ts"].forEach((fileName) => {
    assert.equal(supportedVideoFileName(fileName), true);
  });
  assert.equal(supportedVideoFileName("forras.avi"), false);
  assert.deepEqual(outputFormatDetails("mp4"), {
    id: "mp4", label: "MP4", extension: "mp4", mimeType: "video/mp4", videoCodec: "avc", audioCodec: "aac",
  });
  assert.deepEqual(outputFormatDetails("webm"), {
    id: "webm", label: "WebM", extension: "webm", mimeType: "video/webm", videoCodec: "vp9", audioCodec: "opus",
  });
});
