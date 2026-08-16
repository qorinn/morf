import { availableLocales, defaultLocale, type Locale } from "./locale.ts";

/**
 * Az oldalazonosító stabil marad, a nyelvi slugok viszont locale-onként
 * változhatnak. Egy új eszközhöz elég itt felvenni a saját útvonalait.
 */
export const localizedRoutes = {
  home: { hu: "/", en: "/en/" },
  imageConverter: { hu: "/kep-konvertalo", en: "/en/image-converter" },
  faviconGenerator: { hu: "/favicon-generator" },
  videoFrames: { hu: "/video-kepekre-bontasa" },
  videoSpeed: { hu: "/video-gyorsitas-lassitas" },
  videoConverter: { hu: "/video-konvertalo" },
  sharePreview: { hu: "/megosztasi-elozet-tervezo" },
  browserSupport: { hu: "/bongeszo-tamogatas" },
  privacy: { hu: "/adatvedelmi-tajekoztato" },
} as const;

export type LocalizedRouteId = keyof typeof localizedRoutes;

export function getLocalizedRoute(
  route: LocalizedRouteId,
  locale: Locale = defaultLocale,
) {
  const paths = localizedRoutes[route] as Partial<Record<Locale, string>>;
  return paths[locale] ?? paths[defaultLocale]!;
}

export function getRouteAlternates(route: LocalizedRouteId) {
  const paths = localizedRoutes[route] as Partial<Record<Locale, string>>;
  return Object.entries(paths).map(([locale, path]) => ({
    locale: locale as Locale,
    path: path!,
  }));
}

export function getRouteLocales(route: LocalizedRouteId) {
  const paths = localizedRoutes[route] as Partial<Record<Locale, string>>;
  return availableLocales.filter((locale) => Boolean(paths[locale]));
}

export function getLanguageSwitchTarget(
  route: LocalizedRouteId,
  currentLocale: Locale,
) {
  const targetLocale = getRouteLocales(route).find(
    (locale) => locale !== currentLocale,
  );

  return targetLocale
    ? { locale: targetLocale, href: getLocalizedRoute(route, targetLocale) }
    : undefined;
}
