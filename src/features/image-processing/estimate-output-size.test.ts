import assert from "node:assert/strict";
import test from "node:test";

import { estimateImageOutputSize } from "./estimate-output-size.ts";

const baseOptions = {
  sourceSize: 4_000_000,
  sourceFormat: "jpeg" as const,
  outputFormat: "webp" as const,
  width: 4000,
  height: 2000,
  maxWidth: 1000,
  maxHeight: 1000,
  quality: 80,
};

test("a várható méret figyelembe veszi az átméretezés pixelarányát", () => {
  const estimate = estimateImageOutputSize(baseOptions);

  assert.ok(estimate);
  assert.deepEqual(
    { width: estimate.width, height: estimate.height },
    { width: 1000, height: 500 },
  );
  assert.ok(estimate.bytes < baseOptions.sourceSize / 10);
});

test("veszteséges kimenetnél a magasabb minőség nagyobb becslést ad", () => {
  const low = estimateImageOutputSize({ ...baseOptions, quality: 40 });
  const high = estimateImageOutputSize({ ...baseOptions, quality: 95 });

  assert.ok(low && high);
  assert.ok(high.bytes > low.bytes);
});

test("érvénytelen képméretnél nem ad félrevezető becslést", () => {
  assert.equal(
    estimateImageOutputSize({ ...baseOptions, width: 0 }),
    undefined,
  );
});
