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

export function videoSpeedBrowserSupportError() {
  return "Sajnálom. A videó sebességgörbe nem támogatott a jelenlegi böngésződben. Próbáld meg egy friss Chromium-alapú böngészőben, például Chrome-ban vagy Edge-ben.";
}

export function videoConverterBrowserSupportError() {
  return "Sajnálom. A videó konvertáló nem támogatott a jelenlegi böngésződben. Próbáld meg egy friss Chromium-alapú böngészőben, például Chrome-ban vagy Edge-ben.";
}

export function isBrowserSupportError(message: string | undefined) {
  if (!message) return false;
  const normalized = message.toLocaleLowerCase("hu-HU");
  return browserSupportPhrases.some((phrase) => normalized.includes(phrase));
}
