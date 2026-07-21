import assert from "node:assert/strict";
import test from "node:test";

import {
  detectImageFormat,
  getFileSizeLimit,
  validateImageFile,
} from "./validation.ts";

test("magic byte alapján azonosítja a támogatott képeket", () => {
  assert.equal(
    detectImageFormat(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])),
    "jpeg",
  );
  assert.equal(
    detectImageFormat(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    "png",
  );
  assert.equal(
    detectImageFormat(
      Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]),
    ),
    "webp",
  );
  assert.equal(detectImageFormat(Uint8Array.from([0, 1, 2, 3])), undefined);
});

test("mobilon és kevés memórián konzervatív limitet használ", () => {
  assert.equal(
    getFileSizeLimit({ isMobile: true, deviceMemory: 2 }, "jpeg"),
    30 * 1024 * 1024,
  );
  assert.equal(
    getFileSizeLimit({ isMobile: true, deviceMemory: 8 }, "webp"),
    50 * 1024 * 1024,
  );
  assert.equal(
    getFileSizeLimit({ isMobile: false, deviceMemory: 16 }, "png"),
    130 * 1024 * 1024,
  );
});

test("elutasítja az egymásnak ellentmondó MIME-típust és fájltartalmat", async () => {
  const pngHeader = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const file = new File([pngHeader], "hibas.jpg", { type: "image/jpeg" });
  const result = await validateImageFile(file, { isMobile: false });

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.error.category, "unsupported-format");
  }
});
