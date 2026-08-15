import {
  BrowserIcon,
  Film01Icon,
  Image02Icon,
  Share01Icon,
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
    title: "Videó gyorsítás és lassítás",
    shortDescription: "Sebességgörbe, preview és MP4-export.",
    description:
      "Gyorsíts vagy lassíts videót szerkeszthető sebességgörbével, majd töltsd le H.264/AAC MP4-ként.",
    href: "/video-gyorsitas-lassitas",
    cta: "Videó szerkesztése",
    icon: Film01Icon,
    formats: "MP4, MOV, WebM → MP4",
    features: [
      "Húzható pontok és öt curve preset",
      "Lejátszható preview és hosszbecslés",
      "Opcionális hangmagasság-megtartás",
    ],
  },
  {
    title: "Videó konvertáló és optimalizáló",
    shortDescription: "Formátumváltás, kisebb felbontás és méretbecslés.",
    description:
      "Konvertálj videót MP4, WebM vagy MOV formátumba, csökkentsd a felbontását százalékosan, és lásd előre a várható fájlméretet.",
    href: "/video-konvertalo",
    cta: "Videó konvertálása",
    icon: Film01Icon,
    formats: "MP4, MOV, WebM, MKV, TS → MP4, WebM, MOV",
    features: [
      "Százalékos felbontáscsökkentés",
      "Három tömörítési szint",
      "Helyi feldolgozás és letöltés",
    ],
  },
  {
    title: "Open Graph ellenőrző",
    shortDescription: "Ellenőrzés, előnézet és javítható meta adatok.",
    description:
      "Ellenőrizd az oldalad Open Graph adatait, nézd meg a megosztási előnézetet, majd másold ki a javított meta tageket.",
    href: "/megosztasi-elozet-tervezo",
    cta: "Oldal ellenőrzése",
    icon: Share01Icon,
    formats: "Open Graph, X Card",
    features: [
      "Éles oldal Open Graph ellenőrzése",
      "Helyi kép-előnézet drag and droppal",
      "Ajánlott szöveghossz és képméret",
      "Azonnal másolható meta tag kód",
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
