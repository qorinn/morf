export type VideoOutputFormat = "mp4" | "webm" | "mov";
export type VideoQualityPreset = "smaller" | "balanced" | "higher";

export type VideoConverterMetadata = {
  fileName: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  videoCodec: string | null;
  hasAudio: boolean;
  audioCodec: string | null;
};

export type VideoEncoderSupport = {
  video: boolean;
  audio: boolean;
};

export type VideoConverterInspectResult =
  | {
    valid: true;
    metadata: VideoConverterMetadata;
    encoders: Record<VideoOutputFormat, VideoEncoderSupport>;
  }
  | { valid: false; message: string; suggestion: string };

export type VideoConverterRequest = {
  file: File;
  metadata: VideoConverterMetadata;
  outputFormat: VideoOutputFormat;
  scalePercent: number;
  quality: VideoQualityPreset;
};

export type VideoConverterProgress = {
  phase: "preparing" | "encoding" | "finalizing" | "completed";
  sourceTimestamp: number;
  sourceDuration: number;
};

export type VideoConverterResult = {
  buffer: ArrayBuffer;
  mimeType: string;
};

export type VideoConverterWorkerApi = {
  inspectVideo(file: File): Promise<VideoConverterInspectResult>;
  convertVideo(
    request: VideoConverterRequest,
    onProgress: (progress: VideoConverterProgress) => void,
  ): Promise<VideoConverterResult>;
  cancel(): void;
};
