import {
  createZipArchive,
  downloadFile,
  type SaveableFile,
} from "@/lib/downloads";
import {
  iterateConvertedFrames,
  readConvertedFrame,
  type FrameBatchConversionManifestV1,
} from "@/features/video-frames/conversion-storage";

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

export function canSaveConvertedFramesToDirectory(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function"
  );
}

export async function saveConvertedFramesToDirectory(
  manifest: FrameBatchConversionManifestV1,
  onProgress: (completed: number) => void,
): Promise<void> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("A mappába mentés nem támogatott.");
  const directory = await picker.call(window);
  let completed = 0;

  for await (const record of iterateConvertedFrames(manifest)) {
    const file = await readConvertedFrame(manifest.frameSetId, record.fileName);
    const handle = await directory.getFileHandle(record.fileName, {
      create: true,
    });
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
    completed += 1;
    onProgress(completed);
  }
}

function zipTargetBytes(): number {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? 48 * 1024 * 1024
    : 192 * 1024 * 1024;
}

export async function downloadConvertedFramesAsZipParts(
  manifest: FrameBatchConversionManifestV1,
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
    const archive = await createZipArchive(files);
    downloadFile({
      blob: archive,
      fileName: `morf-optimalizalt-framek-${String(partNumber).padStart(3, "0")}.zip`,
      mimeType: "application/zip",
      description: "Optimalizált frame-ek",
    });
    files = [];
    currentBytes = 0;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
  };

  for await (const record of iterateConvertedFrames(manifest)) {
    if (files.length > 0 && currentBytes + record.byteSize > targetBytes) {
      await flush();
    }
    const file = await readConvertedFrame(manifest.frameSetId, record.fileName);
    files.push({
      blob: file,
      fileName: record.fileName,
      mimeType: record.mimeType,
      description: "Optimalizált frame",
    });
    currentBytes += record.byteSize;
    completed += 1;
    onProgress(completed);
  }

  await flush();
  return partNumber;
}
