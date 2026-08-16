import { create } from "zustand";

import {
  areConversionSettingsEqual,
  assignJobsToConversionGroup,
  createConversionSettings,
  resetJobsForConversionChange,
} from "../features/image-processing/conversion-settings.ts";
import type {
  ConversionGroup,
  FileJob,
  FileJobError,
  FileJobResult,
  FileJobStatus,
  ImageConversionSettings,
} from "../features/image-processing/types.ts";
import { sanitizeBaseName } from "../lib/filenames/image-filenames.ts";
import type { PresetId } from "../lib/presets/image-presets.ts";

export const defaultConversionGroupId = "conversion-group-default";

type NewFileJob = Pick<FileJob, "file" | "inputFormat" | "previewUrl">;

type JobGroupOrder = {
  groupId: string;
  jobIds: string[];
};

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
  groups: ConversionGroup[];
  activeGroupId: string;
  selectedJobIds: string[];
  nextGroupNumber: number;
  addJobs: (jobs: NewFileJob[], groupId?: string) => void;
  createGroupWithJobs: (jobs: NewFileJob[]) => void;
  toggleJobSelection: (id: string) => void;
  setAllJobsSelected: (selected: boolean) => void;
  setGroupProcessing: (groupId: string, shouldProcess: boolean) => void;
  setAllJobsProcessing: (shouldProcess: boolean) => void;
  assignJobToGroup: (jobId: string, groupId: string) => void;
  assignSelectedJobsToGroup: (groupId: string) => void;
  applyJobOrder: (groupOrders: JobGroupOrder[], activeGroupId?: string) => void;
  duplicateJob: (id: string) => void;
  createGroup: () => void;
  createGroupForJob: (jobId: string) => void;
  removeGroup: (groupId: string) => void;
  createGroupFromSelectedJobs: () => void;
  createSeparateGroupsFromSelectedJobs: () => number;
  setActiveGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  applyPresetToGroup: (groupId: string, presetId: PresetId) => void;
  updateGroupSettings: (
    groupId: string,
    patch: Partial<Omit<ImageConversionSettings, "presetId">>,
  ) => void;
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
  prepareJobsForProcessing: (ids: string[]) => void;
  retryJob: (id: string) => void;
  removeJob: (id: string) => void;
  removeSelectedJobs: () => number;
  clearJobs: () => void;
};

const activeStatuses: FileJobStatus[] = [
  "loading-engine",
  "decoding",
  "processing",
  "encoding",
];

function createDefaultGroup(): ConversionGroup {
  return {
    id: defaultConversionGroupId,
    name: "1. csoport",
    shouldProcess: true,
    settings: createConversionSettings("general"),
  };
}

function createGroup(
  number: number,
  settings: ImageConversionSettings,
  shouldProcess: boolean,
): ConversionGroup {
  return {
    id: crypto.randomUUID(),
    name: `${number}. csoport`,
    shouldProcess,
    settings: { ...settings },
  };
}

function isActiveJob(job: FileJob): boolean {
  return activeStatuses.includes(job.status);
}

function releaseJobUrls(job: FileJob) {
  URL.revokeObjectURL(job.previewUrl);
  if (job.result) URL.revokeObjectURL(job.result.url);
}

function createDuplicateOutputBaseName(
  sourceBaseName: string,
  jobs: FileJob[],
): string {
  const usedNames = new Set(jobs.map((job) => job.outputBaseName));
  const sourceRoot = sourceBaseName.replace(/-masolat(?:-\d+)?$/i, "");
  const copyRoot = `${sourceRoot.slice(0, 70)}-masolat`;

  if (!usedNames.has(copyRoot)) return copyRoot;

  let suffix = 2;
  while (usedNames.has(`${copyRoot}-${suffix}`)) suffix += 1;
  return `${copyRoot}-${suffix}`;
}

function duplicateJob(
  job: FileJob,
  jobs: FileJob[],
  groupId: string,
  shouldProcess: boolean,
): FileJob {
  return {
    id: crypto.randomUUID(),
    file: job.file,
    inputFormat: job.inputFormat,
    previewUrl: URL.createObjectURL(job.file),
    outputBaseName: createDuplicateOutputBaseName(job.outputBaseName, jobs),
    groupId,
    shouldProcess,
    status: "queued",
    progress: 0,
    originalWidth: job.originalWidth,
    originalHeight: job.originalHeight,
  };
}

function createJobsForGroup(
  jobs: NewFileJob[],
  group: ConversionGroup,
): FileJob[] {
  return jobs.map((job) => ({
    ...job,
    id: crypto.randomUUID(),
    outputBaseName: `${sanitizeBaseName(job.file.name)}-morf`,
    groupId: group.id,
    shouldProcess: group.shouldProcess,
    status: "queued" as const,
    progress: 0,
  }));
}

function updateGroupConfiguration(
  state: Pick<WorkspaceState, "groups" | "jobs">,
  groupId: string,
  settings: ImageConversionSettings,
): Pick<WorkspaceState, "groups" | "jobs"> {
  const group = state.groups.find((candidate) => candidate.id === groupId);

  if (!group || areConversionSettingsEqual(group.settings, settings)) {
    return { groups: state.groups, jobs: state.jobs };
  }

  return {
    groups: state.groups.map((candidate) =>
      candidate.id === groupId
        ? { ...candidate, settings: { ...settings } }
        : candidate,
    ),
    jobs: state.jobs,
  };
}

const initialGroup = createDefaultGroup();

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  jobs: [],
  groups: [initialGroup],
  activeGroupId: initialGroup.id,
  selectedJobIds: [],
  nextGroupNumber: 2,
  addJobs: (jobs, groupId) =>
    set((state) => {
      const targetGroup =
        (groupId
          ? state.groups.find((group) => group.id === groupId)
          : state.groups.find(
              (group) => group.id === defaultConversionGroupId,
            )) ?? state.groups[0];
      if (!targetGroup) return {};

      return {
        jobs: [...state.jobs, ...createJobsForGroup(jobs, targetGroup)],
        activeGroupId: targetGroup.id,
        selectedJobIds: [],
      };
    }),
  createGroupWithJobs: (jobs) =>
    set((state) => {
      if (jobs.length === 0) return {};

      const sourceGroup =
        state.groups.find((group) => group.id === state.activeGroupId) ??
        state.groups[0];
      const group = createGroup(
        state.nextGroupNumber,
        sourceGroup.settings,
        sourceGroup.shouldProcess,
      );

      return {
        groups: [...state.groups, group],
        jobs: [...state.jobs, ...createJobsForGroup(jobs, group)],
        activeGroupId: group.id,
        selectedJobIds: [],
        nextGroupNumber: state.nextGroupNumber + 1,
      };
    }),
  toggleJobSelection: (id) =>
    set((state) => ({
      selectedJobIds: state.selectedJobIds.includes(id)
        ? state.selectedJobIds.filter((jobId) => jobId !== id)
        : [...state.selectedJobIds, id],
    })),
  setAllJobsSelected: (selected) =>
    set((state) => ({
      selectedJobIds: selected
        ? state.jobs.filter((job) => !isActiveJob(job)).map((job) => job.id)
        : [],
    })),
  setGroupProcessing: (groupId, shouldProcess) =>
    set((state) => {
      return {
        groups: state.groups.map((group) =>
          group.id === groupId ? { ...group, shouldProcess } : group,
        ),
        jobs: state.jobs.map((job) =>
          job.groupId === groupId && !isActiveJob(job)
            ? { ...job, shouldProcess }
            : job,
        ),
      };
    }),
  setAllJobsProcessing: (shouldProcess) =>
    set((state) => ({
      groups: state.groups.map((group) => ({ ...group, shouldProcess })),
      jobs: state.jobs.map((job) =>
        isActiveJob(job) ? job : { ...job, shouldProcess },
      ),
    })),
  assignJobToGroup: (jobId, groupId) =>
    set((state) => ({
      jobs: assignJobsToConversionGroup(
        state.jobs,
        state.groups,
        groupId,
        (job) => job.id === jobId,
      ),
    })),
  assignSelectedJobsToGroup: (groupId) =>
    set((state) => {
      const selectedIds = new Set(state.selectedJobIds);

      return {
        jobs: assignJobsToConversionGroup(
          state.jobs,
          state.groups,
          groupId,
          (job) => selectedIds.has(job.id),
        ),
        activeGroupId: groupId,
        selectedJobIds: [],
      };
    }),
  applyJobOrder: (groupOrders, activeGroupId) =>
    set((state) => {
      const validGroupIds = new Set(state.groups.map((group) => group.id));
      const validJobIds = new Set(state.jobs.map((job) => job.id));
      const orderedJobIds = new Set<string>();
      const validOrders = groupOrders.flatMap((order) => {
        if (!validGroupIds.has(order.groupId)) return [];

        const jobIds = order.jobIds.filter((jobId) => {
          if (!validJobIds.has(jobId) || orderedJobIds.has(jobId)) return false;
          orderedJobIds.add(jobId);
          return true;
        });

        return [{ groupId: order.groupId, jobIds }];
      });

      let assignedJobs = state.jobs;
      for (const order of validOrders) {
        const groupJobIds = new Set(order.jobIds);
        assignedJobs = assignJobsToConversionGroup(
          assignedJobs,
          state.groups,
          order.groupId,
          (job) => groupJobIds.has(job.id),
        );
      }

      const jobsById = new Map(assignedJobs.map((job) => [job.id, job]));
      const jobs = [
        ...validOrders.flatMap((order) =>
          order.jobIds.flatMap((jobId) => {
            const job = jobsById.get(jobId);
            return job ? [job] : [];
          }),
        ),
        ...assignedJobs.filter((job) => !orderedJobIds.has(job.id)),
      ];

      return {
        jobs,
        activeGroupId:
          activeGroupId && validGroupIds.has(activeGroupId)
            ? activeGroupId
            : state.activeGroupId,
      };
    }),
  duplicateJob: (id) =>
    set((state) => {
      const sourceJob = state.jobs.find((job) => job.id === id);
      if (!sourceJob || isActiveJob(sourceJob)) return {};

      const sourceGroup = state.groups.find(
        (group) => group.id === sourceJob.groupId,
      );
      const copy = duplicateJob(
        sourceJob,
        state.jobs,
        sourceJob.groupId,
        sourceGroup?.shouldProcess ?? sourceJob.shouldProcess,
      );
      const sourceIndex = state.jobs.findIndex((job) => job.id === id);
      const jobs = [...state.jobs];
      jobs.splice(sourceIndex + 1, 0, copy);

      return { jobs };
    }),
  createGroup: () =>
    set((state) => {
      const sourceGroup =
        state.groups.find((group) => group.id === state.activeGroupId) ??
        state.groups[0];
      const group = createGroup(
        state.nextGroupNumber,
        sourceGroup.settings,
        sourceGroup.shouldProcess,
      );

      return {
        groups: [...state.groups, group],
        activeGroupId: group.id,
        nextGroupNumber: state.nextGroupNumber + 1,
      };
    }),
  createGroupForJob: (jobId) =>
    set((state) => {
      const sourceJob = state.jobs.find((job) => job.id === jobId);
      if (!sourceJob || isActiveJob(sourceJob)) return {};

      const sourceGroup =
        state.groups.find((group) => group.id === sourceJob.groupId) ??
        state.groups[0];
      if (!sourceGroup) return {};

      const group = createGroup(
        state.nextGroupNumber,
        sourceGroup.settings,
        sourceGroup.shouldProcess,
      );
      const groups = [...state.groups, group];

      return {
        groups,
        jobs: assignJobsToConversionGroup(
          state.jobs,
          groups,
          group.id,
          (job) => job.id === jobId,
        ),
        activeGroupId: group.id,
        nextGroupNumber: state.nextGroupNumber + 1,
      };
    }),
  removeGroup: (groupId) =>
    set((state) => {
      const groupIndex = state.groups.findIndex(
        (group) => group.id === groupId,
      );
      if (groupIndex === -1) return {};

      const removedJobs = state.jobs.filter((job) => job.groupId === groupId);
      removedJobs.forEach(releaseJobUrls);

      let groups = state.groups.filter((group) => group.id !== groupId);
      let nextGroupNumber = state.nextGroupNumber;

      if (groups.length === 0) {
        groups = [
          createGroup(
            nextGroupNumber,
            createConversionSettings("general"),
            true,
          ),
        ];
        nextGroupNumber += 1;
      }

      const removedJobIds = new Set(removedJobs.map((job) => job.id));
      const activeGroupId =
        state.activeGroupId === groupId
          ? groups[Math.min(groupIndex, groups.length - 1)].id
          : state.activeGroupId;

      return {
        groups,
        jobs: state.jobs.filter((job) => job.groupId !== groupId),
        activeGroupId,
        selectedJobIds: state.selectedJobIds.filter(
          (jobId) => !removedJobIds.has(jobId),
        ),
        nextGroupNumber,
      };
    }),
  createGroupFromSelectedJobs: () =>
    set((state) => {
      const selectedIds = new Set(state.selectedJobIds);
      const firstSelectedJob = state.jobs.find((job) =>
        selectedIds.has(job.id),
      );
      if (!firstSelectedJob) return {};

      const sourceGroup =
        state.groups.find((group) => group.id === firstSelectedJob.groupId) ??
        state.groups[0];
      const group = createGroup(
        state.nextGroupNumber,
        sourceGroup.settings,
        sourceGroup.shouldProcess,
      );
      const groups = [...state.groups, group];

      return {
        groups,
        jobs: assignJobsToConversionGroup(state.jobs, groups, group.id, (job) =>
          selectedIds.has(job.id),
        ),
        activeGroupId: group.id,
        selectedJobIds: [],
        nextGroupNumber: state.nextGroupNumber + 1,
      };
    }),
  createSeparateGroupsFromSelectedJobs: () => {
    let createdGroupCount = 0;

    set((state) => {
      const selectedIds = new Set(state.selectedJobIds);
      const newGroups: ConversionGroup[] = [];
      const groupIdsByJobId = new Map<string, string>();
      const retainedJobIds = new Set<string>();
      let nextGroupNumber = state.nextGroupNumber;

      const jobsByGroupId = new Map<string, FileJob[]>();
      for (const job of state.jobs) {
        const groupJobs = jobsByGroupId.get(job.groupId) ?? [];
        groupJobs.push(job);
        jobsByGroupId.set(job.groupId, groupJobs);
      }

      for (const groupJobs of jobsByGroupId.values()) {
        const selectedJobs = groupJobs.filter(
          (job) => selectedIds.has(job.id) && !isActiveJob(job),
        );
        const hasUnmovedJob = groupJobs.some(
          (job) => !selectedIds.has(job.id) || isActiveJob(job),
        );

        if (selectedJobs.length > 0 && !hasUnmovedJob) {
          retainedJobIds.add(selectedJobs[0].id);
        }
      }

      for (const job of state.jobs) {
        if (
          !selectedIds.has(job.id) ||
          isActiveJob(job) ||
          retainedJobIds.has(job.id)
        ) {
          continue;
        }

        const sourceGroup =
          state.groups.find((group) => group.id === job.groupId) ??
          state.groups[0];
        const group = createGroup(
          nextGroupNumber,
          sourceGroup.settings,
          sourceGroup.shouldProcess,
        );
        nextGroupNumber += 1;
        newGroups.push(group);
        groupIdsByJobId.set(job.id, group.id);
      }

      if (newGroups.length === 0) {
        return { selectedJobIds: [] };
      }

      createdGroupCount = newGroups.length;

      return {
        groups: [...state.groups, ...newGroups],
        jobs: state.jobs.map((job) => {
          const groupId = groupIdsByJobId.get(job.id);
          return groupId ? { ...job, groupId } : job;
        }),
        activeGroupId: newGroups[0].id,
        selectedJobIds: [],
        nextGroupNumber,
      };
    });

    return createdGroupCount;
  },
  setActiveGroup: (groupId) =>
    set((state) =>
      state.groups.some((group) => group.id === groupId)
        ? { activeGroupId: groupId }
        : {},
    ),
  renameGroup: (groupId, name) =>
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === groupId ? { ...group, name: name.slice(0, 60) } : group,
      ),
    })),
  applyPresetToGroup: (groupId, presetId) =>
    set((state) =>
      updateGroupConfiguration(
        state,
        groupId,
        createConversionSettings(presetId),
      ),
    ),
  updateGroupSettings: (groupId, patch) =>
    set((state) => {
      const group = state.groups.find((candidate) => candidate.id === groupId);
      if (!group) return {};

      return updateGroupConfiguration(state, groupId, {
        ...group.settings,
        ...patch,
        presetId: "custom",
      });
    }),
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
  prepareJobsForProcessing: (ids) =>
    set((state) => {
      const selectedIds = new Set(ids);
      return {
        jobs: resetJobsForConversionChange(state.jobs, (job) =>
          selectedIds.has(job.id),
        ),
      };
    }),
  retryJob: (id) =>
    set((state) => ({
      jobs: state.jobs.map((job) => {
        if (job.id !== id) return job;
        if (job.result) URL.revokeObjectURL(job.result.url);
        return {
          ...job,
          status: "queued" as const,
          shouldProcess: true,
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

      return {
        jobs: state.jobs.filter((candidate) => candidate.id !== id),
        selectedJobIds: state.selectedJobIds.filter((jobId) => jobId !== id),
      };
    }),
  removeSelectedJobs: () => {
    let removedCount = 0;

    set((state) => {
      const selectedIds = new Set(state.selectedJobIds);
      const removableJobs = state.jobs.filter(
        (job) => selectedIds.has(job.id) && !isActiveJob(job),
      );
      if (removableJobs.length === 0) return {};

      removableJobs.forEach(releaseJobUrls);
      const removedIds = new Set(removableJobs.map((job) => job.id));
      removedCount = removableJobs.length;

      return {
        jobs: state.jobs.filter((job) => !removedIds.has(job.id)),
        selectedJobIds: state.selectedJobIds.filter(
          (id) => !removedIds.has(id),
        ),
      };
    });

    return removedCount;
  },
  clearJobs: () =>
    set((state) => {
      state.jobs.forEach(releaseJobUrls);
      const group = createDefaultGroup();

      return {
        jobs: [],
        groups: [group],
        activeGroupId: group.id,
        selectedJobIds: [],
        nextGroupNumber: 2,
      };
    }),
}));
