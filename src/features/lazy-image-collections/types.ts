import type {
  FileJobStatus,
  ImageConversionSettings,
  InputImageFormat,
} from "@/features/image-processing/types";
import type { LazyOutputManifestV1 } from "./output-storage.ts";

export type LazyImageSourceDescriptor =
  | {
      kind: "frame-set";
      frameSetId: string;
    }
  | {
      kind: "directory";
      directory: FileSystemDirectoryHandle;
    };

export type LazyImageEntry = {
  key: string;
  fileName: string;
  byteSize: number;
  trustedInputFormat?: InputImageFormat;
  open(): Promise<File>;
};

export type LazyImageCollectionStatus =
  "queued" | Exclude<FileJobStatus, "completed"> | "completed";

export type LazyImageCollection = {
  id: string;
  groupId: string;
  name: string;
  sourceLabel: string;
  source: LazyImageSourceDescriptor;
  itemCount: number;
  totalBytes: number;
  status: LazyImageCollectionStatus;
  progress: number;
  completedCount: number;
  outputBytes: number;
  outputManifest?: LazyOutputManifestV1;
  settingsKey?: string;
  errorMessage?: string;
};

export function lazyCollectionSettingsKey(
  settings: ImageConversionSettings,
): string {
  return JSON.stringify(settings);
}
