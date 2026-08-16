import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { proxy } from "comlink";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Download04Icon,
  Film01Icon,
  MusicNote01Icon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDropzone } from "react-dropzone";

import { FileUploadDropzone } from "@/components/upload/FileUploadDropzone";
import { BrowserSupportHint } from "@/components/browser-support/BrowserSupportHint";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/toast";
import {
  addHardCut,
  addSpeedPoint,
  createSpeedCurveFileName,
  curvePresetId,
  defaultSpeedCurve,
  estimateOutputDuration,
  frameNumberAtSourceTime,
  isHardCut,
  MAX_SPEED,
  MIN_SPEED,
  outputTimeAtSourceTime,
  removeCurveNode,
  sampleSpeedCurve,
  speedAt,
  speedPresets,
  sourceTimeAtPosition,
  updateCurveNodeTransition,
  updateHardCutPosition,
  updateHardCutSpeed,
  updateSpeedPoint,
} from "@/features/video-speed/curve";
import { renderCurveAudio } from "@/features/video-speed/audio";
import type { SpeedCurve, SpeedCurveNode, SpeedPoint, SpeedTransition, VideoSpeedMetadata } from "@/features/video-speed/types";
import {
  createVideoSpeedWorker,
  transferableExportRequest,
  type VideoSpeedWorkerHandle,
} from "@/features/video-speed/worker-client";
import { downloadFile } from "@/lib/downloads/file-saver";
import { isBrowserSupportError, videoSpeedBrowserSupportError } from "@/lib/browser-support";
import { formatBytes } from "@/lib/filenames/image-filenames";
import { useErrorToast } from "@/hooks/use-error-toast";

type Phase = "empty" | "inspecting" | "ready" | "rendering-audio" | "exporting" | "complete" | "error";
type FrameScrubState = { targetFrame: number; requestedFrame: number | undefined; seeking: boolean };
type ControllerDragState = { shouldResume: boolean };
type HardCutDrag = { pointIndex: number; target: "position" | "before" | "after" };

const graph = { width: 1000, height: 320, paddingLeft: 50, paddingRight: 14, paddingY: 24 };
const transitionOptions: Array<{ value: SpeedTransition; label: string }> = [
  { value: "ease-in", label: "Ease in" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in-out" },
  { value: "linear", label: "Lineáris" },
];

function formatDuration(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${remainder.toFixed(1).padStart(4, "0")}`;
}

function isConvertibleSourceFormatError(error: string | undefined) {
  if (!error) return false;
  return error.includes("Válassz egyetlen MP4, MOV vagy WebM videót.")
    || error.includes("Ez a fájltípus nem támogatott.")
    || error.includes("A videó konténere nem olvasható.");
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
  return graph.paddingLeft + position * (graph.width - graph.paddingLeft - graph.paddingRight);
}

function speedToY(speed: number) {
  const speedRange = Math.log10(MAX_SPEED) - Math.log10(MIN_SPEED);
  const ratio = (Math.log10(Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed))) - Math.log10(MIN_SPEED)) / speedRange;
  return (
    graph.paddingY +
    (1 - ratio) * (graph.height - graph.paddingY * 2)
  );
}

function isInsideGraph(event: { currentTarget: SVGSVGElement; clientX: number; clientY: number }) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * graph.width;
  const y = ((event.clientY - rect.top) / rect.height) * graph.height;
  return x >= graph.paddingLeft && x <= graph.width - graph.paddingRight && y >= graph.paddingY && y <= graph.height - graph.paddingY;
}

function graphPosition(event: {
  currentTarget: SVGSVGElement;
  clientX: number;
  clientY: number;
}) {
  const rect = event.currentTarget.getBoundingClientRect();
  const position = (event.clientX - rect.left - (graph.paddingLeft / graph.width) * rect.width) /
    (rect.width * ((graph.width - graph.paddingLeft - graph.paddingRight) / graph.width));
  const verticalPosition = (event.clientY - rect.top - (graph.paddingY / graph.height) * rect.height) /
    (rect.height * (1 - (graph.paddingY * 2) / graph.height));
  const speed = MIN_SPEED * Math.pow(MAX_SPEED / MIN_SPEED, 1 - verticalPosition);
  return {
    position: Math.min(1, Math.max(0, position)),
    speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)),
  };
}

function graphPositionFromClientX(svg: SVGSVGElement, clientX: number) {
  const rect = svg.getBoundingClientRect();
  const position = (clientX - rect.left - (graph.paddingLeft / graph.width) * rect.width) /
    (rect.width * ((graph.width - graph.paddingLeft - graph.paddingRight) / graph.width));
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
  onDragStart?(node: SpeedCurveNode): void;
  onDragMove?(node: SpeedCurveNode): void;
  onDragEnd?(): void;
  onControllerDragStart?(): void;
  onControllerDragMove?(position: number): void;
  onControllerDragEnd?(): void;
  onControllerSeek?(position: number): void;
}) {
  const [dragIndex, setDragIndex] = useState<number>();
  const [hardCutDrag, setHardCutDrag] = useState<HardCutDrag>();
  const [activeIndex, setActiveIndex] = useState<number>();
  const [addMode, setAddMode] = useState<"point" | "hard-cut">("point");
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
  const activeNode = activeIndex === undefined ? undefined : normalized.points[activeIndex];
  const activeSourceTime = activeNode
    ? sourceTimeAtPosition(activeNode.position, sourceDuration)
    : 0;

  const changePointFromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    let nextDragIndex = dragIndex;
    if (nextDragIndex === undefined && pointPointerStartRef.current) {
      const start = pointPointerStartRef.current;
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

  const moveHardCut = (event: React.PointerEvent<SVGElement>, index: number, target: HardCutDrag["target"]) => {
    if (hardCutDrag?.pointIndex !== index || hardCutDrag.target !== target || disabled) return;
    const svg = svgRef.current;
    if (!svg) return;
    if (target === "position") {
      const nextCurve = updateHardCutPosition(normalized, index, graphPosition({ currentTarget: svg, clientX: event.clientX, clientY: event.clientY }).position);
      onChange(nextCurve);
      onDragMove?.(nextCurve.points[index]);
      return;
    }
    const speed = graphPosition({ currentTarget: svg, clientX: event.clientX, clientY: event.clientY }).speed;
    onChange(updateHardCutSpeed(normalized, index, target, speed));
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
    <div className="relative overflow-hidden bg-card">
      <div className="px-2 sm:px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-pressed={addMode === "hard-cut"}
          className="aria-pressed:border-primary aria-pressed:bg-muted"
          onClick={() => setAddMode((mode) => mode === "hard-cut" ? "point" : "hard-cut")}
        >
          Hard jump hozzáadása
        </Button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        className="block aspect-[25/8] h-auto w-full touch-none select-none"
        aria-label="Sebességgörbe. A függőleges jelző a videó aktuális pozícióját mutatja. Kattintással normál pontot vagy hard jumpot adhatsz hozzá."
        onPointerMove={changePointFromPointer}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          if (dragIndex !== undefined || disabled || !isInsideGraph(event)) return;
          const target = event.target as SVGElement;
          if (target.dataset.point === "true" || target.dataset.hardCutPoint === "true" || target.dataset.hardCutRail === "true") return;
          const point = graphPosition(event);
          const nextCurve = addMode === "hard-cut"
            ? addHardCut(normalized, { position: point.position, afterSpeed: point.speed })
            : addSpeedPoint(normalized, point);
          setActiveIndex(
            nextCurve.points.findIndex(
              (candidate) =>
                Math.abs(candidate.position - point.position) < 0.001 &&
                (addMode === "hard-cut" ? isHardCut(candidate) : !isHardCut(candidate)),
            ),
          );
          onChange(nextCurve);
          setAddMode("point");
        }}
      >
        {[0.1, 1, 3, 6, 10].map((speed) => (
          <g key={speed}>
            <line
              x1={graph.paddingLeft}
              x2={graph.width - graph.paddingRight}
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
        {normalized.points.map((point, index) => isHardCut(point) && (
          <g key={`hard-cut-${index}`}>
            <rect
              data-hard-cut-rail="true"
              x={positionToX(point.position) - 12}
              y={graph.paddingY}
              width="24"
              height={graph.height - graph.paddingY * 2}
              tabIndex={disabled ? -1 : 0}
              role="slider"
              aria-label={`Hard jump időpontja: ${Math.round(point.position * 100)}%. Balra és jobbra mozgatható.`}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={point.position}
              className="fill-transparent stroke-transparent cursor-ew-resize outline-none focus-visible:stroke-ring focus-visible:stroke-[4px] disabled:cursor-default"
              onPointerDown={(event) => {
                if (disabled) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                suppressClickRef.current = true;
                setActiveIndex(index);
                setHardCutDrag({ pointIndex: index, target: "position" });
                onDragStart?.(point);
              }}
              onPointerMove={(event) => moveHardCut(event, index, "position")}
              onPointerUp={() => {
                setHardCutDrag(undefined);
                onDragEnd?.();
              }}
              onPointerCancel={() => {
                setHardCutDrag(undefined);
                onDragEnd?.();
              }}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                if (disabled) return;
                if (event.key === "Delete" || event.key === "Backspace") {
                  event.preventDefault();
                  onChange(removeCurveNode(normalized, index));
                  return;
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  const positionStep = ((event.shiftKey ? 10 : 1) / Math.max(1, frameRate)) / Math.max(sourceDuration, 0.1);
                  onChange(updateHardCutPosition(normalized, index, point.position + (event.key === "ArrowRight" ? positionStep : -positionStep)));
                }
              }}
            />
            <line
              x1={positionToX(point.position)}
              x2={positionToX(point.position)}
              y1={speedToY(point.beforeSpeed)}
              y2={speedToY(point.afterSpeed)}
              className={activeIndex === index ? "stroke-ring" : "stroke-primary"}
              strokeWidth={activeIndex === index ? "7" : "5"}
              pointerEvents="none"
            />
            {(["before", "after"] as const).map((side) => {
              const speed = side === "before" ? point.beforeSpeed : point.afterSpeed;
              return (
                <circle
                  key={side}
                  data-hard-cut-point="true"
                  cx={positionToX(point.position)}
                  cy={speedToY(speed)}
                  r="7"
                  tabIndex={disabled ? -1 : 0}
                  role="slider"
                  aria-label={`${side === "before" ? "Hard jump előtti" : "Hard jump utáni"} sebesség: ${speed.toFixed(1)}×. Csak fel és le mozgatható.`}
                  aria-valuemin={MIN_SPEED}
                  aria-valuemax={MAX_SPEED}
                  aria-valuenow={speed}
                  className={`cursor-ns-resize stroke-[4px] outline-none focus-visible:stroke-ring focus-visible:stroke-[5px] disabled:cursor-default ${activeIndex === index ? "fill-card stroke-ring" : "fill-card stroke-primary"}`}
                  data-selected={activeIndex === index ? "true" : undefined}
                  onPointerDown={(event) => {
                    if (disabled) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    suppressClickRef.current = true;
                    setActiveIndex(index);
                    setHardCutDrag({ pointIndex: index, target: side });
                  }}
                  onPointerMove={(event) => moveHardCut(event, index, side)}
                  onPointerUp={() => setHardCutDrag(undefined)}
                  onPointerCancel={() => setHardCutDrag(undefined)}
                  onFocus={() => setActiveIndex(index)}
                  onKeyDown={(event) => {
                    if (disabled || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                    event.preventDefault();
                    onChange(updateHardCutSpeed(normalized, index, side, speed + (event.key === "ArrowUp" ? (event.shiftKey ? 0.5 : 0.1) : -(event.shiftKey ? 0.5 : 0.1))));
                  }}
                />
              );
            })}
          </g>
        ))}
        {normalized.points.map((point, index) => !isHardCut(point) && (
          <circle
            key={`point-${index}`}
            data-point="true"
            cx={positionToX(point.position)}
            cy={speedToY(point.speed)}
            r="8"
            tabIndex={disabled ? -1 : 0}
            role="slider"
            aria-label={`${index === 0 ? "Kezdőpont, függőlegesen szerkeszthető" : index === normalized.points.length - 1 ? "Végpont, függőlegesen szerkeszthető" : "Szerkeszthető"} görbepont: ${Math.round(point.position * 100)}%, ${point.speed.toFixed(1)}×`}
            aria-valuemin={MIN_SPEED}
            aria-valuemax={MAX_SPEED}
            aria-valuenow={point.speed}
            className={`fill-card stroke-primary stroke-[4px] outline-none focus-visible:stroke-ring data-[selected=true]:stroke-ring data-[selected=true]:stroke-[5px] disabled:cursor-default ${index === 0 || index === normalized.points.length - 1 ? "cursor-ns-resize" : "cursor-grab"}`}
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
              if (disabled) return;
              if (event.key === "Delete" || event.key === "Backspace") {
                if (index === 0 || index === normalized.points.length - 1) return;
                event.preventDefault();
                onChange(removeCurveNode(normalized, index));
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
              if (index > 0 && index < normalized.points.length - 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
                event.preventDefault();
                const positionStep = ((event.shiftKey ? 10 : 1) / Math.max(1, frameRate)) / Math.max(sourceDuration, 0.1);
                onChange(updateSpeedPoint(normalized, index, {
                  position: point.position + (event.key === "ArrowRight" ? positionStep : -positionStep),
                  speed: point.speed,
                }));
              }
            }}
          />
        ))}
      </svg>
      {activeNode && activeIndex !== undefined && (
        <section className="flex flex-col gap-3 p-4" aria-labelledby="selected-speed-point-heading">
          <div>
            <div className="border-border bg-card pointer-events-none flex items-baseline gap-2 rounded-lg border px-3 py-1.5 text-xs" aria-live="polite">
              <span
                className="text-muted-foreground"
                title="A frame-sorszám az átlagos FPS alapján számolt becslés; változó FPS-nél eltérhet."
              >
                {formatTimestamp(activeSourceTime)} · ~#{frameNumberAtSourceTime(activeSourceTime, frameRate)}. frame
              </span>
              <strong className="text-foreground text-sm font-semibold tabular-nums">
                {isHardCut(activeNode)
                  ? `${activeNode.beforeSpeed.toFixed(1)}× → ${activeNode.afterSpeed.toFixed(1)}×`
                  : `${activeNode.speed.toFixed(2)}×`}
              </strong>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {activeIndex > 0 && (
              <fieldset className="border-primary/35 bg-card flex min-w-0 flex-col gap-2 rounded-md border border-l-4 p-3">
                <legend className="sr-only">Bal oldali átmenet</legend>
                <div className="text-primary flex items-center gap-1.5 text-xs font-semibold">
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={15} strokeWidth={2.2} aria-hidden="true" />
                  <span>Balról érkezik</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {transitionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      aria-pressed={activeNode.incomingTransition === option.value}
                      className="border-input bg-card hover:border-primary/50 focus-visible:ring-ring rounded-md border px-2 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-3 data-[state=selected]:border-primary data-[state=selected]:bg-muted disabled:opacity-50"
                      data-state={activeNode.incomingTransition === option.value ? "selected" : undefined}
                      onClick={() => onChange(updateCurveNodeTransition(normalized, activeIndex, "incoming", option.value))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {isHardCut(activeNode) && (
                  <p className="text-muted-foreground text-xs">A Hard jump bal oldali végéhez fut.</p>
                )}
              </fieldset>
            )}
            {activeIndex < normalized.points.length - 1 && (
              <fieldset className={`border-ring/40 flex min-w-0 flex-col gap-2 rounded-md border border-r-4 p-3 ${activeIndex === 0 ? "md:col-start-2" : ""}`}>
                <legend className="sr-only">Jobb oldali átmenet</legend>
                <div className="text-secondary-foreground flex items-center justify-end gap-1.5 text-xs font-semibold">
                  <span>Jobbra indul</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={2.2} aria-hidden="true" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {transitionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      aria-pressed={activeNode.outgoingTransition === option.value}
                      className="border-input bg-card hover:border-secondary focus-visible:ring-ring rounded-md border px-2 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-3 data-[state=selected]:border-ring data-[state=selected]:bg-secondary/45 disabled:opacity-50"
                      data-state={activeNode.outgoingTransition === option.value ? "selected" : undefined}
                      onClick={() => onChange(updateCurveNodeTransition(normalized, activeIndex, "outgoing", option.value))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {isHardCut(activeNode) && (
                  <p className="text-muted-foreground text-xs">A Hard jump jobb oldali végéből indul.</p>
                )}
              </fieldset>
            )}
          </div>
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
  const [videoLoopEnabled, setVideoLoopEnabled] = useState(false);
  const workerRef = useRef<VideoSpeedWorkerHandle | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const exportAbortRef = useRef<AbortController | undefined>(undefined);
  const sourceUrlRef = useRef<string | undefined>(undefined);
  const curveDragRestoreRef = useRef<{ time: number; wasPlaying: boolean } | undefined>(undefined);
  const controllerDragRestoreRef = useRef<ControllerDragState | undefined>(undefined);
  const controllerScrubRef = useRef<FrameScrubState | undefined>(undefined);
  const controllerResumeAfterScrubRef = useRef(false);

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

  useErrorToast(error, "A videó sebességgörbéje nem használható");

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
    setVideoLoopEnabled(false);
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
        throw new Error(videoSpeedBrowserSupportError());
      }
      setMetadata(inspected.metadata);
      setPhase("ready");
    } catch (reason) {
      setMetadata(undefined);
      setPhase("error");
      const message = reason instanceof Error ? reason.message : "A videó vizsgálata nem sikerült.";
      setError(isBrowserSupportError(message) ? videoSpeedBrowserSupportError() : message);
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

  const requestLatestControllerFrame = useCallback(() => {
    const video = videoRef.current;
    const frameRate = metadata?.frameRate ?? 0;
    const scrub = controllerScrubRef.current;
    if (!video || !scrub || frameRate <= 0 || sourceDuration <= 0) return;
    if (scrub.seeking) return;

    const maxFrame = Math.max(0, Math.ceil(sourceDuration * frameRate) - 1);
    const currentFrame = Math.min(maxFrame, Math.max(0, Math.round(video.currentTime * frameRate)));
    if (currentFrame === scrub.targetFrame) {
      controllerScrubRef.current = undefined;
      if (controllerResumeAfterScrubRef.current) {
        controllerResumeAfterScrubRef.current = false;
        void video.play().catch(() => undefined);
      }
      return;
    }

    scrub.seeking = true;
    scrub.requestedFrame = scrub.targetFrame;
    video.currentTime = Math.min(sourceDuration, scrub.targetFrame / frameRate);
  }, [metadata?.frameRate, sourceDuration]);

  const cancelControllerFrameScrub = useCallback(() => {
    controllerScrubRef.current = undefined;
    controllerResumeAfterScrubRef.current = false;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleFrameSeeked = () => {
      const scrub = controllerScrubRef.current;
      if (!scrub?.seeking) return;
      scrub.seeking = false;
      if (scrub.targetFrame !== scrub.requestedFrame) {
        requestLatestControllerFrame();
        return;
      }
      controllerScrubRef.current = undefined;
      if (controllerResumeAfterScrubRef.current) {
        controllerResumeAfterScrubRef.current = false;
        void video.play().catch(() => undefined);
      }
    };
    video.addEventListener("seeked", handleFrameSeeked);
    return () => video.removeEventListener("seeked", handleFrameSeeked);
  }, [requestLatestControllerFrame]);

  const requestPreviewFrameAtPosition = useCallback((position: number) => {
    const video = videoRef.current;
    const frameRate = metadata?.frameRate ?? 0;
    if (!video || frameRate <= 0 || sourceDuration <= 0) return;
    const maxFrame = Math.max(0, Math.ceil(sourceDuration * frameRate) - 1);
    const targetFrame = Math.min(
      maxFrame,
      Math.max(0, Math.round(sourceTimeAtPosition(position, sourceDuration) * frameRate)),
    );
    if (!controllerScrubRef.current) {
      controllerScrubRef.current = { targetFrame, requestedFrame: undefined, seeking: false };
    }
    else controllerScrubRef.current.targetFrame = targetFrame;
    requestLatestControllerFrame();
  }, [metadata?.frameRate, requestLatestControllerFrame, sourceDuration]);

  const previewCurvePoint = useCallback((node: SpeedCurveNode) => {
    requestPreviewFrameAtPosition(node.position);
  }, [requestPreviewFrameAtPosition]);

  const startCurvePointPreview = useCallback((point: SpeedCurveNode) => {
    const video = videoRef.current;
    if (!video) return;
    cancelControllerFrameScrub();
    curveDragRestoreRef.current = { time: video.currentTime, wasPlaying: !video.paused };
    video.pause();
    previewCurvePoint(point);
  }, [cancelControllerFrameScrub, previewCurvePoint]);

  const restoreCurvePointPreview = useCallback(() => {
    const video = videoRef.current;
    const restore = curveDragRestoreRef.current;
    curveDragRestoreRef.current = undefined;
    if (!video || !restore) return;
    cancelControllerFrameScrub();

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
  }, [cancelControllerFrameScrub]);

  const startControllerDrag = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    cancelControllerFrameScrub();
    controllerDragRestoreRef.current = { shouldResume: !video.paused };
    video.pause();
  }, [cancelControllerFrameScrub]);

  const moveController = useCallback((position: number) => {
    requestPreviewFrameAtPosition(position);
  }, [requestPreviewFrameAtPosition]);

  const endControllerDrag = useCallback(() => {
    const video = videoRef.current;
    const restore = controllerDragRestoreRef.current;
    controllerDragRestoreRef.current = undefined;
    if (!video || !restore?.shouldResume) return;
    if (controllerScrubRef.current) {
      controllerResumeAfterScrubRef.current = true;
      requestLatestControllerFrame();
    } else {
      void video.play().catch(() => undefined);
    }
  }, [requestLatestControllerFrame]);

  const toggleControllerTransport = useCallback(() => {
    const video = videoRef.current;
    const dragState = controllerDragRestoreRef.current;
    if (!video || !dragState) return;

    dragState.shouldResume = !dragState.shouldResume;
  }, []);

  const togglePreviewPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    cancelControllerFrameScrub();
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [cancelControllerFrameScrub]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => {
      if (!videoLoopEnabled) return;
      video.currentTime = 0;
      setPreviewTime(0);
      void video.play().catch(() => undefined);
    };
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [videoLoopEnabled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const controllerIsHeld = controllerDragRestoreRef.current !== undefined;
      const target = event.target as Element | null;
      const targetHandlesSpace = target?.closest("button, input, textarea, select, [contenteditable='true']");
      if (!controllerIsHeld && targetHandlesSpace) return;

      event.preventDefault();
      if (event.repeat) return;
      if (controllerIsHeld) {
        toggleControllerTransport();
      } else {
        togglePreviewPlayback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleControllerTransport, togglePreviewPlayback]);

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
        const message = reason instanceof Error ? reason.message : "Az export nem sikerült.";
        setError(isBrowserSupportError(message) ? videoSpeedBrowserSupportError() : message);
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
            <AlertDescription>
              {error}
              {isBrowserSupportError(error) && <BrowserSupportHint />}
              {isConvertibleSourceFormatError(error) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span>Másik formátumú videót próbálnál?</span>
                  <Button variant="outline" size="sm" render={<a href="/video-konvertalo" />}>
                    Videó konvertáló
                    <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" strokeWidth={2} />
                  </Button>
                </div>
              )}
            </AlertDescription>
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
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.8fr)] lg:gap-6">
            <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-none lg:col-start-1">
              <header className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate text-base font-semibold">Előnézet és sebességgörbe</h3>
                  <p className="text-muted-foreground truncate text-sm">{source.name} · {formatBytes(source.size)} · {metadata.width} × {metadata.height} · {metadata.frameRate.toFixed(2)} FPS</p>
                </div>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => dropzone.open()}>Csere</Button>
              </header>
              <div className="border-border overflow-hidden border bg-card">
                <div className="relative bg-black">
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
                <div className="bg-muted/45 flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap px-2 sm:px-3 py-2 border-b border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 aria-pressed:border-primary aria-pressed:bg-muted"
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
                <section aria-label="Sebességgörbe">
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
                </section>
                <div className="border-border flex flex-col gap-2 border-t px-3 py-3 text-sm">
                  {curve.points.length > 2 && (
                    <Button variant="ghost" size="sm" className="w-fit" disabled={busy} onClick={() => setCurve(defaultSpeedCurve)}>
                      <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" strokeWidth={2} />
                      Egyedi pontok törlése
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <aside className="order-1 flex flex-col gap-3 lg:order-none lg:sticky lg:top-6 lg:self-start lg:gap-6">
              <Card className="border-0 bg-transparent shadow-none lg:border lg:bg-muted/45">
                <CardHeader className="px-0 pb-3 lg:px-6">
                  <CardTitle className="text-base">Curve presetek</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 px-0 lg:gap-4 lg:px-6">
                  <div className="grid grid-cols-3 gap-1.5">
                    {speedPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={busy}
                        aria-pressed={activePreset === preset.id}
                        className="border-input bg-card hover:border-primary/50 focus-visible:ring-ring flex min-h-14 flex-col justify-between rounded-md border p-1.5 text-left outline-none transition-colors focus-visible:ring-3 data-[state=selected]:border-ring data-[state=selected]:bg-muted disabled:opacity-50"
                        data-state={activePreset === preset.id ? "selected" : undefined}
                        onClick={() => setCurve(preset.curve)}
                      >
                        <svg viewBox="0 0 100 36" className="h-4 w-full" aria-hidden="true">
                          <path d={sampleSpeedCurve(preset.curve, 8).map((point, index) => `${index === 0 ? "M" : "L"} ${point.position * 100} ${34 - ((point.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 32}`).join(" ")} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <span className="text-[11px] font-semibold leading-tight">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="justify-start aria-pressed:border-primary aria-pressed:bg-muted" aria-pressed={videoLoopEnabled} onClick={() => setVideoLoopEnabled((enabled) => !enabled)}>
                      <HugeiconsIcon icon={RepeatIcon} data-icon="inline-start" strokeWidth={2} />
                      Videó loop
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start aria-pressed:border-primary aria-pressed:bg-muted" disabled={busy || !metadata.hasAudio} aria-pressed={preservePitch} onClick={() => setPreservePitch((enabled) => !enabled)}>
                      <HugeiconsIcon icon={MusicNote01Icon} data-icon="inline-start" strokeWidth={2} />
                      Hangmagasság megtartása
                    </Button>
                  </div>
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
                  <Button size="lg" disabled={busy} onClick={() => void runExport()}>
                    <HugeiconsIcon icon={Film01Icon} data-icon="inline-start" strokeWidth={2} />
                    MP4 exportálása
                  </Button>
                  {error && <Alert variant="destructive"><AlertTitle>Az export nem indult el</AlertTitle><AlertDescription>{error}{isBrowserSupportError(error) && <BrowserSupportHint />}</AlertDescription></Alert>}
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
      <Toaster />
    </section>
  );
}
