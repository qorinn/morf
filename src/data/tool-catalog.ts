import {
  BrowserIcon,
  Film01Icon,
  Image02Icon,
} from "@hugeicons/core-free-icons";

export const tools = [
  {
    title: "Képkonvertáló",
    shortDescription: "Formátum, méret és minőség több képhez.",
    description:
      "Alakíts át több JPG, PNG vagy WebP képet egyszerre, és állítsd be a méretet és a minőséget egy helyen.",
    href: "/kep-konvertalo",
    cta: "Képek konvertálása",
    icon: Image02Icon,
    formats: "JPG, PNG, WebP",
    features: [
      "Formátumváltás és átméretezés",
      "Több kép feldolgozása egyszerre",
      "Mentés egyenként vagy ZIP-ben",
    ],
  },
  {
    title: "Videó képekre bontása",
    shortDescription: "Veszteségmentes PNG képek videóból.",
    description:
      "Bonts MP4, MOV vagy WebM videót teljes felbontású PNG képekre, majd optimalizáld őket a képkonvertálóban.",
    href: "/video-kepekre-bontasa",
    cta: "Képek készítése",
    icon: Film01Icon,
    formats: "MP4, MOV, WebM → PNG",
    features: [
      "Minden képkocka vagy választható FPS",
      "Checkpointos helyi feldolgozás",
      "Egykattintásos átadás optimalizálásra",
    ],
  },
  {
    title: "Favicon generátor",
    shortDescription: "Favicon- és PWA-csomag egyetlen képből.",
    description:
      "Készíts egyetlen képből weboldalhoz és telepíthető webapphoz használható ikoncsomagot.",
    href: "/favicon-generator",
    cta: "Favicon készítése",
    icon: BrowserIcon,
    formats: "ICO, PNG, Apple, PWA",
    features: [
      "Vágás és előnézet valódi ikonméretben",
      "Maskable ikonokhoz külön biztonsági zóna",
      "Válaszd ki, mire van szükséged: weboldalhoz vagy webapphoz",
    ],
  },
] as const;
