export function calculateContainedDimensions(
  width: number,
  height: number,
  maxWidth?: number,
  maxHeight?: number,
): { width: number; height: number } {
  const widthScale = maxWidth ? maxWidth / width : 1;
  const heightScale = maxHeight ? maxHeight / height : 1;
  const scale = Math.min(1, widthScale, heightScale);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
