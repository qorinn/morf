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
  WorkspaceI18nProvider,
  useWorkspaceI18n,
} from "@/components/workspace/WorkspaceI18nProvider";
import { useErrorToast } from "@/hooks/use-error-toast";
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
import { getVideoFramesMessages, type VideoFramesMessages } from "@/i18n/video-frames";
import { getLocalizedRoute } from "@/lib/localized-routes";
import type { Locale } from "@/lib/locale";

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
  copy: VideoFramesMessages["workspace"]["fpsControl"];
  onAllFramesChange(value: boolean): void;
  onFpsChange(value: number): void;
};

function FpsControl({
  id,
  allFrames,
  fps,
  maximumFps,
  disabled,
  copy,
  onAllFramesChange,
  onFpsChange,
}: FpsControlProps) {
  return (
    <Field
      data-disabled={disabled ? "true" : undefined}
      className="transition-opacity data-[disabled=true]:opacity-50"
    >
      <FieldLabel htmlFor={`${id}-all`}>{copy.label}</FieldLabel>
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
        {copy.allFrames}
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
          aria-label={copy.ariaLabel}
          onChange={(event) => onFpsChange(Number(event.target.value))}
        />
        <span className="text-muted-foreground shrink-0 text-sm">{copy.unit}</span>
      </div>
      <FieldDescription>{copy.maximum(formatFps(maximumFps))}</FieldDescription>
    </Field>
  );
}

function StandardVideoFrameWorkspace({ locale }: { locale: Locale }) {
  const { messages } = useWorkspaceI18n<VideoFramesMessages>();
  const { workspace } = messages;
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

  useErrorToast(error, workspace.errorToastTitle);

  const revokePreviews = useCallback((items: PreviewFrame[]) => {
    items.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  const refreshSummary = useCallback(
    async (frameSetId: string) => {
      const nextSummary = await getFrameSetSummary(
        frameSetId,
        messages.workerErrors,
      );
      setManifest(nextSummary.manifest);
      setSummary(nextSummary);

      const nextPreviews: PreviewFrame[] = [];
      for (const frame of nextSummary.previewFrames.slice(0, 12)) {
        const file = await readFrameFile(
          frameSetId,
          frame.fileName,
          messages.workerErrors,
        );
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
    [messages.workerErrors, revokePreviews],
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
        await removeFrameSet(frameSetId, messages.workerErrors);
      } catch {
        // A böngésző már eltávolíthatta az ideiglenes készletet.
      }
    }
  }, [manifest?.id, messages.workerErrors, revokePreviews]);

  useEffect(() => {
    void cleanupStaleFrameSets(Date.now(), messages.workerErrors).catch(
      () => undefined,
    );
  }, [messages.workerErrors]);

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
        const result = await handle.api.inspectVideo(file, messages.workerErrors);
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
            : workspace.inspectionFailedFallback,
        );
        setPhase("error");
      } finally {
        releaseWorker();
      }
    },
    [
      clearCurrentFrameSet,
      messages.workerErrors,
      releaseWorker,
      workspace.inspectionFailedFallback,
    ],
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
        setError(workspace.rangeValidationError);
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
            copy: messages.workerErrors,
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
            title: workspace.toasts.extractionCompleteTitle,
            description: workspace.toasts.extractionCompleteDescription(
              result.manifest.frameCount,
            ),
          });
        } else if (result.reason === "storage") {
          await refreshSummary(result.manifest.id);
          setError(workspace.storagePausedMessage);
          setPhase("paused");
        } else {
          await refreshSummary(result.manifest.id);
          setPhase("paused");
        }
      } catch (extractionError) {
        setError(
          extractionError instanceof Error
            ? extractionError.message
            : workspace.extractionFailedFallback,
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
      messages.workerErrors,
      metadata,
      rangeEnd,
      rangeStart,
      refreshSummary,
      releaseWorker,
      source,
      workspace.extractionFailedFallback,
      workspace.rangeValidationError,
      workspace.storagePausedMessage,
      workspace.toasts,
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
      await updateFrameSetSelection(
        manifest.id,
        selectionFps,
        messages.workerErrors,
      );
      await refreshSummary(manifest.id);
    },
    [manifest, messages.workerErrors, refreshSummary, resultMaximum],
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
            messages.workerErrors,
          );
          toast.add({
            type: "success",
            title: workspace.toasts.savedToDirectoryTitle,
            description: workspace.toasts.savedToDirectoryDescription(
              summary.selectedCount,
            ),
          });
        } else if (mode === "files") {
          await downloadFrameSetFiles(
            summary.manifest,
            summary.selectedCount,
            setSaveProgress,
            messages.workerErrors,
          );
          toast.add({
            type: "success",
            title: workspace.toasts.downloadStartedTitle,
            description: workspace.toasts.downloadStartedDescription(
              summary.selectedCount,
            ),
          });
        } else {
          const parts = await downloadFrameSetAsZipParts(
            summary.manifest,
            summary.selectedCount,
            setSaveProgress,
            messages.workerErrors,
          );
          toast.add({
            type: "success",
            title: workspace.toasts.downloadCompleteTitle,
            description: workspace.toasts.downloadCompleteDescription(
              summary.selectedCount,
              parts,
            ),
          });
        }
      } catch (saveError) {
        if (!isFilePickerCancellation(saveError)) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : workspace.saveFailedFallback,
          );
        }
      } finally {
        setSaveProgress(undefined);
        setPhase(returnPhase);
      }
    },
    [messages.workerErrors, phase, summary, workspace.saveFailedFallback, workspace.toasts],
  );

  const transferToConverter = () => {
    if (!summary) return;
    const converterHref = getLocalizedRoute("imageConverter", locale);
    window.location.assign(
      `${converterHref}?frameSet=${encodeURIComponent(summary.manifest.id)}#workspace`,
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
      return { state: "processing" as const, ...workspace.mascot.processing };
    }
    if (phase === "ready" || phase === "saving") {
      return { state: "success" as const, ...workspace.mascot.success };
    }
    if (phase === "paused") {
      return { state: "warning" as const, ...workspace.mascot.paused };
    }
    return {
      state: phase === "error" ? ("error" as const) : ("idle" as const),
      ...workspace.mascot.idle,
    };
  }, [phase, workspace.mascot]);

  return (
    <section
      id="video-frame-workspace"
      className="border-border bg-surface-subtle border-b"
    >
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <MascotAssistant {...mascot} />

        {error && (
          <Alert variant="destructive">
            <AlertTitle>{workspace.errorAlertTitle}</AlertTitle>
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
              aria-label={workspace.sourceInputAriaLabel}
            />
            <FileUploadDropzone
              getRootProps={getRootProps}
              isDragActive={isDragActive}
              onBrowse={open}
              title={workspace.dropzone.title}
              activeTitle={workspace.dropzone.activeTitle}
              description={workspace.dropzone.description}
              buttonLabel={workspace.dropzone.buttonLabel}
              busy={phase === "inspecting"}
              busyLabel={workspace.dropzone.busyLabel}
              icon={Video01Icon}
              privacyNote={workspace.dropzone.privacyNote}
            />
          </div>
        ) : (
          metadata &&
          source && (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flex min-w-0 flex-col gap-6">
                <Card className="min-w-0 overflow-hidden border shadow-none ring-0">
                  <CardHeader>
                    <CardTitle>{workspace.sourceCard.title}</CardTitle>
                    <CardDescription>
                      {workspace.sourceCard.description}
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
                        <dt className="text-muted-foreground">{workspace.fileName}</dt>
                        <dd
                          className="block max-w-full truncate font-medium"
                          title={source.name}
                        >
                          {source.name}
                        </dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-muted-foreground">{workspace.duration}</dt>
                          <dd className="font-medium tabular-nums">
                            {formatDuration(metadata.duration)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{workspace.size}</dt>
                          <dd className="font-medium tabular-nums">
                            {formatBytes(source.size)}
                          </dd>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-muted-foreground">{workspace.resolution}</dt>
                          <dd className="font-medium tabular-nums">
                            {metadata.width} × {metadata.height}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{workspace.sourceFps}</dt>
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
                          ? workspace.progressCard.paused
                          : workspace.progressCard.extracting}
                      </CardTitle>
                      <CardDescription>
                        {progress.frameCount} PNG ·{" "}
                        {formatBytes(progress.totalBytes)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                      <Progress
                        value={progressPercent(progress)}
                        aria-label={workspace.progressAriaLabel}
                      >
                        <ProgressLabel>
                          {formatDuration(progress.currentTimestamp)} /{" "}
                          {formatDuration(progress.rangeEnd)}
                        </ProgressLabel>
                        <ProgressValue />
                      </Progress>
                      {progress.storageRemaining !== undefined && (
                        <p className="text-muted-foreground text-sm tabular-nums">
                          {workspace.storageRemainingLabel}{" "}
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
                              {workspace.pause}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={cancelExtraction}
                            >
                              {workspace.cancel}
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
                            {workspace.resume}
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
                        <CardTitle>{workspace.resultCard.title}</CardTitle>
                        <CardDescription>
                          {workspace.resultCard.description(
                            summary.selectedCount,
                            formatBytes(summary.selectedBytes),
                          )}
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
                            aria-label={workspace.saveProgressAriaLabel}
                          >
                            <ProgressLabel>{workspace.savingLabel}</ProgressLabel>
                            <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                              {saveProgress.completed} / {saveProgress.total}
                            </span>
                          </Progress>
                        )}

                        <div className="border-primary/30 bg-primary/5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-heading text-base font-medium">
                              {workspace.optimizePromo.title}
                            </h4>
                            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                              {workspace.optimizePromo.description}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              size="lg"
                              disabled={phase === "saving"}
                              onClick={transferToConverter}
                            >
                              {workspace.optimizePromo.action}
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
                                {workspace.downloadMenu.trigger}
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
                                    {workspace.downloadMenu.files}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => void runSave("zip")}
                                  >
                                    <HugeiconsIcon
                                      icon={FileZipIcon}
                                      strokeWidth={2}
                                    />
                                    {workspace.downloadMenu.zip}
                                  </DropdownMenuItem>
                                  {canSaveFrameSetToDirectory() && (
                                    <DropdownMenuItem
                                      onClick={() => void runSave("directory")}
                                    >
                                      <HugeiconsIcon
                                        icon={FolderDownloadIcon}
                                        strokeWidth={2}
                                      />
                                      {workspace.downloadMenu.directory}
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
                      <CardTitle>{workspace.settingsCard.title}</CardTitle>
                      <CardDescription>
                        {workspace.settingsCard.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="frame-range-start">
                            {workspace.rangeStart}
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
                            {workspace.rangeEnd}
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
                          <span>{workspace.firstAndLastOnly.label}</span>
                        </label>
                        <FieldDescription>
                          {workspace.firstAndLastOnly.description}
                        </FieldDescription>
                      </Field>

                      <FpsControl
                        id="extraction-fps"
                        allFrames={allFrames}
                        fps={extractionFps}
                        maximumFps={metadata.sourceFps}
                        disabled={phase !== "configured" || firstAndLastOnly}
                        copy={workspace.fpsControl}
                        onAllFramesChange={setAllFrames}
                        onFpsChange={(value) =>
                          setExtractionFps(
                            Math.max(0.01, Math.min(value, metadata.sourceFps)),
                          )
                        }
                      />

                      <div className="bg-muted rounded-2xl border p-4">
                        <p className="text-muted-foreground text-xs">
                          {workspace.estimatedOutput.label}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {firstAndLastOnly
                            ? workspace.estimatedOutput.exactlyTwo
                            : workspace.estimatedOutput.approx(estimatedFrames)}
                        </p>
                        <p className="text-muted-foreground mt-2 text-xs">
                          {workspace.estimatedOutput.note}
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
                          {workspace.extractButton}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border shadow-none ring-0">
                    <CardHeader>
                      <CardTitle>{workspace.resultSettingsCard.title}</CardTitle>
                      <CardDescription>
                        {workspace.resultSettingsCard.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                      <FpsControl
                        id="result-fps"
                        allFrames={resultAllFrames}
                        fps={resultFps}
                        maximumFps={resultMaximum}
                        disabled={phase === "saving"}
                        copy={workspace.fpsControl}
                        onAllFramesChange={handleResultAllFrames}
                        onFpsChange={handleResultFps}
                      />
                      <div className="bg-muted rounded-2xl border p-4">
                        <p className="text-muted-foreground text-xs">
                          {workspace.activeSet}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {workspace.imageCountLabel(summary?.selectedCount ?? 0)}
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
                  {workspace.chooseNewVideo}
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

interface VideoFrameWorkspaceProps {
  locale?: Locale;
}

export default function VideoFrameWorkspace({
  locale = "hu",
}: VideoFrameWorkspaceProps) {
  return (
    <WorkspaceI18nProvider locale={locale} messages={getVideoFramesMessages(locale)}>
      <StandardVideoFrameWorkspace locale={locale} />
    </WorkspaceI18nProvider>
  );
}
