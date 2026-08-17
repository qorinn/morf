import type {
  VideoConverterMetadata,
  VideoOutputFormat,
  VideoQualityPreset,
} from "./types";

export const outputFormats: Array<{
  id: VideoOutputFormat;
  label: string;
  extension: string;
  mimeType: string;
  videoCodec: "avc" | "vp9";
  audioCodec: "aac" | "opus";
}> = [
  { id: "mp4", label: "MP4", extension: "mp4", mimeType: "video/mp4", videoCodec: "avc", audioCodec: "aac" },
  { id: "webm", label: "WebM", extension: "webm", mimeType: "video/webm", videoCodec: "vp9", audioCodec: "opus" },
  { id: "mov", label: "MOV", extension: "mov", mimeType: "video/quicktime", videoCodec: "avc", audioCodec: "aac" },
];

export const qualityPresets: Array<{
  id: VideoQualityPreset;
  label: string;
  description: string;
  multiplier: number;
  sourceFraction: number;
}> = [
  { id: "smaller", label: "Kisebb fájl", description: "Erősebb tömörítés", multiplier: 0.58, sourceFraction: 0.45 },
  { id: "balanced", label: "Kiegyensúlyozott", description: "Jó méret és képminőség", multiplier: 1, sourceFraction: 0.7 },
  { id: "original", label: "Eredeti minőség", description: "Megtartja az eredeti tömörítést", multiplier: 1.45, sourceFraction: 0.97 },
];

const minScale = 10;
const maxScale = 100;
const videoBitsPerPixelFrame: Record<VideoOutputFormat, number> = {
  mp4: 0.075,
  mov: 0.075,
  webm: 0.052,
};
const audioBitrate: Record<VideoOutputFormat, number> = {
  mp4: 128_000,
  mov: 128_000,
  webm: 96_000,
};

export function clampScalePercent(value: number): number {
  return Math.min(maxScale, Math.max(minScale, Math.round(value)));
}

function evenDimension(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2);
}

export function targetVideoDimensions(
  width: number,
  height: number,
  scalePercent: number,
): { width: number; height: number } {
  const ratio = clampScalePercent(scalePercent) / 100;
  return {
    width: evenDimension(width * ratio),
    height: evenDimension(height * ratio),
  };
}

export function outputFormatDetails(format: VideoOutputFormat) {
  return outputFormats.find((item) => item.id === format)!;
}

export function qualityPresetDetails(preset: VideoQualityPreset) {
  return qualityPresets.find((item) => item.id === preset)!;
}

export function estimateSourceBitrate(
  metadata: Pick<VideoConverterMetadata, "fileSize" | "duration">,
): number | undefined {
  if (metadata.duration <= 0) return undefined;
  return (metadata.fileSize * 8) / metadata.duration;
}

/**
 * A forrás videósáv becsült bitrátája (a teljes fájl bitrátájából levonva a
 * célformátumhoz tervezett hangsávot). Ez a referenciapont, amihez a
 * presetek igazodnak: mindegyik ennek csak egy hányadát (`sourceFraction`)
 * célozhatja, így egyik sem célozhat a forrásnál ténylegesen magasabb
 * bitrátát — "Eredeti minőségnél" is csak megközelíti, nem lépi túl.
 */
export function sourceVideoBitrateCeiling(
  metadata: Pick<VideoConverterMetadata, "fileSize" | "duration" | "hasAudio">,
  outputFormat: VideoOutputFormat,
): number | undefined {
  const sourceBitrate = estimateSourceBitrate(metadata);
  if (sourceBitrate === undefined) return undefined;
  return Math.max(0, sourceBitrate - (metadata.hasAudio ? audioBitrate[outputFormat] : 0));
}

export function targetVideoBitrate(
  width: number,
  height: number,
  frameRate: number,
  outputFormat: VideoOutputFormat,
  quality: VideoQualityPreset,
  bitrateCeiling?: number,
): number {
  const preset = qualityPresetDetails(quality);
  const base = width * height * Math.max(1, frameRate) * videoBitsPerPixelFrame[outputFormat];
  const pixelTarget = base * preset.multiplier;
  // A felbontás-alapú célérték és a forrás bitrátájának preset-hányada közül
  // mindig a kisebbik érvényesül — ez egyszerre biztosítja, hogy lefelé
  // skálázott felbontásnál is arányosan csökkenjen a bitráta, és hogy egyik
  // preset se célozhasson a forrásnál ténylegesen nagyobb kimenetet.
  const target =
    bitrateCeiling !== undefined
      ? Math.min(pixelTarget, bitrateCeiling * preset.sourceFraction)
      : pixelTarget;
  return Math.round(Math.min(24_000_000, Math.max(100_000, target)));
}

export function targetAudioBitrate(outputFormat: VideoOutputFormat): number {
  return audioBitrate[outputFormat];
}

export function estimateOutputBytes(
  metadata: Pick<
    VideoConverterMetadata,
    "duration" | "width" | "height" | "frameRate" | "hasAudio" | "fileSize"
  >,
  outputFormat: VideoOutputFormat,
  scalePercent: number,
  quality: VideoQualityPreset,
): number {
  const dimensions = targetVideoDimensions(metadata.width, metadata.height, scalePercent);
  const videoBitrate = targetVideoBitrate(
    dimensions.width,
    dimensions.height,
    metadata.frameRate,
    outputFormat,
    quality,
    sourceVideoBitrateCeiling(metadata, outputFormat),
  );
  const totalBitrate = videoBitrate + (metadata.hasAudio ? audioBitrate[outputFormat] : 0);
  return Math.max(1, Math.round((totalBitrate * Math.max(0, metadata.duration)) / 8 * 1.025));
}

export function createVideoConverterFileName(
  fileName: string,
  outputFormat: VideoOutputFormat,
  suffix = "optimalizalt",
): string {
  const base = fileName.replace(/\.[^.]+$/, "") || "video";
  return `${base}-${suffix}.${outputFormatDetails(outputFormat).extension}`;
}

export function supportedVideoFileName(fileName: string): boolean {
  return /\.(mp4|m4v|mov|webm|mkv|ts|m2ts|mts)$/i.test(fileName);
}
