import { defineMessages } from "./types.ts";

export type ToolId =
  | "imageConverter"
  | "faviconGenerator"
  | "videoFrames"
  | "videoSpeed"
  | "videoConverter"
  | "sharePreview";

export interface ToolMessage {
  title: string;
  shortDescription: string;
  description: string;
  cta: string;
  formats: string;
  features: readonly string[];
}

export const toolMessages = defineMessages({
  hu: {
  imageConverter: {
    title: "Képkonvertáló",
    shortDescription: "Ingyenes, reklámmentes képkonvertálás napi limit nélkül.",
    description: "Alakíts át több JPG, PNG vagy WebP képet ingyen, regisztráció és napi limit nélkül, majd állítsd be a méretet és a minőséget egy helyen.",
    cta: "Képek konvertálása", formats: "JPG, PNG, WebP", features: ["Formátumváltás és átméretezés", "Több kép feldolgozása egyszerre", "Mentés egyenként vagy ZIP-ben"],
  },
  faviconGenerator: {
    title: "Favicon generátor", shortDescription: "Ingyenes favicon és PWA ikoncsomag egy képből.",
    description: "Készíts favicon- és PWA ikoncsomagot egyetlen képből ingyen, reklámok és regisztráció nélkül.",
    cta: "Favicon készítése", formats: "ICO, PNG, Apple, PWA", features: ["Vágás és előnézet valódi ikonméretben", "Maskable ikonokhoz külön biztonsági zóna", "Válaszd ki, mire van szükséged: weboldalhoz vagy webapphoz"],
  },
  videoFrames: {
    title: "Videó képekre bontása", shortDescription: "Ingyenes videó képekre bontása, helyi PNG mentéssel.",
    description: "Bonts MP4, MOV vagy WebM videót teljes felbontású PNG képekre ingyen, reklámmentesen, majd optimalizáld őket a képkonvertálóban.",
    cta: "Képek készítése", formats: "MP4, MOV, WebM → PNG", features: ["Minden képkocka vagy választható FPS", "Checkpointos helyi feldolgozás", "Egykattintásos átadás optimalizálásra"],
  },
  videoSpeed: {
    title: "Videó gyorsítás és lassítás", shortDescription: "Ingyenes videó gyorsítás és lassítás görbével.",
    description: "Gyorsíts vagy lassíts videót szerkeszthető sebességgörbével ingyen, fiók és napi limit nélkül, majd töltsd le MP4-ként.",
    cta: "Videó szerkesztése", formats: "MP4, MOV, WebM → MP4", features: ["Húzható pontok és öt curve preset", "Lejátszható preview és hosszbecslés", "Opcionális hangmagasság-megtartás"],
  },
  videoConverter: {
    title: "Videó konvertáló és optimalizáló", shortDescription: "Ingyenes videókonvertálás és fájlméret-csökkentés.",
    description: "Konvertálj videót MP4, WebM vagy MOV formátumba ingyen és reklámmentesen, csökkentsd a felbontást, és lásd előre a várható fájlméretet.",
    cta: "Videó konvertálása", formats: "MP4, MOV, WebM, MKV, TS → MP4, WebM, MOV", features: ["Százalékos felbontáscsökkentés", "Három tömörítési szint", "Helyi feldolgozás és letöltés"],
  },
  sharePreview: {
    title: "Open Graph ellenőrző", shortDescription: "Ingyenes Open Graph ellenőrzés és megosztási előnézet.",
    description: "Ellenőrizd az oldalad Open Graph adatait ingyen, nézd meg a megosztási előnézetet, majd másold ki a javított meta tageket.",
    cta: "Oldal ellenőrzése", formats: "Open Graph, X Card", features: ["Éles oldal Open Graph ellenőrzése", "Helyi kép-előnézet drag and droppal", "Ajánlott szöveghossz és képméret", "Azonnal másolható meta tag kód"],
  },
  },
} satisfies { hu: Record<ToolId, ToolMessage> });

export type ToolMessages = (typeof toolMessages)["hu"];
