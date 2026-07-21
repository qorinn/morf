import assert from "node:assert/strict";
import test from "node:test";

import { calculateContainedDimensions } from "./dimensions.ts";

test("arányosan lekicsinyít a megadott dobozba", () => {
  assert.deepEqual(calculateContainedDimensions(4000, 3000, 1920, 1080), {
    width: 1440,
    height: 1080,
  });
});

test("nem nagyítja fel a kisebb képet", () => {
  assert.deepEqual(calculateContainedDimensions(640, 480, 1920, 1080), {
    width: 640,
    height: 480,
  });
});
