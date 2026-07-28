import assert from "node:assert/strict";
import test from "node:test";

import { imagePresets, imageRecipeSchema } from "./image-presets.ts";

test("az Általános az első és veszteségmentes alapértelmezett preset", () => {
  const general = imagePresets[0];

  assert.equal(general.id, "general");
  assert.equal(general.recipe.name, "Általános");
  assert.equal(general.recipe.outputFormat, "webp");
  assert.equal(general.recipe.lossless, true);
});

test("minden beépített preset megfelel a verziózott sémának", () => {
  for (const preset of imagePresets) {
    assert.equal(imageRecipeSchema.safeParse(preset.recipe).success, true);
  }
});

test("a séma elutasítja az érvénytelen minőséget", () => {
  const invalid = {
    ...imagePresets[0].recipe,
    quality: 101,
  };

  assert.equal(imageRecipeSchema.safeParse(invalid).success, false);
});

test("az AVIF választható kimeneti formátum", () => {
  const avifRecipe = {
    ...imagePresets[0].recipe,
    outputFormat: "avif",
  };

  assert.equal(imageRecipeSchema.safeParse(avifRecipe).success, true);
});

test("a célméret és a veszteségmentes mód része a receptnek", () => {
  const recipe = {
    ...imagePresets[0].recipe,
    maxFileSizeBytes: 500 * 1024,
    lossless: true,
  };

  assert.equal(imageRecipeSchema.safeParse(recipe).success, true);
});
