export interface VideoSpeedTextCopy {
  unsupportedFileType: { message: string; suggestion: string };
  unreadableContainer: { message: string; suggestion: string };
  trackNotDecodable: { message: string; suggestion: string };
  inspectFailed: { message: string; suggestion: string };
  exportCancelled: string;
  exportTrackNotDecodable: string;
  h264Unsupported: string;
  aacUnsupported: string;
  outputNotCreated: string;
}

export type SpeedTransition = "ease-in" | "ease-out" | "ease-in-out" | "linear";

export type SpeedPoint = {
  kind?: "point";
  /** A forrásvideó relatív pozíciója 0 és 1 között. */
  position: number;
  /** Lejátszási sebesség 0,1× és 10× között. */
  speed: number;
  /** Az előző pont felől érkező átmenet. A régi görbéknél ease-in-out. */
  incomingTransition?: SpeedTransition;
  /** A következő pont felé induló átmenet. A régi görbéknél ease-in-out. */
  outgoingTransition?: SpeedTransition;
};

export type HardCut = {
  kind: "hard-cut";
  /** A két sebességpont közös, relatív forrásideje. */
  position: number;
  /** A vágás közvetlen bal oldalán érvényes sebesség. */
  beforeSpeed: number;
  /** A vágás közvetlen jobb oldalán érvényes sebesség. */
  afterSpeed: number;
  /** Az előző normál ponttól a bal oldali cut-pontig tartó easing. */
  incomingTransition?: SpeedTransition;
  /** A jobb oldali cut-ponttól a következő normál pontig tartó easing. */
  outgoingTransition?: SpeedTransition;
};

export type SpeedCurveNode = SpeedPoint | HardCut;

export type SpeedCurve = {
  points: SpeedCurveNode[];
};

export type SpeedPresetId = "normal" | "montage" | "hero" | "jump-cut" | "flash-in" | "custom";

export type SpeedPreset = {
  id: Exclude<SpeedPresetId, "custom">;
  label: string;
  description: string;
  curve: SpeedCurve;
};

export type VideoSpeedMetadata = {
  fileName: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  videoCodec: string | null;
  hasAudio: boolean;
  audioCodec: string | null;
  audioSampleRate: number | null;
  audioChannels: number | null;
};

export type InspectSpeedVideoResult =
  | { valid: true; metadata: VideoSpeedMetadata; canEncode: boolean }
  | { valid: false; message: string; suggestion: string };

export type ProcessedAudio = {
  channels: ArrayBuffer[];
  sampleRate: number;
  numberOfFrames: number;
};

export type VideoSpeedExportRequest = {
  file: File;
  metadata: VideoSpeedMetadata;
  curve: SpeedCurve;
  audio?: ProcessedAudio;
  copy: VideoSpeedTextCopy;
};

export type VideoSpeedExportProgress = {
  phase: "preparing" | "encoding" | "finalizing" | "completed";
  sourceTimestamp: number;
  sourceDuration: number;
};

export type VideoSpeedExportResult = {
  buffer: ArrayBuffer;
  mimeType: string;
};

export type VideoSpeedWorkerApi = {
  inspectVideo(
    file: File,
    copy: VideoSpeedTextCopy,
  ): Promise<InspectSpeedVideoResult>;
  exportVideo(
    request: VideoSpeedExportRequest,
    onProgress: (progress: VideoSpeedExportProgress) => void,
  ): Promise<VideoSpeedExportResult>;
  cancel(): void;
};
