import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import decodeAvif, { init as initAvifDecoder } from "@jsquash/avif/decode.js";
import encodeAvif, { init as initAvifEncoder } from "@jsquash/avif/encode.js";
import decodeJpeg, { init as initJpegDecoder } from "@jsquash/jpeg/decode.js";
import encodeJpeg, { init as initJpegEncoder } from "@jsquash/jpeg/encode.js";
import decodePng, { init as initPngDecoder } from "@jsquash/png/decode.js";
import encodePng, { init as initPngEncoder } from "@jsquash/png/encode.js";
import resize, { initResize } from "@jsquash/resize";
import encodeWebp, { init as initWebpEncoder } from "@jsquash/webp/encode.js";
import { simd } from "wasm-feature-detect";

type EmscriptenInitializer = (
  module: WebAssembly.Module,
) => Promise<unknown> | void;

async function compileWasm(
  packageEntry: string,
  relativePath: string,
): Promise<WebAssembly.Module> {
  const entryUrl = import.meta.resolve(packageEntry);
  const bytes = await readFile(new URL(relativePath, entryUrl));
  return WebAssembly.compile(bytes);
}

function createFixture(width = 8, height = 6): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < data.length; index += 4) {
    data[index] = (index * 7) % 255;
    data[index + 1] = (index * 11) % 255;
    data[index + 2] = (index * 13) % 255;
    data[index + 3] = 255;
  }

  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

test("JPEG és PNG forrásból átméretezett WebP készül", async () => {
  const webpWasmPath = (await simd())
    ? "./codec/enc/webp_enc_simd.wasm"
    : "./codec/enc/webp_enc.wasm";
  const [
    avifEncoder,
    avifDecoder,
    jpegEncoder,
    jpegDecoder,
    pngCodec,
    resizeCodec,
    webpEncoder,
  ] = await Promise.all([
    compileWasm("@jsquash/avif/encode.js", "./codec/enc/avif_enc.wasm"),
    compileWasm("@jsquash/avif/decode.js", "./codec/dec/avif_dec.wasm"),
    compileWasm("@jsquash/jpeg/encode.js", "./codec/enc/mozjpeg_enc.wasm"),
    compileWasm("@jsquash/jpeg/decode.js", "./codec/dec/mozjpeg_dec.wasm"),
    compileWasm("@jsquash/png/encode.js", "./codec/pkg/squoosh_png_bg.wasm"),
    compileWasm("@jsquash/resize", "./lib/resize/pkg/squoosh_resize_bg.wasm"),
    compileWasm("@jsquash/webp/encode.js", webpWasmPath),
  ]);

  await Promise.all([
    (initAvifEncoder as EmscriptenInitializer)(avifEncoder),
    (initAvifDecoder as EmscriptenInitializer)(avifDecoder),
    (initJpegEncoder as EmscriptenInitializer)(jpegEncoder),
    (initJpegDecoder as EmscriptenInitializer)(jpegDecoder),
    initPngEncoder(pngCodec),
    initPngDecoder(pngCodec),
    initResize(resizeCodec),
    (initWebpEncoder as EmscriptenInitializer)(webpEncoder),
  ]);

  const fixture = createFixture();
  const [jpegBuffer, pngBuffer] = await Promise.all([
    encodeJpeg(fixture, { quality: 80 }),
    encodePng(fixture),
  ]);
  const [decodedJpeg, decodedPng] = await Promise.all([
    decodeJpeg(jpegBuffer),
    decodePng(pngBuffer),
  ]);

  assert.equal(decodedJpeg.width, 8);
  assert.equal(decodedPng.height, 6);

  const resized = await resize(decodedPng, {
    width: 4,
    height: 3,
    method: "lanczos3",
    fitMethod: "contain",
    premultiply: true,
    linearRGB: true,
  });
  const webpBuffer = await encodeWebp(resized, { quality: 80 });
  const header = new Uint8Array(webpBuffer.slice(0, 12));

  assert.ok(webpBuffer.byteLength > 0);
  assert.equal(String.fromCharCode(...header.slice(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...header.slice(8, 12)), "WEBP");

  const avifBuffer = await encodeAvif(resized, {
    quality: 70,
    qualityAlpha: 70,
    speed: 8,
  });
  const decodedAvif = await decodeAvif(avifBuffer);
  const avifHeader = new Uint8Array(avifBuffer.slice(4, 12));

  assert.ok(avifBuffer.byteLength > 0);
  assert.equal(String.fromCharCode(...avifHeader), "ftypavif");
  assert.equal(decodedAvif?.width, 4);
  assert.equal(decodedAvif?.height, 3);
});
