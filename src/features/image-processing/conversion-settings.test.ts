import assert from "node:assert/strict";
import test from "node:test";

import {
  areConversionSettingsEqual,
  assignJobsToConversionGroup,
  conversionSettingsToRecipe,
  createConversionSettings,
  resetJobsForConversionChange,
} from "./conversion-settings.ts";
import type {
  ConversionGroup,
  FileJob,
  FileJobStatus,
  ImageConversionSettings,
} from "./types.ts";

function createJob(
  id: string,
  groupId: string,
  status: FileJobStatus = "queued",
): FileJob {
  return {
    id,
    groupId,
    status,
    progress: status === "completed" ? 100 : 0,
    shouldProcess: id !== "excluded",
  } as FileJob;
}

function createGroup(
  id: string,
  quality: number,
  outputFormat: ImageConversionSettings["outputFormat"] = "webp",
): ConversionGroup {
  return {
    id,
    name: id,
    shouldProcess: true,
    settings: {
      presetId: "custom",
      outputFormat,
      maxWidth: 1920,
      maxHeight: 1920,
      quality,
    },
  };
}

test("a presetből önálló konvertálási beállítás készül", () => {
  const settings = createConversionSettings("website");

  assert.deepEqual(settings, {
    presetId: "website",
    outputFormat: "webp",
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 80,
  });
});

test("a csoport beállításából érvényes feldolgozási recept készül", () => {
  const recipe = conversionSettingsToRecipe({
    presetId: "custom",
    outputFormat: "avif",
    maxWidth: 1440,
    maxHeight: 900,
    quality: 72,
  });

  assert.equal(recipe.outputFormat, "avif");
  assert.deepEqual(recipe.resize, {
    maxWidth: 1440,
    maxHeight: 900,
    keepAspectRatio: true,
  });
  assert.equal(recipe.quality, 72);
});

test("csak minden beállítás egyezése számít azonos konfigurációnak", () => {
  const settings = createConversionSettings("email");

  assert.equal(areConversionSettingsEqual(settings, { ...settings }), true);
  assert.equal(
    areConversionSettingsEqual(settings, {
      ...settings,
      quality: settings.quality + 1,
    }),
    false,
  );
});

test("a beállításváltozás újra sorba állítja az érintett kész képeket", () => {
  const completed = {
    ...createJob("excluded", "group-1", "completed"),
    result: { url: "blob:old-result" },
  } as FileJob;
  const untouched = createJob("untouched", "group-2", "completed");
  const releasedUrls: string[] = [];

  const updated = resetJobsForConversionChange(
    [completed, untouched],
    (job) => job.groupId === "group-1",
    (url) => releasedUrls.push(url),
  );

  assert.equal(updated[0].status, "queued");
  assert.equal(updated[0].shouldProcess, false);
  assert.equal(updated[0].result, undefined);
  assert.strictEqual(updated[1], untouched);
  assert.deepEqual(releasedUrls, ["blob:old-result"]);
});

test("azonos beállítású csoportváltás megtartja a kész eredményt", () => {
  const groups = [createGroup("group-1", 80), createGroup("group-2", 80)];
  const completed = {
    ...createJob("image", "group-1", "completed"),
    result: { url: "blob:result" },
  } as FileJob;

  const [updated] = assignJobsToConversionGroup(
    [completed],
    groups,
    "group-2",
    () => true,
  );

  assert.equal(updated.groupId, "group-2");
  assert.equal(updated.status, "completed");
  assert.equal(updated.result?.url, "blob:result");
});

test("eltérő beállítású csoportváltás érvényteleníti a régi eredményt", () => {
  const groups = [createGroup("group-1", 80), createGroup("group-2", 70)];
  const completed = {
    ...createJob("image", "group-1", "completed"),
    result: { url: "blob:result" },
  } as FileJob;
  const releasedUrls: string[] = [];

  const [updated] = assignJobsToConversionGroup(
    [completed],
    groups,
    "group-2",
    () => true,
    (url) => releasedUrls.push(url),
  );

  assert.equal(updated.groupId, "group-2");
  assert.equal(updated.status, "queued");
  assert.equal(updated.result, undefined);
  assert.deepEqual(releasedUrls, ["blob:result"]);
});
