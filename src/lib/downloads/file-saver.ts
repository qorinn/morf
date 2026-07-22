type WritableFileStream = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type WritableFileHandle = {
  createWritable: () => Promise<WritableFileStream>;
};

type WritableDirectoryHandle = {
  getFileHandle: (
    name: string,
    options: { create: true },
  ) => Promise<WritableFileHandle>;
};

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

type FileSystemAccessWindow = Window & {
  showSaveFilePicker?: (
    options?: SaveFilePickerOptions,
  ) => Promise<WritableFileHandle>;
  showDirectoryPicker?: () => Promise<WritableDirectoryHandle>;
};

export type SaveCapabilities = {
  file: boolean;
  directory: boolean;
};

export type SaveableFile = {
  blob: Blob;
  fileName: string;
  mimeType?: string;
  description?: string;
};

const downloadUrlLifetime = 30_000;

function getFileSystemAccessWindow(): FileSystemAccessWindow | undefined {
  if (typeof window === "undefined") return undefined;
  return window as FileSystemAccessWindow;
}

export function getSaveCapabilities(): SaveCapabilities {
  const browserWindow = getFileSystemAccessWindow();
  if (!browserWindow || !browserWindow.isSecureContext) {
    return { file: false, directory: false };
  }

  return {
    file: typeof browserWindow.showSaveFilePicker === "function",
    directory: typeof browserWindow.showDirectoryPicker === "function",
  };
}

export function isFilePickerCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function sanitizeSaveFileName(fileName: string): string {
  const sanitized = fileName
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, 200);

  if (!sanitized) return "fajl";

  const baseName = sanitized.split(".", 1)[0];
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(baseName)) {
    return `_${sanitized}`;
  }

  return sanitized;
}

function createUniqueFileName(fileName: string, usedNames: Set<string>) {
  const safeFileName = sanitizeSaveFileName(fileName);
  const nameKey = safeFileName.toLowerCase();

  if (!usedNames.has(nameKey)) {
    usedNames.add(nameKey);
    return safeFileName;
  }

  const dotIndex = safeFileName.lastIndexOf(".");
  const baseName =
    dotIndex === -1 ? safeFileName : safeFileName.slice(0, dotIndex);
  const extension = dotIndex === -1 ? "" : safeFileName.slice(dotIndex);
  let suffix = 2;

  while (usedNames.has(`${baseName}-${suffix}${extension}`.toLowerCase())) {
    suffix += 1;
  }

  const uniqueName = `${baseName}-${suffix}${extension}`;
  usedNames.add(uniqueName.toLowerCase());
  return uniqueName;
}

/** Másolás közben is biztonságosan használható, nem módosítja a bemenetet. */
export function makeFileNamesUnique(files: SaveableFile[]): SaveableFile[] {
  const usedNames = new Set<string>();
  return files.map((file) => ({
    ...file,
    fileName: createUniqueFileName(file.fileName, usedNames),
  }));
}

function triggerBrowserDownload(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

/** Egy Blob letöltése a böngésző alapértelmezett letöltési helyére. */
export function downloadFile(file: SaveableFile): void {
  const url = URL.createObjectURL(file.blob);
  triggerBrowserDownload(url, sanitizeSaveFileName(file.fileName));
  window.setTimeout(() => URL.revokeObjectURL(url), downloadUrlLifetime);
}

/** Több Blob külön fájlként történő letöltése, névütközés-kezeléssel. */
export function downloadFiles(files: SaveableFile[]): void {
  makeFileNamesUnique(files).forEach(downloadFile);
}

function getMimeType(file: SaveableFile): string {
  return (file.mimeType || file.blob.type || "application/octet-stream").split(
    ";",
    1,
  )[0];
}

async function pickFileSaveDestination(
  fileName: string,
  mimeType: string,
  description = "Fájl",
): Promise<WritableFileHandle> {
  const picker = getFileSystemAccessWindow()?.showSaveFilePicker;
  if (!picker) throw new Error("A fájlhely kiválasztása nem támogatott.");

  const extensionIndex = fileName.lastIndexOf(".");
  const extension = extensionIndex === -1 ? "" : fileName.slice(extensionIndex);
  const options: SaveFilePickerOptions = { suggestedName: fileName };

  if (/^\.[a-z0-9]{1,15}$/i.test(extension) && mimeType.includes("/")) {
    options.types = [
      {
        description,
        accept: { [mimeType]: [extension] },
      },
    ];
  }

  return picker.call(window, options);
}

async function writeBlobToFile(
  handle: WritableFileHandle,
  blob: Blob,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** Egy fájl mentése a natív fájlválasztóval. */
export async function saveFileAs(file: SaveableFile): Promise<void> {
  // A választót közvetlenül a felhasználói kattintásból kell megnyitni.
  const handle = await pickFileSaveDestination(
    sanitizeSaveFileName(file.fileName),
    getMimeType(file),
    file.description,
  );
  await writeBlobToFile(handle, file.blob);
}

/** Több fájl mentése egy, a felhasználó által kiválasztott mappába. */
export async function saveFilesToChosenDirectory(
  files: SaveableFile[],
): Promise<void> {
  const picker = getFileSystemAccessWindow()?.showDirectoryPicker;
  if (!picker) throw new Error("A mappaválasztás nem támogatott.");

  // A választót közvetlenül a felhasználói kattintásból kell megnyitni.
  const directory = await picker.call(window);

  for (const file of makeFileNamesUnique(files)) {
    const handle = await directory.getFileHandle(file.fileName, {
      create: true,
    });
    await writeBlobToFile(handle, file.blob);
  }
}

/** Tetszőleges Blob fájlokból ZIP-et készít, névütközés-kezeléssel. */
export async function createZipArchive(files: SaveableFile[]): Promise<Blob> {
  const { zipSync } = await import("fflate");
  const zipFiles: Record<string, Uint8Array> = {};

  for (const file of makeFileNamesUnique(files)) {
    zipFiles[file.fileName] = new Uint8Array(await file.blob.arrayBuffer());
  }

  return new Blob([zipSync(zipFiles, { level: 0 })], {
    type: "application/zip",
  });
}

/** Több fájl ZIP-be csomagolása és mentése a natív fájlválasztóval. */
export async function saveFilesAsZip(
  files: SaveableFile[],
  archiveName: string,
): Promise<void> {
  // A választó az aszinkron ZIP-készítés előtt nyílik meg, hogy megmaradjon
  // a kattintáshoz tartozó böngészőengedély.
  const handle = await pickFileSaveDestination(
    sanitizeSaveFileName(archiveName),
    "application/zip",
    "ZIP-archívum",
  );
  const archive = await createZipArchive(files);
  await writeBlobToFile(handle, archive);
}
