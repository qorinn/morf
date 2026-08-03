import type {
  FrameRateSelection,
  FrameRecordV1,
} from "@/features/video-frames/types";

const timestampEpsilon = 1e-7;

export function normalizeFrameRate(
  requestedFps: number | null,
  maximumFps: number,
): FrameRateSelection {
  if (requestedFps === null) return null;
  if (!Number.isFinite(requestedFps) || requestedFps <= 0) return null;
  return Math.min(requestedFps, maximumFps);
}

export function shouldSelectFrame(
  timestamp: number,
  previousSelectedTimestamp: number | null,
  targetFps: FrameRateSelection,
): boolean {
  if (targetFps === null || previousSelectedTimestamp === null) return true;
  return (
    timestamp - previousSelectedTimestamp + timestampEpsilon >= 1 / targetFps
  );
}

export function selectFramesByFps(
  frames: FrameRecordV1[],
  targetFps: FrameRateSelection,
): FrameRecordV1[] {
  if (targetFps === null) return frames;

  const selected: FrameRecordV1[] = [];
  let previousTimestamp: number | null = null;

  for (const frame of frames) {
    if (shouldSelectFrame(frame.timestamp, previousTimestamp, targetFps)) {
      selected.push(frame);
      previousTimestamp = frame.timestamp;
    }
  }

  return selected;
}

export function estimateSelectedFrameCount(
  duration: number,
  sourceFps: number,
  targetFps: FrameRateSelection,
): number {
  const effectiveFps =
    targetFps === null ? sourceFps : Math.min(sourceFps, targetFps);
  return Math.max(1, Math.round(Math.max(0, duration) * effectiveFps));
}

export function frameFileName(sourceName: string, frameIndex: number): string {
  const sourceBase =
    sourceName
      .replace(/\.[^.]+$/, "")
      .normalize("NFC")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[. -]+|[. -]+$/g, "")
      .slice(0, 80) || "video";

  return `${sourceBase}-frame-${String(frameIndex).padStart(8, "0")}.png`;
}
