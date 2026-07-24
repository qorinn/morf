import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateSaving,
  createOutputFileName,
  createOutputFileNameFromBase,
  createUniqueFileName,
  sanitizeBaseName,
  sanitizeOutputBaseName,
} from "./image-filenames.ts";

test("biztonságos, determinisztikus fájlnevet készít", () => {
  assert.equal(
    sanitizeBaseName("Árvíztűrő tükörfúrógép.JPG"),
    "arvizturo-tukorfurogep",
  );
  assert.equal(
    createOutputFileName("Nyári fotó.png", "webp"),
    "nyari-foto-morf.webp",
  );
});

test("a megadott kimeneti nevet és a helyes kiterjesztést használja", () => {
  assert.equal(
    createOutputFileNameFromBase("Nyári kampány – hero", "webp"),
    "Nyári kampány – hero.webp",
  );
  assert.equal(sanitizeOutputBaseName("../Tiltott:név*?  "), "-Tiltott-név--");
  assert.equal(createOutputFileNameFromBase("   ", "jpeg"), "kep-morf.jpg");
  assert.equal(
    createOutputFileNameFromBase("modern-kep", "avif"),
    "modern-kep.avif",
  );
});

test("ütközésnél számozott fájlnevet ad", () => {
  const used = new Set<string>();
  assert.equal(createUniqueFileName("kep-morf.webp", used), "kep-morf.webp");
  assert.equal(createUniqueFileName("kep-morf.webp", used), "kep-morf-2.webp");
  assert.equal(createUniqueFileName("kep-morf.webp", used), "kep-morf-3.webp");
});

test("kiszámítja a megtakarítást", () => {
  assert.equal(calculateSaving(1000, 250), 75);
  assert.equal(calculateSaving(0, 0), 0);
});
