import { commonMessages } from "../i18n/common.ts";
import { getMessages } from "../i18n/types.ts";
import type { Locale } from "./locale.ts";

const browserSupportPhrases = [
  "jelenlegi böngésződben",
  "ebben a böngészőben",
  "webcodecs",
  "friss chrome",
  "chrome-ban vagy edge-ben",
  "chrome-mal vagy edge-dzsel",
  "h.264 mp4-kódolás",
  "type error",
];

export function videoSpeedBrowserSupportError(locale: Locale = "hu") {
  return getMessages(commonMessages, locale).browserSupport.videoSpeedError;
}

export function videoConverterBrowserSupportError(locale: Locale = "hu") {
  return getMessages(commonMessages, locale).browserSupport.videoConverterError;
}

export function isBrowserSupportError(message: string | undefined) {
  if (!message) return false;
  const normalized = message.toLocaleLowerCase("hu-HU");
  return browserSupportPhrases.some((phrase) => normalized.includes(phrase));
}
