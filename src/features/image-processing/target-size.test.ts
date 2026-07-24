import assert from "node:assert/strict";
import test from "node:test";

import { encodeAtHighestQualityUnderLimit } from "./target-size.ts";

function bufferWithSize(size: number): ArrayBuffer {
  return new ArrayBuffer(size);
}

test("a legmagasabb, célméret alatti minőséget választja", async () => {
  const attempted: number[] = [];
  const result = await encodeAtHighestQualityUnderLimit(async (quality) => {
    attempted.push(quality);
    return bufferWithSize(quality * 1_000);
  }, 73_500);

  assert.equal(result?.quality, 73);
  assert.equal(result?.buffer.byteLength, 73_000);
  assert.ok(attempted.length <= 4);
});

test("nem ad túlméretes eredményt, ha a minimum sem fér bele", async () => {
  const result = await encodeAtHighestQualityUnderLimit(
    async () => bufferWithSize(2_000),
    1_000,
  );

  assert.equal(result, undefined);
});

test("egyetlen kódolás elég, ha a legjobb minőség is belefér", async () => {
  let attempts = 0;
  const result = await encodeAtHighestQualityUnderLimit(async (quality) => {
    attempts += 1;
    return bufferWithSize(quality * 100);
  }, 20_000);

  assert.equal(result?.quality, 100);
  assert.equal(attempts, 1);
});
