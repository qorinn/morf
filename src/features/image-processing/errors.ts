import type {
  FileJobError,
  FileJobErrorCategory,
} from "@/features/image-processing/types";
import { getImageConverterMessages } from "../../i18n/image-converter.ts";
import type { Locale } from "../../lib/locale.ts";

function inferCategory(message: string): FileJobErrorCategory {
  const normalized = message.toLowerCase();

  if (normalized.includes("memory") || normalized.includes("allocation"))
    return "out-of-memory";
  if (normalized.includes("target_size_unreachable"))
    return "target-size-unreachable";
  if (
    normalized.includes("decode") ||
    normalized.includes("heic") ||
    normalized.includes("heif")
  )
    return "decode-failed";
  if (normalized.includes("encode")) return "encode-failed";
  if (normalized.includes("wasm") || normalized.includes("fetch"))
    return "engine-load-failed";
  return "encode-failed";
}

export function createProcessingError(
  error: unknown,
  locale: Locale = "hu",
): FileJobError {
  const detail = error instanceof Error ? error.message : String(error);
  const category = inferCategory(detail);
  const messages: Record<
    FileJobErrorCategory,
    Pick<FileJobError, "message" | "suggestion">
  > = getImageConverterMessages(locale).processingErrors;
  return { category, ...messages[category], detail };
}
