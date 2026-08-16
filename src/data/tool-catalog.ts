import {
  BrowserIcon,
  Film01Icon,
  Image02Icon,
  Share01Icon,
} from "@hugeicons/core-free-icons";

export const tools = [
  {
    title: "Képkonvertáló",
    shortDescription: "Ingyenes, reklámmentes képkonvertálás napi limit nélkül.",
    description:
      "Alakíts át több JPG, PNG vagy WebP képet ingyen, regisztráció és napi limit nélkül, majd állítsd be a méretet és a minőséget egy helyen.",
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
    shortDescription: "Ingyenes videó képekre bontása, helyi PNG mentéssel.",
    description:
      "Bonts MP4, MOV vagy WebM videót teljes felbontású PNG képekre ingyen, reklámmentesen, majd optimalizáld őket a képkonvertálóban.",
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
    shortDescription: "Ingyenes videó gyorsítás és lassítás görbével.",
    description:
      "Gyorsíts vagy lassíts videót szerkeszthető sebességgörbével ingyen, fiók és napi limit nélkül, majd töltsd le MP4-ként.",
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
    shortDescription: "Ingyenes videókonvertálás és fájlméret-csökkentés.",
    description:
      "Konvertálj videót MP4, WebM vagy MOV formátumba ingyen és reklámmentesen, csökkentsd a felbontást, és lásd előre a várható fájlméretet.",
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
    shortDescription: "Ingyenes Open Graph ellenőrzés és megosztási előnézet.",
    description:
      "Ellenőrizd az oldalad Open Graph adatait ingyen, nézd meg a megosztási előnézetet, majd másold ki a javított meta tageket.",
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
    shortDescription: "Ingyenes favicon és PWA ikoncsomag egy képből.",
    description:
      "Készíts favicon- és PWA ikoncsomagot egyetlen képből ingyen, reklámok és regisztráció nélkül.",
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
