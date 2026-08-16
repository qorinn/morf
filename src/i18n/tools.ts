import { defineHungarianMessages } from "./types";

export type ToolId =
  | "imageConverter"
  | "faviconGenerator"
  | "videoFrames"
  | "videoSpeed"
  | "videoConverter"
  | "sharePreview";

export const toolMessages = defineHungarianMessages({
  imageConverter: {
    name: "Képformátum-konvertáló",
    category: "Képek",
    openLabel: "Képkonvertáló megnyitása",
  },
  faviconGenerator: {
    name: "Favicon- és PWA-ikongenerátor",
    category: "Web",
    openLabel: "Favicon generátor megnyitása",
  },
  videoFrames: {
    name: "Videóképkocka-exportáló",
    category: "Videó",
    openLabel: "Videó képekre bontása",
  },
  videoSpeed: {
    name: "Videósebesség-görbe szerkesztő",
    category: "Videó",
    openLabel: "Videó sebességének szerkesztése",
  },
  videoConverter: {
    name: "Videóformátum-konvertáló és optimalizáló",
    category: "Videó",
    openLabel: "Videó konvertálása",
  },
  sharePreview: {
    name: "Open Graph ellenőrző és előnézet-tervező",
    category: "Web",
    openLabel: "Megosztási előnézet ellenőrzése",
  },
});

export type ToolMessages = (typeof toolMessages)["hu"];
