import assert from "node:assert/strict";
import test from "node:test";

import { imagePresets, imageRecipeSchema } from "./image-presets.ts";

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
