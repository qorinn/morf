import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { proxy } from "comlink";
import {
  Delete02Icon,
  Download04Icon,
  Film01Icon,
  PauseIcon,
  PlayIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDropzone } from "react-dropzone";

import { FileUploadDropzone } from "@/components/upload/FileUploadDropzone";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription } from "@/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
  addSpeedPoint,
  createSpeedCurveFileName,
  curvePresetId,
  defaultSpeedCurve,
  estimateOutputDuration,
  frameNumberAtSourceTime,
  MAX_SPEED,
  MIN_SPEED,
  outputTimeAtSourceTime,
  removeSpeedPoint,
  sampleSpeedCurve,
  speedAt,
  speedPresets,
  sourceTimeAtPosition,
  updateSpeedPoint,
  updateSpeedPointTransition,
} from "@/features/video-speed/curve";
import { renderCurveAudio } from "@/features/video-speed/audio";
import type { SpeedCurve, SpeedPoint, SpeedTransition, VideoSpeedMetadata } from "@/features/video-speed/types";
import {
  createVideoSpeedWorker,
  transferableExportRequest,
  type VideoSpeedWorkerHandle,
} from "@/features/video-speed/worker-client";
import { downloadFile } from "@/lib/downloads/file-saver";
import { formatBytes } from "@/lib/filenames/image-filenames";

type Phase = "empty" | "inspecting" | "ready" | "rendering-audio" | "exporting" | "complete" | "error";

const graph = { width: 1000, height: 210, paddingX: 36, paddingY: 16 };
const transitionOptions: Array<{ value: SpeedTransition; label: string }> = [
  { value: "ease-in", label: "Ease in" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in-out" },
  { value: "linear", label: "Lineáris" },
  { value: "hard-cut", label: "Hard cut" },
];

function formatDuration(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${remainder.toFixed(1).padStart(4, "0")}`;
}

function formatTimestamp(seconds: number): string {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function positionToX(position: number) {
  return graph.paddingX + position * (graph.width - graph.paddingX * 2);
}

function speedToY(speed: number) {
  return (
    graph.paddingY +
    ((MAX_SPEED - speed) / (MAX_SPEED - MIN_SPEED)) *
      (graph.height - graph.paddingY * 2)
  );
}

function graphPosition(event: {
  currentTarget: SVGSVGElement;
  clientX: number;
  clientY: number;
}) {
  const rect = event.currentTarget.getBoundingClientRect();
  const position = (event.clientX - rect.left - (graph.paddingX / graph.width) * rect.width) /
    (rect.width * (1 - (graph.paddingX * 2) / graph.width));
  const speed = MAX_SPEED -
    ((event.clientY - rect.top - (graph.paddingY / graph.height) * rect.height) /
      (rect.height * (1 - (graph.paddingY * 2) / graph.height))) *
      (MAX_SPEED - MIN_SPEED);
  return {
    position: Math.min(1, Math.max(0, position)),
    speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)),
  };
}

function graphPositionFromClientX(svg: SVGSVGElement, clientX: number) {
  const rect = svg.getBoundingClientRect();
  const position = (clientX - rect.left - (graph.paddingX / graph.width) * rect.width) /
    (rect.width * (1 - (graph.paddingX * 2) / graph.width));
  return Math.min(1, Math.max(0, position));
}

function CurveEditor({
  curve,
  disabled,
  sourceDuration,
  frameRate,
  playbackPosition,
  onChange,
  onDragStart,
  onDragMove,
  onDragEnd,
  onControllerDragStart,
  onControllerDragMove,
  onControllerDragEnd,
  onControllerSeek,
}: {
  curve: SpeedCurve;
  disabled?: boolean;
  sourceDuration: number;
  frameRate: number;
  playbackPosition: number;
  onChange(curve: SpeedCurve): void;
  onDragStart?(point: SpeedPoint): void;
  onDragMove?(point: SpeedPoint): void;
  onDragEnd?(): void;
  onControllerDragStart?(): void;
  onControllerDragMove?(position: number): void;
  onControllerDragEnd?(): void;
  onControllerSeek?(position: number): void;
}) {
  const [dragIndex, setDragIndex] = useState<number>();
  const [activeIndex, setActiveIndex] = useState<number>();
  const [controllerPosition, setControllerPosition] = useState<number>();
  const [isControllerDragging, setIsControllerDragging] = useState(false);
  const suppressClickRef = useRef(false);
  const pointPointerStartRef = useRef<{ index: number; clientX: number; clientY: number; point: SpeedPoint } | undefined>(undefined);
  const svgRef = useRef<SVGSVGElement>(null);
  const normalized = useMemo(
    () => ({ points: [...curve.points].sort((left, right) => left.position - right.position) }),
    [curve],
  );
  const path = sampleSpeedCurve(normalized)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${positionToX(point.position)} ${speedToY(point.speed)}`)
    .join(" ");
  const activePoint = activeIndex === undefined ? undefined : normalized.points[activeIndex];
  const activeSourceTime = activePoint
    ? sourceTimeAtPosition(activePoint.position, sourceDuration)
    : 0;

  const changePointFromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    let nextDragIndex = dragIndex;
    if (nextDragIndex === undefined && pointPointerStartRef.current) {
      const start = pointPointerStartRef.current;
      if (start.index === 0 || start.index === normalized.points.length - 1) return;
      if (Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) < 4) return;
      nextDragIndex = start.index;
      setDragIndex(nextDragIndex);
      onDragStart?.(start.point);
    }
    if (nextDragIndex === undefined) return;
    const nextCurve = updateSpeedPoint(normalized, nextDragIndex, graphPosition(event));
    onChange(nextCurve);
    onDragMove?.(nextCurve.points[nextDragIndex]);
  };

  const endDrag = () => {
    pointPointerStartRef.current = undefined;
    if (dragIndex === undefined) return;
    setDragIndex(undefined);
    onDragEnd?.();
  };

  const currentControllerPosition = controllerPosition ?? playbackPosition;

  const moveControllerFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const position = graphPositionFromClientX(svg, clientX);
    setControllerPosition(position);
    onControllerDragMove?.(position);
  };

  const endControllerDrag = () => {
    if (!isControllerDragging) return;
    setIsControllerDragging(false);
    setControllerPosition(undefined);
    onControllerDragEnd?.();
  };

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card">
      {activePoint && (
        <div
          className="border-border bg-card/95 pointer-events-none absolute top-3 right-3 z-10 flex items-baseline gap-2 rounded-lg border px-3 py-2 text-xs shadow-none"
          aria-live="polite"
        >
          <span
            className="text-muted-foreground"
            title="A frame-sorszám az átlagos FPS alapján számolt becslés; változó FPS-nél eltérhet."
          >
            {formatTimestamp(activeSourceTime)} · ~#{frameNumberAtSourceTime(activeSourceTime, frameRate)}. frame
          </span>
          <strong className="text-foreground text-sm font-semibold tabular-nums">
            {activePoint.speed.toFixed(2)}×
          </strong>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        className="block h-44 w-full touch-none select-none sm:h-52"
        aria-label="Sebességgörbe. A függőleges jelző a videó aktuális pozícióját mutatja. Kattintással új pontot adhatsz hozzá, a pontok húzhatók."
        onPointerMove={changePointFromPointer}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          if (dragIndex !== undefined || disabled) return;
          const target = event.target as SVGElement;
          if (target.dataset.point === "true") return;
          const point = graphPosition(event);
          const nextCurve = addSpeedPoint(normalized, point);
          setActiveIndex(
            nextCurve.points.findIndex(
              (candidate) =>
                Math.abs(candidate.position - point.position) < 0.001 &&
                Math.abs(candidate.speed - point.speed) < 0.001,
            ),
          );
          onChange(nextCurve);
        }}
      >
        {[0.1, 1, 3, 6, 10].map((speed) => (
          <g key={speed}>
            <line
              x1={graph.paddingX}
              x2={graph.width - graph.paddingX}
              y1={speedToY(speed)}
              y2={speedToY(speed)}
              className="stroke-border"
              strokeDasharray={speed === 1 ? "0" : "6 7"}
            />
            <text x="8" y={speedToY(speed) + 5} className="fill-muted-foreground text-[20px]">
              {speed}×
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((position) => (
          <line
            key={position}
            x1={positionToX(position)}
            x2={positionToX(position)}
            y1={graph.paddingY}
            y2={graph.height - graph.paddingY}
            className="stroke-border"
            strokeDasharray="5 8"
          />
        ))}
        <rect
          x={positionToX(currentControllerPosition) - 14}
          y={graph.paddingY}
          width="28"
          height={graph.height - graph.paddingY * 2}
          data-controller="true"
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label="Videó pozíciója"
          aria-valuemin={0}
          aria-valuemax={sourceDuration}
          aria-valuenow={sourceTimeAtPosition(currentControllerPosition, sourceDuration)}
          aria-valuetext={formatTimestamp(sourceTimeAtPosition(currentControllerPosition, sourceDuration))}
          className="fill-transparent stroke-transparent cursor-ew-resize outline-none focus-visible:stroke-ring focus-visible:stroke-[4px] disabled:cursor-default"
          onPointerDown={(event) => {
            if (disabled) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            suppressClickRef.current = true;
            setIsControllerDragging(true);
            onControllerDragStart?.();
            moveControllerFromClientX(event.clientX);
          }}
          onPointerMove={(event) => {
            if (!isControllerDragging) return;
            moveControllerFromClientX(event.clientX);
          }}
          onPointerUp={endControllerDrag}
          onPointerCancel={endControllerDrag}
          onKeyDown={(event) => {
            if (disabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
            event.preventDefault();
            const sourceStep = event.shiftKey
              ? Math.max(1, sourceDuration * 0.05)
              : 1 / Math.max(1, frameRate);
            const nextPosition = Math.min(
              1,
              Math.max(0, currentControllerPosition + (event.key === "ArrowRight" ? sourceStep : -sourceStep) / sourceDuration),
            );
            onControllerSeek?.(nextPosition);
          }}
        />
        <line
          x1={positionToX(currentControllerPosition)}
          x2={positionToX(currentControllerPosition)}
          y1={graph.paddingY}
          y2={graph.height - graph.paddingY}
          className="stroke-ring"
          strokeWidth="4"
          pointerEvents="none"
          aria-hidden="true"
        />
        <path d={path} fill="none" className="stroke-primary" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
        {normalized.points.map((point, index) => (
          <circle
            key={`${point.position}-${index}`}
            data-point="true"
            cx={positionToX(point.position)}
            cy={speedToY(point.speed)}
            r="8"
            tabIndex={disabled ? -1 : 0}
            role="slider"
            aria-label={`${index === 0 || index === normalized.points.length - 1 ? "Rögzített" : "Szerkeszthető"} görbepont: ${Math.round(point.position * 100)}%, ${point.speed.toFixed(1)}×`}
            aria-valuemin={MIN_SPEED}
            aria-valuemax={MAX_SPEED}
            aria-valuenow={point.speed}
            className="fill-card stroke-primary cursor-grab stroke-[4px] outline-none focus-visible:stroke-ring data-[selected=true]:stroke-ring data-[selected=true]:stroke-[5px] disabled:cursor-default"
            data-selected={activeIndex === index ? "true" : undefined}
            onPointerDown={(event) => {
              if (disabled) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              suppressClickRef.current = true;
              setActiveIndex(index);
              pointPointerStartRef.current = {
                index,
                clientX: event.clientX,
                clientY: event.clientY,
                point,
              };
            }}
            onFocus={() => setActiveIndex(index)}
            onKeyDown={(event) => {
              if (disabled || index === 0 || index === normalized.points.length - 1) return;
              if (event.key === "Delete" || event.key === "Backspace") {
                event.preventDefault();
                onChange(removeSpeedPoint(normalized, index));
                return;
              }
              const multiplier = event.shiftKey ? 0.5 : 0.1;
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                onChange(updateSpeedPoint(normalized, index, {
                  position: point.position,
                  speed: point.speed + (event.key === "ArrowUp" ? multiplier : -multiplier),
                }));
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                onChange(updateSpeedPoint(normalized, index, {
                  position: point.position + (event.key === "ArrowRight" ? 0.02 : -0.02),
                  speed: point.speed,
                }));
              }
            }}
          />
        ))}
      </svg>
      {activePoint && activeIndex !== undefined && (
        <section className="border-border bg-muted/45 flex flex-col gap-3 border-t p-4" aria-labelledby="selected-speed-point-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h4 id="selected-speed-point-heading" className="text-sm font-semibold">Kiválasztott pont</h4>
              <p className="text-muted-foreground text-xs">{formatTimestamp(activeSourceTime)} · {activePoint.speed.toFixed(1)}×</p>
            </div>
            <span className="text-muted-foreground text-xs">
              {activeIndex === 0 ? "Kezdőpont" : activeIndex === normalized.points.length - 1 ? "Végpont" : "Köztes pont"}
            </span>
          </div>
          {activeIndex > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-muted-foreground text-xs font-medium">Bal oldali átmenet</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {transitionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    aria-pressed={activePoint.incomingTransition === option.value}
                    className="border-input bg-card hover:border-primary/50 focus-visible:ring-ring rounded-md border px-2 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-3 data-[state=selected]:border-ring data-[state=selected]:bg-muted disabled:opacity-50"
                    data-state={activePoint.incomingTransition === option.value ? "selected" : undefined}
                    onClick={() => onChange(updateSpeedPointTransition(normalized, activeIndex, "incoming", option.value))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {activePoint.incomingTransition === "hard-cut" && (
                <p className="text-muted-foreground text-xs">Ugrás a pont sebességére.</p>
              )}
            </fieldset>
          )}
          {activeIndex < normalized.points.length - 1 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-muted-foreground text-xs font-medium">Jobb oldali átmenet</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {transitionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    aria-pressed={activePoint.outgoingTransition === option.value}
                    className="border-input bg-card hover:border-primary/50 focus-visible:ring-ring rounded-md border px-2 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-3 data-[state=selected]:border-ring data-[state=selected]:bg-muted disabled:opacity-50"
                    data-state={activePoint.outgoingTransition === option.value ? "selected" : undefined}
                    onClick={() => onChange(updateSpeedPointTransition(normalized, activeIndex, "outgoing", option.value))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {activePoint.outgoingTransition === "hard-cut" && (
                <p className="text-muted-foreground text-xs">Azonnali visszaállás 1×-re.</p>
              )}
            </fieldset>
          )}
        </section>
      )}
    </div>
  );
}

export default function VideoSpeedWorkspace() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [source, setSource] = useState<File>();
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [metadata, setMetadata] = useState<VideoSpeedMetadata>();
  const [curve, setCurve] = useState<SpeedCurve>(defaultSpeedCurve);
  const [preservePitch, setPreservePitch] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ blob: Blob; fileName: string }>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const workerRef = useRef<VideoSpeedWorkerHandle | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const exportAbortRef = useRef<AbortController | undefined>(undefined);
  const sourceUrlRef = useRef<string | undefined>(undefined);
  const curveDragRestoreRef = useRef<{ time: number; wasPlaying: boolean } | undefined>(undefined);
  const controllerDragRestoreRef = useRef<{ wasPlaying: boolean } | undefined>(undefined);
  const curveSeekFrameRef = useRef<number | undefined>(undefined);

  const sourceDuration = metadata?.duration ?? 0;
  const outputDuration = useMemo(
    () => estimateOutputDuration(curve, sourceDuration),
    [curve, sourceDuration],
  );
  const previewOutputTime = useMemo(
    () => outputTimeAtSourceTime(curve, sourceDuration, previewTime),
    [curve, previewTime, sourceDuration],
  );
  const activePreset = curvePresetId(curve);
  const busy = phase === "inspecting" || phase === "rendering-audio" || phase === "exporting";

  const releaseWorker = useCallback(() => {
    workerRef.current?.worker.terminate();
    workerRef.current = undefined;
  }, []);

  const clearResult = useCallback(() => setResult(undefined), []);

  const selectSource = useCallback(async (file: File) => {
    clearResult();
    setPhase("inspecting");
    setError(undefined);
    setPreservePitch(false);
    setCurve(defaultSpeedCurve);
    setPreviewTime(0);
    setIsPlaying(false);
    const nextUrl = URL.createObjectURL(file);
    setSourceUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });
    setSource(file);
    releaseWorker();
    const worker = createVideoSpeedWorker();
    workerRef.current = worker;
    try {
      const inspected = await worker.api.inspectVideo(file);
      if (!inspected.valid) throw new Error(`${inspected.message} ${inspected.suggestion}`);
      if (!inspected.canEncode) {
        throw new Error("Ebben a böngészőben a H.264 MP4-kódolás nem elérhető. Próbáld friss Chrome-ban vagy Edge-ben.");
      }
      setMetadata(inspected.metadata);
      setPhase("ready");
    } catch (reason) {
      setMetadata(undefined);
      setPhase("error");
      setError(reason instanceof Error ? reason.message : "A videó vizsgálata nem sikerült.");
    }
  }, [clearResult, releaseWorker]);

  const dropzone = useDropzone({
    multiple: false,
    noClick: true,
    disabled: busy,
    accept: { "video/mp4": [".mp4", ".m4v"], "video/quicktime": [".mov"], "video/webm": [".webm"] },
    onDropAccepted: ([file]) => file && void selectSource(file),
    onDropRejected: () => {
      setPhase("error");
      setError("Válassz egyetlen MP4, MOV vagy WebM videót.");
    },
  });

  useEffect(() => {
    sourceUrlRef.current = sourceUrl;
  }, [sourceUrl]);

  useEffect(() => () => {
    releaseWorker();
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
  }, [releaseWorker]);

  useEffect(() => () => {
    if (curveSeekFrameRef.current !== undefined) {
      window.cancelAnimationFrame(curveSeekFrameRef.current);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !metadata) return;
    let animationFrame: number | undefined;
    const syncPreview = () => {
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      setPreviewTime(currentTime);
      const rate = speedAt(curve, metadata.duration > 0 ? currentTime / metadata.duration : 0);
      video.playbackRate = rate;
      video.preservesPitch = preservePitch;
    };

    const stopAnimation = () => {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    };
    const tick = () => {
      syncPreview();
      if (!video.paused && !video.ended) animationFrame = window.requestAnimationFrame(tick);
    };
    const startAnimation = () => {
      stopAnimation();
      tick();
    };
    const syncAfterSeek = () => {
      syncPreview();
      if (!video.paused && !video.ended) startAnimation();
    };

    video.addEventListener("play", startAnimation);
    video.addEventListener("pause", stopAnimation);
    video.addEventListener("ended", stopAnimation);
    video.addEventListener("timeupdate", syncPreview);
    video.addEventListener("seeked", syncAfterSeek);
    video.addEventListener("loadedmetadata", syncPreview);
    video.addEventListener("durationchange", syncPreview);
    syncPreview();
    if (!video.paused && !video.ended) startAnimation();
    return () => {
      stopAnimation();
      video.removeEventListener("play", startAnimation);
      video.removeEventListener("pause", stopAnimation);
      video.removeEventListener("ended", stopAnimation);
      video.removeEventListener("timeupdate", syncPreview);
      video.removeEventListener("seeked", syncAfterSeek);
      video.removeEventListener("loadedmetadata", syncPreview);
      video.removeEventListener("durationchange", syncPreview);
    };
  }, [curve, metadata, preservePitch]);

  const seekPreview = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    const target = Math.min(sourceDuration, Math.max(0, time));
    video.currentTime = target;
    setPreviewTime(target);
  }, [sourceDuration]);

  const previewCurvePoint = useCallback((point: SpeedPoint) => {
    const target = sourceTimeAtPosition(point.position, sourceDuration);
    if (curveSeekFrameRef.current !== undefined) {
      window.cancelAnimationFrame(curveSeekFrameRef.current);
    }
    curveSeekFrameRef.current = window.requestAnimationFrame(() => {
      curveSeekFrameRef.current = undefined;
      seekPreview(target);
    });
  }, [seekPreview, sourceDuration]);

  const startCurvePointPreview = useCallback((point: SpeedPoint) => {
    const video = videoRef.current;
    if (!video) return;
    curveDragRestoreRef.current = { time: video.currentTime, wasPlaying: !video.paused };
    video.pause();
    previewCurvePoint(point);
  }, [previewCurvePoint]);

  const restoreCurvePointPreview = useCallback(() => {
    const video = videoRef.current;
    const restore = curveDragRestoreRef.current;
    curveDragRestoreRef.current = undefined;
    if (!video || !restore) return;
    if (curveSeekFrameRef.current !== undefined) {
      window.cancelAnimationFrame(curveSeekFrameRef.current);
      curveSeekFrameRef.current = undefined;
    }

    let restored = false;
    const finishRestore = () => {
      if (restored) return;
      restored = true;
      setPreviewTime(restore.time);
      if (restore.wasPlaying) void video.play().catch(() => undefined);
    };
    video.addEventListener("seeked", finishRestore, { once: true });
    video.currentTime = restore.time;
    window.requestAnimationFrame(finishRestore);
  }, []);

  const startControllerDrag = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    controllerDragRestoreRef.current = { wasPlaying: !video.paused };
    video.pause();
  }, []);

  const moveController = useCallback((position: number) => {
    seekPreview(sourceTimeAtPosition(position, sourceDuration));
  }, [seekPreview, sourceDuration]);

  const endControllerDrag = useCallback(() => {
    const video = videoRef.current;
    const restore = controllerDragRestoreRef.current;
    controllerDragRestoreRef.current = undefined;
    if (video && restore?.wasPlaying) void video.play().catch(() => undefined);
  }, []);

  const togglePreviewPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  const runExport = async () => {
    if (!source || !metadata || !workerRef.current) return;
    clearResult();
    setError(undefined);
    setExportProgress(0);
    const abortController = new AbortController();
    exportAbortRef.current = abortController;
    try {
      let audio;
      if (metadata.hasAudio) {
        setPhase("rendering-audio");
        audio = await renderCurveAudio({
          file: source,
          metadata,
          curve,
          preservePitch,
          signal: abortController.signal,
          onProgress: (ratio) => setExportProgress(ratio * 0.35),
        });
      }
      setPhase("exporting");
      const exported = await workerRef.current.api.exportVideo(
        transferableExportRequest({ file: source, metadata, curve, audio }),
        proxy((progress) => {
          const ratio = progress.sourceDuration > 0
            ? progress.sourceTimestamp / progress.sourceDuration
            : 0;
          setExportProgress(progress.phase === "completed" ? 1 : 0.35 + ratio * 0.65);
        }),
      );
      setResult({
        blob: new Blob([exported.buffer], { type: exported.mimeType }),
        fileName: createSpeedCurveFileName(source.name),
      });
      setPhase("complete");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setPhase("ready");
      } else {
        setPhase("error");
        setError(reason instanceof Error ? reason.message : "Az export nem sikerült.");
      }
    } finally {
      exportAbortRef.current = undefined;
    }
  };

  return (
    <section id="video-speed-workspace" className="morf-section-normal scroll-mt-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <input
          {...dropzone.getInputProps({
            accept: "video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm",
          })}
          className="sr-only"
          aria-label="Videó kiválasztása"
        />
        <header className="flex max-w-3xl flex-col gap-2">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Sebességgörbe szerkesztő</h2>
          <p className="text-muted-foreground text-base leading-relaxed">Adj felgyorsításokat és lassításokat a teljes videóhoz. A feldolgozás a böngésződben marad.</p>
        </header>

        {(!source || (phase === "error" && !metadata)) && (
          <FileUploadDropzone
            getRootProps={dropzone.getRootProps}
            isDragActive={dropzone.isDragActive}
            onBrowse={dropzone.open}
            title="Videó feltöltése"
            description="MP4, MOV vagy WebM videó. Egy munkamenetben egy videót szerkeszthetsz."
            buttonLabel="Videó kiválasztása"
            busy={phase === "inspecting"}
            busyLabel="Videó vizsgálata"
            icon={Video01Icon}
          />
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Nem sikerült folytatni</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {source && phase === "inspecting" && (
          <Card className="border bg-card shadow-none">
            <CardContent className="flex min-h-36 items-center gap-4 py-8">
              <HugeiconsIcon
                icon={Video01Icon}
                className="text-primary size-7 animate-pulse motion-reduce:animate-none"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1">
                <p className="font-medium">Videó vizsgálata</p>
                <p className="text-muted-foreground text-sm">
                  Ellenőrizzük a konténert, a kodeket és a böngésződ MP4-kódolási támogatását.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {source && metadata && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.8fr)]">
            <div className="flex min-w-0 flex-col gap-6">
              <Card className="border bg-card shadow-none">
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate">Előnézet és sebességgörbe</CardTitle>
                    <CardDescription className="truncate">{source.name} · {formatBytes(source.size)} · {metadata.width} × {metadata.height} · {metadata.frameRate.toFixed(2)} FPS</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => dropzone.open()}>Csere</Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="relative overflow-hidden rounded-xl bg-black">
                    <video
                      ref={videoRef}
                      src={sourceUrl}
                      className="aspect-video w-full"
                      aria-label="Videó előnézet"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    />
                  </div>
                  <div className="border-border bg-muted/45 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-2 sm:flex-nowrap sm:p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={togglePreviewPlayback}
                      aria-label={isPlaying ? "Videó szüneteltetése" : "Videó lejátszása"}
                    >
                      <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} data-icon="inline-start" strokeWidth={2} />
                      {isPlaying ? "Szünet" : "Lejátszás"}
                    </Button>
                    <span className="text-muted-foreground ml-auto shrink-0 text-xs font-medium tabular-nums" aria-live="off">
                      Kimenet: {formatDuration(previewOutputTime)} / {formatDuration(outputDuration)}
                    </span>
                    <span className="bg-card text-foreground shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums">
                      {speedAt(curve, sourceDuration > 0 ? previewTime / sourceDuration : 0).toFixed(2)}×
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">A preview a görbe alapján állítja a lejátszási sebességet. A görbén lévő vonallal a videóban is tekerhetsz.</p>
                  <section className="border-border flex flex-col gap-4 border-t pt-4" aria-labelledby="speed-curve-heading">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <h3 id="speed-curve-heading" className="text-sm font-semibold">Sebességgörbe</h3>
                        <p className="text-muted-foreground text-sm">A jelző a videó pozícióját követi.</p>
                      </div>
                      <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold">{activePreset === "custom" ? "Egyedi" : speedPresets.find((preset) => preset.id === activePreset)?.label}</span>
                    </div>
                    <CurveEditor
                      curve={curve}
                      disabled={busy}
                      sourceDuration={sourceDuration}
                      frameRate={metadata.frameRate}
                      playbackPosition={sourceDuration > 0 ? previewTime / sourceDuration : 0}
                      onChange={setCurve}
                      onDragStart={startCurvePointPreview}
                      onDragMove={previewCurvePoint}
                      onDragEnd={restoreCurvePointPreview}
                      onControllerDragStart={startControllerDrag}
                      onControllerDragMove={moveController}
                      onControllerDragEnd={endControllerDrag}
                      onControllerSeek={moveController}
                    />
                    <p className="text-muted-foreground text-sm">Kattints a grafikonra új ponthoz. A köztes pontok húzhatók; fókuszban nyílbillentyűkkel vagy Delete-tel is szerkeszthetők.</p>
                    {curve.points.length > 2 && (
                      <Button variant="ghost" size="sm" className="w-fit" disabled={busy} onClick={() => setCurve(defaultSpeedCurve)}>
                        <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" strokeWidth={2} />
                        Egyedi pontok törlése
                      </Button>
                    )}
                  </section>
                </CardContent>
              </Card>
            </div>

            <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
              <Card className="bg-muted/45 border shadow-none">
                <CardHeader>
                  <CardTitle>Curve presetek</CardTitle>
                  <CardDescription>Kiindulópontok, amelyeket utána szabadon alakíthatsz.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                  {speedPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={busy}
                      aria-pressed={activePreset === preset.id}
                      className="border-input bg-card hover:border-primary/50 focus-visible:ring-ring flex min-h-24 flex-col justify-between rounded-lg border p-3 text-left outline-none transition-colors focus-visible:ring-3 data-[state=selected]:border-ring data-[state=selected]:bg-muted disabled:opacity-50"
                      data-state={activePreset === preset.id ? "selected" : undefined}
                      onClick={() => setCurve(preset.curve)}
                    >
                      <svg viewBox="0 0 100 36" className="h-8 w-full" aria-hidden="true">
                        <path d={preset.curve.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.position * 100} ${34 - ((point.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 32}`).join(" ")} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      <span className="text-sm font-semibold">{preset.label}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-muted/45 border shadow-none">
                <CardHeader>
                  <CardTitle>Kimenet</CardTitle>
                  <CardDescription>Teljes felbontású H.264/AAC MP4. Nem készül mesterséges képkocka-interpoláció.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="text-muted-foreground">Forrás</dt><dd className="font-semibold tabular-nums">{formatDuration(sourceDuration)}</dd></div>
                    <div><dt className="text-muted-foreground">Becsült kimenet</dt><dd className="font-semibold tabular-nums">{formatDuration(outputDuration)}</dd></div>
                  </dl>
                  <Field data-disabled={!metadata.hasAudio ? "true" : undefined} className="gap-2 data-[disabled=true]:opacity-55">
                    <label className="flex items-start gap-3 text-sm font-medium">
                      <Checkbox checked={preservePitch} disabled={busy || !metadata.hasAudio} onCheckedChange={(checked) => setPreservePitch(checked === true)} />
                      <span>Hangmagasság megtartása</span>
                    </label>
                    <FieldDescription>{metadata.hasAudio ? "Bekapcsolva a hang tempója változik, de a hangmagassága megmarad. 8× felett kapcsold ki, vagy csökkentsd a görbét." : "A feltöltött videóban nincs dekódolható hangsáv."}</FieldDescription>
                  </Field>
                  <Button size="lg" disabled={busy} onClick={() => void runExport()}>
                    <HugeiconsIcon icon={Film01Icon} data-icon="inline-start" strokeWidth={2} />
                    MP4 exportálása
                  </Button>
                  {busy && (
                    <div className="flex flex-col gap-2">
                      <Progress value={exportProgress * 100}><ProgressLabel>{phase === "rendering-audio" ? "Hang feldolgozása" : "MP4 kódolása"}</ProgressLabel><ProgressValue /></Progress>
                      <Button variant="ghost" size="sm" className="w-fit" onClick={() => {
                        exportAbortRef.current?.abort();
                        workerRef.current?.api.cancel();
                      }}>Export megszakítása</Button>
                    </div>
                  )}
                  {result && (
                    <Alert>
                      <AlertTitle>Kész az MP4</AlertTitle>
                      <AlertDescription className="mt-3 flex flex-wrap items-center gap-3">
                        <span>{result.fileName} · {formatBytes(result.blob.size)}</span>
                        <Button size="sm" onClick={() => downloadFile({ blob: result.blob, fileName: result.fileName, mimeType: "video/mp4" })}>
                          <HugeiconsIcon icon={Download04Icon} data-icon="inline-start" strokeWidth={2} />
                          Letöltés
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
