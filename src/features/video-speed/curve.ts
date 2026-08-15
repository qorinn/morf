import type { SpeedCurve, SpeedPoint, SpeedPreset, SpeedTransition } from "./types";

export const MIN_SPEED = 0.1;
export const MAX_SPEED = 10;
export const SPEED_STEP = 0.1;
export const defaultSpeedTransition: SpeedTransition = "ease-in-out";

const speedTransitions: readonly SpeedTransition[] = [
  "ease-in",
  "ease-out",
  "ease-in-out",
  "linear",
  "hard-cut",
] as const;

export const speedPresets: readonly SpeedPreset[] = [
  {
    id: "normal",
    label: "Normál",
    description: "Változatlan tempó.",
    curve: { points: [{ position: 0, speed: 1 }, { position: 1, speed: 1 }] },
  },
  {
    id: "montage",
    label: "Montázs",
    description: "Rövid lassítás után gyors részlet.",
    curve: {
      points: [
        { position: 0, speed: 1.5 },
        { position: 0.26, speed: 0.6 },
        { position: 0.52, speed: 3.4 },
        { position: 0.77, speed: 0.8 },
        { position: 1, speed: 2.3 },
      ],
    },
  },
  {
    id: "hero",
    label: "Hero",
    description: "Középen hangsúlyos lassítás.",
    curve: {
      points: [
        { position: 0, speed: 1.8 },
        { position: 0.34, speed: 1.4 },
        { position: 0.5, speed: 0.4 },
        { position: 0.66, speed: 1.4 },
        { position: 1, speed: 1.8 },
      ],
    },
  },
  {
    id: "jump-cut",
    label: "Jump cut",
    description: "Lendületes, gyors középső szakasz.",
    curve: {
      points: [
        { position: 0, speed: 1 },
        { position: 0.2, speed: 1 },
        { position: 0.32, speed: 4.6 },
        { position: 0.68, speed: 4.6 },
        { position: 0.8, speed: 1 },
        { position: 1, speed: 1 },
      ],
    },
  },
  {
    id: "flash-in",
    label: "Flash in",
    description: "Gyors belépés, nyugodt befejezés.",
    curve: {
      points: [
        { position: 0, speed: 4.5 },
        { position: 0.18, speed: 3 },
        { position: 0.46, speed: 1.2 },
        { position: 1, speed: 1 },
      ],
    },
  },
] as const;

export const defaultSpeedCurve: SpeedCurve = speedPresets[0].curve;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function snapSpeed(value: number): number {
  return Number(clamp(Math.round(value / SPEED_STEP) * SPEED_STEP, MIN_SPEED, MAX_SPEED).toFixed(1));
}

function normalizeTransition(value: unknown): SpeedTransition {
  return speedTransitions.includes(value as SpeedTransition)
    ? value as SpeedTransition
    : defaultSpeedTransition;
}

export function normalizeSpeedCurve(curve: SpeedCurve): SpeedCurve {
  const normalized = curve.points
    .filter(
      (point) => Number.isFinite(point.position) && Number.isFinite(point.speed),
    )
    .map((point) => ({
      position: clamp(point.position, 0, 1),
      speed: snapSpeed(point.speed),
      incomingTransition: normalizeTransition(point.incomingTransition),
      outgoingTransition: normalizeTransition(point.outgoingTransition),
    }))
    .sort((a, b) => a.position - b.position);

  const inner = normalized.filter(
    (point) => point.position > 0 && point.position < 1,
  );
  const deduplicated = inner.filter(
    (point, index) => index === 0 || point.position - inner[index - 1].position > 0.001,
  );
  const first = normalized.find((point) => point.position === 0) ?? {
    position: 0,
    speed: 1,
    incomingTransition: defaultSpeedTransition,
    outgoingTransition: defaultSpeedTransition,
  };
  const last = normalized.findLast((point) => point.position === 1) ?? {
    position: 1,
    speed: 1,
    incomingTransition: defaultSpeedTransition,
    outgoingTransition: defaultSpeedTransition,
  };

  return {
    points: [
      { ...first, position: 0 },
      ...deduplicated,
      { ...last, position: 1 },
    ],
  };
}

type BezierHandle = { x: number; y: number };

function outgoingHandle(transition: SpeedTransition): BezierHandle {
  switch (transition) {
    case "linear": return { x: 1 / 3, y: 1 / 3 };
    case "ease-in": return { x: 0.42, y: 0 };
    case "ease-out": return { x: 0, y: 0 };
    case "ease-in-out": return { x: 1 / 3, y: 0 };
    case "hard-cut": return { x: 0, y: 0 };
  }
}

function incomingHandle(transition: SpeedTransition): BezierHandle {
  switch (transition) {
    case "linear": return { x: 2 / 3, y: 2 / 3 };
    case "ease-in": return { x: 1, y: 1 };
    case "ease-out": return { x: 0.58, y: 1 };
    case "ease-in-out": return { x: 2 / 3, y: 1 };
    case "hard-cut": return { x: 1, y: 1 };
  }
}

function cubicBezierCoordinate(t: number, first: number, second: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * first + 3 * inverse * t * t * second + t * t * t;
}

function cubicBezierProgress(position: number, first: BezierHandle, second: BezierHandle): number {
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 18; iteration += 1) {
    const candidate = (low + high) / 2;
    if (cubicBezierCoordinate(candidate, first.x, second.x) < position) low = candidate;
    else high = candidate;
  }
  return cubicBezierCoordinate((low + high) / 2, first.y, second.y);
}

/** A pontok kétoldali Bézier-handle-jeit használó, közös sebességkiértékelő. */
export function speedAt(curve: SpeedCurve, position: number): number {
  const points = normalizeSpeedCurve(curve).points;
  const x = clamp(position, 0, 1);
  const index = points.findIndex((point) => point.position >= x);
  if (index <= 0) return points[0].speed;
  if (index === -1) return points.at(-1)?.speed ?? 1;

  const left = points[index - 1];
  const right = points[index];
  const span = right.position - left.position;
  if (span <= 0) return right.speed;
  if (Math.abs(x - right.position) < 0.000001) return right.speed;
  if (left.outgoingTransition === "hard-cut") return 1;
  if (right.incomingTransition === "hard-cut") return left.speed;
  const t = (x - left.position) / span;
  const progress = cubicBezierProgress(
    t,
    outgoingHandle(left.outgoingTransition ?? defaultSpeedTransition),
    incomingHandle(right.incomingTransition ?? defaultSpeedTransition),
  );
  return clamp(left.speed + (right.speed - left.speed) * progress, MIN_SPEED, MAX_SPEED);
}

export function sampleSpeedCurve(curve: SpeedCurve, samplesPerSegment = 32): SpeedPoint[] {
  const points = normalizeSpeedCurve(curve).points;
  const samples: SpeedPoint[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    if (left.outgoingTransition === "hard-cut") {
      samples.push({ position: left.position, speed: 1 });
      samples.push({ position: right.position, speed: 1 });
      samples.push(right);
      continue;
    }
    if (right.incomingTransition === "hard-cut") {
      samples.push({ position: right.position, speed: left.speed });
      samples.push(right);
      continue;
    }
    for (let sample = 1; sample <= samplesPerSegment; sample += 1) {
      const position = left.position + ((right.position - left.position) * sample) / samplesPerSegment;
      samples.push({ position, speed: speedAt({ points }, position) });
    }
  }
  return samples;
}

/** A forrás 0..position részének becsült kimeneti ideje másodpercben. */
export function sourcePositionToOutputTime(
  curve: SpeedCurve,
  sourceDuration: number,
  position: number,
): number {
  const clampedPosition = clamp(position, 0, 1);
  if (sourceDuration <= 0 || clampedPosition === 0) return 0;

  if (normalizeSpeedCurve(curve).points.every((point) => point.speed === 1)) {
    return sourceDuration * clampedPosition;
  }

  const steps = Math.max(24, Math.ceil(clampedPosition * 320));
  const step = clampedPosition / steps;
  let integral = 0;
  for (let index = 0; index < steps; index += 1) {
    const midpoint = (index + 0.5) * step;
    integral += step / speedAt(curve, midpoint);
  }
  return sourceDuration * integral;
}

export function estimateOutputDuration(curve: SpeedCurve, sourceDuration: number): number {
  return sourcePositionToOutputTime(curve, sourceDuration, 1);
}

export function outputTimeAtSourceTime(
  curve: SpeedCurve,
  sourceDuration: number,
  sourceTime: number,
): number {
  if (sourceDuration <= 0) return 0;
  return sourcePositionToOutputTime(curve, sourceDuration, sourceTime / sourceDuration);
}

/** A görbepont relatív pozíciójából számolt forrásidő másodpercben. */
export function sourceTimeAtPosition(position: number, sourceDuration: number): number {
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) return 0;
  return clamp(position, 0, 1) * sourceDuration;
}

/**
 * A videó átlagos FPS-ével számolt, 1-től induló képkockasorszám.
 * Változó képkockasebességű forrásnál ez becslés.
 */
export function frameNumberAtSourceTime(sourceTime: number, frameRate: number): number {
  if (!Number.isFinite(frameRate) || frameRate <= 0) return 1;
  return Math.max(1, Math.floor(Math.max(0, sourceTime) * frameRate) + 1);
}

export function isSameCurve(left: SpeedCurve, right: SpeedCurve): boolean {
  const leftPoints = normalizeSpeedCurve(left).points;
  const rightPoints = normalizeSpeedCurve(right).points;
  return (
    leftPoints.length === rightPoints.length &&
    leftPoints.every(
      (point, index) =>
        Math.abs(point.position - rightPoints[index].position) < 0.0001 &&
        Math.abs(point.speed - rightPoints[index].speed) < 0.0001 &&
        point.incomingTransition === rightPoints[index].incomingTransition &&
        point.outgoingTransition === rightPoints[index].outgoingTransition,
    )
  );
}

export function curvePresetId(curve: SpeedCurve): SpeedPreset["id"] | "custom" {
  return speedPresets.find((preset) => isSameCurve(curve, preset.curve))?.id ?? "custom";
}

export function addSpeedPoint(curve: SpeedCurve, point: SpeedPoint): SpeedCurve {
  return normalizeSpeedCurve({
    points: [...curve.points, point],
  });
}

export function updateSpeedPoint(
  curve: SpeedCurve,
  index: number,
  point: SpeedPoint,
): SpeedCurve {
  const points = normalizeSpeedCurve(curve).points;
  if (index <= 0 || index >= points.length - 1) return { points };
  const before = points[index - 1];
  const after = points[index + 1];
  points[index] = {
    ...points[index],
    ...point,
    position: clamp(point.position, before.position + 0.01, after.position - 0.01),
    speed: snapSpeed(point.speed),
  };
  return { points };
}

export function updateSpeedPointTransition(
  curve: SpeedCurve,
  index: number,
  direction: "incoming" | "outgoing",
  transition: SpeedTransition,
): SpeedCurve {
  const points = normalizeSpeedCurve(curve).points;
  if (index < 0 || index >= points.length) return { points };
  points[index] = {
    ...points[index],
    [direction === "incoming" ? "incomingTransition" : "outgoingTransition"]: normalizeTransition(transition),
  };
  return { points };
}

export function removeSpeedPoint(curve: SpeedCurve, index: number): SpeedCurve {
  const points = normalizeSpeedCurve(curve).points;
  if (index <= 0 || index >= points.length - 1) return { points };
  return { points: points.filter((_, pointIndex) => pointIndex !== index) };
}

export function createSpeedCurveFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "").trim() || "video";
  return `${base}-speed-curve.mp4`;
}
