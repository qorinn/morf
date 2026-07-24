export const faviconExportTargetIds = ["website", "web-app"] as const;

export type FaviconExportTarget = (typeof faviconExportTargetIds)[number];

export interface FaviconExportOptions {
  targets: FaviconExportTarget[];
  includeWebManifest: boolean;
}

export type BackgroundMode =
  "transparent" | "custom" | "dominant" | "white" | "black";

export type DisplayMode =
  "standalone" | "minimal-ui" | "fullscreen" | "browser";

export type SourceKind = "png" | "jpeg" | "webp" | "svg";

export interface FaviconEditorSettings {
  backgroundMode: BackgroundMode;
  backgroundColor: string;
  dominantColor: string;
  standardPadding: number;
  maskablePadding: number;
  borderRadius: number;
}

export interface ManifestSettings {
  name: string;
  shortName: string;
  id: string;
  startUrl: string;
  scope: string;
  themeColor: string;
  backgroundColor: string;
  display: DisplayMode;
  basePath: string;
  projectName: string;
}

export interface FaviconSource {
  file: File;
  kind: SourceKind;
  width: number;
  height: number;
  hasTransparency: boolean;
  transparentRatio: number;
  dominantColor: string;
  sanitizedSvg?: string;
  objectUrl: string;
}

export interface RasterPayload {
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

export interface FaviconGenerateRequest {
  standardMaster: RasterPayload;
  opaqueMaster: RasterPayload;
  maskableMaster: RasterPayload;
  exportOptions: FaviconExportOptions;
  manifest: ManifestSettings;
  sanitizedSvg?: string;
  language: "hu";
}

export type FaviconProgressStatus =
  "generating" | "creating-ico" | "creating-package";

export interface FaviconProgress {
  status: FaviconProgressStatus;
  value: number;
}

export interface FaviconGenerateResult {
  archiveBuffer: ArrayBuffer;
  archiveName: string;
  assetNames: string[];
  htmlCode: string;
  manifest?: string;
}

export interface FaviconWorkerApi {
  generatePackage(
    request: FaviconGenerateRequest,
    onProgress: (progress: FaviconProgress) => void,
  ): Promise<FaviconGenerateResult>;
}
