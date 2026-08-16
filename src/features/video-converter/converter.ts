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
}> = [
  { id: "smaller", label: "Kisebb fájl", description: "Erősebb tömörítés", multiplier: 0.58 },
  { id: "balanced", label: "Kiegyensúlyozott", description: "Jó méret és képminőség", multiplier: 1 },
  { id: "higher", label: "Jobb minőség", description: "Nagyobb fájl, több részlet", multiplier: 1.45 },
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

export function targetVideoBitrate(
  width: number,
  height: number,
  frameRate: number,
  outputFormat: VideoOutputFormat,
  quality: VideoQualityPreset,
): number {
  const base = width * height * Math.max(1, frameRate) * videoBitsPerPixelFrame[outputFormat];
  return Math.round(Math.min(24_000_000, Math.max(300_000, base * qualityPresetDetails(quality).multiplier)));
}

export function targetAudioBitrate(outputFormat: VideoOutputFormat): number {
  return audioBitrate[outputFormat];
}

export function estimateOutputBytes(
  metadata: Pick<VideoConverterMetadata, "duration" | "width" | "height" | "frameRate" | "hasAudio">,
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
  );
  const totalBitrate = videoBitrate + (metadata.hasAudio ? audioBitrate[outputFormat] : 0);
  return Math.max(1, Math.round((totalBitrate * Math.max(0, metadata.duration)) / 8 * 1.025));
}

export function createVideoConverterFileName(fileName: string, outputFormat: VideoOutputFormat): string {
  const base = fileName.replace(/\.[^.]+$/, "") || "video";
  return `${base}-optimalizalt.${outputFormatDetails(outputFormat).extension}`;
}

export function supportedVideoFileName(fileName: string): boolean {
  return /\.(mp4|m4v|mov|webm|mkv|ts|m2ts|mts)$/i.test(fileName);
}
