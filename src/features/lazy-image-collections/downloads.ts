import {
  downloadFile,
  downloadFilesAsZip,
  type SaveableFile,
} from "@/lib/downloads";

import {
  iterateLazyOutputRecords,
  readLazyOutputFile,
  type LazyOutputManifestV1,
} from "./output-storage.ts";

type WritableDirectoryHandle = {
  getFileHandle(
    name: string,
    options: { create: true },
  ): Promise<FileSystemFileHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<WritableDirectoryHandle>;
};

function zipTargetBytes(): number {
  if (typeof navigator === "undefined") return 96 * 1024 * 1024;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? 48 * 1024 * 1024
    : 192 * 1024 * 1024;
}

export function canSaveLazyOutputToDirectory(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function"
  );
}

export async function* iterateLazyOutputFiles(
  manifest: LazyOutputManifestV1,
): AsyncGenerator<SaveableFile> {
  for await (const record of iterateLazyOutputRecords(manifest)) {
    const file = await readLazyOutputFile(
      manifest.collectionId,
      record.fileName,
    );
    yield {
      blob: file,
      fileName: record.fileName,
      mimeType: record.mimeType,
      description: "Optimalizált kép",
    };
  }
}

export async function downloadLazyOutputFiles(
  manifest: LazyOutputManifestV1,
  onProgress: (completed: number) => void,
): Promise<void> {
  let completed = 0;
  for await (const file of iterateLazyOutputFiles(manifest)) {
    downloadFile(file);
    completed += 1;
    onProgress(completed);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
  }
}

export async function saveLazyOutputToDirectory(
  manifest: LazyOutputManifestV1,
  onProgress: (completed: number) => void,
): Promise<void> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("A mappába mentés nem támogatott.");
  const directory = await picker.call(window);
  let completed = 0;

  for await (const record of iterateLazyOutputRecords(manifest)) {
    const source = await readLazyOutputFile(
      manifest.collectionId,
      record.fileName,
    );
    const handle = await directory.getFileHandle(record.fileName, {
      create: true,
    });
    const writable = await handle.createWritable();
    await writable.write(source);
    await writable.close();
    completed += 1;
    onProgress(completed);
  }
}

export async function downloadLazyOutputAsZipParts(
  manifest: LazyOutputManifestV1,
  archiveBaseName: string,
  onProgress: (completed: number) => void,
): Promise<number> {
  const targetBytes = zipTargetBytes();
  let files: SaveableFile[] = [];
  let currentBytes = 0;
  let completed = 0;
  let partNumber = 0;

  const flush = async () => {
    if (files.length === 0) return;
    partNumber += 1;
    await downloadFilesAsZip(
      files,
      `${archiveBaseName}-${String(partNumber).padStart(3, "0")}.zip`,
    );
    files = [];
    currentBytes = 0;
  };

  for await (const record of iterateLazyOutputRecords(manifest)) {
    if (files.length > 0 && currentBytes + record.byteSize > targetBytes) {
      await flush();
    }
    const file = await readLazyOutputFile(
      manifest.collectionId,
      record.fileName,
    );
    files.push({
      blob: file,
      fileName: record.fileName,
      mimeType: record.mimeType,
      description: "Optimalizált kép",
    });
    currentBytes += record.byteSize;
    completed += 1;
    onProgress(completed);
  }

  await flush();
  return partNumber;
}
