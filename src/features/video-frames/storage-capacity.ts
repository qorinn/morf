export const storageSafetyFloor = 64 * 1024 * 1024;

export function requiredStorageMargin(lastFrameSize: number): number {
  return Math.max(storageSafetyFloor, Math.max(0, lastFrameSize) * 8);
}

export function isStorageNearLimit(
  storageRemaining: number | undefined,
  lastFrameSize: number,
): boolean {
  return (
    storageRemaining !== undefined &&
    storageRemaining < requiredStorageMargin(lastFrameSize)
  );
}
