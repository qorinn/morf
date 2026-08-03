import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  cleanupStaleFrameSets,
  getFrameSetDirectory,
  getFrameSetSummary,
  readFrameSetManifest,
  writeFrameBlob,
  writeFrameChunk,
  writeFrameSetManifest,
} from "./storage.ts";
import {
  isStorageNearLimit,
  requiredStorageMargin,
  storageSafetyFloor,
} from "./storage-capacity.ts";
import { frameSetSchemaVersion, type FrameSetManifestV1 } from "./types.ts";

class MemoryFileHandle {
  readonly kind = "file";
  private blob = new Blob();

  constructor(readonly name: string) {}

  async createWritable() {
    return {
      write: async (value: Blob) => {
        this.blob = value;
      },
      close: async () => undefined,
    };
  }

  async getFile() {
    return new File([this.blob], this.name, { type: this.blob.type });
  }
}

class MemoryDirectoryHandle {
  readonly kind = "directory";
  readonly children = new Map<
    string,
    MemoryDirectoryHandle | MemoryFileHandle
  >();

  constructor(readonly name: string) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    const existing = this.children.get(name);
    if (existing instanceof MemoryDirectoryHandle) return existing;
    if (existing || !options?.create)
      throw new DOMException("Hiányzik", "NotFoundError");
    const directory = new MemoryDirectoryHandle(name);
    this.children.set(name, directory);
    return directory;
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    const existing = this.children.get(name);
    if (existing instanceof MemoryFileHandle) return existing;
    if (existing || !options?.create)
      throw new DOMException("Hiányzik", "NotFoundError");
    const file = new MemoryFileHandle(name);
    this.children.set(name, file);
    return file;
  }

  async removeEntry(name: string) {
    if (!this.children.delete(name)) {
      throw new DOMException("Hiányzik", "NotFoundError");
    }
  }

  async *entries() {
    yield* this.children.entries();
  }
}

let opfsRoot: MemoryDirectoryHandle;

beforeEach(() => {
  opfsRoot = new MemoryDirectoryHandle("root");
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {
      getDirectory: async () => opfsRoot,
    },
  });
});

function manifest(
  id: string,
  overrides: Partial<FrameSetManifestV1> = {},
): FrameSetManifestV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: frameSetSchemaVersion,
    id,
    sourceName: "teszt.mp4",
    sourceSize: 1_000,
    createdAt: now,
    updatedAt: now,
    status: "ready",
    metadata: {
      fileName: "teszt.mp4",
      fileSize: 1_000,
      duration: 2,
      firstTimestamp: 0,
      width: 320,
      height: 180,
      rotation: 0,
      sourceFps: 5,
      approximateFrameCount: 10,
      codec: "avc1",
    },
    rangeStart: 0,
    rangeEnd: 2,
    extractionFps: null,
    selectionFps: null,
    frameCount: 2,
    totalBytes: 24,
    chunkCount: 1,
    lastTimestamp: 0.2,
    lastSelectedTimestamp: 0.2,
    ...overrides,
  };
}

test("a manifest és a checkpoint verziója visszaolvasható", async () => {
  const value = manifest("verzio");
  await writeFrameSetManifest(value);
  await writeFrameChunk({
    schemaVersion: frameSetSchemaVersion,
    frameSetId: value.id,
    chunkNumber: 1,
    startTimestamp: 0,
    endTimestamp: 0.2,
    frames: [
      {
        index: 1,
        timestamp: 0,
        duration: 0.2,
        fileName: "frame-1.png",
        byteSize: 10,
      },
      {
        index: 2,
        timestamp: 0.2,
        duration: 0.2,
        fileName: "frame-2.png",
        byteSize: 14,
      },
    ],
  });

  const summary = await getFrameSetSummary(value.id);
  assert.equal(summary.manifest.schemaVersion, 1);
  assert.equal(summary.selectedCount, 2);
  assert.equal(summary.selectedBytes, 24);
});

test("a részleges checkpoint helyreállításakor az árva PNG nem duplikál rekordot", async () => {
  const value = manifest("reszleges", {
    frameCount: 1,
    totalBytes: 10,
    lastTimestamp: 0,
    lastSelectedTimestamp: 0,
  });
  await writeFrameSetManifest(value);
  await writeFrameChunk({
    schemaVersion: frameSetSchemaVersion,
    frameSetId: value.id,
    chunkNumber: 1,
    startTimestamp: 0,
    endTimestamp: 0,
    frames: [
      {
        index: 1,
        timestamp: 0,
        duration: 0.2,
        fileName: "frame-1.png",
        byteSize: 10,
      },
    ],
  });
  await writeFrameBlob(
    value.id,
    "frame-2.png",
    new Blob(["árva"], { type: "image/png" }),
  );

  const summary = await getFrameSetSummary(value.id);
  assert.equal(summary.selectedCount, 1);
  assert.equal(summary.previewFrames[0]?.fileName, "frame-1.png");
});

test("a megszakított állapot megmarad a manifestben", async () => {
  await writeFrameSetManifest(
    manifest("megszakitott", { status: "cancelled" }),
  );
  assert.equal(
    (await readFrameSetManifest("megszakitott")).status,
    "cancelled",
  );
});

test("az ismeretlen manifest-verzió érthető hibát ad", async () => {
  const value = manifest("regi");
  await writeFrameSetManifest(value);
  const directory = (await getFrameSetDirectory(
    value.id,
  )) as unknown as MemoryDirectoryHandle;
  const handle = await directory.getFileHandle("manifest.json");
  const writable = await handle.createWritable();
  await writable.write(
    new Blob([JSON.stringify({ ...value, schemaVersion: 999 })]),
  );
  await writable.close();

  await assert.rejects(
    readFrameSetManifest(value.id),
    /verziója nem támogatott/,
  );
});

test("a lejárt és sérült készletek 24 óra után takaríthatók", async () => {
  await writeFrameSetManifest(
    manifest("lejart", {
      updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1_000).toISOString(),
    }),
  );
  await writeFrameSetManifest(manifest("friss"));
  const broken = await getFrameSetDirectory("serult", true);
  await broken.getFileHandle("manifest.json", { create: true });

  assert.equal(await cleanupStaleFrameSets(), 2);
  await assert.rejects(readFrameSetManifest("lejart"));
  assert.equal((await readFrameSetManifest("friss")).id, "friss");
});

test("a kvótavédelem az alap és frame-méretből számolt tartalékot használja", () => {
  assert.equal(requiredStorageMargin(1), storageSafetyFloor);
  assert.equal(requiredStorageMargin(16 * 1024 * 1024), 128 * 1024 * 1024);
  assert.equal(isStorageNearLimit(storageSafetyFloor - 1, 0), true);
  assert.equal(isStorageNearLimit(storageSafetyFloor, 0), false);
  assert.equal(isStorageNearLimit(undefined, 0), false);
});
