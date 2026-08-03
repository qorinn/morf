import { getFrameSetDirectory } from "@/features/video-frames/storage";
import type { ImageFormat } from "@/features/image-processing/types";

const conversionDirectoryName = "optimized";
const filesDirectoryName = "files";
const chunksDirectoryName = "chunks";
const manifestFileName = "manifest.json";
const conversionSchemaVersion = 1 as const;

export type ConvertedFrameRecordV1 = {
  index: number;
  sourceFileName: string;
  fileName: string;
  byteSize: number;
  format: ImageFormat;
  mimeType: string;
};

export type ConvertedFrameChunkV1 = {
  schemaVersion: typeof conversionSchemaVersion;
  chunkNumber: number;
  records: ConvertedFrameRecordV1[];
};

export type FrameBatchConversionManifestV1 = {
  schemaVersion: typeof conversionSchemaVersion;
  frameSetId: string;
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

async function getConversionDirectory(
  frameSetId: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  const frameSet = await getFrameSetDirectory(frameSetId);
  return frameSet.getDirectoryHandle(conversionDirectoryName, { create });
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
  return JSON.parse(await (await handle.getFile()).text()) as T;
}

export async function resetFrameBatchConversion(
  frameSetId: string,
  sourceCount: number,
  outputFormat: ImageFormat,
): Promise<FrameBatchConversionManifestV1> {
  const frameSet = await getFrameSetDirectory(frameSetId);
  try {
    await frameSet.removeEntry(conversionDirectoryName, { recursive: true });
  } catch {
    // Nincs korábbi kimenet.
  }
  const directory = await getConversionDirectory(frameSetId, true);
  await directory.getDirectoryHandle(filesDirectoryName, { create: true });
  await directory.getDirectoryHandle(chunksDirectoryName, { create: true });
  const now = new Date().toISOString();
  const manifest: FrameBatchConversionManifestV1 = {
    schemaVersion: conversionSchemaVersion,
    frameSetId,
    createdAt: now,
    updatedAt: now,
    status: "processing",
    sourceCount,
    completedCount: 0,
    totalBytes: 0,
    chunkCount: 0,
    outputFormat,
  };
  await writeFrameBatchConversionManifest(manifest);
  return manifest;
}

export async function writeFrameBatchConversionManifest(
  manifest: FrameBatchConversionManifestV1,
): Promise<void> {
  await writeJson(
    await getConversionDirectory(manifest.frameSetId, true),
    manifestFileName,
    manifest,
  );
}

export async function readFrameBatchConversionManifest(
  frameSetId: string,
): Promise<FrameBatchConversionManifestV1> {
  return readJson(await getConversionDirectory(frameSetId), manifestFileName);
}

export async function writeConvertedFrame(
  frameSetId: string,
  record: ConvertedFrameRecordV1,
  blob: Blob,
): Promise<void> {
  const directory = await getConversionDirectory(frameSetId, true);
  const files = await directory.getDirectoryHandle(filesDirectoryName, {
    create: true,
  });
  await writeBlob(files, record.fileName, blob);
}

export async function readConvertedFrame(
  frameSetId: string,
  fileName: string,
): Promise<File> {
  const directory = await getConversionDirectory(frameSetId);
  const files = await directory.getDirectoryHandle(filesDirectoryName);
  return (await files.getFileHandle(fileName)).getFile();
}

export async function writeConvertedFrameChunk(
  frameSetId: string,
  chunkNumber: number,
  records: ConvertedFrameRecordV1[],
): Promise<void> {
  const directory = await getConversionDirectory(frameSetId, true);
  const chunks = await directory.getDirectoryHandle(chunksDirectoryName, {
    create: true,
  });
  await writeJson(chunks, `${String(chunkNumber).padStart(8, "0")}.json`, {
    schemaVersion: conversionSchemaVersion,
    chunkNumber,
    records,
  } satisfies ConvertedFrameChunkV1);
}

export async function* iterateConvertedFrames(
  manifest: FrameBatchConversionManifestV1,
): AsyncGenerator<ConvertedFrameRecordV1> {
  const directory = await getConversionDirectory(manifest.frameSetId);
  const chunks = await directory.getDirectoryHandle(chunksDirectoryName);
  for (let chunkNumber = 1; chunkNumber <= manifest.chunkCount; chunkNumber++) {
    const chunk = await readJson<ConvertedFrameChunkV1>(
      chunks,
      `${String(chunkNumber).padStart(8, "0")}.json`,
    );
    yield* chunk.records;
  }
}
