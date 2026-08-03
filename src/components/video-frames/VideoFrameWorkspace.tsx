import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { proxy } from "comlink";
import {
  ArrowRight02Icon,
  Delete02Icon,
  Download04Icon,
  FileZipIcon,
  Film01Icon,
  FolderDownloadIcon,
  PauseIcon,
  PlayIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDropzone } from "react-dropzone";

import { FileUploadDropzone } from "@/components/upload/FileUploadDropzone";
import { MascotAssistant } from "@/components/mascot/MascotAssistant";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Toaster, toast } from "@/components/ui/toast";
import {
  canSaveFrameSetToDirectory,
  downloadFrameSetAsZipParts,
  downloadFrameSetFiles,
  saveFrameSetToDirectory,
} from "@/features/video-frames/downloads";
import {
  estimateSelectedFrameCount,
  normalizeFrameRate,
} from "@/features/video-frames/sampling";
import {
  cleanupStaleFrameSets,
  getFrameSetSummary,
  readFrameFile,
  removeFrameSet,
  updateFrameSetSelection,
} from "@/features/video-frames/storage";
import type {
  FrameExtractionProgress,
  FrameRateSelection,
  FrameSetManifestV1,
  FrameSetSummary,
  VideoFrameMetadata,
} from "@/features/video-frames/types";
import {
  createVideoFrameWorker,
  type VideoFrameWorkerHandle,
} from "@/features/video-frames/worker-client";
import { formatBytes } from "@/lib/filenames/image-filenames";
import { isFilePickerCancellation } from "@/lib/downloads";

type WorkspacePhase =
  | "empty"
  | "inspecting"
  | "configured"
  | "extracting"
  | "paused"
  | "ready"
  | "saving"
  | "error";

type PreviewFrame = {
  fileName: string;
  timestamp: number;
  url: string;
};

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = Math.floor(safeSeconds % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatFps(fps: number): string {
  return Number.isInteger(fps) ? String(fps) : fps.toFixed(2);
}

function progressPercent(progress: FrameExtractionProgress | undefined) {
  if (!progress) return 0;
  const duration = progress.rangeEnd - progress.rangeStart;
  if (duration <= 0) return 0;
  return Math.min(
    100,
    Math.max(
      0,
      ((progress.currentTimestamp - progress.rangeStart) / duration) * 100,
    ),
  );
}

type FpsControlProps = {
  id: string;
  allFrames: boolean;
  fps: number;
  maximumFps: number;
  disabled?: boolean;
  onAllFramesChange(value: boolean): void;
  onFpsChange(value: number): void;
};

function FpsControl({
  id,
  allFrames,
  fps,
  maximumFps,
  disabled,
  onAllFramesChange,
  onFpsChange,
}: FpsControlProps) {
  return (
    <Field
      data-disabled={disabled ? "true" : undefined}
      className="transition-opacity data-[disabled=true]:opacity-50"
    >
      <FieldLabel htmlFor={`${id}-all`}>Kimeneti képkockaszám</FieldLabel>
      <label
        htmlFor={`${id}-all`}
        className="flex items-center gap-3 text-sm font-medium"
      >
        <Checkbox
          id={`${id}-all`}
          checked={allFrames}
          disabled={disabled}
          className={disabled ? "disabled:opacity-100" : undefined}
          onCheckedChange={(checked) => onAllFramesChange(checked === true)}
        />
        Minden elérhető frame
      </label>
      <div className="flex items-center gap-3">
        <Input
          id={id}
          type="number"
          min={0.01}
          max={maximumFps}
          step={0.01}
          value={fps}
          disabled={disabled || allFrames}
          className={disabled ? "disabled:opacity-100" : undefined}
          aria-label="Kimeneti FPS"
          onChange={(event) => onFpsChange(Number(event.target.value))}
        />
        <span className="text-muted-foreground shrink-0 text-sm">FPS</span>
      </div>
      <FieldDescription>Maximum: {formatFps(maximumFps)} FPS.</FieldDescription>
    </Field>
  );
}

export default function VideoFrameWorkspace() {
  const [phase, setPhase] = useState<WorkspacePhase>("empty");
  const [source, setSource] = useState<File>();
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [metadata, setMetadata] = useState<VideoFrameMetadata>();
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [allFrames, setAllFrames] = useState(true);
  const [firstAndLastOnly, setFirstAndLastOnly] = useState(false);
  const [extractionFps, setExtractionFps] = useState(10);
  const [resultAllFrames, setResultAllFrames] = useState(true);
  const [resultFps, setResultFps] = useState(10);
  const [manifest, setManifest] = useState<FrameSetManifestV1>();
  const [summary, setSummary] = useState<FrameSetSummary>();
  const [progress, setProgress] = useState<FrameExtractionProgress>();
  const [previews, setPreviews] = useState<PreviewFrame[]>([]);
  const [error, setError] = useState<string>();
  const [saveProgress, setSaveProgress] = useState<{
    completed: number;
    total: number;
  }>();
  const workerRef = useRef<VideoFrameWorkerHandle | undefined>(undefined);
  const sourceUrlRef = useRef<string | undefined>(undefined);
  const previewsRef = useRef<PreviewFrame[]>([]);

  const effectiveExtractionFps: FrameRateSelection =
    firstAndLastOnly || allFrames || !metadata
      ? null
      : normalizeFrameRate(extractionFps, metadata.sourceFps);
  const extractionMaximum = metadata?.sourceFps ?? 30;
  const resultMaximum =
    manifest?.extractionFps ??
    manifest?.metadata.sourceFps ??
    extractionMaximum;
  const estimatedFrames = metadata
    ? firstAndLastOnly
      ? 2
      : estimateSelectedFrameCount(
          Math.max(0, rangeEnd - rangeStart),
          metadata.sourceFps,
          effectiveExtractionFps,
        )
    : 0;
  const isActive = phase === "extracting";

  const revokePreviews = useCallback((items: PreviewFrame[]) => {
    items.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  const refreshSummary = useCallback(
    async (frameSetId: string) => {
      const nextSummary = await getFrameSetSummary(frameSetId);
      setManifest(nextSummary.manifest);
      setSummary(nextSummary);

      const nextPreviews: PreviewFrame[] = [];
      for (const frame of nextSummary.previewFrames.slice(0, 12)) {
        const file = await readFrameFile(frameSetId, frame.fileName);
        nextPreviews.push({
          fileName: frame.fileName,
          timestamp: frame.timestamp,
          url: URL.createObjectURL(file),
        });
      }
      setPreviews((current) => {
        revokePreviews(current);
        return nextPreviews;
      });
    },
    [revokePreviews],
  );

  const releaseWorker = useCallback(() => {
    workerRef.current?.worker.terminate();
    workerRef.current = undefined;
  }, []);

  const clearCurrentFrameSet = useCallback(async () => {
    const frameSetId = manifest?.id;
    setManifest(undefined);
    setSummary(undefined);
    setProgress(undefined);
    setPreviews((current) => {
      revokePreviews(current);
      return [];
    });
    if (frameSetId) {
      try {
        await removeFrameSet(frameSetId);
      } catch {
        // A böngésző már eltávolíthatta az ideiglenes készletet.
      }
    }
  }, [manifest?.id, revokePreviews]);

  useEffect(() => {
    void cleanupStaleFrameSets().catch(() => undefined);
  }, []);

  useEffect(() => {
    sourceUrlRef.current = sourceUrl;
  }, [sourceUrl]);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isActive) return;
      event.preventDefault();
      Reflect.set(event, "returnValue", "");
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isActive]);

  useEffect(
    () => () => {
      releaseWorker();
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      revokePreviews(previewsRef.current);
    },
    [releaseWorker, revokePreviews],
  );

  const inspectFile = useCallback(
    async (file: File) => {
      releaseWorker();
      await clearCurrentFrameSet();
      setPhase("inspecting");
      setError(undefined);
      setMetadata(undefined);
      setSource(file);
      setSourceUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(file);
      });

      const handle = createVideoFrameWorker();
      workerRef.current = handle;
      try {
        const result = await handle.api.inspectVideo(file);
        if (!result.valid) {
          setError(`${result.message} ${result.suggestion}`);
          setPhase("error");
          return;
        }

        setMetadata(result.metadata);
        setRangeStart(result.metadata.firstTimestamp);
        setRangeEnd(result.metadata.duration);
        const sensibleFps = Math.min(10, result.metadata.sourceFps);
        setExtractionFps(sensibleFps);
        setResultFps(sensibleFps);
        setAllFrames(true);
        setFirstAndLastOnly(false);
        setResultAllFrames(true);
        setPhase("configured");
      } catch (inspectionError) {
        setError(
          inspectionError instanceof Error
            ? inspectionError.message
            : "A videót nem sikerült beolvasni.",
        );
        setPhase("error");
      } finally {
        releaseWorker();
      }
    },
    [clearCurrentFrameSet, releaseWorker],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => {
      const file = files[0];
      if (file) void inspectFile(file);
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: isActive || phase === "inspecting",
  });

  const runExtraction = useCallback(
    async (resume: boolean) => {
      if (!source || !metadata) return;
      if (
        rangeStart < metadata.firstTimestamp ||
        rangeEnd > metadata.duration ||
        rangeStart >= rangeEnd
      ) {
        setError("A kezdőpontnak a végpont előtt, a videón belül kell lennie.");
        return;
      }

      setError(undefined);
      setPhase("extracting");
      setProgress({
        status: "preparing",
        currentTimestamp: rangeStart,
        rangeStart,
        rangeEnd,
        frameCount: manifest?.frameCount ?? 0,
        totalBytes: manifest?.totalBytes ?? 0,
      });

      try {
        await navigator.storage.persist?.();
      } catch {
        // A feldolgozás best-effort tárhelyen is folytatható.
      }

      const handle = createVideoFrameWorker();
      workerRef.current = handle;
      const frameSetId = resume && manifest ? manifest.id : crypto.randomUUID();

      try {
        const result = await handle.api.extractFrames(
          {
            file: source,
            frameSetId,
            metadata,
            rangeStart,
            rangeEnd,
            extractionMode: firstAndLastOnly ? "first-last" : "timeline",
            extractionFps: effectiveExtractionFps,
            resume,
          },
          proxy((nextProgress) => setProgress(nextProgress)),
        );

        setManifest(result.manifest);
        if (result.reason === "completed") {
          setResultAllFrames(true);
          setResultFps(
            result.manifest.extractionFps ?? result.manifest.metadata.sourceFps,
          );
          await refreshSummary(result.manifest.id);
          setPhase("ready");
          toast.add({
            type: "success",
            title: "Elkészültek a frame-ek",
            description: `${result.manifest.frameCount} veszteségmentes PNG készült.`,
          });
        } else if (result.reason === "storage") {
          await refreshSummary(result.manifest.id);
          setError(
            "A helyi tárhely biztonságos határához értünk. Mentsd vagy optimalizáld az elkészült frame-eket, szabadíts fel helyet, vagy indíts kisebb FPS-sel.",
          );
          setPhase("paused");
        } else {
          await refreshSummary(result.manifest.id);
          setPhase("paused");
        }
      } catch (extractionError) {
        setError(
          extractionError instanceof Error
            ? extractionError.message
            : "A frame-ek elkészítése megszakadt.",
        );
        setPhase("error");
      } finally {
        releaseWorker();
      }
    },
    [
      effectiveExtractionFps,
      firstAndLastOnly,
      manifest,
      metadata,
      rangeEnd,
      rangeStart,
      refreshSummary,
      releaseWorker,
      source,
    ],
  );

  const pauseExtraction = () => {
    void workerRef.current?.api.pause();
  };

  const cancelExtraction = () => {
    void workerRef.current?.api.cancel();
  };

  const applyResultSelection = useCallback(
    async (useAll: boolean, requestedFps: number) => {
      if (!manifest) return;
      const selectionFps = useAll
        ? manifest.extractionFps
        : normalizeFrameRate(requestedFps, resultMaximum);
      await updateFrameSetSelection(manifest.id, selectionFps);
      await refreshSummary(manifest.id);
    },
    [manifest, refreshSummary, resultMaximum],
  );

  const handleResultAllFrames = (value: boolean) => {
    setResultAllFrames(value);
    void applyResultSelection(value, resultFps);
  };

  const handleResultFps = (value: number) => {
    const normalized = Math.max(0.01, Math.min(value, resultMaximum));
    setResultFps(normalized);
    if (!resultAllFrames) {
      void applyResultSelection(false, normalized);
    }
  };

  const runSave = useCallback(
    async (mode: "directory" | "files" | "zip") => {
      if (!summary) return;
      const returnPhase = phase === "paused" ? "paused" : "ready";
      setPhase("saving");
      setSaveProgress({ completed: 0, total: summary.selectedCount });
      setError(undefined);

      try {
        if (mode === "directory") {
          await saveFrameSetToDirectory(
            summary.manifest,
            summary.selectedCount,
            setSaveProgress,
          );
          toast.add({
            type: "success",
            title: "A frame-ek mappába kerültek",
            description: `${summary.selectedCount} PNG mentése elkészült.`,
          });
        } else if (mode === "files") {
          await downloadFrameSetFiles(
            summary.manifest,
            summary.selectedCount,
            setSaveProgress,
          );
          toast.add({
            type: "success",
            title: "A letöltés elindult",
            description: `${summary.selectedCount} PNG külön fájlként kerül a böngésző letöltési helyére.`,
          });
        } else {
          const parts = await downloadFrameSetAsZipParts(
            summary.manifest,
            summary.selectedCount,
            setSaveProgress,
          );
          toast.add({
            type: "success",
            title: "A letöltés elkészült",
            description: `${summary.selectedCount} PNG, ${parts} ZIP-részben.`,
          });
        }
      } catch (saveError) {
        if (!isFilePickerCancellation(saveError)) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "A frame-ek mentése nem sikerült.",
          );
        }
      } finally {
        setSaveProgress(undefined);
        setPhase(returnPhase);
      }
    },
    [phase, summary],
  );

  const transferToConverter = () => {
    if (!summary) return;
    window.location.assign(
      `/kep-konvertalo?frameSet=${encodeURIComponent(summary.manifest.id)}#workspace`,
    );
  };

  const chooseNewVideo = async () => {
    releaseWorker();
    await clearCurrentFrameSet();
    setSource(undefined);
    setMetadata(undefined);
    setError(undefined);
    setSourceUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return undefined;
    });
    setPhase("empty");
    window.setTimeout(open, 0);
  };

  const mascot = useMemo(() => {
    if (phase === "extracting") {
      return {
        state: "processing" as const,
        title: "Morf frame-enként dolgozik",
        message:
          "A videó részletekben olvasódik, a PNG-k pedig folyamatosan a helyi tárhelyre kerülnek.",
      };
    }
    if (phase === "ready" || phase === "saving") {
      return {
        state: "success" as const,
        title: "A frame-ek készen állnak",
        message:
          "Elsődlegesen átviheted őket optimalizálásra, vagy megtarthatod a veszteségmentes PNG-ket.",
      };
    }
    if (phase === "paused") {
      return {
        state: "warning" as const,
        title: "A feldolgozás szünetel",
        message:
          "Az elkészült checkpointok biztonságban vannak. Ugyaninnen folytathatod.",
      };
    }
    return {
      state: phase === "error" ? ("error" as const) : ("idle" as const),
      title: "Csatolj egy videót",
      message:
        "A feltöltés után kiválaszhatod, hogyan szeretnéd képekre bontani.",
    };
  }, [phase]);

  return (
    <section
      id="video-frame-workspace"
      className="border-border bg-surface-subtle border-b"
    >
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <MascotAssistant {...mascot} />

        {error && (
          <Alert variant="destructive">
            <AlertTitle>A művelet figyelmet kér</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!metadata ? (
          <div>
            <input
              {...getInputProps({
                accept:
                  "video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm",
              })}
              aria-label="Videó kiválasztása"
            />
            <FileUploadDropzone
              getRootProps={getRootProps}
              isDragActive={isDragActive}
              onBrowse={open}
              title="Húzd ide a videót"
              activeTitle="Engedd el a videót"
              description="Egy MP4, MOV vagy WebM videóból készíthetsz teljes felbontású PNG frame-eket."
              buttonLabel="Videó kiválasztása"
              busy={phase === "inspecting"}
              busyLabel="Videó ellenőrzése"
              icon={Video01Icon}
              privacyNote="A videó nem töltődik fel a Morf szerverére."
            />
          </div>
        ) : (
          metadata &&
          source && (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flex min-w-0 flex-col gap-6">
                <Card className="min-w-0 overflow-hidden border shadow-none ring-0">
                  <CardHeader>
                    <CardTitle>Forrásvideó</CardTitle>
                    <CardDescription>
                      A fájlhoz a feldolgozás alatt közvetlenül, részletekben
                      férünk hozzá.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="bg-foreground/5 overflow-hidden rounded-2xl border">
                      {sourceUrl && (
                        <video
                          src={sourceUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="aspect-video size-full object-contain"
                        />
                      )}
                    </div>
                    <dl className="grid min-w-0 content-start gap-3 text-sm">
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">Fájlnév</dt>
                        <dd
                          className="block max-w-full truncate font-medium"
                          title={source.name}
                        >
                          {source.name}
                        </dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-muted-foreground">Időtartam</dt>
                          <dd className="font-medium tabular-nums">
                            {formatDuration(metadata.duration)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Méret</dt>
                          <dd className="font-medium tabular-nums">
                            {formatBytes(source.size)}
                          </dd>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-muted-foreground">Felbontás</dt>
                          <dd className="font-medium tabular-nums">
                            {metadata.width} × {metadata.height}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Forrás FPS</dt>
                          <dd className="font-medium tabular-nums">
                            ≈ {formatFps(metadata.sourceFps)}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {(phase === "extracting" || phase === "paused") && progress && (
                  <Card className="border shadow-none ring-0">
                    <CardHeader>
                      <CardTitle>
                        {phase === "paused"
                          ? "Feldolgozás szünetel"
                          : "Frame-ek készítése"}
                      </CardTitle>
                      <CardDescription>
                        {progress.frameCount} PNG ·{" "}
                        {formatBytes(progress.totalBytes)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                      <Progress
                        value={progressPercent(progress)}
                        aria-label="Frame-ek feldolgozási folyamata"
                      >
                        <ProgressLabel>
                          {formatDuration(progress.currentTimestamp)} /{" "}
                          {formatDuration(progress.rangeEnd)}
                        </ProgressLabel>
                        <ProgressValue />
                      </Progress>
                      {progress.storageRemaining !== undefined && (
                        <p className="text-muted-foreground text-sm tabular-nums">
                          Becsült szabad helyi tárhely:{" "}
                          {formatBytes(progress.storageRemaining)}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {phase === "extracting" ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={pauseExtraction}
                            >
                              <HugeiconsIcon
                                icon={PauseIcon}
                                strokeWidth={2}
                                data-icon="inline-start"
                              />
                              Szüneteltetés
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={cancelExtraction}
                            >
                              Megszakítás
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => void runExtraction(true)}
                          >
                            <HugeiconsIcon
                              icon={PlayIcon}
                              strokeWidth={2}
                              data-icon="inline-start"
                            />
                            Folytatás
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(phase === "ready" ||
                  phase === "saving" ||
                  phase === "paused") &&
                  summary && (
                    <Card className="border shadow-none ring-0">
                      <CardHeader>
                        <CardTitle>Elkészült PNG frame-ek</CardTitle>
                        <CardDescription>
                          {summary.selectedCount} kiválasztva ·{" "}
                          {formatBytes(summary.selectedBytes)} · eredeti
                          felbontás
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-5">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {previews.map((preview) => (
                            <figure
                              key={preview.fileName}
                              className="bg-muted overflow-hidden rounded-2xl border"
                            >
                              <img
                                src={preview.url}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="aspect-video size-full object-contain"
                              />
                              <figcaption className="text-muted-foreground px-2 py-1.5 text-xs tabular-nums">
                                {formatDuration(preview.timestamp)}
                              </figcaption>
                            </figure>
                          ))}
                        </div>

                        {saveProgress && (
                          <Progress
                            value={
                              saveProgress.total > 0
                                ? (saveProgress.completed /
                                    saveProgress.total) *
                                  100
                                : 0
                            }
                            aria-label="Frame-ek mentése"
                          >
                            <ProgressLabel>PNG-k mentése</ProgressLabel>
                            <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                              {saveProgress.completed} / {saveProgress.total}
                            </span>
                          </Progress>
                        )}

                        <div className="border-primary/30 bg-primary/5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-heading text-base font-medium">
                              Optimalizálnád a PNG-ket?
                            </h4>
                            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                              Vidd át a kiválasztott frame-eket a
                              képkonvertálóba, ahol formátumot, méretet és
                              minőséget adhatsz meg.
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              size="lg"
                              disabled={phase === "saving"}
                              onClick={transferToConverter}
                            >
                              Frame-ek optimalizálása
                              <HugeiconsIcon
                                icon={ArrowRight02Icon}
                                strokeWidth={2}
                                data-icon="inline-end"
                              />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                  />
                                }
                                disabled={phase === "saving"}
                              >
                                <HugeiconsIcon
                                  icon={Download04Icon}
                                  strokeWidth={2}
                                  data-icon="inline-start"
                                />
                                PNG-k letöltése
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={() => void runSave("files")}
                                  >
                                    <HugeiconsIcon
                                      icon={Download04Icon}
                                      strokeWidth={2}
                                    />
                                    Letöltés egyesével
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => void runSave("zip")}
                                  >
                                    <HugeiconsIcon
                                      icon={FileZipIcon}
                                      strokeWidth={2}
                                    />
                                    Letöltés ZIP-ben
                                  </DropdownMenuItem>
                                  {canSaveFrameSetToDirectory() && (
                                    <DropdownMenuItem
                                      onClick={() => void runSave("directory")}
                                    >
                                      <HugeiconsIcon
                                        icon={FolderDownloadIcon}
                                        strokeWidth={2}
                                      />
                                      Mentés választott mappába
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </div>

              <aside className="flex flex-col gap-4 xl:sticky xl:top-4">
                {phase === "configured" || phase === "extracting" ? (
                  <Card className="border shadow-none ring-0">
                    <CardHeader>
                      <CardTitle>Beállítások</CardTitle>
                      <CardDescription>
                        Válaszd ki, hány képre szeretnéd felbontani a videót.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="frame-range-start">
                            Kezdés, mp
                          </FieldLabel>
                          <Input
                            id="frame-range-start"
                            type="number"
                            min={metadata.firstTimestamp}
                            max={rangeEnd}
                            step={0.01}
                            value={rangeStart}
                            disabled={phase !== "configured"}
                            onChange={(event) =>
                              setRangeStart(Number(event.target.value))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="frame-range-end">
                            Vége, mp
                          </FieldLabel>
                          <Input
                            id="frame-range-end"
                            type="number"
                            min={rangeStart}
                            max={metadata.duration}
                            step={0.01}
                            value={rangeEnd}
                            disabled={phase !== "configured"}
                            onChange={(event) =>
                              setRangeEnd(Number(event.target.value))
                            }
                          />
                        </Field>
                      </div>

                      <Field>
                        <label
                          htmlFor="first-and-last-only"
                          className="flex items-start gap-3 text-sm font-medium"
                        >
                          <Checkbox
                            id="first-and-last-only"
                            checked={firstAndLastOnly}
                            disabled={phase !== "configured"}
                            onCheckedChange={(checked) =>
                              setFirstAndLastOnly(checked === true)
                            }
                          />
                          <span>Csak az első és utolsó frame mentése</span>
                        </label>
                        <FieldDescription>
                          A kijelölt időtartomány elejéről és végéről egy-egy
                          kép készül.
                        </FieldDescription>
                      </Field>

                      <FpsControl
                        id="extraction-fps"
                        allFrames={allFrames}
                        fps={extractionFps}
                        maximumFps={metadata.sourceFps}
                        disabled={phase !== "configured" || firstAndLastOnly}
                        onAllFramesChange={setAllFrames}
                        onFpsChange={(value) =>
                          setExtractionFps(
                            Math.max(0.01, Math.min(value, metadata.sourceFps)),
                          )
                        }
                      />

                      <div className="bg-muted rounded-2xl border p-4">
                        <p className="text-muted-foreground text-xs">
                          Becsült kimenet
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {firstAndLastOnly
                            ? "= 2 PNG"
                            : `≈ ${estimatedFrames} PNG`}
                        </p>
                        <p className="text-muted-foreground mt-2 text-xs">
                          A PNG-k pontos mérete a videó tartalmától függ.
                        </p>
                      </div>

                      {phase === "configured" && (
                        <Button
                          type="button"
                          size="lg"
                          onClick={() => void runExtraction(false)}
                        >
                          <HugeiconsIcon
                            icon={Film01Icon}
                            strokeWidth={2}
                            data-icon="inline-start"
                          />
                          Frame-ek elkészítése
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border shadow-none ring-0">
                    <CardHeader>
                      <CardTitle>Kiválasztott frame-ek</CardTitle>
                      <CardDescription>
                        Az elkészült készlet tovább ritkítható, de nem
                        sűríthető.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                      <FpsControl
                        id="result-fps"
                        allFrames={resultAllFrames}
                        fps={resultFps}
                        maximumFps={resultMaximum}
                        disabled={phase === "saving"}
                        onAllFramesChange={handleResultAllFrames}
                        onFpsChange={handleResultFps}
                      />
                      <div className="bg-muted rounded-2xl border p-4">
                        <p className="text-muted-foreground text-xs">
                          Aktív készlet
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {summary?.selectedCount ?? 0} frame
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                          {formatBytes(summary?.selectedBytes ?? 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  disabled={isActive || phase === "saving"}
                  onClick={() => void chooseNewVideo()}
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Új videó választása
                </Button>
              </aside>
            </div>
          )
        )}
      </div>
      <Toaster />
    </section>
  );
}
