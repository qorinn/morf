import { defineHungarianMessages } from "./types";

/** Stabil hibakódok worker és UI közötti kommunikációhoz. */
export type ErrorCode =
  | "UNSUPPORTED_BROWSER"
  | "UNSUPPORTED_FILE"
  | "VIDEO_TRACK_NOT_DECODABLE"
  | "VIDEO_ENCODER_NOT_AVAILABLE"
  | "AUDIO_ENCODER_NOT_AVAILABLE"
  | "OUTPUT_NOT_CREATED"
  | "LOCAL_STORAGE_NOT_SUPPORTED"
  | "FILE_PICKER_NOT_SUPPORTED"
  | "EXPORT_CANCELLED"
  | "UNKNOWN_ERROR";

export const errorMessages = defineHungarianMessages({
  UNSUPPORTED_BROWSER: {
    title: "Ez az eszköz nem támogatott a jelenlegi böngésződben.",
    suggestion: "Próbáld meg egy friss Chromium-alapú böngészőben, például Chrome-ban vagy Edge-ben.",
  },
  UNSUPPORTED_FILE: {
    title: "Ez a fájltípus nem támogatott.",
    suggestion: "Válassz másik fájlt, vagy konvertáld át támogatott formátumba.",
  },
  VIDEO_TRACK_NOT_DECODABLE: {
    title: "A videósáv ebben a böngészőben nem dekódolható.",
    suggestion: "Próbáld meg MP4, MOV vagy WebM fájllal egy friss Chromium-alapú böngészőben.",
  },
  VIDEO_ENCODER_NOT_AVAILABLE: {
    title: "A szükséges videókódoló nem érhető el.",
    suggestion: "Próbáld meg egy friss Chromium-alapú böngészőben.",
  },
  AUDIO_ENCODER_NOT_AVAILABLE: {
    title: "A szükséges hangkódoló nem érhető el.",
    suggestion: "Próbáld meg hang nélküli videóval vagy egy másik böngészőben.",
  },
  OUTPUT_NOT_CREATED: {
    title: "A kimeneti fájl nem készült el.",
    suggestion: "Próbáld meg újra, vagy válassz egy rövidebb fájlt.",
  },
  LOCAL_STORAGE_NOT_SUPPORTED: {
    title: "A szükséges helyi tárolás nem támogatott.",
    suggestion: "Próbáld meg egy friss böngészőben, normál böngészési módban.",
  },
  FILE_PICKER_NOT_SUPPORTED: {
    title: "A fájlmentési párbeszédablak nem támogatott.",
    suggestion: "Használd a böngésző alapértelmezett letöltését.",
  },
  EXPORT_CANCELLED: {
    title: "Az export megszakítva.",
    suggestion: "A fájlod nem került feltöltésre vagy törlésre.",
  },
  UNKNOWN_ERROR: {
    title: "Váratlan hiba történt.",
    suggestion: "Próbáld meg újra. Ha a hiba megmarad, válassz másik fájlt vagy böngészőt.",
  },
} satisfies Record<ErrorCode, { title: string; suggestion: string }>);

export type ErrorMessages = (typeof errorMessages)["hu"];
