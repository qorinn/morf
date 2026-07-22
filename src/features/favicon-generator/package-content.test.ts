import assert from "node:assert/strict";
import test from "node:test";

import {
  createHtmlCode,
  createManifest,
  normalizeBasePath,
  slugifyProjectName,
} from "./package-content.ts";

test("a base path root-relative, relative és egyedi alakot is kezel", () => {
  assert.equal(normalizeBasePath("/"), "/");
  assert.equal(normalizeBasePath("./"), "./");
  assert.equal(normalizeBasePath("/app/icons"), "/app/icons/");
});

test("a PWA manifest helyes ikonokat és purpose értékeket tartalmaz", () => {
  const manifest = JSON.parse(
    createManifest({
      name: "Morf App",
      shortName: "Morf",
      themeColor: "#123456",
      backgroundColor: "#ffffff",
      display: "standalone",
      basePath: "/assets",
      projectName: "Morf",
    }),
  );

  assert.equal(manifest.icons.length, 4);
  assert.deepEqual(
    manifest.icons.map((item: { purpose: string }) => item.purpose),
    ["any", "any", "maskable", "maskable"],
  );
  assert.equal(manifest.icons[0].src, "/assets/web-app-manifest-192x192.png");
});

test("raszteres csomag HTML-je nem hivatkozik SVG-re", () => {
  const html = createHtmlCode({
    exportOptions: {
      targets: ["website"],
      includeWebManifest: false,
    },
    basePath: "/",
    hasSvg: false,
    themeColor: "#ffffff",
  });
  assert.doesNotMatch(html, /favicon\.svg/);
  assert.match(html, /favicon\.ico/);
});

test("a HTML csak a kiválasztott célok hivatkozásait tartalmazza", () => {
  const manifestOnlyCode = createHtmlCode({
    exportOptions: {
      targets: ["web-app"],
      includeWebManifest: true,
    },
    basePath: "/icons",
    hasSvg: true,
    themeColor: "#123456",
  });

  assert.match(manifestOnlyCode, /site\.webmanifest/);
  assert.match(manifestOnlyCode, /theme-color/);
  assert.doesNotMatch(manifestOnlyCode, /favicon\.ico/);
  assert.doesNotMatch(manifestOnlyCode, /favicon\.svg/);
});

test("a projekt neve biztonságos ZIP slugot ad", () => {
  assert.equal(
    slugifyProjectName("Árvíztűrő Tükörfúrógép"),
    "arvizturo-tukorfurogep",
  );
});
