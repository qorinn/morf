import type { Locale } from "@/lib/locale";

export type HomeToolId =
  | "imageConverter"
  | "imageOptimizer"
  | "imageResizer"
  | "videoFrames"
  | "videoSpeed"
  | "videoConverter"
  | "openGraph"
  | "favicon";

type HomeCopy = {
  title: string;
  description: string;
  catalogTitle: string;
  catalogDescription: string;
  openTool: string;
  categories: Record<"images" | "video" | "web", string>;
  tools: Record<HomeToolId, { title: string; description: string }>;
  hero: {
    imageConverter: string;
    frames: string;
    speed: string;
    videoConverter: string;
    favicon: string;
    title: [string, string];
    description: string;
    cta: string;
  };
  whyChoose: {
    heading: string;
    lead: string;
  };
};

export const homeCopy: Record<Extract<Locale, "hu" | "en">, HomeCopy> = {
  hu: {
    title: "Morf - Online eszközök egy helyen",
    description: "Ingyenes, reklámmentes és regisztráció nélküli online eszközök kép- és videókonvertáláshoz, favicon készítéshez és megosztási előnézethez.",
    catalogTitle: "Mit szeretnél megcsinálni?",
    catalogDescription: "Ingyenes, reklámmentes eszközök képhez, videóhoz és weboldalhoz. Nincs fiók vagy napi limit: a fájljaid helyben, a saját eszközödön maradnak.",
    openTool: "Megnyitás",
    categories: { images: "Képek", video: "Videó", web: "Web" },
    tools: {
      imageConverter: { title: "Képformátum-konvertáló", description: "Ingyenes, reklámmentes JPG, PNG, WebP és AVIF konvertálás HEIC és HEIF képekből is." },
      imageOptimizer: { title: "Képoptimalizáló", description: "JPG, PNG, WebP és AVIF képek fájlméretének csökkentése ingyen, minőség- vagy célméret-beállítással." },
      imageResizer: { title: "Képátméretező", description: "JPG, PNG, WebP, AVIF és HEIC/HEIF képek átméretezése az oldalarány megtartásával, regisztráció nélkül." },
      videoFrames: { title: "Videó képekre bontása", description: "MP4, MOV és WebM videók teljes felbontású PNG képekre bontása ingyen, választható FPS-sel." },
      videoSpeed: { title: "Videó gyorsítás és lassítás", description: "MP4, MOV és WebM videók gyorsítása vagy lassítása ingyen, szerkeszthető sebességgörbével és MP4-kimenettel." },
      videoConverter: { title: "Videó konvertáló és optimalizáló", description: "MP4, MOV, WebM, MKV és TS videók konvertálása ingyen MP4, WebM vagy MOV formátumba, kisebb felbontással is." },
      openGraph: { title: "Open Graph ellenőrző", description: "Ellenőrizd ingyen a meglévő Open Graph adatokat, nézd meg az előnézetet, és másold ki a javított meta tag kódot." },
      favicon: { title: "Favicon generátor", description: "Ingyenes favicon- és webappikon-csomag készítése egyetlen képből." },
    },
    hero: {
      imageConverter: "Képkonvertáló",
      frames: "Videó képekre bontása",
      speed: "Videó gyorsítás",
      videoConverter: "Videó konvertáló",
      favicon: "Favicon generátor",
      title: ["Eszközök a digitális", "mindennapokhoz."],
      description: "A Morf célja, hogy a gyakori digitális feladatokhoz egyszerű, ingyenes és privát böngészős eszközöket kínáljon.",
      cta: "Eszközök megnyitása",
    },
    whyChoose: {
      heading: "Miért válaszd a Morfot?",
      lead: "Az egyszerű használaton kívül.",
    },
  },
  en: {
    title: "Morf - Free online tools in one place",
    description: "Free, ad-free online tools without registration for image and video conversion, favicon generation, and social preview checks.",
    catalogTitle: "What would you like to do?",
    catalogDescription: "Free, ad-free tools for images, video, and websites. No account or daily limit: your files stay on your own device.",
    openTool: "Open tool",
    categories: { images: "Images", video: "Video", web: "Web" },
    tools: {
      imageConverter: { title: "Image format converter", description: "Convert JPG, PNG, WebP, and AVIF images from HEIC and HEIF files for free, without ads." },
      imageOptimizer: { title: "Image optimizer", description: "Reduce JPG, PNG, WebP, and AVIF file sizes with a quality or target-size setting." },
      imageResizer: { title: "Image resizer", description: "Resize JPG, PNG, WebP, AVIF, and HEIC/HEIF images while keeping their aspect ratio." },
      videoFrames: { title: "Video to frames", description: "Extract full-resolution PNG frames from MP4, MOV, and WebM videos with a selectable FPS." },
      videoSpeed: { title: "Video speed editor", description: "Speed up or slow down MP4, MOV, and WebM videos with an editable speed curve and MP4 export." },
      videoConverter: { title: "Video converter and optimizer", description: "Convert MP4, MOV, WebM, MKV, and TS videos to MP4, WebM, or MOV with a smaller resolution." },
      openGraph: { title: "Open Graph checker", description: "Check existing Open Graph data, preview the result, and copy improved meta tag code." },
      favicon: { title: "Favicon generator", description: "Create a favicon and web app icon bundle from a single image for free." },
    },
    hero: {
      imageConverter: "Image converter",
      frames: "Video to frames",
      speed: "Video speed",
      videoConverter: "Video converter",
      favicon: "Favicon generator",
      title: ["Tools for everyday", "digital tasks."],
      description: "Morf makes common digital tasks simple, free, and private in your browser.",
      cta: "Explore tools",
    },
    whyChoose: {
      heading: "Why choose Morf?",
      lead: "Beyond being easy to use.",
    },
  },
};

export function getHomeCopy(locale: Extract<Locale, "hu" | "en">) {
  return homeCopy[locale];
}
