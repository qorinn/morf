// @ts-check

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // A jSquash WASM modulok import.meta.url alapú codec-betöltését a Vite
      // dependency optimizer dev módban érvénytelen cache URL-re írhatja át.
      exclude: [
        "@jsquash/jpeg",
        "@jsquash/png",
        "@jsquash/resize",
        "@jsquash/webp",
      ],
    },
  },

  integrations: [react()],
});
