import type {
  ConversionGroup,
  FileJob,
  FileJobStatus,
  ImageConversionSettings,
} from "./types";
import {
  getImagePreset,
  type ImageRecipe,
  type PresetId,
} from "../../lib/presets/image-presets.ts";

const activeStatuses: FileJobStatus[] = [
  "loading-engine",
  "decoding",
  "processing",
  "encoding",
];

export function createConversionSettings(
  presetId: PresetId,
): ImageConversionSettings {
  const preset = getImagePreset(presetId);

  return {
    presetId,
    outputFormat: preset.recipe.outputFormat,
    maxWidth: preset.recipe.resize.maxWidth ?? 1920,
    maxHeight: preset.recipe.resize.maxHeight ?? 1920,
    quality: preset.recipe.quality,
  };
}

export function conversionSettingsToRecipe(
  settings: ImageConversionSettings,
): ImageRecipe {
  return {
    schemaVersion: 1,
    name: getImagePreset(settings.presetId).recipe.name,
    outputFormat: settings.outputFormat,
    resize: {
      maxWidth: settings.maxWidth,
      maxHeight: settings.maxHeight,
      keepAspectRatio: true,
    },
    quality: settings.quality,
    stripMetadata: true,
  };
}

export function areConversionSettingsEqual(
  first: ImageConversionSettings,
  second: ImageConversionSettings,
): boolean {
  return (
    first.presetId === second.presetId &&
    first.outputFormat === second.outputFormat &&
    first.maxWidth === second.maxWidth &&
    first.maxHeight === second.maxHeight &&
    first.quality === second.quality
  );
}

function resetJobForConversionChange(
  job: FileJob,
  releaseResultUrl: (url: string) => void,
): FileJob {
  if (activeStatuses.includes(job.status)) return job;

  if (job.result) releaseResultUrl(job.result.url);

  return {
    ...job,
    status: "queued",
    progress: 0,
    result: undefined,
    error: undefined,
  };
}

export function resetJobsForConversionChange(
  jobs: FileJob[],
  shouldReset: (job: FileJob) => boolean,
  releaseResultUrl: (url: string) => void = URL.revokeObjectURL,
): FileJob[] {
  return jobs.map((job) =>
    shouldReset(job) ? resetJobForConversionChange(job, releaseResultUrl) : job,
  );
}

export function assignJobsToConversionGroup(
  jobs: FileJob[],
  groups: ConversionGroup[],
  targetGroupId: string,
  shouldAssign: (job: FileJob) => boolean,
  releaseResultUrl: (url: string) => void = URL.revokeObjectURL,
): FileJob[] {
  const targetGroup = groups.find((group) => group.id === targetGroupId);
  if (!targetGroup) return jobs;

  return jobs.map((job) => {
    if (
      !shouldAssign(job) ||
      activeStatuses.includes(job.status) ||
      job.groupId === targetGroupId
    ) {
      return job;
    }

    const sourceGroup = groups.find((group) => group.id === job.groupId);
    const settingsChanged =
      !sourceGroup ||
      !areConversionSettingsEqual(sourceGroup.settings, targetGroup.settings);
    const nextJob = settingsChanged
      ? resetJobForConversionChange(job, releaseResultUrl)
      : job;

    return {
      ...nextJob,
      groupId: targetGroupId,
      shouldProcess: targetGroup.shouldProcess,
    };
  });
}
