import assert from "node:assert/strict";
import test from "node:test";

import {
  getLanguageSwitchTarget,
  getLocalizedRoute,
  getRouteAlternates,
} from "./localized-routes.ts";

test("a lokalizált eszköz saját angol slugot használ", () => {
  assert.equal(getLocalizedRoute("imageConverter", "hu"), "/kep-konvertalo");
  assert.equal(getLocalizedRoute("imageConverter", "en"), "/en/image-converter");
});

test("a még le nem fordított oldal biztonságosan az alapútvonalra esik vissza", () => {
  assert.equal(getLocalizedRoute("videoConverter", "en"), "/video-konvertalo");
});

test("csak valóban elkészült nyelvek kapnak hreflangot és nyelvváltót", () => {
  assert.deepEqual(getRouteAlternates("imageConverter"), [
    { locale: "hu", path: "/kep-konvertalo" },
    { locale: "en", path: "/en/image-converter" },
  ]);
  assert.deepEqual(getLanguageSwitchTarget("imageConverter", "en"), {
    locale: "hu",
    href: "/kep-konvertalo",
  });
  assert.equal(getLanguageSwitchTarget("videoConverter", "hu"), undefined);
});
