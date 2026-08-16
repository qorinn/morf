export const locales = ["hu", "en", "de", "es", "fr"] as const;

export type Locale = (typeof locales)[number];

export const localeMetadata: Record<Locale, { htmlLang: string; ogLocale: string }> = {
  hu: { htmlLang: "hu", ogLocale: "hu_HU" },
  en: { htmlLang: "en", ogLocale: "en_US" },
  de: { htmlLang: "de", ogLocale: "de_DE" },
  es: { htmlLang: "es", ogLocale: "es_ES" },
  fr: { htmlLang: "fr", ogLocale: "fr_FR" },
};
