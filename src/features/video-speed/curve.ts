import type { HardCut, SpeedCurve, SpeedCurveNode, SpeedPoint, SpeedPreset, SpeedTransition } from "./types";

export const MIN_SPEED = 0.1;
export const MAX_SPEED = 10;
export const SPEED_STEP = 0.1;
const minimumHardJumpGap = 2;
export const defaultSpeedTransition: SpeedTransition = "ease-in-out";

const speedTransitions: readonly SpeedTransition[] = ["ease-in", "ease-out", "ease-in-out", "linear"] as const;

export const speedPresets: readonly SpeedPreset[] = [
  { id: "normal", label: "Normál", description: "Változatlan tempó.", curve: { points: [{ position: 0, speed: 1 }, { position: 1, speed: 1 }] } },
  {
    id: "montage", label: "Montázs", description: "Rövid lassítás után gyors részlet.", curve: {
      points: [{ position: 0, speed: 1.5 }, { position: 0.26, speed: 0.6 }, { position: 0.52, speed: 3.4 }, { position: 0.77, speed: 0.8 }, { position: 1, speed: 2.3 }],
    },
  },
  {
    id: "hero", label: "Hero", description: "Középen hangsúlyos lassítás.", curve: {
      points: [{ position: 0, speed: 1.8 }, { position: 0.34, speed: 1.4 }, { position: 0.5, speed: 0.4 }, { position: 0.66, speed: 1.4 }, { position: 1, speed: 1.8 }],
    },
  },
  {
    id: "jump-cut", label: "Jump cut", description: "Lendületes, gyors középső szakasz.", curve: {
      points: [{ position: 0, speed: 1 }, { position: 0.2, speed: 1 }, { position: 0.32, speed: 4.6 }, { position: 0.68, speed: 4.6 }, { position: 0.8, speed: 1 }, { position: 1, speed: 1 }],
    },
  },
  {
    id: "flash-in", label: "Flash in", description: "Gyors belépés, nyugodt befejezés.", curve: {
      points: [{ position: 0, speed: 4.5 }, { position: 0.18, speed: 3 }, { position: 0.46, speed: 1.2 }, { position: 1, speed: 1 }],
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
  return speedTransitions.includes(value as SpeedTransition) ? value as SpeedTransition : defaultSpeedTransition;
}

export function isHardCut(node: SpeedCurveNode): node is HardCut {
  return node.kind === "hard-cut";
}

export function nodeBeforeSpeed(node: SpeedCurveNode): number {
  return isHardCut(node) ? node.beforeSpeed : node.speed;
}

export function nodeAfterSpeed(node: SpeedCurveNode): number {
  return isHardCut(node) ? node.afterSpeed : node.speed;
}

function normalizeNode(node: SpeedCurveNode): SpeedCurveNode | undefined {
  if (!Number.isFinite(node.position)) return undefined;
  if (isHardCut(node)) {
    if (!Number.isFinite(node.beforeSpeed) || !Number.isFinite(node.afterSpeed)) return undefined;
    return {
      kind: "hard-cut",
      position: clamp(node.position, 0, 1),
      beforeSpeed: snapSpeed(node.beforeSpeed),
      afterSpeed: snapSpeed(node.afterSpeed),
      incomingTransition: normalizeTransition(node.incomingTransition),
      outgoingTransition: normalizeTransition(node.outgoingTransition),
    };
  }
  if (!Number.isFinite(node.speed)) return undefined;
  return {
    position: clamp(node.position, 0, 1),
    speed: snapSpeed(node.speed),
    incomingTransition: normalizeTransition(node.incomingTransition),
    outgoingTransition: normalizeTransition(node.outgoingTransition),
  };
}

export function normalizeSpeedCurve(curve: SpeedCurve): SpeedCurve {
  const normalized = curve.points.map(normalizeNode).filter((node): node is SpeedCurveNode => node !== undefined).sort((left, right) => left.position - right.position);
  const inner = normalized.filter((node) => node.position > 0 && node.position < 1);
  const deduplicated = inner.filter((node, index) => index === 0 || node.position - inner[index - 1].position > 0.001);
  const first = normalized.find((node) => node.position === 0 && !isHardCut(node)) ?? { position: 0, speed: 1, incomingTransition: defaultSpeedTransition, outgoingTransition: defaultSpeedTransition };
  const last = normalized.findLast((node) => node.position === 1 && !isHardCut(node)) ?? { position: 1, speed: 1, incomingTransition: defaultSpeedTransition, outgoingTransition: defaultSpeedTransition };
  return { points: [{ ...first, position: 0 }, ...deduplicated, { ...last, position: 1 }] };
}

type BezierHandle = { x: number; y: number };

function outgoingHandle(transition: SpeedTransition): BezierHandle {
  switch (transition) {
    case "linear": return { x: 1 / 3, y: 1 / 3 };
    case "ease-in": return { x: 0.42, y: 0 };
    case "ease-out": return { x: 0, y: 0 };
    case "ease-in-out": return { x: 1 / 3, y: 0 };
  }
}

function incomingHandle(transition: SpeedTransition): BezierHandle {
  switch (transition) {
    case "linear": return { x: 2 / 3, y: 2 / 3 };
    case "ease-in": return { x: 1, y: 1 };
    case "ease-out": return { x: 0.58, y: 1 };
    case "ease-in-out": return { x: 2 / 3, y: 1 };
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

function speedBetween(left: SpeedCurveNode, right: SpeedCurveNode, position: number): number {
  const span = right.position - left.position;
  if (span <= 0) return nodeAfterSpeed(right);
  const progress = cubicBezierProgress(
    (position - left.position) / span,
    outgoingHandle(left.outgoingTransition ?? defaultSpeedTransition),
    incomingHandle(right.incomingTransition ?? defaultSpeedTransition),
  );
  return clamp(nodeAfterSpeed(left) + (nodeBeforeSpeed(right) - nodeAfterSpeed(left)) * progress, MIN_SPEED, MAX_SPEED);
}

/** A normál és hard-cut csomópontok közös sebességkiértékelője. */
export function speedAt(curve: SpeedCurve, position: number): number {
  const points = normalizeSpeedCurve(curve).points;
  const x = clamp(position, 0, 1);
  const index = points.findIndex((point) => point.position >= x);
  if (index <= 0) return nodeAfterSpeed(points[0]);
  if (index === -1) return nodeAfterSpeed(points.at(-1) ?? { position: 1, speed: 1 });
  const right = points[index];
  if (Math.abs(x - right.position) < 0.000001) return nodeAfterSpeed(right);
  return speedBetween(points[index - 1], right, x);
}

export function sampleSpeedCurve(curve: SpeedCurve, samplesPerSegment = 32): SpeedPoint[] {
  const points = normalizeSpeedCurve(curve).points;
  const samples: SpeedPoint[] = [{ position: points[0].position, speed: nodeAfterSpeed(points[0]) }];
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    for (let sample = 1; sample <= samplesPerSegment; sample += 1) {
      const position = left.position + ((right.position - left.position) * sample) / samplesPerSegment;
      samples.push({ position, speed: sample === samplesPerSegment ? nodeBeforeSpeed(right) : speedBetween(left, right, position) });
    }
    if (isHardCut(right)) samples.push({ position: right.position, speed: right.afterSpeed });
  }
  return samples;
}

export function sourcePositionToOutputTime(curve: SpeedCurve, sourceDuration: number, position: number): number {
  const clampedPosition = clamp(position, 0, 1);
  if (sourceDuration <= 0 || clampedPosition === 0) return 0;
  if (normalizeSpeedCurve(curve).points.every((point) => nodeBeforeSpeed(point) === 1 && nodeAfterSpeed(point) === 1)) return sourceDuration * clampedPosition;
  const steps = Math.max(24, Math.ceil(clampedPosition * 320));
  const step = clampedPosition / steps;
  let integral = 0;
  for (let index = 0; index < steps; index += 1) integral += step / speedAt(curve, (index + 0.5) * step);
  return sourceDuration * integral;
}

export function estimateOutputDuration(curve: SpeedCurve, sourceDuration: number): number {
  return sourcePositionToOutputTime(curve, sourceDuration, 1);
}

export function outputTimeAtSourceTime(curve: SpeedCurve, sourceDuration: number, sourceTime: number): number {
  if (sourceDuration <= 0) return 0;
  return sourcePositionToOutputTime(curve, sourceDuration, sourceTime / sourceDuration);
}

export function sourceTimeAtPosition(position: number, sourceDuration: number): number {
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) return 0;
  return clamp(position, 0, 1) * sourceDuration;
}

export function frameNumberAtSourceTime(sourceTime: number, frameRate: number): number {
  if (!Number.isFinite(frameRate) || frameRate <= 0) return 1;
  return Math.max(1, Math.floor(Math.max(0, sourceTime) * frameRate) + 1);
}

function nodesEqual(left: SpeedCurveNode, right: SpeedCurveNode): boolean {
  if (isHardCut(left) !== isHardCut(right) || Math.abs(left.position - right.position) >= 0.0001) return false;
  if (isHardCut(left) && isHardCut(right)) {
    return Math.abs(left.beforeSpeed - right.beforeSpeed) < 0.0001 && Math.abs(left.afterSpeed - right.afterSpeed) < 0.0001 && left.incomingTransition === right.incomingTransition && left.outgoingTransition === right.outgoingTransition;
  }
  const leftPoint = left as SpeedPoint;
  const rightPoint = right as SpeedPoint;
  return Math.abs(leftPoint.speed - rightPoint.speed) < 0.0001 && leftPoint.incomingTransition === rightPoint.incomingTransition && leftPoint.outgoingTransition === rightPoint.outgoingTransition;
}

export function isSameCurve(left: SpeedCurve, right: SpeedCurve): boolean {
  const leftPoints = normalizeSpeedCurve(left).points;
  const rightPoints = normalizeSpeedCurve(right).points;
  return leftPoints.length === rightPoints.length && leftPoints.every((point, index) => nodesEqual(point, rightPoints[index]));
}

export function curvePresetId(curve: SpeedCurve): SpeedPreset["id"] | "custom" {
  return speedPresets.find((preset) => isSameCurve(curve, preset.curve))?.id ?? "custom";
}

function insertionPosition(points: SpeedCurveNode[], position: number): number | undefined {
  const rightIndex = points.findIndex((point) => point.position >= position);
  const right = rightIndex === -1 ? points.at(-1) : points[rightIndex];
  const left = rightIndex <= 0 ? points[0] : points[rightIndex - 1];
  if (!left || !right || position - left.position < 0.01 || right.position - position < 0.01) return undefined;
  return clamp(position, left.position + 0.01, right.position - 0.01);
}

export function addSpeedPoint(curve: SpeedCurve, point: Pick<SpeedPoint, "position" | "speed">): SpeedCurve {
  const normalized = normalizeSpeedCurve(curve);
  const position = insertionPosition(normalized.points, point.position);
  if (position === undefined) return normalized;
  return normalizeSpeedCurve({ points: [...normalized.points, { position, speed: point.speed }] });
}

export function addHardCut(curve: SpeedCurve, point: Pick<HardCut, "position" | "afterSpeed">): SpeedCurve {
  const normalized = normalizeSpeedCurve(curve);
  const position = insertionPosition(normalized.points, point.position);
  if (position === undefined) return normalized;
  const beforeSpeed = speedAt(normalized, position);
  const requestedAfterSpeed = snapSpeed(point.afterSpeed);
  const afterSpeed = Math.abs(requestedAfterSpeed - beforeSpeed) >= minimumHardJumpGap
    ? requestedAfterSpeed
    : requestedAfterSpeed >= beforeSpeed
      ? snapSpeed(beforeSpeed + minimumHardJumpGap <= MAX_SPEED ? beforeSpeed + minimumHardJumpGap : beforeSpeed - minimumHardJumpGap)
      : snapSpeed(beforeSpeed - minimumHardJumpGap >= MIN_SPEED ? beforeSpeed - minimumHardJumpGap : beforeSpeed + minimumHardJumpGap);
  return normalizeSpeedCurve({
    points: [...normalized.points, {
      kind: "hard-cut",
      position,
      beforeSpeed,
      afterSpeed,
      incomingTransition: defaultSpeedTransition,
      outgoingTransition: defaultSpeedTransition,
    }],
  });
}

export function updateSpeedPoint(curve: SpeedCurve, index: number, point: Pick<SpeedPoint, "position" | "speed">): SpeedCurve {
  const points = normalizeSpeedCurve(curve).points;
  const current = points[index];
  if (!current || isHardCut(current)) return { points };
  const isFirst = index === 0;
  const isLast = index === points.length - 1;
  const position = isFirst
    ? 0
    : isLast
      ? 1
      : clamp(point.position, points[index - 1].position + 0.01, points[index + 1].position - 0.01);
  points[index] = { ...current, position, speed: snapSpeed(point.speed) };
  return { points };
}

export function updateHardCutPosition(curve: SpeedCurve, index: number, position: number): SpeedCurve {
  const points = normalizeSpeedCurve(curve).points;
  const current = points[index];
  if (!current || !isHardCut(current) || index <= 0 || index >= points.length - 1) return { points };
  points[index] = { ...current, position: clamp(position, points[index - 1].position + 0.01, points[index + 1].position - 0.01) };
  return { points };
}

export function updateHardCutSpeed(curve: SpeedCurve, index: number, side: "before" | "after", speed: number): SpeedCurve {
  const points = normalizeSpeedCurve(curve).points;
  const current = points[index];
  if (!current || !isHardCut(current)) return { points };
  points[index] = { ...current, [side === "before" ? "beforeSpeed" : "afterSpeed"]: snapSpeed(speed) };
  return { points };
}

export function updateCurveNodeTransition(curve: SpeedCurve, index: number, direction: "incoming" | "outgoing", transition: SpeedTransition): SpeedCurve {
  const points = normalizeSpeedCurve(curve).points;
  const current = points[index];
  if (!current) return { points };
  points[index] = { ...current, [direction === "incoming" ? "incomingTransition" : "outgoingTransition"]: normalizeTransition(transition) };
  return { points };
}

export function removeCurveNode(curve: SpeedCurve, index: number): SpeedCurve {
  const points = normalizeSpeedCurve(curve).points;
  if (index <= 0 || index >= points.length - 1) return { points };
  return { points: points.filter((_, pointIndex) => pointIndex !== index) };
}

export function createSpeedCurveFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "").trim() || "video";
  return `${base}-speed-curve.mp4`;
}
