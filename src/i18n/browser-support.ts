import { defineMessages } from "./types.ts";

interface SupportedTool {
  name: string;
  description: string;
  chrome: boolean;
  edge: boolean;
  firefox: boolean;
  safari: boolean;
}

interface BrowserSupportCopy {
  eyebrow: string;
  title: string;
  lead: string;
  recommendedTitle: string;
  recommendedText: string;
  tableTitle: string;
  tableDescription: string;
  toolColumnLabel: string;
  supportedLabel: string;
  unsupportedLabel: string;
  footnote: string;
  tools: SupportedTool[];
}

export const browserSupportMessages = defineMessages({
  hu: {
    eyebrow: "Böngészőtámogatás",
    title: "Melyik böngészőben működik az eszköz?",
    lead: "A képes eszközök a legtöbb modern böngészőben használhatók. A videós feldolgozáshoz a Morfnak olyan böngészőfunkciókra is szüksége van, amelyek jelenleg a friss Chrome-ban és Edge-ben a legmegbízhatóbbak.",
    recommendedTitle: "Videós eszközökhöz ezt ajánljuk",
    recommendedText: "Használj friss Chrome-ot vagy Edge-et. Ezek Chromium-alapú böngészők, és a Morf helyi videófeldolgozásához szükséges kódolási funkciókat jelenleg ezek támogatják a legteljesebben.",
    tableTitle: "Eszközönkénti támogatás",
    tableDescription: "A jelölés a Morf jelenlegi, teljes munkafolyamatára vonatkozik: feltöltés, feldolgozás és letöltés.",
    toolColumnLabel: "Eszköz",
    supportedLabel: "Támogatott",
    unsupportedLabel: "Jelenleg nem támogatott",
    footnote: "A támogatást a böngésző verziója, az eszközöd és a videóban használt kodek is befolyásolhatja. Ha egy videófájl nem nyílik meg, próbáld meg H.264-es MP4-ként, friss Chrome-ban vagy Edge-ben.",
    tools: [
      { name: "Képkonvertáló", description: "Képek átalakítása és tömörítése.", chrome: true, edge: true, firefox: true, safari: true },
      { name: "Favicon generátor", description: "Faviconcsomag készítése képből.", chrome: true, edge: true, firefox: true, safari: true },
      { name: "Megosztási előnézet", description: "Open Graph adatok ellenőrzése és képtervező.", chrome: true, edge: true, firefox: true, safari: true },
      { name: "Videó képekre bontása", description: "Képkockák mentése videóból.", chrome: true, edge: true, firefox: false, safari: false },
      { name: "Videó gyorsítás és lassítás", description: "Sebességgörbe, előnézet és MP4-export.", chrome: true, edge: true, firefox: false, safari: false },
      { name: "Videó konvertáló", description: "Videó átméretezése és új formátumba mentése.", chrome: true, edge: true, firefox: false, safari: false },
    ],
  } satisfies BrowserSupportCopy,
  en: {
    eyebrow: "Browser support",
    title: "Which browser does each tool work in?",
    lead: "The image tools work in most modern browsers. Video processing requires browser features that are currently most reliable in up-to-date Chrome and Edge.",
    recommendedTitle: "For video tools, we recommend this",
    recommendedText: "Use an up-to-date version of Chrome or Edge. These are Chromium-based browsers, and they currently support the encoding features Morf needs for local video processing most completely.",
    tableTitle: "Support by tool",
    tableDescription: "The marks apply to Morf's current, full workflow: upload, processing, and download.",
    toolColumnLabel: "Tool",
    supportedLabel: "Supported",
    unsupportedLabel: "Not currently supported",
    footnote: "Support can also depend on your browser version, your device, and the codec used in the video. If a video file will not open, try it as an H.264 MP4 in an up-to-date Chrome or Edge.",
    tools: [
      { name: "Image converter", description: "Convert and compress images.", chrome: true, edge: true, firefox: true, safari: true },
      { name: "Favicon generator", description: "Create a favicon pack from an image.", chrome: true, edge: true, firefox: true, safari: true },
      { name: "Share preview", description: "Check Open Graph data and design a preview image.", chrome: true, edge: true, firefox: true, safari: true },
      { name: "Video to frames", description: "Save frames from a video.", chrome: true, edge: true, firefox: false, safari: false },
      { name: "Video speed editor", description: "Speed curve, preview, and MP4 export.", chrome: true, edge: true, firefox: false, safari: false },
      { name: "Video converter", description: "Resize video and save it in a new format.", chrome: true, edge: true, firefox: false, safari: false },
    ],
  } satisfies BrowserSupportCopy,
});

export type BrowserSupportMessages = (typeof browserSupportMessages)["hu"];
