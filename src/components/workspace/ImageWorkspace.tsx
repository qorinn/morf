import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { proxy, transfer } from "comlink";
import {
  Add01Icon,
  Delete02Icon,
  Download04Icon,
  FileZipIcon,
  FolderDownloadIcon,
  FolderOpenIcon,
  ImageUploadIcon,
  MoreVerticalIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DragDropProvider,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { useDropzone, type DropzoneState } from "react-dropzone";

import {
  MascotAssistant,
  getMascotState,
} from "@/components/mascot/MascotAssistant";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toaster, toast } from "@/components/ui/toast";
import { useErrorToast } from "@/hooks/use-error-toast";
import { getImageConverterMessages, type ImageConverterMessages } from "@/i18n/image-converter";
import type { Locale } from "@/lib/locale";
import {
  DndJobList,
  DndNewGroupTarget,
  imageJobDndType,
  newGroupTarget,
} from "@/components/workspace/DndJobList";
import { FileJobCard } from "@/components/workspace/FileJobCard";
import { LazyImageCollectionItem } from "@/components/workspace/LazyImageCollectionItem";
import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";
import { WorkspaceI18nProvider, useWorkspaceI18n } from "@/components/workspace/WorkspaceI18nProvider";
import {
  createDndGroupOrdersFromItems,
  createDndJobItems,
  type DndJobItems,
} from "@/components/workspace/dnd-job-order";
import {
  conversionSettingsKey,
  conversionSettingsToRecipe,
  getConversionModeLabel,
  getConversionResolutionLabel,
  shouldProcessJobForSettings,
} from "@/features/image-processing/conversion-settings";
import { createProcessingError } from "@/features/image-processing/errors";
import type {
  FileJob,
  FileJobError,
  ImageConversionSettings,
  ProcessProgress,
} from "@/features/image-processing/types";
import { validateImageFile } from "@/features/image-processing/validation";
import { createImageWorker } from "@/features/image-processing/worker-client";
import {
  downloadLazyOutputAsZipParts,
  downloadLazyOutputFiles,
  iterateLazyOutputFiles,
} from "@/features/lazy-image-collections/downloads";
import { removeLazyOutput } from "@/features/lazy-image-collections/output-storage";
import { processLazyImageCollection } from "@/features/lazy-image-collections/process";
import {
  canImportLazyDirectory,
  createDirectoryCollection,
  createFrameSetCollection,
  pickLazyImageDirectory,
} from "@/features/lazy-image-collections/sources";
import {
  lazyCollectionSettingsKey,
  type LazyImageCollection,
} from "@/features/lazy-image-collections/types";
import { createOutputFileNameFromBase } from "@/lib/filenames/image-filenames";
import { cn } from "@/lib/utils";
import {
  downloadFile,
  downloadFiles,
  downloadFilesAsZip,
  getSaveCapabilities,
  isFilePickerCancellation,
  saveFileSequenceToChosenDirectory,
  saveFilesAsZip,
  type SaveCapabilities,
  type SaveableFile,
} from "@/lib/downloads";
import { imageRecipeSchema } from "@/lib/presets/image-presets";
import { useWorkspaceStore } from "@/stores/workspace-store";

type DropError = {
  fileName: string;
  error: FileJobError;
};

const activeStatuses = ["loading-engine", "decoding", "processing", "encoding"];
const acceptedImageTypes =
  "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif";

type GroupDropzoneProps = {
  groupId: string;
  ariaLabel: string;
  disabled: boolean;
  onFiles: (files: File[], groupId: string) => Promise<void>;
  children: (state: Pick<DropzoneState, "isDragActive" | "open">) => ReactNode;
};

function GroupDropzone({
  groupId,
  ariaLabel,
  disabled,
  onFiles,
  children,
}: GroupDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => {
      void onFiles(files, groupId);
    },
    multiple: true,
    noClick: true,
    noKeyboard: true,
    disabled,
  });

  return (
    <div {...getRootProps()} className="h-full min-w-0">
      <input
        {...getInputProps({ accept: acceptedImageTypes })}
        className="sr-only"
        aria-label={ariaLabel}
      />
      {children({ isDragActive, open })}
    </div>
  );
}

function isActiveJob(job: FileJob): boolean {
  return activeStatuses.includes(job.status);
}

function isGroupCardActivationClick(
  target: EventTarget | null,
  groupCard: Element,
): boolean {
  // Ignore events from portaled controls owned by descendants in the React tree.
  if (!(target instanceof Element) || !groupCard.contains(target)) return false;

  const control = target.closest(
    "a, button, input, label, select, textarea, [role=button], [role=checkbox], [role=combobox], [data-slot=input-group], [data-slot=select-trigger]",
  );

  return control === null || control === groupCard;
}

function getConcurrency(): number {
  if (typeof navigator === "undefined") return 1;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 1 : 2;
}

function getCompletedFile(job: FileJob, description: string): SaveableFile | undefined {
  if (!job.result) return undefined;

  return {
    blob: job.result.blob,
    fileName: createOutputFileNameFromBase(
      job.outputBaseName,
      job.result.format,
    ),
    mimeType: job.result.mimeType,
    description,
  };
}

function getCompletedFiles(jobs: FileJob[], description: string): SaveableFile[] {
  return jobs.flatMap((job) => {
    const file = getCompletedFile(job, description);
    return file ? [file] : [];
  });
}

type StandardImageWorkspaceProps = {
  initialFrameSetId?: string;
};

function StandardImageWorkspace({
  initialFrameSetId,
}: StandardImageWorkspaceProps) {
  const { locale, messages } = useWorkspaceI18n<ImageConverterMessages>();
  const copy = messages.workspace;
  const ui = copy.ui;
  const jobs = useWorkspaceStore((state) => state.jobs);
  const groups = useWorkspaceStore((state) => state.groups);
  const activeGroupId = useWorkspaceStore((state) => state.activeGroupId);
  const addJobs = useWorkspaceStore((state) => state.addJobs);
  const selectedJobIds = useWorkspaceStore((state) => state.selectedJobIds);
  const toggleJobSelection = useWorkspaceStore(
    (state) => state.toggleJobSelection,
  );
  const setAllJobsSelected = useWorkspaceStore(
    (state) => state.setAllJobsSelected,
  );
  const setGroupProcessing = useWorkspaceStore(
    (state) => state.setGroupProcessing,
  );
  const setAllJobsProcessing = useWorkspaceStore(
    (state) => state.setAllJobsProcessing,
  );
  const setActiveGroup = useWorkspaceStore((state) => state.setActiveGroup);
  const assignSelectedJobsToGroup = useWorkspaceStore(
    (state) => state.assignSelectedJobsToGroup,
  );
  const applyJobOrder = useWorkspaceStore((state) => state.applyJobOrder);
  const duplicateJob = useWorkspaceStore((state) => state.duplicateJob);
  const createGroupFromSelectedJobs = useWorkspaceStore(
    (state) => state.createGroupFromSelectedJobs,
  );
  const createGroup = useWorkspaceStore((state) => state.createGroup);
  const createGroupForJob = useWorkspaceStore(
    (state) => state.createGroupForJob,
  );
  const createGroupWithJobs = useWorkspaceStore(
    (state) => state.createGroupWithJobs,
  );
  const removeGroup = useWorkspaceStore((state) => state.removeGroup);
  const createSeparateGroupsFromSelectedJobs = useWorkspaceStore(
    (state) => state.createSeparateGroupsFromSelectedJobs,
  );
  const renameGroup = useWorkspaceStore((state) => state.renameGroup);
  const updateJob = useWorkspaceStore((state) => state.updateJob);
  const completeJob = useWorkspaceStore((state) => state.completeJob);
  const renameJob = useWorkspaceStore((state) => state.renameJob);
  const failJob = useWorkspaceStore((state) => state.failJob);
  const setJobStatus = useWorkspaceStore((state) => state.setJobStatus);
  const prepareJobsForProcessing = useWorkspaceStore(
    (state) => state.prepareJobsForProcessing,
  );
  const removeSelectedJobs = useWorkspaceStore(
    (state) => state.removeSelectedJobs,
  );
  const clearJobs = useWorkspaceStore((state) => state.clearJobs);
  const [dropErrors, setDropErrors] = useState<DropError[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string>();
  const [isBatchActive, setIsBatchActive] = useState(false);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState("");
  const [activeSaveAction, setActiveSaveAction] = useState<string>();
  const [fixedBarsHeight, setFixedBarsHeight] = useState(0);
  const [dragItems, setDragItems] = useState<DndJobItems | null>(null);
  const [saveCapabilities, setSaveCapabilities] = useState<SaveCapabilities>({
    file: false,
    directory: false,
  });
  const [lazyCollections, setLazyCollections] = useState<LazyImageCollection[]>(
    [],
  );
  const [canImportDirectory, setCanImportDirectory] = useState(false);

  useErrorToast(workspaceError, messages.processingErrors["encode-failed"].message);
  const fixedBarsRef = useRef<HTMLDivElement>(null);
  const batchRunRef = useRef(false);
  const activeWorkers = useRef(new Map<string, Worker>());
  const cancelRejectors = useRef(new Map<string, () => void>());
  const cancelledJobs = useRef(new Set<string>());
  const dragItemsRef = useRef<DndJobItems | null>(null);
  const dragItemsSnapshotRef = useRef<DndJobItems | null>(null);
  const lazyCollectionsRef = useRef<LazyImageCollection[]>([]);
  const lazyControllers = useRef(new Map<string, AbortController>());
  const importedFrameSetRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (locale !== "en") return;

    groups.forEach((group) => {
      const match = /^(\d+)\. csoport$/u.exec(group.name);
      if (match) renameGroup(group.id, ui.defaultGroupName(Number(match[1])));
    });
  }, [groups, locale, renameGroup, ui]);

  useEffect(() => {
    lazyCollectionsRef.current = lazyCollections;
  }, [lazyCollections]);

  const getOrCreateCollectionGroup = useCallback(
    (name: string) => {
      const state = useWorkspaceStore.getState();
      const reusableGroup = state.groups.find(
        (group) =>
          !state.jobs.some((job) => job.groupId === group.id) &&
          !lazyCollectionsRef.current.some(
            (collection) => collection.groupId === group.id,
          ),
      );

      if (reusableGroup) {
        renameGroup(reusableGroup.id, name);
        setActiveGroup(reusableGroup.id);
        return reusableGroup.id;
      }

      createGroup();
      const groupId = useWorkspaceStore.getState().activeGroupId;
      renameGroup(groupId, name);
      return groupId;
    },
    [createGroup, renameGroup, setActiveGroup],
  );

  const importDirectoryCollection = useCallback(async () => {
    if (isBatchActive) return;
    setWorkspaceError(undefined);
    try {
      const directory = await pickLazyImageDirectory();
      const draft = await createDirectoryCollection(directory, "");
      const groupId = getOrCreateCollectionGroup(directory.name);
      const collection = { ...draft, groupId };
      setLazyCollections((current) => [...current, collection]);
      setActiveGroup(groupId);
      toast.add({
        type: "success",
        title: copy.importFolderSuccess,
        description: `${ui.imageCount(collection.itemCount)} · ${directory.name}`,
      });
    } catch (error) {
      if (!isFilePickerCancellation(error)) {
        setWorkspaceError(
          error instanceof Error
            ? error.message
            : ui.folderImportFailed,
        );
      }
    }
  }, [copy.importFolderSuccess, getOrCreateCollectionGroup, isBatchActive, setActiveGroup, ui]);

  useEffect(() => {
    setCanImportDirectory(canImportLazyDirectory());
  }, []);

  useEffect(() => {
    if (
      !initialFrameSetId ||
      importedFrameSetRef.current === initialFrameSetId
    ) {
      return;
    }
    let cancelled = false;

    void createFrameSetCollection(initialFrameSetId, "")
      .then((draft) => {
        if (cancelled) return;
        importedFrameSetRef.current = initialFrameSetId;
        const groupId = getOrCreateCollectionGroup(
          locale === "en" ? "Frames from video" : "Videóból készült képek",
        );
        setLazyCollections((current) => [...current, { ...draft, groupId }]);
        setActiveGroup(groupId);
      })
      .catch((error) => {
        if (!cancelled) {
          setWorkspaceError(
            error instanceof Error
              ? error.message
              : ui.localCollectionUnavailable,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getOrCreateCollectionGroup, initialFrameSetId, locale, setActiveGroup]);

  const groupIds = useMemo(() => groups.map((group) => group.id), [groups]);
  const workspaceDndItems = useMemo(
    () => createDndJobItems(groupIds, jobs),
    [groupIds, jobs],
  );
  const jobsById = useMemo(
    () => new Map(jobs.map((job) => [job.id, job])),
    [jobs],
  );
  const displayedDndItems = dragItems ?? workspaceDndItems;

  const validateFiles = useCallback(
    async (files: File[]) => {
      if (isBatchActive) return;

      setDropErrors([]);
      setWorkspaceError(undefined);
      const results = await Promise.all(
        files.map(async (file) => ({
          file,
          validation: await validateImageFile(file),
        })),
      );
      const validJobs: Array<
        Pick<FileJob, "file" | "inputFormat" | "previewUrl">
      > = [];
      const errors: DropError[] = [];

      for (const result of results) {
        if (result.validation.valid) {
          validJobs.push({
            file: result.file,
            inputFormat: result.validation.format,
            previewUrl: URL.createObjectURL(result.file),
          });
        } else {
          errors.push({
            fileName: result.file.name,
            error: result.validation.error,
          });
        }
      }

      setDropErrors(errors);

      return validJobs;
    },
    [isBatchActive],
  );

  const addFilesToGroup = useCallback(
    async (files: File[], groupId: string) => {
      const validJobs = await validateFiles(files);
      if (validJobs && validJobs.length > 0) addJobs(validJobs, groupId);
    },
    [addJobs, validateFiles],
  );

  const addFilesToNewGroup = useCallback(
    async (files: File[]) => {
      const validJobs = await validateFiles(files);
      if (validJobs && validJobs.length > 0) createGroupWithJobs(validJobs);
    },
    [createGroupWithJobs, validateFiles],
  );

  const clearJobDragPreview = useCallback(() => {
    dragItemsRef.current = null;
    dragItemsSnapshotRef.current = null;
    setDragItems(null);
  }, []);

  const handleJobDragStart = useCallback(
    (event: DragStartEvent) => {
      if (event.operation.source?.type !== imageJobDndType) return;

      const snapshot = structuredClone(workspaceDndItems);
      dragItemsSnapshotRef.current = snapshot;
      dragItemsRef.current = snapshot;
      setDragItems(snapshot);
    },
    [workspaceDndItems],
  );

  const handleJobDragOver = useCallback(
    (event: DragOverEvent) => {
      if (event.operation.source?.type !== imageJobDndType) return;

      setDragItems((currentItems) => {
        const items =
          currentItems ??
          dragItemsRef.current ??
          dragItemsSnapshotRef.current ??
          workspaceDndItems;
        const nextItems = move(items, event);

        dragItemsRef.current = nextItems;
        return nextItems;
      });
    },
    [workspaceDndItems],
  );

  const handleJobDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { source, target } = event.operation;
      const finalItems = dragItemsRef.current;

      if (
        source?.type === imageJobDndType &&
        !event.canceled &&
        target?.id === newGroupTarget
      ) {
        createGroupForJob(String(source.id));
        clearJobDragPreview();
        return;
      }

      if (
        source?.type !== imageJobDndType ||
        event.canceled ||
        !target ||
        !finalItems
      ) {
        clearJobDragPreview();
        return;
      }

      const jobId = String(source.id);
      const targetGroupId = groupIds.find((groupId) =>
        finalItems[groupId]?.includes(jobId),
      );
      if (!targetGroupId) {
        clearJobDragPreview();
        return;
      }

      applyJobOrder(
        createDndGroupOrdersFromItems(groupIds, finalItems),
        targetGroupId,
      );
      clearJobDragPreview();
    },
    [applyJobOrder, clearJobDragPreview, createGroupForJob, groupIds],
  );

  const processOneJob = useCallback(
    async (job: FileJob, settings: ImageConversionSettings) => {
      const recipeResult = imageRecipeSchema.safeParse(
        conversionSettingsToRecipe(settings),
      );

      if (!recipeResult.success) {
        failJob(job.id, {
          category: "invalid-settings",
          message: messages.processingErrors["invalid-settings"].message,
          suggestion: ui.invalidSettingsSuggestion,
          detail: recipeResult.error.message,
        });
        return;
      }

      let handle: ReturnType<typeof createImageWorker> | undefined;

      try {
        handle = createImageWorker();
        activeWorkers.current.set(job.id, handle.worker);
        setJobStatus(job.id, "loading-engine", 2);

        const cancellation = new Promise<never>((_, reject) => {
          cancelRejectors.current.set(job.id, () =>
            reject(
              new DOMException(messages.processingErrors.cancelled.message, "AbortError"),
            ),
          );
        });
        const buffer = await job.file.arrayBuffer();
        const request = transfer(
          {
            buffer,
            inputFormat: job.inputFormat,
            recipe: recipeResult.data,
          },
          [buffer],
        );
        const result = await Promise.race([
          handle.api.processImage(
            request,
            proxy((progress: ProcessProgress) => {
              if (!cancelledJobs.current.has(job.id)) {
                updateJob(job.id, {
                  status: progress.status,
                  progress: progress.value,
                });
              }
            }),
          ),
          cancellation,
        ]);

        if (cancelledJobs.current.has(job.id)) return;

        const blob = new Blob([result.buffer], { type: result.mimeType });
        const outputUrl = URL.createObjectURL(blob);
        completeJob(
          job.id,
          {
            blob,
            url: outputUrl,
            format: recipeResult.data.outputFormat,
            width: result.width,
            height: result.height,
            size: blob.size,
            mimeType: result.mimeType,
            settingsKey: conversionSettingsKey(settings),
          },
          result.originalWidth,
          result.originalHeight,
        );
      } catch (error) {
        if (!cancelledJobs.current.has(job.id)) {
          failJob(job.id, createProcessingError(error, locale));
        }
      } finally {
        handle?.worker.terminate();
        activeWorkers.current.delete(job.id);
        cancelRejectors.current.delete(job.id);
        cancelledJobs.current.delete(job.id);
      }
    },
    [completeJob, failJob, locale, setJobStatus, updateJob],
  );

  const processOneLazyCollection = useCallback(
    async (
      collection: LazyImageCollection,
      settings: ImageConversionSettings,
    ): Promise<number> => {
      const controller = new AbortController();
      lazyControllers.current.set(collection.id, controller);
      setLazyCollections((current) =>
        current.map((candidate) =>
          candidate.id === collection.id
            ? {
                ...candidate,
                status: "loading-engine",
                progress: 1,
                completedCount: 0,
                outputBytes: 0,
                outputManifest: undefined,
                errorMessage: undefined,
              }
            : candidate,
        ),
      );

      try {
        const manifest = await processLazyImageCollection(
          collection,
          settings,
          controller.signal,
          (progress) => {
            const totalProgress =
              progress.totalCount > 0
                ? ((progress.completedCount + progress.activeProgress / 100) /
                    progress.totalCount) *
                  100
                : 0;
            setLazyCollections((current) =>
              current.map((candidate) =>
                candidate.id === collection.id
                  ? {
                      ...candidate,
                      status: progress.status,
                      progress: totalProgress,
                      completedCount: progress.completedCount,
                      outputBytes: progress.outputBytes,
                    }
                  : candidate,
              ),
            );
          },
        );
        setLazyCollections((current) =>
          current.map((candidate) =>
            candidate.id === collection.id
              ? {
                  ...candidate,
                  status: "completed",
                  progress: 100,
                  completedCount: manifest.completedCount,
                  outputBytes: manifest.totalBytes,
                  outputManifest: manifest,
                  settingsKey: lazyCollectionSettingsKey(settings),
                  errorMessage: undefined,
                }
              : candidate,
          ),
        );
        return manifest.completedCount;
      } catch (error) {
        const cancelled =
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError");
        setLazyCollections((current) =>
          current.map((candidate) =>
            candidate.id === collection.id
              ? {
                  ...candidate,
                  status: cancelled ? "cancelled" : "error",
                  progress: 0,
                  errorMessage: cancelled
                    ? undefined
                    : error instanceof Error
                      ? error.message
                      : String(error),
                }
              : candidate,
          ),
        );
        return 0;
      } finally {
        lazyControllers.current.delete(collection.id);
      }
    },
    [],
  );

  const startProcessing = useCallback(async () => {
    if (batchRunRef.current) return;
    if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
      setWorkspaceError(
        ui.browserUnsupported,
      );
      return;
    }

    let state = useWorkspaceStore.getState();
    const processableJobIds = state.jobs.flatMap((job) => {
      if (!job.shouldProcess) return [];
      const group = state.groups.find(
        (candidate) => candidate.id === job.groupId,
      );
      return group?.shouldProcess &&
        shouldProcessJobForSettings(job, group.settings)
        ? [job.id]
        : [];
    });
    const staleJobIds = processableJobIds.filter((jobId) =>
      state.jobs.some((job) => job.id === jobId && job.status === "completed"),
    );
    if (staleJobIds.length > 0) {
      prepareJobsForProcessing(staleJobIds);
      state = useWorkspaceStore.getState();
    }
    const processableJobIdSet = new Set(processableJobIds);
    const queuedJobs = state.jobs.flatMap((job) => {
      if (!processableJobIdSet.has(job.id) || job.status !== "queued") {
        return [];
      }
      const group = state.groups.find(
        (candidate) => candidate.id === job.groupId,
      );
      return group ? [{ job, settings: { ...group.settings } }] : [];
    });
    const queuedCollections = lazyCollections.flatMap((collection) => {
      const group = state.groups.find(
        (candidate) => candidate.id === collection.groupId,
      );
      const needsProcessing =
        collection.status === "queued" ||
        (collection.status === "completed" &&
          collection.settingsKey !==
            (group ? lazyCollectionSettingsKey(group.settings) : undefined));
      return group?.shouldProcess && needsProcessing
        ? [{ collection, settings: { ...group.settings } }]
        : [];
    });

    if (queuedJobs.length === 0 && queuedCollections.length === 0) return;

    batchRunRef.current = true;
    setIsBatchActive(true);
    setWorkspaceError(undefined);
    let cursor = 0;

    const runNext = async () => {
      while (cursor < queuedJobs.length) {
        const queuedJob = queuedJobs[cursor];
        cursor += 1;
        await processOneJob(queuedJob.job, queuedJob.settings);
      }
    };

    try {
      if (queuedJobs.length > 0) {
        await Promise.all(
          Array.from(
            { length: Math.min(getConcurrency(), queuedJobs.length) },
            runNext,
          ),
        );
      }

      let completedLazyCount = 0;
      for (const queuedCollection of queuedCollections) {
        completedLazyCount += await processOneLazyCollection(
          queuedCollection.collection,
          queuedCollection.settings,
        );
      }

      const completedJobCount = queuedJobs.filter(({ job }) =>
        useWorkspaceStore
          .getState()
          .jobs.some(
            (candidate) =>
              candidate.id === job.id && candidate.status === "completed",
          ),
      ).length;

      if (completedJobCount + completedLazyCount > 0) {
        toast.add({
          type: "success",
          title: copy.filesCompleted,
          description: ui.completedToast(completedJobCount + completedLazyCount),
        });
      }
    } finally {
      batchRunRef.current = false;
      setIsBatchActive(false);
    }
  }, [
    lazyCollections,
    prepareJobsForProcessing,
    processOneJob,
    processOneLazyCollection,
  ]);

  const updateJobDimensions = useCallback(
    (id: string, width: number, height: number) => {
      updateJob(id, { originalWidth: width, originalHeight: height });
    },
    [updateJob],
  );

  const duplicateOne = useCallback(
    (id: string) => {
      duplicateJob(id);
      toast.add({
        type: "success",
        title: ui.duplicateTitle,
        description: ui.duplicateDescription,
      });
    },
    [duplicateJob],
  );

  const downloadOne = useCallback((id: string) => {
    const job = useWorkspaceStore
      .getState()
      .jobs.find((candidate) => candidate.id === id);
    if (!job) return;

    const file = getCompletedFile(job, ui.imageDescription);
    if (file) downloadFile(file);
  }, [ui.imageDescription]);

  const removeSelected = useCallback(() => {
    const removedCount = removeSelectedJobs();
    if (removedCount === 0) return;

    toast.add({
      type: "success",
      title: ui.deletedTitle,
      description: ui.deletedDescription(removedCount),
    });
  }, [removeSelectedJobs]);

  const cancelLazyCollection = useCallback((collectionId: string) => {
    lazyControllers.current.get(collectionId)?.abort();
  }, []);

  const retryLazyCollection = useCallback((collectionId: string) => {
    setLazyCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              status: "queued",
              progress: 0,
              completedCount: 0,
              outputBytes: 0,
              outputManifest: undefined,
              errorMessage: undefined,
              settingsKey: undefined,
            }
          : collection,
      ),
    );
  }, []);

  const removeWorkspaceGroup = useCallback(
    (groupId: string) => {
      const collections = lazyCollectionsRef.current.filter(
        (collection) => collection.groupId === groupId,
      );
      for (const collection of collections) {
        lazyControllers.current.get(collection.id)?.abort();
        void removeLazyOutput(collection.id).catch(() => undefined);
      }
      setLazyCollections((current) =>
        current.filter((collection) => collection.groupId !== groupId),
      );
      removeGroup(groupId);
    },
    [removeGroup],
  );

  const runSaveAction = useCallback(
    async (action: string, operation: () => Promise<void>) => {
      setActiveSaveAction(action);
      setWorkspaceError(undefined);

      try {
        await operation();
      } catch (error) {
        if (!isFilePickerCancellation(error)) {
          setWorkspaceError(
            `A mentés nem sikerült: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      } finally {
        setActiveSaveAction(undefined);
      }
    },
    [],
  );

  const downloadAllFiles = useCallback(() => {
    void runSaveAction("files-download", async () => {
      const files = getCompletedFiles(useWorkspaceStore.getState().jobs, ui.imageDescription);
      downloadFiles(files);
      for (const collection of lazyCollectionsRef.current) {
        if (collection.status !== "completed" || !collection.outputManifest) {
          continue;
        }
        await downloadLazyOutputFiles(collection.outputManifest, () => {});
      }
    });
  }, [runSaveAction, ui.imageDescription]);

  const saveAllFilesAs = useCallback(() => {
    void runSaveAction("files-as", async () => {
      const files = getCompletedFiles(useWorkspaceStore.getState().jobs, ui.imageDescription);
      const collections = lazyCollectionsRef.current.filter(
        (collection) =>
          collection.status === "completed" && collection.outputManifest,
      );
      async function* iterateAllCompletedFiles(): AsyncGenerator<SaveableFile> {
        yield* files;
        for (const collection of collections) {
          if (!collection.outputManifest) continue;
          yield* iterateLazyOutputFiles(collection.outputManifest);
        }
      }
      await saveFileSequenceToChosenDirectory(iterateAllCompletedFiles());
    });
  }, [runSaveAction, ui.imageDescription]);

  const downloadZip = useCallback(() => {
    void runSaveAction("zip-download", async () => {
      const files = getCompletedFiles(useWorkspaceStore.getState().jobs, ui.imageDescription);
      if (files.length > 0) {
        await downloadFilesAsZip(files, "morf-kepek.zip");
      }
      for (const collection of lazyCollectionsRef.current) {
        if (collection.status !== "completed" || !collection.outputManifest) {
          continue;
        }
        await downloadLazyOutputAsZipParts(
          collection.outputManifest,
          `${collection.name.replace(/\.[^.]+$/u, "")}-morf`,
          () => {},
        );
      }
    });
  }, [runSaveAction, ui.imageDescription]);

  const saveZipAs = useCallback(() => {
    void runSaveAction("zip-as", async () => {
      const files = getCompletedFiles(useWorkspaceStore.getState().jobs, ui.imageDescription);
      await saveFilesAsZip(files, "morf-kepek.zip");
    });
  }, [runSaveAction, ui.imageDescription]);

  useEffect(() => {
    setSaveCapabilities(getSaveCapabilities());
  }, []);

  useEffect(() => {
    const fixedBars = fixedBarsRef.current;
    if (!fixedBars) {
      setFixedBarsHeight(0);
      return;
    }

    const updateFixedBarsHeight = () => {
      setFixedBarsHeight(Math.ceil(fixedBars.getBoundingClientRect().height));
    };
    const resizeObserver = new ResizeObserver(updateFixedBarsHeight);

    updateFixedBarsHeight();
    resizeObserver.observe(fixedBars);

    return () => resizeObserver.disconnect();
  }, [jobs.length, lazyCollections.length]);

  useEffect(() => {
    if (
      bulkTargetGroupId &&
      bulkTargetGroupId !== newGroupTarget &&
      !groups.some((group) => group.id === bulkTargetGroupId)
    ) {
      setBulkTargetGroupId("");
    }
  }, [bulkTargetGroupId, groups]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!batchRunRef.current) return;
      event.preventDefault();
      Reflect.set(event, "returnValue", "");
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, []);

  useEffect(
    () => () => {
      activeWorkers.current.forEach((worker) => worker.terminate());
      lazyControllers.current.forEach((controller) => controller.abort());
      useWorkspaceStore.getState().clearJobs();
    },
    [],
  );

  const completedFileJobCount = jobs.filter(
    (job) => job.status === "completed",
  ).length;
  const completedLazyCount = lazyCollections.reduce(
    (total, collection) =>
      total +
      (collection.status === "completed" ? collection.completedCount : 0),
    0,
  );
  const completedCount = completedFileJobCount + completedLazyCount;
  const failedCount =
    jobs.filter((job) => job.status === "error").length +
    lazyCollections.filter((collection) => collection.status === "error")
      .length;
  const selectedCount = selectedJobIds.filter((id) =>
    jobs.some((job) => job.id === id),
  ).length;
  const processIncludedCount =
    jobs.filter(
      (job) =>
        job.shouldProcess &&
        groups.some((group) => group.id === job.groupId && group.shouldProcess),
    ).length +
    lazyCollections.reduce(
      (total, collection) =>
        total +
        (groups.some(
          (group) => group.id === collection.groupId && group.shouldProcess,
        )
          ? collection.itemCount
          : 0),
      0,
    );
  const processableCount =
    jobs.filter((job) => {
      if (!job.shouldProcess) return false;
      const group = groups.find((candidate) => candidate.id === job.groupId);
      return Boolean(
        group?.shouldProcess &&
        shouldProcessJobForSettings(job, group.settings),
      );
    }).length +
    lazyCollections.reduce((total, collection) => {
      const group = groups.find(
        (candidate) => candidate.id === collection.groupId,
      );
      const needsProcessing =
        collection.status === "queued" ||
        (collection.status === "completed" &&
          collection.settingsKey !==
            (group ? lazyCollectionSettingsKey(group.settings) : undefined));
      return (
        total +
        (group?.shouldProcess && needsProcessing ? collection.itemCount : 0)
      );
    }, 0);
  const totalInputCount =
    jobs.length +
    lazyCollections.reduce(
      (total, collection) => total + collection.itemCount,
      0,
    );
  const hasInputs = totalInputCount > 0;
  const allGroupsIncluded =
    groups.every((group) => group.shouldProcess) && groups.length > 0;
  const groupItems = [
    ...groups.map((group) => ({
      label: `${group.name} · ${group.settings.outputFormat.toUpperCase()} · ${getConversionModeLabel(group.settings, locale)}`,
      value: group.id,
    })),
    { label: ui.newSharedGroup, value: newGroupTarget },
  ];
  const representativeJob =
    jobs.find(isActiveJob) ??
    jobs.find((job) => job.status === "error") ??
    [...jobs].reverse().find((job) => job.status === "completed") ??
    jobs[0];
  const representativeCollection =
    lazyCollections.find((collection) =>
      activeStatuses.includes(collection.status),
    ) ??
    lazyCollections.find((collection) => collection.status === "error") ??
    lazyCollections.find((collection) => collection.status === "completed") ??
    lazyCollections[0];
  const representativeStatus =
    representativeJob?.status ?? representativeCollection?.status;
  const mascotState = getMascotState(representativeStatus);
  const mascotCopy = useMemo(() => {
    if (isBatchActive) {
      return {
        title: ui.processingTitle,
        message: ui.processingMessage,
      };
    }
    if (representativeStatus === "error") {
      return {
        title: ui.errorTitle,
        message: ui.errorMessage,
      };
    }
    if (completedCount > 0) {
      return {
        title: copy.filesCompleted,
        message: ui.completedMessage(completedCount),
      };
    }
    return {
      title: ui.readyTitle,
      message: ui.readyMessage,
    };
  }, [completedCount, isBatchActive, representativeStatus, ui]);
  return (
    <section
      id="workspace"
      className="border-border bg-surface-subtle border-b"
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8",
          hasInputs &&
            (selectedCount > 0
              ? "pb-80 sm:pb-56 lg:pb-44"
              : "pb-56 sm:pb-40 lg:pb-32"),
        )}
      >
        <MascotAssistant
          state={mascotState}
          title={mascotCopy.title}
          message={mascotCopy.message}
        />

        {workspaceError && (
          <Alert variant="destructive">
            <AlertTitle>{ui.workspaceErrorTitle}</AlertTitle>
            <AlertDescription>{workspaceError}</AlertDescription>
          </Alert>
        )}

        {dropErrors.map(({ fileName, error }) => (
          <Alert key={`${fileName}-${error.category}`} variant="destructive">
            <AlertTitle>{fileName}</AlertTitle>
            <AlertDescription>
              {error.message} {error.suggestion}
            </AlertDescription>
          </Alert>
        ))}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div className="flex flex-col gap-1">
                  <h3 className="font-heading text-2xl font-medium">
                    {ui.groupsTitle}
                  </h3>
                  <p
                    className="text-muted-foreground text-sm"
                    aria-live="polite"
                  >
                    {ui.groupSummary(totalInputCount, groups.length, selectedCount, processIncludedCount, completedCount, failedCount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canImportDirectory && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBatchActive}
                      onClick={() => void importDirectoryCollection()}
                    >
                      <HugeiconsIcon
                        icon={FolderOpenIcon}
                        strokeWidth={2}
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      {ui.importFolder}
                    </Button>
                  )}
                  {jobs.length > 0 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          isBatchActive || selectedCount === jobs.length
                        }
                        onClick={() => setAllJobsSelected(true)}
                      >
                        {ui.selectAll}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isBatchActive || selectedCount === 0}
                        onClick={() => setAllJobsSelected(false)}
                      >
                        {ui.clearSelection}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isBatchActive}
                        onClick={clearJobs}
                      >
                        {ui.clearList}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <DragDropProvider
                onDragStart={handleJobDragStart}
                onDragOver={handleJobDragOver}
                onDragEnd={handleJobDragEnd}
              >
                <div className="grid items-stretch gap-4 lg:grid-cols-3">
                  {groups.map((group) => {
                    const groupJobs = (
                      displayedDndItems[group.id] ?? []
                    ).flatMap((jobId) => {
                      const job = jobsById.get(jobId);
                      return job ? [job] : [];
                    });
                    const presetName =
                      messages.presets[group.settings.presetId].name;
                    const groupCollections = lazyCollections.filter(
                      (collection) => collection.groupId === group.id,
                    );
                    const groupImageCount =
                      groupJobs.length +
                      groupCollections.reduce(
                        (total, collection) => total + collection.itemCount,
                        0,
                      );

                    return (
                      <GroupDropzone
                        key={group.id}
                        groupId={group.id}
                        ariaLabel={`${ui.addImages}: ${group.name}`}
                        disabled={isBatchActive}
                        onFiles={addFilesToGroup}
                      >
                        {({ isDragActive, open }) => (
                          <Card
                            size="sm"
                            data-selected={
                              activeGroupId === group.id ? "true" : undefined
                            }
                            role="button"
                            tabIndex={isBatchActive ? -1 : 0}
                            aria-pressed={activeGroupId === group.id}
                            aria-disabled={isBatchActive || undefined}
                            aria-label={`${group.name}: ${ui.groupsTitle}`}
                            className={cn(
                              "border-foreground/20 relative min-h-96 border bg-card shadow-none ring-0 [--card-spacing:--spacing(3)] data-[selected=true]:border-ring data-[selected=true]:ring-2 data-[selected=true]:ring-ring/20 lg:h-[32rem]",
                              isDragActive && "border-ring ring-2 ring-ring/20",
                            )}
                            onClick={(event) => {
                              if (
                                !isBatchActive &&
                                isGroupCardActivationClick(
                                  event.target,
                                  event.currentTarget,
                                )
                              ) {
                                setActiveGroup(group.id);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.target !== event.currentTarget ||
                                isBatchActive ||
                                (event.key !== "Enter" && event.key !== " ")
                              ) {
                                return;
                              }

                              event.preventDefault();
                              setActiveGroup(group.id);
                            }}
                          >
                            <CardHeader>
                              <div className="flex min-w-0 flex-col gap-2">
                                <div className="flex min-w-0 items-center gap-1">
                                  <Checkbox
                                    id={`process-group-${group.id}`}
                                    checked={group.shouldProcess}
                                    disabled={isBatchActive}
                                    aria-label={`${copy.startConversion}: ${group.name}`}
                                    onCheckedChange={(checked) =>
                                      setGroupProcessing(
                                        group.id,
                                        checked === true,
                                      )
                                    }
                                  />
                                  <Input
                                    className="font-heading hover:border-border/60 focus-visible:bg-background border-transparent bg-transparent px-1 text-base font-medium shadow-none"
                                    aria-label={`${group.name}: ${ui.groupMenu}`}
                                    value={group.name}
                                    maxLength={60}
                                    disabled={isBatchActive}
                                    onFocus={() => setActiveGroup(group.id)}
                                    onChange={(event) =>
                                      renameGroup(group.id, event.target.value)
                                    }
                                    onBlur={(event) => {
                                      const name = event.target.value.trim();
                                      renameGroup(
                                        group.id,
                                        name || ui.unnamedGroup,
                                      );
                                    }}
                                  />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge variant="secondary">
                                    {presetName}
                                  </Badge>
                                  <Badge variant="outline">
                                    {group.settings.outputFormat.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline">
                                    {group.settings.lossless
                                      ? getConversionResolutionLabel(group.settings, locale)
                                      : `max. ${getConversionResolutionLabel(group.settings, locale)}`}
                                  </Badge>
                                  <Badge variant="outline">
                                    {getConversionModeLabel(group.settings, locale)}
                                  </Badge>
                                  <Badge variant="outline">
                                    {ui.imageCount(groupImageCount)}
                                  </Badge>
                                </div>
                              </div>
                              <CardAction className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label={`${ui.addImages}: ${group.name}`}
                                  title={ui.addImages}
                                  disabled={isBatchActive}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    open();
                                  }}
                                >
                                  <HugeiconsIcon
                                    icon={ImageUploadIcon}
                                    strokeWidth={2}
                                    aria-hidden="true"
                                  />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="ghost"
                                      />
                                    }
                                    aria-label={`${ui.groupMenu}: ${group.name}`}
                                    title={ui.groupMenu}
                                    disabled={isBatchActive}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <HugeiconsIcon
                                      icon={MoreVerticalIcon}
                                      strokeWidth={2}
                                      aria-hidden="true"
                                    />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuGroup>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() =>
                                          removeWorkspaceGroup(group.id)
                                        }
                                      >
                                        <HugeiconsIcon
                                          icon={Delete02Icon}
                                          strokeWidth={2}
                                          aria-hidden="true"
                                        />
                                        {ui.deleteGroup}
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </CardAction>
                            </CardHeader>
                            <Separator className="bg-foreground/20" />
                            <CardContent className="min-h-0 flex-1 overflow-y-auto py-px">
                              <div className="flex min-h-full flex-col gap-2">
                                {groupCollections.map((collection) => (
                                  <LazyImageCollectionItem
                                    key={collection.id}
                                    collection={collection}
                                    disabled={
                                      isBatchActive || Boolean(activeSaveAction)
                                    }
                                    onCancel={() =>
                                      cancelLazyCollection(collection.id)
                                    }
                                    onRetry={() =>
                                      retryLazyCollection(collection.id)
                                    }
                                  />
                                ))}

                                <DndJobList
                                  groupId={group.id}
                                  ariaLabel={ui.groupImages(group.name)}
                                  disabled={isBatchActive}
                                  className={cn(
                                    groupImageCount === 0
                                      ? "grid flex-1 place-items-center"
                                      : "flex flex-col gap-2",
                                  )}
                                >
                                  {groupImageCount === 0 ? (
                                    <div
                                      className={cn(
                                        "morf-group-dropzone-radius border-foreground/20 flex size-full min-h-48 flex-col items-center justify-center gap-3 border border-dashed p-6 text-center",
                                        isDragActive && "border-ring",
                                      )}
                                    >
                                      <p className="text-muted-foreground text-sm">
                                        {isDragActive
                                          ? ui.releaseImages
                                          : ui.dropImages}
                                      </p>
                                      <Button
                                        type="button"
                                        disabled={isBatchActive}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          open();
                                        }}
                                      >
                                        <HugeiconsIcon
                                          icon={ImageUploadIcon}
                                          strokeWidth={2}
                                          data-icon="inline-start"
                                          aria-hidden="true"
                                        />
                                        {ui.chooseImages}
                                      </Button>
                                      <p className="text-muted-foreground text-xs">
                                        {ui.supportedFormats}
                                      </p>
                                    </div>
                                  ) : (
                                    groupJobs.map((job, jobIndex) => (
                                      <FileJobCard
                                        key={job.id}
                                        job={job}
                                        group={group}
                                        sortIndex={jobIndex}
                                        isSelected={selectedJobIds.includes(
                                          job.id,
                                        )}
                                        onDimensions={updateJobDimensions}
                                        onDownload={downloadOne}
                                        onDuplicate={duplicateOne}
                                        onRename={renameJob}
                                        onSelectionChange={toggleJobSelection}
                                        selectionDisabled={isBatchActive}
                                        dragDisabled={isBatchActive}
                                      />
                                    ))
                                  )}
                                </DndJobList>
                              </div>
                            </CardContent>
                            {isDragActive && groupImageCount > 0 && (
                              <div
                                className="bg-card/95 pointer-events-none absolute inset-0 z-10 grid place-items-center p-4"
                                role="status"
                              >
                                <div className="morf-group-dropzone-radius border-ring flex min-h-40 w-full flex-col items-center justify-center gap-3 border border-dashed p-6 text-center">
                                  <span className="border-ring text-ring flex size-12 items-center justify-center rounded-full border">
                                    <HugeiconsIcon
                                      icon={ImageUploadIcon}
                                      strokeWidth={2}
                                      aria-hidden="true"
                                    />
                                  </span>
                                  <div className="flex flex-col gap-1">
                                    <p className="font-heading text-base font-medium">
                                      {ui.releaseImages}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                      {ui.droppedInGroup}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Card>
                        )}
                      </GroupDropzone>
                    );
                  })}

                  <GroupDropzone
                    groupId={newGroupTarget}
                    ariaLabel={ui.chooseImagesForNewGroup}
                    disabled={isBatchActive}
                    onFiles={async (files) => addFilesToNewGroup(files)}
                  >
                    {({ isDragActive, open }) => (
                      <DndNewGroupTarget disabled={isBatchActive}>
                        {(isDndActive) => (
                          <Card
                            size="sm"
                            role="button"
                            tabIndex={isBatchActive ? -1 : 0}
                            aria-disabled={isBatchActive || undefined}
                            aria-label={ui.createNewGroup}
                            className={cn(
                              "border-foreground/20 h-full min-h-96 border border-dashed shadow-none [--card-spacing:--spacing(3)] bg-transparent hover:bg-card/50 lg:h-[32rem]",
                              (isDragActive || isDndActive) &&
                                "border-ring ring-ring/20 ring-2",
                            )}
                            onClick={() => {
                              if (!isBatchActive) createGroup();
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.target !== event.currentTarget ||
                                isBatchActive ||
                                (event.key !== "Enter" && event.key !== " ")
                              ) {
                                return;
                              }
                              event.preventDefault();
                              createGroup();
                            }}
                          >
                            <CardContent className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
                              <span
                                className={cn(
                                  "border-primary text-primary flex size-12 items-center justify-center rounded-full border",
                                  (isDragActive || isDndActive) &&
                                    "border-ring text-ring",
                                )}
                              >
                                <HugeiconsIcon
                                  icon={
                                    isDragActive || isDndActive
                                      ? ImageUploadIcon
                                      : Add01Icon
                                  }
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                              </span>
                              <div className="flex flex-col gap-1">
                                <p className="font-heading text-lg font-medium">
                                  {isDndActive
                                    ? ui.releaseImage
                                    : isDragActive
                                      ? ui.releaseImages
                                      : ui.newGroup}
                                </p>
                                <p className="text-muted-foreground max-w-56 text-sm">
                                  {isDndActive
                                    ? ui.newGroupWithImage
                                    : isDragActive
                                      ? ui.newGroupWithImages
                                      : ui.newGroupDescription}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isBatchActive}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  open();
                                }}
                              >
                                <HugeiconsIcon
                                  icon={ImageUploadIcon}
                                  strokeWidth={2}
                                  data-icon="inline-start"
                                  aria-hidden="true"
                                />
                                {ui.browseImages}
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </DndNewGroupTarget>
                    )}
                  </GroupDropzone>
                </div>
              </DragDropProvider>
            </div>
          </div>

          <Card
            className="xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem-var(--workspace-fixed-bars-height))]"
            style={
              {
                "--workspace-fixed-bars-height": `${fixedBarsHeight}px`,
              } as CSSProperties
            }
          >
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <WorkspaceSettings disabled={isBatchActive} />
            </CardContent>
          </Card>
        </div>

        {hasInputs && (
          <div
            ref={fixedBarsRef}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2"
          >
            {selectedCount > 0 && (
              <Card
                size="sm"
                role="region"
                aria-label={ui.groupActions}
                className="pointer-events-auto mx-4 self-center shadow-lg [--card-spacing:--spacing(2)] [background:var(--card)] sm:w-[min(calc(100%-2rem),64rem)]"
              >
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="shrink-0 text-sm font-medium">
                    {ui.selectedImages(selectedCount)}
                  </span>
                  <Field className="min-w-0 sm:w-64 sm:flex-none">
                    <FieldLabel htmlFor="bulk-group-target" className="sr-only">
                      {ui.targetGroup}
                    </FieldLabel>
                    <Select
                      items={groupItems}
                      value={bulkTargetGroupId || null}
                      disabled={isBatchActive}
                      onValueChange={(value) =>
                        setBulkTargetGroupId(value ?? "")
                      }
                    >
                      <SelectTrigger id="bulk-group-target">
                        <SelectValue placeholder={ui.moveTo} />
                      </SelectTrigger>
                      <SelectContent
                        side="top"
                        sideOffset={8}
                        align="start"
                        alignItemWithTrigger={false}
                        className="[background:var(--popover)]"
                      >
                        <SelectGroup>
                          {groupItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isBatchActive || !bulkTargetGroupId}
                      onClick={() => {
                        if (bulkTargetGroupId === newGroupTarget) {
                          createGroupFromSelectedJobs();
                          toast.add({
                            type: "success",
                            title: "Kijelölt művelet kész",
                            description: `${selectedCount} kép új közös csoportba került.`,
                          });
                        } else {
                          const targetGroup = groups.find(
                            (group) => group.id === bulkTargetGroupId,
                          );
                          assignSelectedJobsToGroup(bulkTargetGroupId);
                          toast.add({
                            type: "success",
                            title: "Kijelölt művelet kész",
                            description: `${selectedCount} kép a(z) „${targetGroup?.name ?? "kiválasztott"}” csoportba került.`,
                          });
                        }
                        setBulkTargetGroupId("");
                      }}
                    >
                      {ui.move}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isBatchActive}
                      onClick={() => {
                        const createdGroupCount =
                          createSeparateGroupsFromSelectedJobs();
                        toast.add(
                          createdGroupCount === 0
                            ? {
                                type: "info",
                                title: "Nincs szükség átrendezésre",
                                description:
                                  "A kijelölt képek már külön konfigurációs csoportokban vannak.",
                              }
                            : {
                                type: "success",
                                title: "Kijelölt művelet kész",
                                description: `${createdGroupCount} új, képenként külön konfigurációs csoport készült.`,
                              },
                        );
                        setBulkTargetGroupId("");
                      }}
                    >
                      {ui.separateGroups}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isBatchActive}
                      onClick={removeSelected}
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        strokeWidth={2}
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      {ui.deleteSelected}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="morf-card-surface bg-background/95 pointer-events-auto border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-3 pt-3 lg:flex-row lg:items-center lg:justify-between">
                <p
                  className="text-muted-foreground shrink-0 text-sm tabular-nums"
                  aria-live="polite"
                >
                  {ui.queueSummary(processableCount, completedCount, failedCount)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBatchActive}
                    onClick={() => setAllJobsProcessing(!allGroupsIncluded)}
                  >
                    {allGroupsIncluded
                      ? ui.skipAllGroups
                      : ui.convertAllGroups}
                  </Button>
                  <Button
                    type="button"
                    disabled={isBatchActive || processableCount === 0}
                    onClick={startProcessing}
                  >
                    <HugeiconsIcon
                      icon={PlayIcon}
                      strokeWidth={2}
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    {isBatchActive
                      ? ui.processing
                      : `${copy.startConversion} (${processableCount})`}
                  </Button>
                  {completedCount > 0 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={Boolean(activeSaveAction)}
                        onClick={downloadAllFiles}
                      >
                        <HugeiconsIcon
                          icon={Download04Icon}
                          strokeWidth={2}
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        {activeSaveAction === "files-download"
                          ? ui.saving
                          : copy.save}
                      </Button>
                      {saveCapabilities.directory && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={Boolean(activeSaveAction)}
                          onClick={saveAllFilesAs}
                        >
                          <HugeiconsIcon
                            icon={FolderOpenIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          {ui.saveAs}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={Boolean(activeSaveAction)}
                        onClick={downloadZip}
                      >
                        <HugeiconsIcon
                          icon={FileZipIcon}
                          strokeWidth={2}
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        {activeSaveAction === "zip-download"
                          ? ui.creatingZip
                          : copy.saveToZip}
                      </Button>
                      {saveCapabilities.file && completedLazyCount === 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={Boolean(activeSaveAction)}
                          onClick={saveZipAs}
                        >
                          <HugeiconsIcon
                            icon={FolderDownloadIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          {activeSaveAction === "zip-as"
                            ? ui.creatingZip
                            : ui.saveZipAs}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <Toaster />
      </div>
    </section>
  );
}

interface ImageWorkspaceProps {
  locale?: Locale;
}

export default function ImageWorkspace({ locale = "hu" }: ImageWorkspaceProps) {
  const [frameSetId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("frameSet") ?? "";
  });

  return <WorkspaceI18nProvider locale={locale} messages={getImageConverterMessages(locale)}><StandardImageWorkspace initialFrameSetId={frameSetId} /></WorkspaceI18nProvider>;
}
