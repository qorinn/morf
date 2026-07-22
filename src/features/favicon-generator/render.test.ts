import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCornerRadius,
  calculatePaddedSize,
  resolveWebAppBackground,
} from "./render.ts";
import type { FaviconEditorSettings } from "./types.ts";

const baseSettings: FaviconEditorSettings = {
  backgroundMode: "transparent",
  backgroundColor: "#123456",
  dominantColor: "#7bdcb5",
  standardPadding: 0.1,
  maskablePadding: 0.2,
  borderRadius: 0,
};

test("a normál és maskable padding a körbevágott master hasznos méretét módosítja", () => {
  assert.equal(calculatePaddedSize(1024, 0), 1024);
  assert.equal(calculatePaddedSize(1024, 0.1), 819.2);
  assert.equal(calculatePaddedSize(1024, 0.2), 614.4);
});

test("a sarokkerekítés teljes csúszkatartománya látható sugárrá alakul", () => {
  assert.equal(calculateCornerRadius(1024, 0), 0);
  assert.equal(calculateCornerRadius(1024, 0.5), 256);
  assert.equal(calculateCornerRadius(1024, 1), 512);
});

test("a webapp háttér minden háttérmódot változatlanul követ", () => {
  assert.equal(resolveWebAppBackground(baseSettings), null);
  assert.equal(
    resolveWebAppBackground({ ...baseSettings, backgroundMode: "white" }),
    "#ffffff",
  );
  assert.equal(
    resolveWebAppBackground({ ...baseSettings, backgroundMode: "black" }),
    "#000000",
  );
  assert.equal(
    resolveWebAppBackground({ ...baseSettings, backgroundMode: "dominant" }),
    "#7bdcb5",
  );
  assert.equal(
    resolveWebAppBackground({ ...baseSettings, backgroundMode: "custom" }),
    "#123456",
  );
  assert.equal(
    resolveWebAppBackground({
      ...baseSettings,
      backgroundMode: "custom",
      backgroundColor: "#123",
    }),
    "#7bdcb5",
  );
});
