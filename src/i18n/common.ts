import { defineMessages } from "./types.ts";

export const commonMessages = defineMessages({
  hu: {
  navigation: {
    home: "Főoldal",
    allTools: "Összes eszköz",
    imageTools: "Képes eszközök",
    videoTools: "Videós eszközök",
    webTools: "Webes eszközök",
    browserSupport: "Böngészőtámogatás",
    privacy: "Adatvédelem",
  },
  header: {
    announcementStrong: "Nem kész verzió.",
    announcement: "A Morf jelenleg még épül, és nincs tesztelve.",
    allTools: "Összes eszköz",
    allToolsMobile: "Eszközök",
    homeLabel: "Morf kezdőlap",
    switchLanguage: "Váltás angol nyelvre",
    mainNavigationLabel: "Fő navigáció",
    categories: {
      kepek: { label: "Képes eszközök", mobileLabel: "Képek" },
      video: { label: "Videós eszközök", mobileLabel: "Videó" },
      web: { label: "Webes eszközök", mobileLabel: "Web" },
    },
  },
  footer: {
    madeBy: "Készítette:",
    navLabel: "Lábléc navigáció",
  },
  toolHero: {
    benefitsLabel: "Általános előnyök",
  },
  relatedTools: {
    title: "Kapcsolódó eszközök",
    description: "Ezek az eszközök gyakran a következő lépést jelentik ugyanebben a munkában.",
  },
  browserSupport: {
    linkLabel: "Böngészőtámogatás",
    videoSpeedError: "Sajnálom. A videó sebességgörbe nem támogatott a jelenlegi böngésződben. Próbáld meg egy friss Chromium-alapú böngészőben, például Chrome-ban vagy Edge-ben.",
    videoConverterError: "Sajnálom. A videó konvertáló nem támogatott a jelenlegi böngésződben. Próbáld meg egy friss Chromium-alapú böngészőben, például Chrome-ban vagy Edge-ben.",
  },
  actions: {
    add: "Hozzáadás",
    cancel: "Mégse",
    clear: "Törlés",
    close: "Bezárás",
    download: "Letöltés",
    export: "Exportálás",
    open: "Megnyitás",
    remove: "Eltávolítás",
    retry: "Újrapróbálás",
    save: "Mentés",
  },
  status: {
    ready: "Kezdésre kész",
    processing: "Feldolgozás folyamatban",
    completed: "Elkészült",
    cancelled: "Megszakítva",
    error: "Hiba történt",
  },
  benefits: [
    "Ingyenes",
    "Reklámmentes",
    "Regisztráció nélkül",
    "Napi limit nélkül",
  ],
  },
  en: {
    navigation: {
      home: "Home",
      allTools: "All tools",
      imageTools: "Image tools",
      videoTools: "Video tools",
      webTools: "Web tools",
      browserSupport: "Browser support",
      privacy: "Privacy",
    },
    header: {
      announcementStrong: "Work in progress.",
      announcement: "Morf is still being built and has not been fully tested.",
      allTools: "All tools",
      allToolsMobile: "Tools",
      homeLabel: "Morf home",
      switchLanguage: "Switch to Hungarian",
      mainNavigationLabel: "Main navigation",
      categories: {
        kepek: { label: "Image tools", mobileLabel: "Images" },
        video: { label: "Video tools", mobileLabel: "Video" },
        web: { label: "Web tools", mobileLabel: "Web" },
      },
    },
    footer: {
      madeBy: "Made by:",
      navLabel: "Footer navigation",
    },
    toolHero: {
      benefitsLabel: "General benefits",
    },
    relatedTools: {
      title: "Related tools",
      description: "These tools are often the next step in the same workflow.",
    },
    browserSupport: {
      linkLabel: "Browser support",
      videoSpeedError: "Sorry. The video speed curve editor is not supported in your current browser. Try a current Chromium-based browser such as Chrome or Edge.",
      videoConverterError: "Sorry. The video converter is not supported in your current browser. Try a current Chromium-based browser such as Chrome or Edge.",
    },
    actions: {
      add: "Add",
      cancel: "Cancel",
      clear: "Clear",
      close: "Close",
      download: "Download",
      export: "Export",
      open: "Open",
      remove: "Remove",
      retry: "Try again",
      save: "Save",
    },
    status: {
      ready: "Ready to start",
      processing: "Processing",
      completed: "Done",
      cancelled: "Cancelled",
      error: "Something went wrong",
    },
    benefits: ["Free", "Ad-free", "No registration", "No daily limit"],
  },
});

export type CommonMessages = (typeof commonMessages)["hu"];
