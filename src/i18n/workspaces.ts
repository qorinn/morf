import { defineHungarianMessages } from "./types";

export const workspaceMessages = defineHungarianMessages({
  upload: {
    chooseFile: "Fájl kiválasztása",
    chooseFiles: "Fájlok kiválasztása",
    chooseVideo: "Videó kiválasztása",
    dropFiles: "Húzd ide a fájlokat",
    replaceFile: "Fájl cseréje",
  },
  image: {
    addImages: "Képek hozzáadása",
    createGroup: "Új csoport",
    convert: "Képek konvertálása",
    downloadAll: "Összes letöltése",
  },
  favicon: {
    createPackage: "Favicon csomag készítése",
    cropImage: "Kép vágása",
    exportPackage: "Csomag letöltése",
  },
  videoFrames: {
    extractFrames: "Képkockák készítése",
    saveFrames: "Képek mentése",
    outputFps: "Kimeneti FPS",
  },
  videoSpeed: {
    editCurve: "Sebességgörbe szerkesztő",
    play: "Videó lejátszása",
    pause: "Videó szüneteltetése",
    exportMp4: "MP4 exportálása",
  },
  videoConverter: {
    convertVideo: "Videó konvertálása",
    outputFormat: "Kimeneti formátum",
    resolution: "Felbontás",
    estimatedSize: "Várható fájlméret",
  },
  sharePreview: {
    inspectUrl: "Oldal ellenőrzése",
    generateImage: "Kép készítése",
    copyCode: "Kód másolása",
  },
});

export type WorkspaceMessages = (typeof workspaceMessages)["hu"];
