import {
  createZipArchive,
  downloadFile,
  type SaveableFile,
} from "@/lib/downloads";
import {
  iterateSelectedFrameRecords,
  readFrameFile,
} from "@/features/video-frames/storage";
import type {
  FrameSetManifestV1,
  VideoFramesTextCopy,
} from "@/features/video-frames/types";
import { getVideoFramesMessages } from "@/i18n/video-frames";

const defaultCopy = getVideoFramesMessages("hu").workerErrors;

type WritableFileStream = {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
};

type WritableFileHandle = {
  createWritable(): Promise<WritableFileStream>;
};

type WritableDirectoryHandle = {
  getFileHandle(
    name: string,
    options: { create: true },
  ): Promise<WritableFileHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<WritableDirectoryHandle>;
};

export type FrameSaveProgress = {
  completed: number;
  total: number;
};

export function canSaveFrameSetToDirectory(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function"
  );
}

export async function saveFrameSetToDirectory(
  manifest: FrameSetManifestV1,
  selectedCount: number,
  onProgress: (progress: FrameSaveProgress) => void,
  copy: VideoFramesTextCopy = defaultCopy,
): Promise<void> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error(copy.directorySaveUnsupported);
  const directory = await picker.call(window);
  let completed = 0;

  for await (const frame of iterateSelectedFrameRecords(manifest, copy)) {
    const source = await readFrameFile(manifest.id, frame.fileName, copy);
    const handle = await directory.getFileHandle(frame.fileName, {
      create: true,
    });
    const writable = await handle.createWritable();
    await writable.write(source);
    await writable.close();
    completed += 1;
    onProgress({ completed, total: selectedCount });
  }
}

export async function downloadFrameSetFiles(
  manifest: FrameSetManifestV1,
  selectedCount: number,
  onProgress: (progress: FrameSaveProgress) => void,
  copy: VideoFramesTextCopy = defaultCopy,
): Promise<void> {
  let completed = 0;

  for await (const frame of iterateSelectedFrameRecords(manifest, copy)) {
    const file = await readFrameFile(manifest.id, frame.fileName, copy);
    downloadFile({
      blob: file,
      fileName: frame.fileName,
      mimeType: "image/png",
      description: copy.pngImageDescription,
    });
    completed += 1;
    onProgress({ completed, total: selectedCount });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
  }
}

function zipPartTargetBytes(): number {
  if (typeof navigator === "undefined") return 128 * 1024 * 1024;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? 48 * 1024 * 1024
    : 192 * 1024 * 1024;
}

function archiveBaseName(sourceName: string): string {
  return (
    sourceName
      .replace(/\.[^.]+$/, "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/^[. ]+|[. ]+$/g, "")
      .slice(0, 100) || "video"
  );
}

export async function downloadFrameSetAsZipParts(
  manifest: FrameSetManifestV1,
  selectedCount: number,
  onProgress: (progress: FrameSaveProgress) => void,
  copy: VideoFramesTextCopy = defaultCopy,
): Promise<number> {
  const targetBytes = zipPartTargetBytes();
  const baseName = archiveBaseName(manifest.sourceName);
  let files: SaveableFile[] = [];
  let partBytes = 0;
  let partNumber = 0;
  let completed = 0;

  const flushPart = async () => {
    if (files.length === 0) return;
    partNumber += 1;
    const archive = await createZipArchive(files);
    downloadFile({
      blob: archive,
      fileName: `${baseName}-frames-${String(partNumber).padStart(3, "0")}.zip`,
      mimeType: "application/zip",
      description: copy.pngImagesDescription,
    });
    files = [];
    partBytes = 0;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
  };

  for await (const frame of iterateSelectedFrameRecords(manifest, copy)) {
    if (files.length > 0 && partBytes + frame.byteSize > targetBytes) {
      await flushPart();
    }
    const file = await readFrameFile(manifest.id, frame.fileName, copy);
    files.push({
      blob: file,
      fileName: frame.fileName,
      mimeType: "image/png",
      description: copy.pngImageDescription,
    });
    partBytes += frame.byteSize;
    completed += 1;
    onProgress({ completed, total: selectedCount });
  }

  await flushPart();
  return partNumber;
}
