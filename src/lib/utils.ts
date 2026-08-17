import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Egy "{token}" jelölésű szöveget bont fel darabokra, és a megadott
 * tokeneket a hozzájuk tartozó értékre (pl. link vagy strong elemre)
 * cseréli. Így a fordítási bundle-ök egyszerű, lokalizálható mondatokat
 * tárolhatnak, a beágyazott linkek/kiemelések pedig a komponensben,
 * nyelvfüggetlenül maradnak.
 */
/**
 * Egyszerű "{token}" sablon-behelyettesítés, amikor a végeredménynek
 * egyszerű stringnek kell maradnia (pl. worker felé küldött hibaszöveg).
 * JSX csomópontokhoz lásd az interpolateText függvényt.
 */
export function formatTemplate(
  template: string,
  tokens: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in tokens ? tokens[key] : match,
  );
}

export function interpolateText(
  text: string,
  tokens: Record<string, unknown>,
): unknown[] {
  return text
    .split(/(\{\w+\})/g)
    .filter((part) => part !== "")
    .map((part) => {
      const match = part.match(/^\{(\w+)\}$/);
      return match && match[1] in tokens ? tokens[match[1]] : part;
    });
}
