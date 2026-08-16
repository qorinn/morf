import assert from "node:assert/strict";
import test from "node:test";

import {
  createDirectoryCollection,
  iterateLazyImageEntries,
  lazyImageCollectionInternals,
} from "./sources.ts";

class MemoryFileHandle {
  readonly kind = "file";
  readonly name: string;
  private readonly file: File;

  constructor(name: string, size: number) {
    this.name = name;
    this.file = new File([new Uint8Array(size)], name);
  }

  async getFile() {
    return this.file;
  }
}

class MemoryDirectoryHandle {
  readonly kind = "directory";
  readonly name: string;
  private readonly children: Array<
    [string, MemoryDirectoryHandle | MemoryFileHandle]
  >;

  constructor(
    name: string,
    children: Array<[string, MemoryDirectoryHandle | MemoryFileHandle]>,
  ) {
    this.name = name;
    this.children = children;
  }

  async *entries() {
    yield* this.children;
  }
}

test("a lusta mappaforrás felismeri a támogatott képformátumokat", () => {
  assert.equal(
    lazyImageCollectionInternals.formatFromFileName("kep.JPEG"),
    "jpeg",
  );
  assert.equal(
    lazyImageCollectionInternals.formatFromFileName("foto.heif"),
    "heic",
  );
  assert.equal(
    lazyImageCollectionInternals.formatFromFileName("video.mp4"),
    undefined,
  );
});

test("a beágyazott mappaútvonal biztonságos, egyedi kimeneti nevet ad", () => {
  assert.equal(
    lazyImageCollectionInternals.safeCollectionFileName(
      "termekek/nyar/borító: nagy.png",
    ),
    "termekek--nyar--borító- nagy.png",
  );
});

test("a mappa és almappái egyetlen lusta képcsoportként járhatók be", async () => {
  const directory = new MemoryDirectoryHandle("Termékfotók", [
    ["borito.png", new MemoryFileHandle("borito.png", 12)],
    ["video.mp4", new MemoryFileHandle("video.mp4", 99)],
    [
      "mobil",
      new MemoryDirectoryHandle("mobil", [
        ["kep.webp", new MemoryFileHandle("kep.webp", 8)],
      ]),
    ],
  ]) as unknown as FileSystemDirectoryHandle;

  const collection = await createDirectoryCollection(directory, "group-1");
  assert.equal(collection.itemCount, 2);
  assert.equal(collection.totalBytes, 20);
  assert.equal(collection.groupId, "group-1");

  const names: string[] = [];
  for await (const entry of iterateLazyImageEntries(collection.source)) {
    names.push(entry.fileName);
  }
  assert.deepEqual(names, ["borito.png", "mobil--kep.webp"]);
});
