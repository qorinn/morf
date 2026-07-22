import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { proxy, transfer } from "comlink";
import {
  Delete02Icon,
  Download04Icon,
  FileZipIcon,
  FolderDownloadIcon,
  FolderOpenIcon,
  ImageUpload01Icon,
  PlayIcon,
  SecurityCheckIcon,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileJobCard } from "@/components/workspace/FileJobCard";
import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";
import { createProcessingError } from "@/features/image-processing/errors";
import type {
  FileJob,
  FileJobError,
  ProcessProgress,
} from "@/features/image-processing/types";
import { validateImageFile } from "@/features/image-processing/validation";
import { createImageWorker } from "@/features/image-processing/worker-client";
import { createOutputFileNameFromBase } from "@/lib/filenames/image-filenames";
import {
  downloadFile,
  downloadFiles,
  downloadFilesAsZip,
  getSaveCapabilities,
  isFilePickerCancellation,
  saveFileAs,
  saveFilesAsZip,
  saveFilesToChosenDirectory,
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

function isActiveJob(job: FileJob): boolean {
  return activeStatuses.includes(job.status);
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
  const addJobs = useWorkspaceStore((state) => state.addJobs);
  const updateJob = useWorkspaceStore((state) => state.updateJob);
  const completeJob = useWorkspaceStore((state) => state.completeJob);
  const renameJob = useWorkspaceStore((state) => state.renameJob);
  const failJob = useWorkspaceStore((state) => state.failJob);
  const setJobStatus = useWorkspaceStore((state) => state.setJobStatus);
  const requeueCompletedJobs = useWorkspaceStore(
    (state) => state.requeueCompletedJobs,
  );
  const retryJob = useWorkspaceStore((state) => state.retryJob);
  const removeJob = useWorkspaceStore((state) => state.removeJob);
  const clearJobs = useWorkspaceStore((state) => state.clearJobs);
  const settings = useWorkspaceStore((state) => state.settings);
  const [dropErrors, setDropErrors] = useState<DropError[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string>();
  const [isBatchActive, setIsBatchActive] = useState(false);
  const [activeSaveAction, setActiveSaveAction] = useState<string>();
  const [saveCapabilities, setSaveCapabilities] = useState<SaveCapabilities>({
    file: false,
    directory: false,
  });
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
    async (job: FileJob) => {
      const recipeResult = imageRecipeSchema.safeParse(
        useWorkspaceStore.getState().getRecipe(),
      );

      if (!recipeResult.success) {
        failJob(job.id, {
          category: "invalid-settings",
          message: "A feldolgozási beállítások nem érvényesek.",
          suggestion: "Ellenőrizd a méret- és minőségértékeket.",
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

    let queuedJobs = useWorkspaceStore
      .getState()
      .jobs.filter((job) => job.status === "queued");

    if (queuedJobs.length === 0) {
      requeueCompletedJobs();
      queuedJobs = useWorkspaceStore
        .getState()
        .jobs.filter((job) => job.status === "queued");
    }

    if (queuedJobs.length === 0) return;

    batchRunRef.current = true;
    setIsBatchActive(true);
    setWorkspaceError(undefined);
    let cursor = 0;

    const runNext = async () => {
      while (cursor < queuedJobs.length) {
        const job = queuedJobs[cursor];
        cursor += 1;
        await processOneJob(job);
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(getConcurrency(), queuedJobs.length) },
          runNext,
        ),
      );
    } finally {
      batchRunRef.current = false;
      setIsBatchActive(false);
    }
  }, [processOneJob, requeueCompletedJobs]);

  const cancelJob = useCallback(
    (id: string) => {
      cancelledJobs.current.add(id);
      setJobStatus(id, "cancelled", 0);
      activeWorkers.current.get(id)?.terminate();
      cancelRejectors.current.get(id)?.();
    },
    [setJobStatus],
  );

  const updateJobDimensions = useCallback(
    (id: string, width: number, height: number) => {
      updateJob(id, { originalWidth: width, originalHeight: height });
    },
    [updateJob],
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

  const downloadOne = useCallback((job: FileJob) => {
    if (!job.result) return;
    downloadFile({
      blob: job.result.blob,
      fileName: createOutputFileNameFromBase(
        job.outputBaseName,
        job.result.format,
      ),
      mimeType: job.result.mimeType,
      description: "Kép",
    });
  }, []);

  const saveOneAs = useCallback(
    (job: FileJob) => {
      if (!job.result) return;
      const result = job.result;
      const fileName = createOutputFileNameFromBase(
        job.outputBaseName,
        result.format,
      );

      void runSaveAction(`file-${job.id}`, async () => {
        await saveFileAs({
          blob: result.blob,
          fileName,
          mimeType: result.mimeType,
          description: "Kép",
        });
      });
    },
    [runSaveAction],
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
  const queuedCount = jobs.filter((job) => job.status === "queued").length;
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
        "Dobj be JPG, PNG vagy WebP képeket, válassz célt, majd indítsd el a feldolgozást.",
    };
  }, [completedCount, isBatchActive, representativeJob?.status]);

  return (
    <section
      id="workspace"
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8"
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

      {isBatchActive && (
        <Alert>
          <HugeiconsIcon
            icon={SecurityCheckIcon}
            strokeWidth={2}
            aria-hidden="true"
          />
          <AlertTitle>A feldolgozás aktív</AlertTitle>
          <AlertDescription>
            Ne zárd be és ne frissítsd az oldalt. A képeid nem kerülnek
            feltöltésre.
          </AlertDescription>
        </Alert>
      )}

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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.75fr)]">
        <Card
          {...getRootProps({ role: "region" })}
          className="min-h-80 justify-center"
          aria-label="Képfájlok hozzáadása"
        >
          <CardHeader className="text-center">
            <CardTitle>
              {isDragActive ? "Engedd el a képeket" : "Dobd ide a képeket"}
            </CardTitle>
            <CardDescription>
              JPG, PNG és WebP állóképek · több fájlt is választhatsz
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <input
              {...getInputProps({
                accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
              })}
            />
            <Button
              type="button"
              size="lg"
              disabled={isBatchActive}
              onClick={open}
            >
              <HugeiconsIcon
                icon={ImageUpload01Icon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Képek kiválasztása
            </Button>
          </CardContent>
          <CardFooter className="text-muted-foreground justify-center text-center text-sm">
            A biztonságos méretkorlátot az eszköztípus és a rendelkezésre álló
            memória alapján állítjuk be.
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Beállítások</CardTitle>
            <CardDescription>
              A preset kiindulópont; minden érték módosítható.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceSettings disabled={isBatchActive} />
          </CardContent>
          <CardFooter className="text-muted-foreground text-sm">
            Az újrakódolás eltávolítja a beágyazott metaadatokat, az
            EXIF-orientációt pedig helyesen alkalmazza.
          </CardFooter>
        </Card>
      </div>

      {jobs.length > 0 && (
        <div className="flex flex-col gap-5">
          <Separator />
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <h3 className="font-heading text-2xl font-medium">Fájlok</h3>
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {jobs.length} fájl · {completedCount} kész · {failedCount} hibás
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={
                  isBatchActive || (queuedCount === 0 && completedCount === 0)
                }
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
                  : queuedCount > 0
                    ? `Feldolgozás (${queuedCount})`
                    : `Újrafeldolgozás (${completedCount})`}
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
              <Button
                type="button"
                variant="ghost"
                disabled={isBatchActive}
                onClick={clearJobs}
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  strokeWidth={2}
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Lista törlése
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {jobs.map((job) => (
              <FileJobCard
                key={job.id}
                job={job}
                estimateSettings={settings}
                canSaveAs={saveCapabilities.file}
                isSaving={Boolean(activeSaveAction)}
                onCancel={cancelJob}
                onDimensions={updateJobDimensions}
                onDownload={downloadOne}
                onRename={renameJob}
                onRetry={retryJob}
                onRemove={removeJob}
                onSaveAs={saveOneAs}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
