import { calculateContainedDimensions } from "./dimensions.ts";
import type { ImageFormat } from "./types.ts";

export type ImageSizeEstimateOptions = {
  sourceSize: number;
  sourceFormat: ImageFormat;
  outputFormat: ImageFormat;
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  quality: number;
};

export type ImageSizeEstimate = {
  bytes: number;
  width: number;
  height: number;
};

const formatFactors: Record<ImageFormat, Record<ImageFormat, number>> = {
  jpeg: { jpeg: 1, png: 2.2, webp: 0.78 },
  png: { jpeg: 0.45, png: 0.95, webp: 0.55 },
  webp: { jpeg: 1.2, png: 2, webp: 0.95 },
};

function getQualityFactor(format: ImageFormat, quality: number): number {
  if (format === "png") return 1;
  const normalizedQuality = Math.min(100, Math.max(1, quality)) / 100;
  return 0.42 + 0.72 * normalizedQuality ** 1.7;
}

/**
 * Gyors, kliensoldali becslés. Nem dekódolja és nem kódolja újra a képet;
 * a pixelarány, a formátumváltás és a minőség alapján ad tájékoztató értéket.
 */
export function estimateImageOutputSize(
  options: ImageSizeEstimateOptions,
): ImageSizeEstimate | undefined {
  if (
    options.sourceSize <= 0 ||
    options.width <= 0 ||
    options.height <= 0 ||
    options.maxWidth <= 0 ||
    options.maxHeight <= 0
  ) {
    return undefined;
  }

  const dimensions = calculateContainedDimensions(
    options.width,
    options.height,
    options.maxWidth,
    options.maxHeight,
  );
  const sourcePixels = options.width * options.height;
  const outputPixels = dimensions.width * dimensions.height;
  const pixelRatio = outputPixels / sourcePixels;
  const formatFactor =
    formatFactors[options.sourceFormat][options.outputFormat];
  const qualityFactor = getQualityFactor(options.outputFormat, options.quality);
  const estimatedBytes =
    options.sourceSize * pixelRatio * formatFactor * qualityFactor * 0.98;

  return {
    bytes: Math.max(512, Math.round(estimatedBytes)),
    ...dimensions,
  };
}
