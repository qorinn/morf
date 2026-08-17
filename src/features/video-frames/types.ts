export const frameSetSchemaVersion = 1 as const;
export const frameCheckpointSeconds = 15;

export interface VideoFramesTextCopy {
  unsupportedFileType: { message: string; suggestion: string };
  unreadableContainer: { message: string; suggestion: string };
  noVideoTrack: { message: string; suggestion: string };
  undecodableCodecTemplate: string;
  undecodableCodecSuggestion: string;
  metadataReadFailed: { message: string; suggestion: string };
  canvasUnavailable: string;
  trackNotDecodable: string;
  localStorageUnsupported: string;
  unsupportedSchemaVersionTemplate: string;
  frameSetArtifactName: string;
  checkpointArtifactName: string;
  directorySaveUnsupported: string;
  pngImageDescription: string;
  pngImagesDescription: string;
}

export type FrameRateSelection = number | null;
export type FrameExtractionMode = "timeline" | "first-last";

export type VideoFrameMetadata = {
  fileName: string;
  fileSize: number;
  duration: number;
  firstTimestamp: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  sourceFps: number;
  approximateFrameCount: number;
  codec: string;
};

export type FrameRecordV1 = {
  index: number;
  timestamp: number;
  duration: number;
  fileName: string;
  byteSize: number;
};

export type FrameChunkIndexV1 = {
  schemaVersion: typeof frameSetSchemaVersion;
  frameSetId: string;
  chunkNumber: number;
  startTimestamp: number;
  endTimestamp: number;
  frames: FrameRecordV1[];
};

export type FrameSetStatus =
  "extracting" | "paused" | "ready" | "cancelled" | "error";

export type FrameSetManifestV1 = {
  schemaVersion: typeof frameSetSchemaVersion;
  id: string;
  sourceName: string;
  sourceSize: number;
  createdAt: string;
  updatedAt: string;
  status: FrameSetStatus;
  metadata: VideoFrameMetadata;
  rangeStart: number;
  rangeEnd: number;
  extractionFps: FrameRateSelection;
  selectionFps: FrameRateSelection;
  frameCount: number;
  totalBytes: number;
  chunkCount: number;
  lastTimestamp: number | null;
  lastSelectedTimestamp: number | null;
  errorMessage?: string;
};

export type InspectVideoResult =
  | { valid: true; metadata: VideoFrameMetadata }
  | { valid: false; message: string; suggestion: string };

export type ExtractFramesRequest = {
  file: File;
  frameSetId: string;
  metadata: VideoFrameMetadata;
  rangeStart: number;
  rangeEnd: number;
  extractionMode: FrameExtractionMode;
  extractionFps: FrameRateSelection;
  resume: boolean;
  copy: VideoFramesTextCopy;
};

export type FrameExtractionProgress = {
  status: "preparing" | "decoding" | "writing" | "paused" | "completed";
  currentTimestamp: number;
  rangeStart: number;
  rangeEnd: number;
  frameCount: number;
  totalBytes: number;
  storageRemaining?: number;
  reason?: "user" | "storage";
};

export type ExtractFramesResult = {
  manifest: FrameSetManifestV1;
  reason: "completed" | "paused" | "storage" | "cancelled";
};

export type VideoFrameWorkerApi = {
  inspectVideo(
    file: File,
    copy: VideoFramesTextCopy,
  ): Promise<InspectVideoResult>;
  extractFrames(
    request: ExtractFramesRequest,
    onProgress: (progress: FrameExtractionProgress) => void,
  ): Promise<ExtractFramesResult>;
  pause(): void;
  cancel(): void;
};

export type FrameSetSummary = {
  manifest: FrameSetManifestV1;
  selectedCount: number;
  selectedBytes: number;
  previewFrames: FrameRecordV1[];
};
