import type { ImageFormat } from "@/features/image-processing/types";

const rootDirectoryName = "morf-lusta-kepcsoportok";
const filesDirectoryName = "files";
const chunksDirectoryName = "chunks";
const manifestFileName = "manifest.json";
const schemaVersion = 1 as const;

export type LazyOutputRecordV1 = {
  index: number;
  sourceKey: string;
  sourceFileName: string;
  fileName: string;
  byteSize: number;
  format: ImageFormat;
  mimeType: string;
};

export type LazyOutputChunkV1 = {
  schemaVersion: typeof schemaVersion;
  chunkNumber: number;
  records: LazyOutputRecordV1[];
};

export type LazyOutputManifestV1 = {
  schemaVersion: typeof schemaVersion;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
  status: "processing" | "ready" | "cancelled" | "error";
  sourceCount: number;
  completedCount: number;
  totalBytes: number;
  chunkCount: number;
  outputFormat: ImageFormat;
  errorMessage?: string;
};

async function getRootDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage?.getDirectory) {
    throw new Error("A böngésződ nem támogatja a szükséges helyi fájltárolót.");
  }
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(rootDirectoryName, { create: true });
}

async function getCollectionDirectory(
  collectionId: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  return (await getRootDirectory()).getDirectoryHandle(collectionId, {
    create,
  });
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
  await writeBlob(directory, fileName, new Blob([JSON.stringify(value)]));
}

async function readJson<T>(
  directory: FileSystemDirectoryHandle,
  fileName: string,
): Promise<T> {
  const file = await (await directory.getFileHandle(fileName)).getFile();
  return JSON.parse(await file.text()) as T;
}

export async function resetLazyOutput(
  collectionId: string,
  sourceCount: number,
  outputFormat: ImageFormat,
): Promise<LazyOutputManifestV1> {
  await removeLazyOutput(collectionId).catch(() => undefined);
  const directory = await getCollectionDirectory(collectionId, true);
  await directory.getDirectoryHandle(filesDirectoryName, { create: true });
  await directory.getDirectoryHandle(chunksDirectoryName, { create: true });
  const now = new Date().toISOString();
  const manifest: LazyOutputManifestV1 = {
    schemaVersion,
    collectionId,
    createdAt: now,
    updatedAt: now,
    status: "processing",
    sourceCount,
    completedCount: 0,
    totalBytes: 0,
    chunkCount: 0,
    outputFormat,
  };
  await writeLazyOutputManifest(manifest);
  return manifest;
}

export async function writeLazyOutputManifest(
  manifest: LazyOutputManifestV1,
): Promise<void> {
  await writeJson(
    await getCollectionDirectory(manifest.collectionId, true),
    manifestFileName,
    manifest,
  );
}

export async function writeLazyOutputFile(
  collectionId: string,
  record: LazyOutputRecordV1,
  blob: Blob,
): Promise<void> {
  const files = await (
    await getCollectionDirectory(collectionId, true)
  ).getDirectoryHandle(filesDirectoryName, { create: true });
  await writeBlob(files, record.fileName, blob);
}

export async function readLazyOutputFile(
  collectionId: string,
  fileName: string,
): Promise<File> {
  const files = await (
    await getCollectionDirectory(collectionId)
  ).getDirectoryHandle(filesDirectoryName);
  return (await files.getFileHandle(fileName)).getFile();
}

export async function writeLazyOutputChunk(
  collectionId: string,
  chunkNumber: number,
  records: LazyOutputRecordV1[],
): Promise<void> {
  const chunks = await (
    await getCollectionDirectory(collectionId, true)
  ).getDirectoryHandle(chunksDirectoryName, { create: true });
  await writeJson(chunks, `${String(chunkNumber).padStart(8, "0")}.json`, {
    schemaVersion,
    chunkNumber,
    records,
  } satisfies LazyOutputChunkV1);
}

export async function* iterateLazyOutputRecords(
  manifest: LazyOutputManifestV1,
): AsyncGenerator<LazyOutputRecordV1> {
  const chunks = await (
    await getCollectionDirectory(manifest.collectionId)
  ).getDirectoryHandle(chunksDirectoryName);
  for (let chunkNumber = 1; chunkNumber <= manifest.chunkCount; chunkNumber++) {
    const chunk = await readJson<LazyOutputChunkV1>(
      chunks,
      `${String(chunkNumber).padStart(8, "0")}.json`,
    );
    if (chunk.schemaVersion !== schemaVersion) {
      throw new Error("A képcsoport kimeneti verziója nem támogatott.");
    }
    yield* chunk.records;
  }
}

export async function removeLazyOutput(collectionId: string): Promise<void> {
  const root = await getRootDirectory();
  await root.removeEntry(collectionId, { recursive: true });
}
