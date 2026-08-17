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
  en: {
  imageConverter: {
    title: "Image converter",
    shortDescription: "Free, ad-free image conversion with no daily limit.",
    description: "Convert multiple JPG, PNG, or WebP images for free, without registration or a daily limit, and set the size and quality in one place.",
    cta: "Convert images", formats: "JPG, PNG, WebP", features: ["Format conversion and resizing", "Process several images at once", "Save individually or as a ZIP"],
  },
  faviconGenerator: {
    title: "Favicon generator", shortDescription: "Free favicon and PWA icon pack from a single image.",
    description: "Create a favicon and PWA icon pack from a single image for free, without ads or registration.",
    cta: "Create favicon", formats: "ICO, PNG, Apple, PWA", features: ["Crop and preview at real icon size", "Separate safe zone for maskable icons", "Choose what you need: website or web app"],
  },
  videoFrames: {
    title: "Video to frames", shortDescription: "Free video to frames extraction with local PNG export.",
    description: "Extract full-resolution PNG frames from MP4, MOV, or WebM video for free, ad-free, then optimize them in the image converter.",
    cta: "Extract frames", formats: "MP4, MOV, WebM → PNG", features: ["Every frame or a chosen FPS", "Checkpointed local processing", "One-click handoff to the optimizer"],
  },
  videoSpeed: {
    title: "Video speed editor", shortDescription: "Free video speed up and slow down with a curve.",
    description: "Speed up or slow down video with an editable speed curve for free, no account or daily limit, then download it as MP4.",
    cta: "Edit video", formats: "MP4, MOV, WebM → MP4", features: ["Draggable points and five curve presets", "Playable preview and length estimate", "Optional pitch preservation"],
  },
  videoConverter: {
    title: "Video converter and optimizer", shortDescription: "Free video conversion and file size reduction.",
    description: "Convert video to MP4, WebM, or MOV for free and ad-free, reduce the resolution, and preview the expected file size.",
    cta: "Convert video", formats: "MP4, MOV, WebM, MKV, TS → MP4, WebM, MOV", features: ["Percentage-based resolution reduction", "Three compression levels", "Local processing and download"],
  },
  sharePreview: {
    title: "Open Graph checker", shortDescription: "Free Open Graph check and share preview.",
    description: "Check your page's Open Graph data for free, see the share preview, then copy the improved meta tags.",
    cta: "Check page", formats: "Open Graph, X Card", features: ["Open Graph check for a live page", "Local image preview with drag and drop", "Recommended text length and image size", "Instantly copyable meta tag code"],
  },
  },
} satisfies { hu: Record<ToolId, ToolMessage>; en: Record<ToolId, ToolMessage> });

export type ToolMessages = (typeof toolMessages)["hu"];
