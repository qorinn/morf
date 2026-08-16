/** Az Astro-konfigurációban is szereplő, hosszú távon tervezett nyelvek. */
export const locales = ["hu", "en", "de", "es", "fr"] as const;

export type Locale = (typeof locales)[number];

export const localeMetadata: Record<Locale, { htmlLang: string; ogLocale: string }> = {
  hu: { htmlLang: "hu", ogLocale: "hu_HU" },
  en: { htmlLang: "en", ogLocale: "en_US" },
  de: { htmlLang: "de", ogLocale: "de_DE" },
  es: { htmlLang: "es", ogLocale: "es_ES" },
  fr: { htmlLang: "fr", ogLocale: "fr_FR" },
};

export const defaultLocale: Locale = "hu";

/** Csak ezekhez létezik jelenleg teljes, látogatható tartalom. */
export const availableLocales = ["hu", "en"] as const satisfies readonly Locale[];

export type AvailableLocale = (typeof availableLocales)[number];

export function getLocalizedPath(locale: Locale, path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (locale === defaultLocale) {
    return normalizedPath;
  }

  return normalizedPath === "/" ? `/${locale}/` : `/${locale}${normalizedPath}`;
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
