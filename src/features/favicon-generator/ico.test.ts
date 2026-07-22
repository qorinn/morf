import assert from "node:assert/strict";
import test from "node:test";

import { encodePngIco } from "./ico.ts";

test("az ICO könyvtár három PNG frame-et és helyes offseteket tartalmaz", () => {
  const frames = [
    { size: 16, png: new Uint8Array([1, 2]) },
    { size: 32, png: new Uint8Array([3, 4, 5]) },
    { size: 48, png: new Uint8Array([6]) },
  ];
  const ico = encodePngIco(frames);
  const view = new DataView(ico.buffer);

  assert.equal(view.getUint16(2, true), 1);
  assert.equal(view.getUint16(4, true), 3);
  assert.deepEqual([ico[6], ico[22], ico[38]], [16, 32, 48]);
  assert.equal(view.getUint32(18, true), 54);
  assert.equal(view.getUint32(34, true), 56);
  assert.equal(view.getUint32(50, true), 59);
  assert.deepEqual([...ico.slice(54)], [1, 2, 3, 4, 5, 6]);
});
