import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateSaving,
  createOutputFileName,
  createUniqueFileName,
  sanitizeBaseName,
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
