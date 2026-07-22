import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";

import {
  createZipArchive,
  makeFileNamesUnique,
  sanitizeSaveFileName,
} from "./file-saver.ts";

test("az ismétlődő fájlneveket minden workflow számára egyedivé teszi", () => {
  const blob = new Blob(["morf"]);
  const files = makeFileNamesUnique([
    { blob, fileName: "eredmeny.txt" },
    { blob, fileName: "EREDMENY.TXT" },
    { blob, fileName: "eredmeny.txt" },
  ]);

  assert.deepEqual(
    files.map((file) => file.fileName),
    ["eredmeny.txt", "EREDMENY-2.TXT", "eredmeny-3.txt"],
  );
});

test("platformfüggetlen, útvonal nélküli fájlnevet készít", () => {
  assert.equal(
    sanitizeSaveFileName("../Riport: 2026?.pdf"),
    "-Riport- 2026-.pdf",
  );
  assert.equal(sanitizeSaveFileName("  "), "fajl");
  assert.equal(sanitizeSaveFileName("CON.txt"), "_CON.txt");
});

test("tetszőleges Blob fájlokból újrahasználható ZIP-et készít", async () => {
  const archive = await createZipArchive([
    { blob: new Blob(["első"]), fileName: "adat.txt" },
    { blob: new Blob(["második"]), fileName: "adat.txt" },
  ]);
  const files = unzipSync(new Uint8Array(await archive.arrayBuffer()));

  assert.equal(archive.type, "application/zip");
  assert.deepEqual(Object.keys(files), ["adat.txt", "adat-2.txt"]);
  assert.equal(strFromU8(files["adat.txt"]), "első");
  assert.equal(strFromU8(files["adat-2.txt"]), "második");
});
