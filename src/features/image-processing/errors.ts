import type {
  FileJobError,
  FileJobErrorCategory,
} from "@/features/image-processing/types";

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

const messages: Record<
  FileJobErrorCategory,
  Pick<FileJobError, "message" | "suggestion">
> = {
  "unsupported-format": {
    message: "Ez a képformátum nem támogatott.",
    suggestion: "Válassz JPG, PNG, WebP, AVIF vagy HEIC állóképet.",
  },
  "file-too-large": {
    message: "A kép túl nagy az eszköz biztonságos memóriakeretéhez.",
    suggestion: "Próbálj kisebb fájlt vagy kisebb felbontást.",
  },
  "decode-failed": {
    message: "A képet nem sikerült beolvasni.",
    suggestion: "Ellenőrizd, hogy a fájl nem sérült-e, majd próbáld újra.",
  },
  "encode-failed": {
    message: "A kimeneti képet nem sikerült elkészíteni.",
    suggestion:
      "Próbálj másik formátumot, kisebb felbontást vagy alacsonyabb minőséget.",
  },
  "out-of-memory": {
    message: "Az eszköz memóriája elfogyott feldolgozás közben.",
    suggestion: "Egyszerre kevesebb vagy kisebb felbontású képet dolgozz fel.",
  },
  "engine-load-failed": {
    message: "A feldolgozó motort nem sikerült előkészíteni.",
    suggestion:
      "Ellenőrizd a kapcsolatot, majd próbáld újra. A motor később cache-ből is elérhető lehet.",
  },
  "invalid-settings": {
    message: "A feldolgozási beállítások nem érvényesek.",
    suggestion:
      "Adj meg pozitív képméretet, érvényes maximum fájlméretet és 1–100 közötti minőséget.",
  },
  cancelled: {
    message: "A feldolgozás megszakítva.",
    suggestion: "Az Újrapróbálás gombbal ismét elindíthatod.",
  },
  "browser-unsupported": {
    message: "Ez a böngésző nem támogatja a szükséges helyi feldolgozást.",
    suggestion: "Próbáld a Chrome, Firefox vagy Safari legfrissebb verzióját.",
  },
  "target-size-unreachable": {
    message: "A célméret elfogadható minőség mellett nem érhető el.",
    suggestion: "Válassz kisebb felbontást vagy másik formátumot.",
  },
};

export function createProcessingError(error: unknown): FileJobError {
  const detail = error instanceof Error ? error.message : String(error);
  const category = inferCategory(detail);
  return { category, ...messages[category], detail };
}
