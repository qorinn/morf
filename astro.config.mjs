// @ts-check

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // A React islandek, a Zustand és a közös UI-csomagok ugyanazt a
      // React-példányt használják akkor is, ha a Vite újraoptimalizál.
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      // A jSquash WASM modulok import.meta.url alapú codec-betöltését a Vite
      // dependency optimizer dev módban érvénytelen cache URL-re írhatja át.
      exclude: [
        "@jsquash/jpeg",
        "@jsquash/png",
        "@jsquash/resize",
        "@jsquash/webp",
        // A Cropper.js csak böngészőben tölthető be, és a Vite elavult
        // optimize-dep URL-jei megszakíthatják a dinamikus importját.
        "cropperjs",
      ],
    },
  },

  integrations: [react()],
});
