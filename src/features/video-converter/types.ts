export interface VideoConverterTextCopy {
  unsupportedFileType: { message: string; suggestion: string };
  unreadableContainer: { message: string; suggestion: string };
  trackNotDecodable: { message: string; suggestion: string };
  inspectFailed: { message: string; suggestion: string };
  exportCancelled: string;
  exportTrackNotDecodable: string;
  videoEncoderUnavailableTemplate: string;
  audioEncoderUnavailableTemplate: string;
  outputNotCreated: string;
}

export type VideoOutputFormat = "mp4" | "webm" | "mov";
export type VideoQualityPreset = "smaller" | "balanced" | "original";

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
  copy: VideoConverterTextCopy;
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
  inspectVideo(
    file: File,
    copy: VideoConverterTextCopy,
  ): Promise<VideoConverterInspectResult>;
  convertVideo(
    request: VideoConverterRequest,
    onProgress: (progress: VideoConverterProgress) => void,
  ): Promise<VideoConverterResult>;
  cancel(): void;
};
