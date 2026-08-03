import { useCallback, useEffect, useRef, useState } from "react";
import { proxy, transfer } from "comlink";
import {
  ArrowLeft02Icon,
  Download04Icon,
  FileZipIcon,
  FolderDownloadIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { MascotAssistant } from "@/components/mascot/MascotAssistant";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Toaster, toast } from "@/components/ui/toast";
import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";
import {
  conversionSettingsToRecipe,
  getConversionModeLabel,
} from "@/features/image-processing/conversion-settings";
import type { ProcessProgress } from "@/features/image-processing/types";
import { createImageWorker } from "@/features/image-processing/worker-client";
import {
  canSaveConvertedFramesToDirectory,
  downloadConvertedFramesAsZipParts,
  saveConvertedFramesToDirectory,
} from "@/features/video-frames/conversion-downloads";
import {
  resetFrameBatchConversion,
  writeConvertedFrame,
  writeConvertedFrameChunk,
  writeFrameBatchConversionManifest,
  type ConvertedFrameRecordV1,
  type FrameBatchConversionManifestV1,
} from "@/features/video-frames/conversion-storage";
import {
  getFrameSetSummary,
  iterateSelectedFrameRecords,
  readFrameFile,
} from "@/features/video-frames/storage";
import type { FrameSetSummary } from "@/features/video-frames/types";
import { createOutputFileNameFromBase } from "@/lib/filenames/image-filenames";
import { formatBytes } from "@/lib/filenames/image-filenames";
import { imageRecipeSchema } from "@/lib/presets/image-presets";
import { useWorkspaceStore } from "@/stores/workspace-store";

type BatchPhase =
  "loading" | "ready" | "processing" | "completed" | "saving" | "error";

type Props = {
  frameSetId: string;
};

const conversionCheckpointSize = 25;

export function FrameSetBatchWorkspace({ frameSetId }: Props) {
  const groups = useWorkspaceStore((state) => state.groups);
  const renameGroup = useWorkspaceStore((state) => state.renameGroup);
  const [phase, setPhase] = useState<BatchPhase>("loading");
  const [summary, setSummary] = useState<FrameSetSummary>();
  const [conversion, setConversion] =
    useState<FrameBatchConversionManifestV1>();
  const [completed, setCompleted] = useState(0);
  const [activeProgress, setActiveProgress] = useState(0);
  const [saveCompleted, setSaveCompleted] = useState(0);
  const [error, setError] = useState<string>();
  const cancelledRef = useRef(false);
  const activeWorkerRef = useRef<Worker | undefined>(undefined);

  useEffect(() => {
    const firstGroup = useWorkspaceStore.getState().groups[0];
    if (firstGroup) renameGroup(firstGroup.id, "Videó frame-ek");
  }, [renameGroup]);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    getFrameSetSummary(frameSetId)
      .then((loaded) => {
        if (cancelled) return;
        if (
          loaded.manifest.status !== "ready" &&
          loaded.manifest.status !== "paused"
        ) {
          throw new Error(
            "A frame-készlet még nem áll készen az importálásra.",
          );
        }
        setSummary(loaded);
        setPhase("ready");
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "A helyi frame-készlet már nem érhető el.",
        );
        setPhase("error");
      });

    return () => {
      cancelled = true;
      activeWorkerRef.current?.terminate();
    };
  }, [frameSetId]);

  const startConversion = useCallback(async () => {
    if (!summary || phase === "processing") return;
    const settings = useWorkspaceStore.getState().groups[0]?.settings;
    if (!settings) return;
    const recipeResult = imageRecipeSchema.safeParse(
      conversionSettingsToRecipe(settings),
    );
    if (!recipeResult.success) {
      setError("A konvertálási beállítások nem érvényesek.");
      return;
    }

    cancelledRef.current = false;
    setError(undefined);
    setCompleted(0);
    setActiveProgress(0);
    setPhase("processing");
    let outputManifest: FrameBatchConversionManifestV1 | undefined;
    let checkpointRecords: ConvertedFrameRecordV1[] = [];
    const workerHandle = createImageWorker();
    activeWorkerRef.current = workerHandle.worker;

    const flushCheckpoint = async () => {
      if (!outputManifest || checkpointRecords.length === 0) return;
      const chunkNumber = outputManifest.chunkCount + 1;
      await writeConvertedFrameChunk(
        frameSetId,
        chunkNumber,
        checkpointRecords,
      );
      outputManifest = {
        ...outputManifest,
        chunkCount: chunkNumber,
        updatedAt: new Date().toISOString(),
      };
      checkpointRecords = [];
      await writeFrameBatchConversionManifest(outputManifest);
      setConversion(outputManifest);
    };

    try {
      outputManifest = await resetFrameBatchConversion(
        frameSetId,
        summary.selectedCount,
        recipeResult.data.outputFormat,
      );
      setConversion(outputManifest);

      for await (const frame of iterateSelectedFrameRecords(summary.manifest)) {
        if (cancelledRef.current) break;
        const inputFile = await readFrameFile(frameSetId, frame.fileName);
        const buffer = await inputFile.arrayBuffer();
        const result = await workerHandle.api.processImage(
          transfer(
            {
              buffer,
              inputFormat: "png" as const,
              recipe: recipeResult.data,
            },
            [buffer],
          ),
          proxy((progress: ProcessProgress) =>
            setActiveProgress(progress.value),
          ),
        );
        const blob = new Blob([result.buffer], { type: result.mimeType });
        const outputBaseName = `${frame.fileName.replace(/\.png$/i, "")}-morf`;
        const fileName = createOutputFileNameFromBase(
          outputBaseName,
          recipeResult.data.outputFormat,
        );
        const record: ConvertedFrameRecordV1 = {
          index: outputManifest.completedCount + 1,
          sourceFileName: frame.fileName,
          fileName,
          byteSize: blob.size,
          format: recipeResult.data.outputFormat,
          mimeType: result.mimeType,
        };
        await writeConvertedFrame(frameSetId, record, blob);
        checkpointRecords.push(record);
        outputManifest = {
          ...outputManifest,
          completedCount: outputManifest.completedCount + 1,
          totalBytes: outputManifest.totalBytes + blob.size,
          updatedAt: new Date().toISOString(),
        };
        setCompleted(outputManifest.completedCount);
        setActiveProgress(0);

        if (checkpointRecords.length >= conversionCheckpointSize) {
          await flushCheckpoint();
        }
      }

      await flushCheckpoint();
      outputManifest = {
        ...outputManifest,
        status: cancelledRef.current ? "cancelled" : "ready",
        updatedAt: new Date().toISOString(),
      };
      await writeFrameBatchConversionManifest(outputManifest);
      setConversion(outputManifest);
      if (cancelledRef.current) {
        setPhase("ready");
      } else {
        setPhase("completed");
        toast.add({
          type: "success",
          title: "Elkészültek az optimalizált frame-ek",
          description: `${outputManifest.completedCount} kép menthető.`,
        });
      }
    } catch (conversionError) {
      if (cancelledRef.current) {
        await flushCheckpoint().catch(() => undefined);
        if (!outputManifest) {
          setPhase("ready");
          return;
        }
        outputManifest = {
          ...outputManifest,
          status: "cancelled",
          updatedAt: new Date().toISOString(),
        };
        await writeFrameBatchConversionManifest(outputManifest).catch(
          () => undefined,
        );
        setConversion(outputManifest);
        setPhase("ready");
        return;
      }
      if (outputManifest) {
        outputManifest = {
          ...outputManifest,
          status: "error",
          errorMessage:
            conversionError instanceof Error
              ? conversionError.message
              : String(conversionError),
          updatedAt: new Date().toISOString(),
        };
        await flushCheckpoint().catch(() => undefined);
        await writeFrameBatchConversionManifest(outputManifest).catch(
          () => undefined,
        );
        setConversion(outputManifest);
      }
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "A frame-ek optimalizálása megszakadt.",
      );
      setPhase("error");
    } finally {
      workerHandle.worker.terminate();
      activeWorkerRef.current = undefined;
    }
  }, [frameSetId, phase, summary]);

  const cancelConversion = () => {
    cancelledRef.current = true;
    activeWorkerRef.current?.terminate();
    activeWorkerRef.current = undefined;
  };

  const saveResults = useCallback(
    async (mode: "directory" | "zip") => {
      if (!conversion || conversion.status !== "ready") return;
      setPhase("saving");
      setSaveCompleted(0);
      setError(undefined);
      try {
        if (mode === "directory") {
          await saveConvertedFramesToDirectory(conversion, setSaveCompleted);
        } else {
          await downloadConvertedFramesAsZipParts(conversion, setSaveCompleted);
        }
        toast.add({
          type: "success",
          title: "A mentés elkészült",
          description: `${conversion.completedCount} optimalizált frame feldolgozva.`,
        });
      } catch (saveError) {
        if (!(
          saveError instanceof DOMException && saveError.name === "AbortError"
        )) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "A mentés nem sikerült.",
          );
        }
      } finally {
        setPhase("completed");
      }
    },
    [conversion],
  );

  const activeSettings = groups[0]?.settings;
  const totalProgress =
    summary && summary.selectedCount > 0
      ? ((completed + activeProgress / 100) / summary.selectedCount) * 100
      : 0;

  return (
    <section
      id="workspace"
      className="border-border bg-surface-subtle border-b"
    >
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <MascotAssistant
          state={
            phase === "processing"
              ? "processing"
              : phase === "completed" || phase === "saving"
                ? "success"
                : phase === "error"
                  ? "error"
                  : "idle"
          }
          title={
            phase === "processing"
              ? "Morf sorban optimalizálja a frame-eket"
              : phase === "completed" || phase === "saving"
                ? "Az optimalizált frame-ek készen állnak"
                : "A helyi frame-készlet megérkezett"
          }
          message="A konvertáló a frame-eket egyenként olvassa a helyi tárhelyről, így a teljes sorozat nem kerül egyszerre memóriába."
        />

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Nem sikerült befejezni a műveletet</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {phase === "loading" ? (
          <p className="text-muted-foreground py-12 text-center">
            A helyi frame-készlet megnyitása…
          </p>
        ) : summary ? (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-6">
              <Card className="border shadow-none ring-0">
                <CardHeader>
                  <CardTitle>Importált videó frame-ek</CardTitle>
                  <CardDescription>
                    Összesített batch-csoport; minden beállítás a teljes
                    kiválasztott sorozatra érvényes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Forrás</p>
                      <p className="mt-1 truncate font-medium">
                        {summary.manifest.sourceName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Frame-ek</p>
                      <p className="mt-1 font-medium tabular-nums">
                        {summary.selectedCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">PNG-méret</p>
                      <p className="mt-1 font-medium tabular-nums">
                        {formatBytes(summary.selectedBytes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Felbontás</p>
                      <p className="mt-1 font-medium tabular-nums">
                        {summary.manifest.metadata.width} ×{" "}
                        {summary.manifest.metadata.height}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Helyi frame-készlet</Badge>
                    <Badge variant="outline">
                      {summary.manifest.selectionFps === null
                        ? "Minden frame"
                        : `${summary.manifest.selectionFps} FPS`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {(phase === "processing" ||
                phase === "completed" ||
                phase === "saving") && (
                <Card className="border shadow-none ring-0">
                  <CardHeader>
                    <CardTitle>
                      {phase === "processing"
                        ? "Frame-ek optimalizálása"
                        : "Optimalizált eredmény"}
                    </CardTitle>
                    <CardDescription>
                      {conversion?.completedCount ?? completed} kép ·{" "}
                      {formatBytes(conversion?.totalBytes ?? 0)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    <Progress
                      value={
                        phase === "saving" && conversion
                          ? (saveCompleted / conversion.completedCount) * 100
                          : phase === "completed"
                            ? 100
                            : totalProgress
                      }
                      aria-label={
                        phase === "saving"
                          ? "Optimalizált frame-ek mentése"
                          : "Frame-ek optimalizálása"
                      }
                    >
                      <ProgressLabel>
                        {phase === "saving"
                          ? "Mentés"
                          : phase === "completed"
                            ? "Kész"
                            : "Feldolgozás"}
                      </ProgressLabel>
                      <ProgressValue />
                    </Progress>

                    {phase === "processing" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-fit"
                        onClick={cancelConversion}
                      >
                        Megszakítás
                      </Button>
                    ) : (
                      conversion?.status === "ready" && (
                        <div className="flex flex-wrap gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button type="button" size="lg" />}
                              disabled={phase === "saving"}
                            >
                              <HugeiconsIcon
                                icon={Download04Icon}
                                strokeWidth={2}
                                data-icon="inline-start"
                              />
                              Eredmények mentése
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuGroup>
                                {canSaveConvertedFramesToDirectory() && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void saveResults("directory")
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={FolderDownloadIcon}
                                      strokeWidth={2}
                                    />
                                    Mentés választott mappába
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => void saveResults("zip")}
                                >
                                  <HugeiconsIcon
                                    icon={FileZipIcon}
                                    strokeWidth={2}
                                  />
                                  Letöltés ZIP-részekben
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <aside className="flex flex-col gap-4 xl:sticky xl:top-4">
              <Card className="border shadow-none ring-0">
                <CardContent>
                  <WorkspaceSettings
                    disabled={phase === "processing" || phase === "saving"}
                  />
                </CardContent>
              </Card>

              {phase === "ready" || phase === "error" ? (
                <Button
                  type="button"
                  size="lg"
                  disabled={summary.selectedCount === 0}
                  onClick={() => void startConversion()}
                >
                  <HugeiconsIcon
                    icon={PlayIcon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Frame-ek konvertálása
                </Button>
              ) : null}

              {activeSettings && (
                <p className="text-muted-foreground px-1 text-xs">
                  {activeSettings.outputFormat.toUpperCase()} ·{" "}
                  {getConversionModeLabel(activeSettings)}
                </p>
              )}

              <a
                href={`/video-framekre-bontasa#video-frame-workspace`}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 px-1 text-sm font-medium"
              >
                <HugeiconsIcon
                  icon={ArrowLeft02Icon}
                  className="size-4"
                  strokeWidth={2}
                />
                Vissza a frame-készítőhöz
              </a>
            </aside>
          </div>
        ) : phase === "error" ? (
          <Card className="mx-auto w-full max-w-2xl border shadow-none ring-0">
            <CardHeader>
              <CardTitle>A frame-készlet nem nyitható meg</CardTitle>
              <CardDescription>
                Az azonosító lejárhatott, a böngésző törölhette a helyi
                tárhelyet, vagy a készlet egy másik eszközön készült.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={() =>
                  window.location.assign(
                    "/video-framekre-bontasa#video-frame-workspace",
                  )
                }
              >
                Új frame-készlet készítése
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
      <Toaster />
    </section>
  );
}
