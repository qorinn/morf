import type {
  FileJobError,
  InputImageFormat,
} from "@/features/image-processing/types";

const megabyte = 1024 * 1024;
const mimeFormats: Record<string, InputImageFormat> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heic",
  "image/heic-sequence": "heic",
  "image/heif-sequence": "heic",
};
const formatLimitsInMegabytes: Record<
  InputImageFormat,
  { mobile: number; desktop: number; highMemoryDesktop: number }
> = {
  jpeg: { mobile: 60, desktop: 180, highMemoryDesktop: 220 },
  png: { mobile: 35, desktop: 100, highMemoryDesktop: 130 },
  webp: { mobile: 50, desktop: 140, highMemoryDesktop: 180 },
  avif: { mobile: 35, desktop: 100, highMemoryDesktop: 130 },
  heic: { mobile: 30, desktop: 90, highMemoryDesktop: 120 },
};

export type DeviceProfile = {
  isMobile: boolean;
  deviceMemory?: number;
};

export type FileValidationResult =
  | { valid: true; format: InputImageFormat }
  | { valid: false; error: FileJobError };

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function detectIsoBaseMediaFormat(
  bytes: Uint8Array,
): Extract<InputImageFormat, "avif" | "heic"> | undefined {
  if (bytes.length < 12 || readAscii(bytes, 4, 4) !== "ftyp") {
    return undefined;
  }

  const declaredBoxSize = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(0);
  const boxEnd = Math.min(
    bytes.length,
    declaredBoxSize >= 16 ? declaredBoxSize : bytes.length,
  );
  const brands = [readAscii(bytes, 8, 4)];

  for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
    brands.push(readAscii(bytes, offset, 4));
  }

  if (brands.some((brand) => brand === "avif" || brand === "avis")) {
    return "avif";
  }

  if (
    brands.some((brand) =>
      ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand),
    )
  ) {
    return "heic";
  }

  return undefined;
}

export function detectImageFormat(
  bytes: Uint8Array,
): InputImageFormat | undefined {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (
    bytes.length >= 12 &&
    readAscii(bytes, 0, 4) === "RIFF" &&
    readAscii(bytes, 8, 4) === "WEBP"
  ) {
    return "webp";
  }

  return detectIsoBaseMediaFormat(bytes);
}

export function getFileSizeLimit(
  profile: DeviceProfile,
  format: InputImageFormat = "jpeg",
): number {
  const formatLimits = formatLimitsInMegabytes[format];
  const baseline =
    (profile.isMobile ? formatLimits.mobile : formatLimits.desktop) * megabyte;

  if (profile.deviceMemory !== undefined && profile.deviceMemory <= 2) {
    return Math.min(baseline, 30 * megabyte);
  }

  if (
    profile.deviceMemory !== undefined &&
    profile.deviceMemory >= 8 &&
    !profile.isMobile
  ) {
    return formatLimits.highMemoryDesktop * megabyte;
  }

  return baseline;
}

export function getCurrentDeviceProfile(): DeviceProfile {
  if (typeof navigator === "undefined") return { isMobile: false };

  const navigatorWithMemory = navigator as Navigator & {
    deviceMemory?: number;
  };
  return {
    isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    deviceMemory: navigatorWithMemory.deviceMemory,
  };
}

export async function validateImageFile(
  file: File,
  profile = getCurrentDeviceProfile(),
): Promise<FileValidationResult> {
  try {
    const header = new Uint8Array(await file.slice(0, 128).arrayBuffer());
    const format = detectImageFormat(header);

    if (!format) {
      return {
        valid: false,
        error: {
          category: "unsupported-format",
          message:
            "A fájl tartalma nem támogatott JPG, PNG, WebP, AVIF vagy HEIC kép.",
          suggestion:
            "Válassz JPG, PNG, WebP, AVIF vagy HEIC/HEIF formátumú állóképet.",
        },
      };
    }

    const mimeFormat = mimeFormats[file.type.toLowerCase()];
    if (mimeFormat && mimeFormat !== format) {
      return {
        valid: false,
        error: {
          category: "unsupported-format",
          message: "A fájl MIME-típusa és tényleges képformátuma nem egyezik.",
          suggestion:
            "Exportáld újra a képet a helyes formátumban, majd próbáld újra.",
        },
      };
    }

    const sizeLimit = getFileSizeLimit(profile, format);
    if (file.size > sizeLimit) {
      return {
        valid: false,
        error: {
          category: "file-too-large",
          message: "Ez a fájl túl nagy a biztonságos helyi feldolgozáshoz.",
          suggestion: `Próbálj ${Math.round(sizeLimit / megabyte)} MB alatti ${format.toUpperCase()} fájlt vagy kisebb felbontást.`,
        },
      };
    }

    return { valid: true, format };
  } catch (error) {
    return {
      valid: false,
      error: {
        category: "decode-failed",
        message: "A fájl fejléce nem olvasható.",
        suggestion: "Próbáld újra az eredeti, sértetlen fájllal.",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
