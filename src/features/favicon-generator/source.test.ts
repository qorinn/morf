import assert from "node:assert/strict";
import test from "node:test";

import { sniffSourceKind } from "./source.ts";

test("a forrás formátumát a fájl tartalmából ismeri fel", () => {
  assert.equal(
    sniffSourceKind(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    "png",
  );
  assert.equal(sniffSourceKind(new Uint8Array([0xff, 0xd8, 0xff])), "jpeg");
  assert.equal(
    sniffSourceKind(
      new Uint8Array(),
      '<?xml version="1.0"?><svg viewBox="0 0 10 10">',
    ),
    "svg",
  );
});

test("a kiterjesztésnek álcázott ismeretlen fájlt elutasítja", () => {
  assert.equal(sniffSourceKind(new Uint8Array([1, 2, 3]), "nem kép"), null);
});
