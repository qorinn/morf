import type { Locale } from "@/lib/locale";

/**
 * Egy üzenetcsomag kezdetben csak magyar adatot tartalmazhat. Új nyelv
 * hozzáadásakor ugyanebbe a struktúrába kerül a locale saját csomagja.
 */
export type MessageBundles<T> = Partial<Record<Locale, T>>;

export function defineHungarianMessages<T>(messages: T) {
  return { hu: messages } as const satisfies MessageBundles<T>;
}

export type MessageOf<TBundles extends MessageBundles<unknown>> =
  TBundles extends MessageBundles<infer T> ? T : never;
