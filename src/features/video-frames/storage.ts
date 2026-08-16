import { shouldSelectFrame } from "./sampling.ts";
import {
  frameSetSchemaVersion,
  type FrameChunkIndexV1,
  type FrameRecordV1,
  type FrameSetManifestV1,
  type FrameSetSummary,
} from "./types.ts";

const rootDirectoryName = "morf-video-framek";
const manifestFileName = "manifest.json";
const chunksDirectoryName = "chunks";
const framesDirectoryName = "frames";
const staleAfterMilliseconds = 24 * 60 * 60 * 1000;

async function getRootDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage?.getDirectory) {
    throw new Error("A böngésződ nem támogatja a szükséges helyi fájltárolót.");
  }

  const opfsRoot = await navigator.storage.getDirectory();
  return opfsRoot.getDirectoryHandle(rootDirectoryName, { create: true });
}

export async function getFrameSetDirectory(
  frameSetId: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  const root = await getRootDirectory();
  return root.getDirectoryHandle(frameSetId, { create });
}

async function writeBlob(
  directory: FileSystemDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<void> {
  const handle = await directory.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function writeJson(
  directory: FileSystemDirectoryHandle,
  fileName: string,
  value: unknown,
): Promise<void> {
  await writeBlob(
    directory,
    fileName,
    new Blob([JSON.stringify(value)], { type: "application/json" }),
  );
}

async function readJson<T>(
  directory: FileSystemDirectoryHandle,
  fileName: string,
): Promise<T> {
  const handle = await directory.getFileHandle(fileName);
  const file = await handle.getFile();
  return JSON.parse(await file.text()) as T;
}

function assertSupportedVersion(
  value: { schemaVersion?: unknown },
  artifactName: string,
): void {
  if (value.schemaVersion !== frameSetSchemaVersion) {
    throw new Error(
      `A helyi ${artifactName} verziója nem támogatott. Készíts új képkészletet.`,
    );
  }
}

export async function writeFrameSetManifest(
  manifest: FrameSetManifestV1,
): Promise<void> {
  const directory = await getFrameSetDirectory(manifest.id, true);
  await writeJson(directory, manifestFileName, manifest);
}

export async function readFrameSetManifest(
  frameSetId: string,
): Promise<FrameSetManifestV1> {
  const manifest = await readJson<FrameSetManifestV1>(
    await getFrameSetDirectory(frameSetId),
    manifestFileName,
  );
  assertSupportedVersion(manifest, "képkészlet");
  return manifest;
}

export async function writeFrameBlob(
  frameSetId: string,
  fileName: string,
  blob: Blob,
): Promise<void> {
  const frameSet = await getFrameSetDirectory(frameSetId, true);
  const frames = await frameSet.getDirectoryHandle(framesDirectoryName, {
    create: true,
  });
  await writeBlob(frames, fileName, blob);
}

export async function readFrameFile(
  frameSetId: string,
  fileName: string,
): Promise<File> {
  const frameSet = await getFrameSetDirectory(frameSetId);
  const frames = await frameSet.getDirectoryHandle(framesDirectoryName);
  const handle = await frames.getFileHandle(fileName);
  return handle.getFile();
}

export async function writeFrameChunk(chunk: FrameChunkIndexV1): Promise<void> {
  const frameSet = await getFrameSetDirectory(chunk.frameSetId, true);
  const chunks = await frameSet.getDirectoryHandle(chunksDirectoryName, {
    create: true,
  });
  await writeJson(
    chunks,
    `${String(chunk.chunkNumber).padStart(8, "0")}.json`,
    chunk,
  );
}

export async function readFrameChunk(
  frameSetId: string,
  chunkNumber: number,
): Promise<FrameChunkIndexV1> {
  const frameSet = await getFrameSetDirectory(frameSetId);
  const chunks = await frameSet.getDirectoryHandle(chunksDirectoryName);
  const chunk = await readJson<FrameChunkIndexV1>(
    chunks,
    `${String(chunkNumber).padStart(8, "0")}.json`,
  );
  assertSupportedVersion(chunk, "checkpoint");
  return chunk;
}

export async function readAllFrameRecords(
  manifest: FrameSetManifestV1,
): Promise<FrameRecordV1[]> {
  const records: FrameRecordV1[] = [];
  for (let chunkNumber = 1; chunkNumber <= manifest.chunkCount; chunkNumber++) {
    const chunk = await readFrameChunk(manifest.id, chunkNumber);
    records.push(...chunk.frames);
  }
  return records;
}

export async function* iterateSelectedFrameRecords(
  manifest: FrameSetManifestV1,
): AsyncGenerator<FrameRecordV1> {
  let previousSelectedTimestamp: number | null = null;

  for (let chunkNumber = 1; chunkNumber <= manifest.chunkCount; chunkNumber++) {
    const chunk = await readFrameChunk(manifest.id, chunkNumber);
    for (const frame of chunk.frames) {
      if (
        shouldSelectFrame(
          frame.timestamp,
          previousSelectedTimestamp,
          manifest.selectionFps,
        )
      ) {
        yield frame;
        previousSelectedTimestamp = frame.timestamp;
      }
    }
  }
}

export async function readSelectedFrameRecords(
  manifest: FrameSetManifestV1,
): Promise<FrameRecordV1[]> {
  const records: FrameRecordV1[] = [];
  for await (const frame of iterateSelectedFrameRecords(manifest)) {
    records.push(frame);
  }
  return records;
}

export async function getFrameSetSummary(
  frameSetId: string,
): Promise<FrameSetSummary> {
  const manifest = await readFrameSetManifest(frameSetId);
  const previewFrames: FrameRecordV1[] = [];
  let selectedCount = 0;
  let selectedBytes = 0;

  for await (const frame of iterateSelectedFrameRecords(manifest)) {
    selectedCount += 1;
    selectedBytes += frame.byteSize;
    if (previewFrames.length < 24) previewFrames.push(frame);
  }

  return {
    manifest,
    selectedCount,
    selectedBytes,
    previewFrames,
  };
}

export async function updateFrameSetSelection(
  frameSetId: string,
  selectionFps: number | null,
): Promise<FrameSetManifestV1> {
  const manifest = await readFrameSetManifest(frameSetId);
  const updated = {
    ...manifest,
    selectionFps,
    updatedAt: new Date().toISOString(),
  };
  await writeFrameSetManifest(updated);
  return updated;
}

export async function removeFrameSet(frameSetId: string): Promise<void> {
  const root = await getRootDirectory();
  await root.removeEntry(frameSetId, { recursive: true });
}

export async function cleanupStaleFrameSets(now = Date.now()): Promise<number> {
  const root = await getRootDirectory();
  let removed = 0;

  for await (const [name, handle] of root.entries()) {
    if (handle.kind !== "directory") continue;
    try {
      const manifest = await readJson<FrameSetManifestV1>(
        handle,
        manifestFileName,
      );
      const updatedAt = new Date(manifest.updatedAt).getTime();
      if (
        Number.isFinite(updatedAt) &&
        now - updatedAt > staleAfterMilliseconds
      ) {
        await root.removeEntry(name, { recursive: true });
        removed += 1;
      }
    } catch {
      await root.removeEntry(name, { recursive: true });
      removed += 1;
    }
  }

  return removed;
}
