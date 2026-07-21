import type { ImageFormat } from "@/features/image-processing/types";

const extensions: Record<ImageFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

export function sanitizeBaseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const normalized = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "kep";
}

export function createOutputFileName(
  fileName: string,
  format: ImageFormat,
): string {
  return `${sanitizeBaseName(fileName)}-morf.${extensions[format]}`;
}

export function createUniqueFileName(
  fileName: string,
  usedNames: Set<string>,
): string {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  const extension = dotIndex === -1 ? "" : fileName.slice(dotIndex);
  let suffix = 2;

  while (usedNames.has(`${baseName}-${suffix}${extension}`)) {
    suffix += 1;
  }

  const uniqueName = `${baseName}-${suffix}${extension}`;
  usedNames.add(uniqueName);
  return uniqueName;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  return `${new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: exponent === 0 ? 0 : 1,
  }).format(value)} ${units[exponent]}`;
}

export function calculateSaving(
  originalSize: number,
  outputSize: number,
): number {
  if (originalSize <= 0) return 0;
  return Math.round(((originalSize - outputSize) / originalSize) * 100);
}
