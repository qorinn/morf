import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { proxy, transfer } from "comlink";
import {
  Delete02Icon,
  FileZipIcon,
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
import {
  createOutputFileName,
  createUniqueFileName,
} from "@/lib/filenames/image-filenames";
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

function triggerDownload(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
}

export default function ImageWorkspace() {
  const jobs = useWorkspaceStore((state) => state.jobs);
  const addJobs = useWorkspaceStore((state) => state.addJobs);
  const updateJob = useWorkspaceStore((state) => state.updateJob);
  const completeJob = useWorkspaceStore((state) => state.completeJob);
  const failJob = useWorkspaceStore((state) => state.failJob);
  const setJobStatus = useWorkspaceStore((state) => state.setJobStatus);
  const retryJob = useWorkspaceStore((state) => state.retryJob);
  const removeJob = useWorkspaceStore((state) => state.removeJob);
  const clearJobs = useWorkspaceStore((state) => state.clearJobs);
  const [dropErrors, setDropErrors] = useState<DropError[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string>();
  const [isBatchActive, setIsBatchActive] = useState(false);
  const [isZipPreparing, setIsZipPreparing] = useState(false);
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

      const handle = createImageWorker();
      activeWorkers.current.set(job.id, handle.worker);
      setJobStatus(job.id, "loading-engine", 2);

      const cancellation = new Promise<never>((_, reject) => {
        cancelRejectors.current.set(job.id, () =>
          reject(new DOMException("A feldolgozás megszakítva.", "AbortError")),
        );
      });

      try {
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
            fileName: createOutputFileName(
              job.file.name,
              recipeResult.data.outputFormat,
            ),
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
        handle.worker.terminate();
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

    const queuedJobs = useWorkspaceStore
      .getState()
      .jobs.filter((job) => job.status === "queued");
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
  }, [processOneJob]);

  const cancelJob = useCallback(
    (id: string) => {
      cancelledJobs.current.add(id);
      setJobStatus(id, "cancelled", 0);
      activeWorkers.current.get(id)?.terminate();
      cancelRejectors.current.get(id)?.();
    },
    [setJobStatus],
  );

  const downloadAll = useCallback(async () => {
    const completedJobs = useWorkspaceStore
      .getState()
      .jobs.filter((job) => job.result);
    if (completedJobs.length === 0) return;

    setIsZipPreparing(true);
    setWorkspaceError(undefined);

    try {
      const { zipSync } = await import("fflate");
      const usedNames = new Set<string>();
      const files: Record<string, Uint8Array> = {};

      for (const job of completedJobs) {
        if (!job.result) continue;
        const fileName = createUniqueFileName(job.result.fileName, usedNames);
        files[fileName] = new Uint8Array(await job.result.blob.arrayBuffer());
      }

      const zip = zipSync(files, { level: 0 });
      const blob = new Blob([zip], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, "morf-kepek.zip");
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      setWorkspaceError(
        `A ZIP-csomagot nem sikerült elkészíteni: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsZipPreparing(false);
    }
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
                disabled={isBatchActive || queuedCount === 0}
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
                  : `Feldolgozás (${queuedCount})`}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={completedCount === 0 || isZipPreparing}
                onClick={downloadAll}
              >
                <HugeiconsIcon
                  icon={FileZipIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                {isZipPreparing ? "ZIP készítése…" : "Összes letöltése"}
              </Button>
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
                onCancel={cancelJob}
                onRetry={retryJob}
                onRemove={removeJob}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
