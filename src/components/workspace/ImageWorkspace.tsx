import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { proxy, transfer } from "comlink";
import {
  Add01Icon,
  Delete02Icon,
  Download04Icon,
  FileZipIcon,
  FolderDownloadIcon,
  FolderOpenIcon,
  MoreVerticalIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDropzone } from "react-dropzone";

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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toaster, toast } from "@/components/ui/toast";
import { FileUploadDropzone } from "@/components/upload/FileUploadDropzone";
import { FileJobCard } from "@/components/workspace/FileJobCard";
import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";
import {
  conversionSettingsToRecipe,
  getConversionModeLabel,
  getConversionResolutionLabel,
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
import { createOutputFileNameFromBase } from "@/lib/filenames/image-filenames";
import { cn } from "@/lib/utils";
import {
  downloadFiles,
  downloadFilesAsZip,
  getSaveCapabilities,
  isFilePickerCancellation,
  saveFilesAsZip,
  saveFilesToChosenDirectory,
  type SaveCapabilities,
  type SaveableFile,
} from "@/lib/downloads";
import { imagePresets, imageRecipeSchema } from "@/lib/presets/image-presets";
import { useWorkspaceStore } from "@/stores/workspace-store";

type DropError = {
  fileName: string;
  error: FileJobError;
};

const newGroupTarget = "__new-group__";
const activeStatuses = ["loading-engine", "decoding", "processing", "encoding"];

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

function getCompletedFiles(jobs: FileJob[]): SaveableFile[] {
  return jobs.flatMap((job) => {
    if (!job.result) return [];
    return [
      {
        blob: job.result.blob,
        fileName: createOutputFileNameFromBase(
          job.outputBaseName,
          job.result.format,
        ),
        mimeType: job.result.mimeType,
        description: "Kép",
      },
    ];
  });
}

export default function ImageWorkspace() {
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
  const duplicateJob = useWorkspaceStore((state) => state.duplicateJob);
  const createGroupFromSelectedJobs = useWorkspaceStore(
    (state) => state.createGroupFromSelectedJobs,
  );
  const createGroup = useWorkspaceStore((state) => state.createGroup);
  const createSeparateGroupsFromSelectedJobs = useWorkspaceStore(
    (state) => state.createSeparateGroupsFromSelectedJobs,
  );
  const renameGroup = useWorkspaceStore((state) => state.renameGroup);
  const updateJob = useWorkspaceStore((state) => state.updateJob);
  const completeJob = useWorkspaceStore((state) => state.completeJob);
  const renameJob = useWorkspaceStore((state) => state.renameJob);
  const failJob = useWorkspaceStore((state) => state.failJob);
  const setJobStatus = useWorkspaceStore((state) => state.setJobStatus);
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
  const [saveCapabilities, setSaveCapabilities] = useState<SaveCapabilities>({
    file: false,
    directory: false,
  });
  const fixedBarsRef = useRef<HTMLDivElement>(null);
  const batchRunRef = useRef(false);
  const activeWorkers = useRef(new Map<string, Worker>());
  const cancelRejectors = useRef(new Map<string, () => void>());
  const cancelledJobs = useRef(new Set<string>());

  const onDrop = useCallback(
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

      if (validJobs.length > 0) addJobs(validJobs);
      setDropErrors(errors);
    },
    [addJobs, isBatchActive],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    disabled: isBatchActive,
  });

  const processOneJob = useCallback(
    async (job: FileJob, settings: ImageConversionSettings) => {
      const recipeResult = imageRecipeSchema.safeParse(
        conversionSettingsToRecipe(settings),
      );

      if (!recipeResult.success) {
        failJob(job.id, {
          category: "invalid-settings",
          message: "A feldolgozási beállítások nem érvényesek.",
          suggestion:
            "Ellenőrizd a felbontás-, minőség- és fájlméretértékeket.",
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
              new DOMException("A feldolgozás megszakítva.", "AbortError"),
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
          },
          result.originalWidth,
          result.originalHeight,
        );
      } catch (error) {
        if (!cancelledJobs.current.has(job.id)) {
          failJob(job.id, createProcessingError(error));
        }
      } finally {
        handle?.worker.terminate();
        activeWorkers.current.delete(job.id);
        cancelRejectors.current.delete(job.id);
        cancelledJobs.current.delete(job.id);
      }
    },
    [completeJob, failJob, setJobStatus, updateJob],
  );

  const startProcessing = useCallback(async () => {
    if (batchRunRef.current) return;
    if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
      setWorkspaceError(
        "Ez a böngésző nem támogatja a szükséges helyi worker- és WebAssembly-feldolgozást.",
      );
      return;
    }

    const state = useWorkspaceStore.getState();
    const queuedJobs = state.jobs.flatMap((job) => {
      if (!job.shouldProcess || job.status !== "queued") return [];

      const group = state.groups.find(
        (candidate) => candidate.id === job.groupId,
      );
      return group?.shouldProcess
        ? [{ job, settings: { ...group.settings } }]
        : [];
    });

    if (queuedJobs.length === 0) return;

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
      await Promise.all(
        Array.from(
          { length: Math.min(getConcurrency(), queuedJobs.length) },
          runNext,
        ),
      );

      const completedJobCount = queuedJobs.filter(({ job }) =>
        useWorkspaceStore
          .getState()
          .jobs.some(
            (candidate) =>
              candidate.id === job.id && candidate.status === "completed",
          ),
      ).length;

      if (completedJobCount > 0) {
        toast.add({
          type: "success",
          title: "Elkészültek a fájlok",
          description: `${completedJobCount} kép letölthető.`,
        });
      }
    } finally {
      batchRunRef.current = false;
      setIsBatchActive(false);
    }
  }, [processOneJob]);

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
        title: "Kép duplikálva",
        description: "A másolat ugyanebbe a konfigurációs csoportba került.",
      });
    },
    [duplicateJob],
  );

  const removeSelected = useCallback(() => {
    const removedCount = removeSelectedJobs();
    if (removedCount === 0) return;

    toast.add({
      type: "success",
      title: "Kijelölt képek törölve",
      description: `${removedCount} kép eltávolítva a listából.`,
    });
  }, [removeSelectedJobs]);

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
    const files = getCompletedFiles(useWorkspaceStore.getState().jobs);
    downloadFiles(files);
  }, []);

  const saveAllFilesAs = useCallback(() => {
    void runSaveAction("files-as", async () => {
      const files = getCompletedFiles(useWorkspaceStore.getState().jobs);
      await saveFilesToChosenDirectory(files);
    });
  }, [runSaveAction]);

  const downloadZip = useCallback(() => {
    void runSaveAction("zip-download", async () => {
      const files = getCompletedFiles(useWorkspaceStore.getState().jobs);
      await downloadFilesAsZip(files, "morf-kepek.zip");
    });
  }, [runSaveAction]);

  const saveZipAs = useCallback(() => {
    void runSaveAction("zip-as", async () => {
      const files = getCompletedFiles(useWorkspaceStore.getState().jobs);
      await saveFilesAsZip(files, "morf-kepek.zip");
    });
  }, [runSaveAction]);

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
  }, [jobs.length > 0]);

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
      useWorkspaceStore.getState().clearJobs();
    },
    [],
  );

  const completedCount = jobs.filter(
    (job) => job.status === "completed",
  ).length;
  const failedCount = jobs.filter((job) => job.status === "error").length;
  const selectedCount = selectedJobIds.filter((id) =>
    jobs.some((job) => job.id === id),
  ).length;
  const processIncludedCount = jobs.filter(
    (job) =>
      job.shouldProcess &&
      groups.some((group) => group.id === job.groupId && group.shouldProcess),
  ).length;
  const processableCount = jobs.filter(
    (job) =>
      job.shouldProcess &&
      job.status === "queued" &&
      groups.some((group) => group.id === job.groupId && group.shouldProcess),
  ).length;
  const allGroupsIncluded =
    groups.every((group) => group.shouldProcess) && groups.length > 0;
  const groupItems = [
    ...groups.map((group) => ({
      label: `${group.name} · ${group.settings.outputFormat.toUpperCase()} · ${getConversionModeLabel(group.settings)}`,
      value: group.id,
    })),
    { label: "Új közös csoport", value: newGroupTarget },
  ];
  const representativeJob =
    jobs.find(isActiveJob) ??
    jobs.find((job) => job.status === "error") ??
    [...jobs].reverse().find((job) => job.status === "completed") ??
    jobs[0];
  const mascotState = getMascotState(representativeJob?.status);
  const mascotCopy = useMemo(() => {
    if (isBatchActive) {
      return {
        title: "Morf dolgozik",
        message:
          "A feldolgozás helyben fut. Ne zárd be és ne frissítsd az oldalt.",
      };
    }
    if (representativeJob?.status === "error") {
      return {
        title: "Egy képnek segítség kell",
        message:
          "A hiba alatt találsz visszaállítható következő lépést és újrapróbálási lehetőséget.",
      };
    }
    if (completedCount > 0) {
      return {
        title: "Elkészültek a fájlok",
        message: `${completedCount} kép letölthető. Az eredményeket külön vagy egy ZIP-ben is elmentheted.`,
      };
    }
    return {
      title: "Kezdésre kész",
      message:
        "Dobj be képeket, rendezd őket konfigurációs csoportokba, majd indítsd el a közös konvertálást.",
    };
  }, [completedCount, isBatchActive, representativeJob?.status]);

  return (
    <section
      id="workspace"
      className={cn(
        "mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8",
        jobs.length > 0 &&
          (selectedCount > 0
            ? "pb-80 sm:pb-56 lg:pb-44"
            : "pb-56 sm:pb-40 lg:pb-32"),
      )}
    >
      <div className="flex flex-col gap-2">
        <Badge variant="secondary">Képfeldolgozó workspace</Badge>
        <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">
          Készíts használatra kész képeket
        </h2>
        <p className="text-muted-foreground max-w-3xl">
          Több képet alakíthatsz át egyszerre. A dekódolás, átméretezés és
          kódolás a böngésződben, külön workerben történik.
        </p>
      </div>

      <MascotAssistant
        state={mascotState}
        title={mascotCopy.title}
        message={mascotCopy.message}
      />

      {workspaceError && (
        <Alert variant="destructive">
          <AlertTitle>Nem sikerült befejezni a műveletet</AlertTitle>
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
          <div>
            <input
              {...getInputProps({
                accept:
                  "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif",
              })}
              className="sr-only"
              aria-label="Konvertálandó képek kiválasztása"
            />
            <FileUploadDropzone
              getRootProps={getRootProps}
              isDragActive={isDragActive}
              onBrowse={open}
              title="Húzd ide a képeket"
              activeTitle="Engedd el a képeket"
              description="JPG, PNG, WebP, AVIF vagy HEIC/HEIF állóképek · nincs fájlszámkorlát"
              buttonLabel="Képek kiválasztása"
              disabled={isBatchActive}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1">
                <h3 className="font-heading text-2xl font-medium">Csoportok</h3>
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  {jobs.length} fájl · {groups.length} csoport · {selectedCount}{" "}
                  kijelölve · {processIncludedCount} konvertálásra ·{" "}
                  {completedCount} kész · {failedCount} hibás
                </p>
              </div>
              {jobs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBatchActive || selectedCount === jobs.length}
                    onClick={() => setAllJobsSelected(true)}
                  >
                    Mind kijelölése
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBatchActive || selectedCount === 0}
                    onClick={() => setAllJobsSelected(false)}
                  >
                    Kijelölés törlése
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isBatchActive}
                    onClick={clearJobs}
                  >
                    Lista törlése
                  </Button>
                </div>
              )}
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-3">
              {groups.map((group) => {
                const groupJobs = jobs.filter(
                  (job) => job.groupId === group.id,
                );
                const presetName =
                  imagePresets.find(
                    (preset) => preset.id === group.settings.presetId,
                  )?.recipe.name ?? "Egyedi";

                return (
                  <Card
                    key={group.id}
                    size="sm"
                    interactive={!isBatchActive}
                    selected={activeGroupId === group.id}
                    role="button"
                    tabIndex={isBatchActive ? -1 : 0}
                    aria-pressed={activeGroupId === group.id}
                    aria-disabled={isBatchActive || undefined}
                    aria-label={`${group.name} konfigurációs csoport kiválasztása`}
                    className="border-foreground/20 min-h-96 [--card-spacing:--spacing(3)] [background:var(--card)] lg:h-[32rem]"
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
                            aria-label={`${group.name} konvertálása`}
                            onCheckedChange={(checked) =>
                              setGroupProcessing(group.id, checked === true)
                            }
                          />
                          <Input
                            variant="inline"
                            aria-label={`${group.name} csoport nevének módosítása`}
                            value={group.name}
                            maxLength={60}
                            disabled={isBatchActive}
                            onFocus={() => setActiveGroup(group.id)}
                            onChange={(event) =>
                              renameGroup(group.id, event.target.value)
                            }
                            onBlur={(event) => {
                              const name = event.target.value.trim();
                              renameGroup(group.id, name || "Névtelen csoport");
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{presetName}</Badge>
                          <Badge variant="outline">
                            {group.settings.outputFormat.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {group.settings.lossless
                              ? getConversionResolutionLabel(group.settings)
                              : `max. ${getConversionResolutionLabel(group.settings)}`}
                          </Badge>
                          <Badge variant="outline">
                            {getConversionModeLabel(group.settings)}
                          </Badge>
                          <Badge variant="outline">
                            {groupJobs.length} kép
                          </Badge>
                        </div>
                      </div>
                      <CardAction>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`${group.name} csoport menüje`}
                          title="Csoportmenü"
                          disabled={isBatchActive}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <HugeiconsIcon
                            icon={MoreVerticalIcon}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <Separator className="bg-foreground/20" />
                    <CardContent
                      className={cn(
                        "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                        groupJobs.length === 0 && "grid place-items-center",
                      )}
                    >
                      {groupJobs.length === 0 ? (
                        <p className="text-muted-foreground text-center text-sm">
                          Még nincs kép ebben a csoportban.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {groupJobs.map((job) => (
                            <FileJobCard
                              key={job.id}
                              job={job}
                              group={group}
                              isSelected={selectedJobIds.includes(job.id)}
                              onDimensions={updateJobDimensions}
                              onDuplicate={duplicateOne}
                              onRename={renameJob}
                              onSelectionChange={toggleJobSelection}
                              selectionDisabled={isBatchActive}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              <Card
                size="sm"
                interactive={!isBatchActive}
                role="button"
                tabIndex={isBatchActive ? -1 : 0}
                aria-disabled={isBatchActive || undefined}
                aria-label="Új csoport létrehozása"
                className="border-foreground/20 min-h-96 border border-dashed [--card-spacing:--spacing(3)] [background:transparent] lg:h-[32rem]"
                onClick={() => {
                  if (!isBatchActive) createGroup();
                }}
                onKeyDown={(event) => {
                  if (
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
                  <span className="border-primary text-primary flex size-12 items-center justify-center rounded-full border">
                    <HugeiconsIcon
                      icon={Add01Icon}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-heading text-lg font-medium">
                      Új csoport
                    </p>
                    <p className="text-muted-foreground max-w-48 text-sm">
                      Az aktív csoport beállításaiból indul.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
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
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <WorkspaceSettings disabled={isBatchActive} />
          </CardContent>
        </Card>
      </div>

      {jobs.length > 0 && (
        <div
          ref={fixedBarsRef}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2"
        >
          {selectedCount > 0 && (
            <Card
              size="sm"
              role="region"
              aria-label="Kijelölt képek műveletei"
              className="pointer-events-auto mx-4 self-center [--card-spacing:--spacing(2)] [background:var(--card)] sm:w-[min(calc(100%-2rem),64rem)]"
            >
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="shrink-0 text-sm font-medium">
                  {selectedCount} kép kijelölve
                </span>
                <Field className="min-w-0 sm:w-64 sm:flex-none">
                  <FieldLabel htmlFor="bulk-group-target" className="sr-only">
                    Közös célcsoport
                  </FieldLabel>
                  <Select
                    items={groupItems}
                    value={bulkTargetGroupId || null}
                    disabled={isBatchActive}
                    onValueChange={(value) => setBulkTargetGroupId(value ?? "")}
                  >
                    <SelectTrigger id="bulk-group-target">
                      <SelectValue placeholder="Áthelyezés ide…" />
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
                    Áthelyezés
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
                    Minden kép külön csoportba
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
                    Kijelöltek törlése
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="morf-card-surface pointer-events-auto border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-3 pt-3 lg:flex-row lg:items-center lg:justify-between">
              <p
                className="text-muted-foreground shrink-0 text-sm tabular-nums"
                aria-live="polite"
              >
                {processableCount} várakozik · {completedCount} kész ·{" "}
                {failedCount} hibás
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBatchActive}
                  onClick={() => setAllJobsProcessing(!allGroupsIncluded)}
                >
                  {allGroupsIncluded
                    ? "Összes csoport kihagyása"
                    : "Összes csoport konvertálása"}
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
                    ? "Feldolgozás…"
                    : `Konvertálás indítása (${processableCount})`}
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
                      Mentés
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
                        Mentés másként
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
                        ? "ZIP készítése…"
                        : "Mentés ZIP-be"}
                    </Button>
                    {saveCapabilities.file && (
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
                          ? "ZIP készítése…"
                          : "Mentés másként ZIP-be"}
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
    </section>
  );
}
