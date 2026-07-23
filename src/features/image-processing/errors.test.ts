import assert from "node:assert/strict";
import test from "node:test";

import { createProcessingError } from "./errors.ts";

test("a HEIC dekódolási hibát beolvasási hibaként jelzi", () => {
  const error = createProcessingError(new Error("HEIF processing error"));

  assert.equal(error.category, "decode-failed");
});
