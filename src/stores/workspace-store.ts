import { create } from "zustand";

import type {
  FileJob,
  FileJobError,
  FileJobResult,
  FileJobStatus,
  ImageFormat,
} from "@/features/image-processing/types";
import { sanitizeBaseName } from "@/lib/filenames/image-filenames";
import {
  getImagePreset,
  type ImageRecipe,
  type PresetId,
} from "@/lib/presets/image-presets";

export type WorkspaceSettings = {
  presetId: PresetId;
  outputFormat: ImageFormat;
  maxWidth: number;
  maxHeight: number;
  quality: number;
};

type NewFileJob = Pick<FileJob, "file" | "inputFormat" | "previewUrl">;

type JobPatch = Partial<
  Pick<
    FileJob,
    | "status"
    | "progress"
    | "originalWidth"
    | "originalHeight"
    | "result"
    | "error"
  >
>;

type WorkspaceState = {
  jobs: FileJob[];
  settings: WorkspaceSettings;
  addJobs: (jobs: NewFileJob[]) => void;
  updateJob: (id: string, patch: JobPatch) => void;
  renameJob: (id: string, outputBaseName: string) => void;
  completeJob: (
    id: string,
    result: FileJobResult,
    originalWidth: number,
    originalHeight: number,
  ) => void;
  failJob: (id: string, error: FileJobError) => void;
  setJobStatus: (id: string, status: FileJobStatus, progress?: number) => void;
  requeueCompletedJobs: () => void;
  retryJob: (id: string) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  applyPreset: (presetId: PresetId) => void;
  updateSettings: (patch: Partial<Omit<WorkspaceSettings, "presetId">>) => void;
  getRecipe: () => ImageRecipe;
};

function createSettings(presetId: PresetId): WorkspaceSettings {
  const preset = getImagePreset(presetId);
  return {
    presetId,
    outputFormat: preset.recipe.outputFormat,
    maxWidth: preset.recipe.resize.maxWidth ?? 1920,
    maxHeight: preset.recipe.resize.maxHeight ?? 1920,
    quality: preset.recipe.quality,
  };
}

function releaseJobUrls(job: FileJob) {
  URL.revokeObjectURL(job.previewUrl);
  if (job.result) URL.revokeObjectURL(job.result.url);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  jobs: [],
  settings: createSettings("website"),
  addJobs: (jobs) =>
    set((state) => ({
      jobs: [
        ...state.jobs,
        ...jobs.map((job) => ({
          ...job,
          id: crypto.randomUUID(),
          outputBaseName: `${sanitizeBaseName(job.file.name)}-morf`,
          status: "queued" as const,
          progress: 0,
        })),
      ],
    })),
  updateJob: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...patch } : job,
      ),
    })),
  renameJob: (id, outputBaseName) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, outputBaseName } : job,
      ),
    })),
  completeJob: (id, result, originalWidth, originalHeight) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              status: "completed" as const,
              progress: 100,
              result,
              originalWidth,
              originalHeight,
              error: undefined,
            }
          : job,
      ),
    })),
  failJob: (id, error) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? { ...job, status: "error" as const, error, progress: 0 }
          : job,
      ),
    })),
  setJobStatus: (id, status, progress) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? { ...job, status, progress: progress ?? job.progress }
          : job,
      ),
    })),
  requeueCompletedJobs: () =>
    set((state) => ({
      jobs: state.jobs.map((job) => {
        if (job.status !== "completed") return job;
        if (job.result) URL.revokeObjectURL(job.result.url);

        return {
          ...job,
          status: "queued" as const,
          progress: 0,
          result: undefined,
          error: undefined,
        };
      }),
    })),
  retryJob: (id) =>
    set((state) => ({
      jobs: state.jobs.map((job) => {
        if (job.id !== id) return job;
        if (job.result) URL.revokeObjectURL(job.result.url);
        return {
          ...job,
          status: "queued" as const,
          progress: 0,
          error: undefined,
          result: undefined,
        };
      }),
    })),
  removeJob: (id) =>
    set((state) => {
      const job = state.jobs.find((candidate) => candidate.id === id);
      if (job) releaseJobUrls(job);
      return { jobs: state.jobs.filter((candidate) => candidate.id !== id) };
    }),
  clearJobs: () =>
    set((state) => {
      state.jobs.forEach(releaseJobUrls);
      return { jobs: [] };
    }),
  applyPreset: (presetId) => set({ settings: createSettings(presetId) }),
  updateSettings: (patch) =>
    set((state) => ({
      settings: { ...state.settings, ...patch, presetId: "custom" },
    })),
  getRecipe: () => {
    const settings = get().settings;
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
  },
}));
