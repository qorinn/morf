import type { ImageRecipe, PresetId } from "@/lib/presets/image-presets";

export const outputImageFormats = ["jpeg", "png", "webp", "avif"] as const;
export const inputImageFormats = [...outputImageFormats, "heic"] as const;

export type ImageFormat = (typeof outputImageFormats)[number];
export type InputImageFormat = (typeof inputImageFormats)[number];

export type ImageConversionSettings = {
  presetId: PresetId;
  outputFormat: ImageFormat;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  maxFileSizeKb: number | null;
  lossless: boolean;
};

export type ConversionGroup = {
  id: string;
  name: string;
  shouldProcess: boolean;
  settings: ImageConversionSettings;
};

export type FileJobStatus =
  | "queued"
  | "loading-engine"
  | "decoding"
  | "processing"
  | "encoding"
  | "completed"
  | "cancelled"
  | "error";

export type FileJobErrorCategory =
  | "unsupported-format"
  | "file-too-large"
  | "decode-failed"
  | "encode-failed"
  | "out-of-memory"
  | "engine-load-failed"
  | "invalid-settings"
  | "cancelled"
  | "browser-unsupported"
  | "target-size-unreachable";

export type FileJobError = {
  category: FileJobErrorCategory;
  message: string;
  suggestion: string;
  detail?: string;
};

export type ProcessProgress = {
  status: Exclude<
    FileJobStatus,
    "queued" | "completed" | "cancelled" | "error"
  >;
  value: number;
};

export type ProcessImageRequest = {
  buffer: ArrayBuffer;
  inputFormat: InputImageFormat;
  recipe: ImageRecipe;
};

export type ProcessImageResult = {
  buffer: ArrayBuffer;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  mimeType: string;
  extension: string;
};

export type ProcessImageApi = {
  processImage(
    request: ProcessImageRequest,
    onProgress: (progress: ProcessProgress) => void,
  ): Promise<ProcessImageResult>;
};

export type FileJobResult = {
  blob: Blob;
  url: string;
  format: ImageFormat;
  width: number;
  height: number;
  size: number;
  mimeType: string;
};

export type FileJob = {
  id: string;
  file: File;
  inputFormat: InputImageFormat;
  previewUrl: string;
  outputBaseName: string;
  groupId: string;
  shouldProcess: boolean;
  status: FileJobStatus;
  progress: number;
  originalWidth?: number;
  originalHeight?: number;
  result?: FileJobResult;
  error?: FileJobError;
};
