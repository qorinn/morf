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
  const metadata = {
    duration: 30,
    width: 1920,
    height: 1080,
    frameRate: 30,
    hasAudio: true,
    fileSize: 30 * 1024 * 1024,
  };
  const full = estimateOutputBytes(metadata, "mp4", 100, "balanced");
  const reduced = estimateOutputBytes(metadata, "mp4", 50, "balanced");
  const webm = estimateOutputBytes(metadata, "webm", 100, "balanced");
  assert.ok(reduced < full);
  assert.ok(webm < full);
});

test("egyik preset sem haladja meg érdemben a forrás méretét, még változatlan felbontásnál sem", () => {
  // Hatékonyan tömörített, kis forrás: a felbontás-alapú képlet önmagában
  // ennél jóval nagyobb bitrátát adna mindhárom presetnél, ha nem korlátozná
  // a forrás mérete.
  const metadata = {
    duration: 10,
    width: 1280,
    height: 720,
    frameRate: 30,
    hasAudio: true,
    fileSize: 500_000,
  };
  const smaller = estimateOutputBytes(metadata, "mp4", 100, "smaller");
  const balanced = estimateOutputBytes(metadata, "mp4", 100, "balanced");
  const original = estimateOutputBytes(metadata, "mp4", 100, "original");
  assert.ok(smaller <= metadata.fileSize * 1.1);
  assert.ok(balanced <= metadata.fileSize * 1.1);
  assert.ok(original <= metadata.fileSize * 1.1);
});

test("a három preset egyértelműen eltérő méretet ad, még kis/hatékony forrásnál is", () => {
  // Ez pont az az eset, ahol korábban a Kisebb fájl és a Kiegyensúlyozott
  // preset is ugyanarra a plafonra vágódott, és byte-ra egyezett a kettő.
  const metadata = {
    duration: 10,
    width: 1280,
    height: 720,
    frameRate: 30,
    hasAudio: true,
    fileSize: 500_000,
  };
  const smaller = estimateOutputBytes(metadata, "mp4", 100, "smaller");
  const balanced = estimateOutputBytes(metadata, "mp4", 100, "balanced");
  const original = estimateOutputBytes(metadata, "mp4", 100, "original");
  assert.ok(smaller < balanced);
  assert.ok(balanced < original);
});

test("nagy, hatékonyan tömörítetlen forrásnál a preset-sorrend a felbontás-alapú képletet követi", () => {
  const metadata = {
    duration: 30,
    width: 1920,
    height: 1080,
    frameRate: 30,
    hasAudio: true,
    fileSize: 200 * 1024 * 1024,
  };
  const smaller = estimateOutputBytes(metadata, "mp4", 100, "smaller");
  const balanced = estimateOutputBytes(metadata, "mp4", 100, "balanced");
  const original = estimateOutputBytes(metadata, "mp4", 100, "original");
  assert.ok(smaller < balanced);
  assert.ok(balanced < original);
  assert.ok(original < metadata.fileSize);
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
