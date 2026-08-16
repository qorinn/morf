import type { Locale } from "../lib/locale.ts";

/**
 * Egy üzenetcsomag kezdetben csak magyar adatot tartalmazhat. Új nyelv
 * hozzáadásakor ugyanebbe a struktúrába kerül a locale saját csomagja.
 */
export type MessageBundles<T> = Partial<Record<Locale, T>>;

export function defineHungarianMessages<T>(messages: T) {
  return { hu: messages } as const satisfies MessageBundles<T>;
}

export function defineMessages<const T extends { hu: unknown }>(messages: T) {
  return messages;
}

/**
 * Központi, biztonságos locale-feloldás. Amíg egy új nyelv fordítása nincs
 * kész, a felület magyar tartalommal marad használható.
 */
export function getMessages<
  TBundles extends Partial<Record<Locale, unknown>>,
>(
  bundles: TBundles,
  locale: Locale,
  fallbackLocale: Locale = "hu",
) {
  const messages = bundles[locale] ?? bundles[fallbackLocale];

  if (!messages) {
    throw new Error(`Hiányzik az i18n üzenetcsomag: ${locale}`);
  }

  return messages as Exclude<TBundles[keyof TBundles], undefined>;
}

export type MessageOf<TBundles extends MessageBundles<unknown>> =
  TBundles extends MessageBundles<infer T> ? T : never;
