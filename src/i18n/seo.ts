import { defineHungarianMessages } from "./types";
import type { ToolId } from "./tools";
import type { Locale } from "../lib/locale.ts";

type SeoPage = {
  title: string;
  description: string;
  inLanguage: Locale;
};

export const seoMessages = defineHungarianMessages({
  siteName: "Morf",
  pages: {
    imageConverter: {
      title: "Ingyenes online képkonvertáló: JPG, PNG, WebP | Morf",
      description: "Ingyenes, reklámmentes és regisztráció nélküli képkonvertáló JPG, PNG, WebP, AVIF, HEIC és HEIF képekhez.",
      inLanguage: "hu",
    },
    faviconGenerator: {
      title: "Ingyenes favicon generátor és PWA ikon készítő | Morf",
      description: "Készíts favicon- és PWA ikoncsomagot egy képből ingyen, reklámmentesen és regisztráció nélkül.",
      inLanguage: "hu",
    },
    videoFrames: {
      title: "Videó képekre bontása online: PNG képkockák | Morf",
      description: "Bonts MP4, MOV vagy WebM videót teljes felbontású PNG képkockákra ingyen, reklámmentesen és regisztráció nélkül.",
      inLanguage: "hu",
    },
    videoSpeed: {
      title: "Videó gyorsítás és lassítás online sebességgörbével | Morf",
      description: "Gyorsíts vagy lassíts MP4, MOV és WebM videót szerkeszthető sebességgörbével, helyi feldolgozással.",
      inLanguage: "hu",
    },
    videoConverter: {
      title: "Ingyenes videó konvertáló és optimalizáló | Morf",
      description: "Konvertálj és optimalizálj MP4, MOV, WebM, MKV és TS videót ingyen, reklámmentesen és regisztráció nélkül.",
      inLanguage: "hu",
    },
    sharePreview: {
      title: "Open Graph ellenőrző és megosztási előnézet | Morf",
      description: "Ellenőrizd az Open Graph adatokat, tervezz megosztási képet és másold ki a javított meta tagokat.",
      inLanguage: "hu",
    },
  } satisfies Record<ToolId, SeoPage>,
});

export type SeoMessages = (typeof seoMessages)["hu"];
