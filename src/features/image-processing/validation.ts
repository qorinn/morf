import type {
  FileJobError,
  ImageFormat,
} from "@/features/image-processing/types";

const megabyte = 1024 * 1024;
const mimeFormats: Record<string, ImageFormat> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};
const formatLimitsInMegabytes: Record<
  ImageFormat,
  { mobile: number; desktop: number; highMemoryDesktop: number }
> = {
  jpeg: { mobile: 60, desktop: 180, highMemoryDesktop: 220 },
  png: { mobile: 35, desktop: 100, highMemoryDesktop: 130 },
  webp: { mobile: 50, desktop: 140, highMemoryDesktop: 180 },
};

export type DeviceProfile = {
  isMobile: boolean;
  deviceMemory?: number;
};

export type FileValidationResult =
  { valid: true; format: ImageFormat } | { valid: false; error: FileJobError };

export function detectImageFormat(bytes: Uint8Array): ImageFormat | undefined {
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
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }

  return undefined;
}

export function getFileSizeLimit(
  profile: DeviceProfile,
  format: ImageFormat = "jpeg",
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
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const format = detectImageFormat(header);

    if (!format) {
      return {
        valid: false,
        error: {
          category: "unsupported-format",
          message: "A fájl tartalma nem támogatott JPG, PNG vagy WebP kép.",
          suggestion: "Válassz JPG, PNG vagy WebP formátumú állóképet.",
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
