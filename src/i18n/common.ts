import { defineHungarianMessages } from "./types";

export const commonMessages = defineHungarianMessages({
  navigation: {
    home: "Főoldal",
    allTools: "Összes eszköz",
    imageTools: "Képes eszközök",
    videoTools: "Videós eszközök",
    webTools: "Webes eszközök",
    browserSupport: "Böngészőtámogatás",
    privacy: "Adatvédelem",
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
});

export type CommonMessages = (typeof commonMessages)["hu"];
