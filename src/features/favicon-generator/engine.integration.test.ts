import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import decodePng, { init as initPngDecoder } from "@jsquash/png/decode.js";
import { init as initPngEncoder } from "@jsquash/png/encode.js";
import { initResize } from "@jsquash/resize";
import { unzipSync } from "fflate";

import { generateFaviconPackage } from "./engine.ts";
import type { RasterPayload } from "./types.ts";

function solidMaster(size: number, alpha = 255): RasterPayload {
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 113;
    pixels[index + 1] = 78;
    pixels[index + 2] = 214;
    pixels[index + 3] = alpha;
  }
  return { buffer: pixels.buffer, width: size, height: size };
}

async function compileWasm(
  packageEntry: string,
  relativePath: string,
): Promise<WebAssembly.Module> {
  const entryUrl = import.meta.resolve(packageEntry);
  const bytes = await readFile(new URL(relativePath, entryUrl));
  return WebAssembly.compile(bytes);
}

test("a PWA ZIP minden előírt, dekódolható képméretet és többméretes ICO-t tartalmaz", async () => {
  const [pngCodec, resizeCodec] = await Promise.all([
    compileWasm("@jsquash/png/encode.js", "./codec/pkg/squoosh_png_bg.wasm"),
    compileWasm("@jsquash/resize", "./lib/resize/pkg/squoosh_resize_bg.wasm"),
  ]);
  await Promise.all([
    initPngEncoder(pngCodec),
    initPngDecoder(pngCodec),
    initResize(resizeCodec),
  ]);

  const result = await generateFaviconPackage(
    {
      standardMaster: solidMaster(64),
      opaqueMaster: solidMaster(64),
      maskableMaster: solidMaster(64),
      exportOptions: {
        targets: ["website", "web-app"],
        includeWebManifest: true,
      },
      manifest: {
        name: "Morf",
        shortName: "Morf",
        id: "/",
        startUrl: "/",
        scope: "/",
        themeColor: "#ffffff",
        backgroundColor: "#ffffff",
        display: "standalone",
        basePath: "/",
        projectName: "Morf",
      },
      language: "hu",
    },
    () => undefined,
  );

  const files = unzipSync(new Uint8Array(result.archiveBuffer));
  const expectedPngs = [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["favicon-48x48.png", 48],
    ["apple-touch-icon.png", 180],
    ["web-app-manifest-192x192.png", 192],
    ["web-app-manifest-512x512.png", 512],
    ["web-app-manifest-192x192-maskable.png", 192],
    ["web-app-manifest-512x512-maskable.png", 512],
  ] as const;

  for (const [fileName, size] of expectedPngs) {
    const file = files[`favicon-package/${fileName}`];
    assert.ok(file, `${fileName} hiányzik`);
    const image = await decodePng(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    );
    assert.equal(image.width, size);
    assert.equal(image.height, size);
  }

  const ico = files["favicon-package/favicon.ico"];
  const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
  assert.equal(view.getUint16(4, true), 3);
  assert.deepEqual([ico[6], ico[22], ico[38]], [16, 32, 48]);
  assert.ok(files["favicon-package/site.webmanifest"]);
  assert.ok(files["favicon-package/favicon-code.html"]);
  assert.ok(files["favicon-package/README.md"]);

  const webAppOnlyResult = await generateFaviconPackage(
    {
      standardMaster: solidMaster(64),
      opaqueMaster: solidMaster(64),
      maskableMaster: solidMaster(64),
      exportOptions: {
        targets: ["web-app"],
        includeWebManifest: false,
      },
      manifest: {
        name: "Morf",
        shortName: "Morf",
        id: "/",
        startUrl: "/",
        scope: "/",
        themeColor: "#ffffff",
        backgroundColor: "#ffffff",
        display: "standalone",
        basePath: "/",
        projectName: "Morf",
      },
      language: "hu",
    },
    () => undefined,
  );
  const webAppOnlyFiles = unzipSync(
    new Uint8Array(webAppOnlyResult.archiveBuffer),
  );

  assert.ok(webAppOnlyFiles["favicon-package/web-app-manifest-192x192.png"]);
  assert.ok(webAppOnlyFiles["favicon-package/README.md"]);
  assert.equal(webAppOnlyFiles["favicon-package/favicon.ico"], undefined);
  assert.equal(
    webAppOnlyFiles["favicon-package/apple-touch-icon.png"],
    undefined,
  );
  assert.equal(webAppOnlyFiles["favicon-package/site.webmanifest"], undefined);
  assert.equal(webAppOnlyFiles["favicon-package/favicon-code.html"], undefined);

  const websiteOnlyResult = await generateFaviconPackage(
    {
      standardMaster: solidMaster(64),
      opaqueMaster: solidMaster(64),
      maskableMaster: solidMaster(64),
      exportOptions: {
        targets: ["website"],
        includeWebManifest: false,
      },
      manifest: {
        name: "Morf",
        shortName: "Morf",
        id: "/",
        startUrl: "/",
        scope: "/",
        themeColor: "#ffffff",
        backgroundColor: "#ffffff",
        display: "standalone",
        basePath: "/",
        projectName: "Morf",
      },
      language: "hu",
    },
    () => undefined,
  );
  const websiteOnlyFiles = unzipSync(
    new Uint8Array(websiteOnlyResult.archiveBuffer),
  );

  assert.ok(websiteOnlyFiles["favicon-package/favicon.ico"]);
  assert.ok(websiteOnlyFiles["favicon-package/apple-touch-icon.png"]);
  assert.equal(
    websiteOnlyFiles["favicon-package/web-app-manifest-192x192.png"],
    undefined,
  );
  assert.equal(websiteOnlyFiles["favicon-package/site.webmanifest"], undefined);
});
