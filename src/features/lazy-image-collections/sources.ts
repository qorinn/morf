import type { InputImageFormat } from "../image-processing/types.ts";
import {
  getFrameSetSummary,
  iterateSelectedFrameRecords,
  readFrameFile,
} from "../video-frames/storage.ts";

import type {
  LazyImageCollection,
  LazyImageEntry,
  LazyImageSourceDescriptor,
} from "./types.ts";

const inputFormatsByExtension: Record<string, InputImageFormat> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  avif: "avif",
  heic: "heic",
  heif: "heic",
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
};

function formatFromFileName(fileName: string): InputImageFormat | undefined {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return inputFormatsByExtension[extension];
}

function safeCollectionFileName(path: string): string {
  return path
    .normalize("NFC")
    .replace(/[\\/]+/g, "--")
    .replace(/[<>:\"|?*\u0000-\u001F]/g, "-")
    .slice(0, 180);
}

async function* walkDirectory(
  directory: FileSystemDirectoryHandle,
  prefix = "",
): AsyncGenerator<{
  path: string;
  handle: FileSystemFileHandle;
  format: InputImageFormat;
}> {
  const entries: Array<[string, FileSystemHandle]> = [];
  for await (const entry of directory.entries()) entries.push(entry);
  entries.sort(([left], [right]) => left.localeCompare(right, "hu"));

  for (const [name, handle] of entries) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      yield* walkDirectory(handle as FileSystemDirectoryHandle, path);
      continue;
    }

    const format = formatFromFileName(name);
    if (format) {
      yield { path, handle: handle as FileSystemFileHandle, format };
    }
  }
}

export function canImportLazyDirectory(): boolean {
  if (typeof window === "undefined" || !window.isSecureContext) return false;
  return (
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function"
  );
}

export async function pickLazyImageDirectory(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) {
    throw new Error("A böngésződ nem támogatja a teljes mappák importálását.");
  }
  return picker.call(window);
}

export async function createDirectoryCollection(
  directory: FileSystemDirectoryHandle,
  groupId: string,
): Promise<LazyImageCollection> {
  let itemCount = 0;
  let totalBytes = 0;

  for await (const entry of walkDirectory(directory)) {
    const file = await entry.handle.getFile();
    itemCount += 1;
    totalBytes += file.size;
  }

  if (itemCount === 0) {
    throw new Error(
      "A kiválasztott mappában nincs támogatott JPG, PNG, WebP, AVIF vagy HEIC/HEIF kép.",
    );
  }

  return {
    id: crypto.randomUUID(),
    groupId,
    name: directory.name,
    sourceLabel: "Importált mappa",
    source: { kind: "directory", directory },
    itemCount,
    totalBytes,
    status: "queued",
    progress: 0,
    completedCount: 0,
    outputBytes: 0,
  };
}

export async function createFrameSetCollection(
  frameSetId: string,
  groupId: string,
): Promise<LazyImageCollection> {
  const summary = await getFrameSetSummary(frameSetId);
  if (
    summary.manifest.status !== "ready" &&
    summary.manifest.status !== "paused"
  ) {
    throw new Error("A frame-készlet még nem áll készen az importálásra.");
  }

  return {
    id: crypto.randomUUID(),
    groupId,
    name: summary.manifest.sourceName,
    sourceLabel: "Videó frame-ek",
    source: { kind: "frame-set", frameSetId },
    itemCount: summary.selectedCount,
    totalBytes: summary.selectedBytes,
    status: "queued",
    progress: 0,
    completedCount: 0,
    outputBytes: 0,
  };
}

export async function* iterateLazyImageEntries(
  source: LazyImageSourceDescriptor,
): AsyncGenerator<LazyImageEntry> {
  if (source.kind === "frame-set") {
    const summary = await getFrameSetSummary(source.frameSetId);
    for await (const frame of iterateSelectedFrameRecords(summary.manifest)) {
      yield {
        key: frame.fileName,
        fileName: frame.fileName,
        byteSize: frame.byteSize,
        trustedInputFormat: "png",
        open: () => readFrameFile(source.frameSetId, frame.fileName),
      };
    }
    return;
  }

  for await (const entry of walkDirectory(source.directory)) {
    const file = await entry.handle.getFile();
    yield {
      key: entry.path,
      fileName: safeCollectionFileName(entry.path),
      byteSize: file.size,
      open: () => entry.handle.getFile(),
    };
  }
}

export const lazyImageCollectionInternals = {
  formatFromFileName,
  safeCollectionFileName,
};
