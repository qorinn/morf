import { proxy, transfer } from "comlink";

import { conversionSettingsToRecipe } from "@/features/image-processing/conversion-settings";
import type {
  ImageConversionSettings,
  ProcessProgress,
} from "@/features/image-processing/types";
import { validateImageFile } from "@/features/image-processing/validation";
import { createImageWorker } from "@/features/image-processing/worker-client";
import { createOutputFileNameFromBase } from "@/lib/filenames/image-filenames";
import { imageRecipeSchema } from "@/lib/presets/image-presets";

import {
  resetLazyOutput,
  writeLazyOutputChunk,
  writeLazyOutputFile,
  writeLazyOutputManifest,
  type LazyOutputManifestV1,
  type LazyOutputRecordV1,
} from "./output-storage.ts";
import { iterateLazyImageEntries } from "./sources.ts";
import type { LazyImageCollection } from "./types.ts";

const checkpointSize = 25;

export type LazyCollectionProgress = {
  status: "loading-engine" | "decoding" | "processing" | "encoding";
  completedCount: number;
  totalCount: number;
  activeProgress: number;
  outputBytes: number;
};

function abortError(): DOMException {
  return new DOMException("A feldolgozás megszakítva.", "AbortError");
}

async function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw abortError();
  let rejectAbort: ((reason: DOMException) => void) | undefined;
  const cancellation = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const onAbort = () => rejectAbort?.(abortError());
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([promise, cancellation]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

export async function processLazyImageCollection(
  collection: LazyImageCollection,
  settings: ImageConversionSettings,
  signal: AbortSignal,
  onProgress: (progress: LazyCollectionProgress) => void,
): Promise<LazyOutputManifestV1> {
  const recipeResult = imageRecipeSchema.safeParse(
    conversionSettingsToRecipe(settings),
  );
  if (!recipeResult.success) {
    throw new Error("A konvertálási beállítások nem érvényesek.");
  }

  let manifest = await resetLazyOutput(
    collection.id,
    collection.itemCount,
    recipeResult.data.outputFormat,
  );
  let checkpoint: LazyOutputRecordV1[] = [];
  const worker = createImageWorker();
  const terminateOnAbort = () => worker.worker.terminate();
  signal.addEventListener("abort", terminateOnAbort, { once: true });

  const flush = async () => {
    if (checkpoint.length === 0) return;
    const chunkNumber = manifest.chunkCount + 1;
    await writeLazyOutputChunk(collection.id, chunkNumber, checkpoint);
    manifest = {
      ...manifest,
      chunkCount: chunkNumber,
      updatedAt: new Date().toISOString(),
    };
    checkpoint = [];
    await writeLazyOutputManifest(manifest);
  };

  try {
    for await (const entry of iterateLazyImageEntries(collection.source)) {
      if (signal.aborted) throw abortError();
      const file = await entry.open();
      const inputFormat = entry.trustedInputFormat
        ? entry.trustedInputFormat
        : await validateImageFile(file).then((validation) => {
            if (!validation.valid) {
              throw new Error(
                `${entry.fileName}: ${validation.error.message} ${validation.error.suggestion}`,
              );
            }
            return validation.format;
          });
      const buffer = await file.arrayBuffer();
      const result = await raceWithAbort(
        worker.api.processImage(
          transfer(
            {
              buffer,
              inputFormat,
              recipe: recipeResult.data,
            },
            [buffer],
          ),
          proxy((progress: ProcessProgress) =>
            onProgress({
              status: progress.status,
              completedCount: manifest.completedCount,
              totalCount: collection.itemCount,
              activeProgress: progress.value,
              outputBytes: manifest.totalBytes,
            }),
          ),
        ),
        signal,
      );
      if (signal.aborted) throw abortError();

      const blob = new Blob([result.buffer], { type: result.mimeType });
      const outputBaseName = `${entry.fileName.replace(/\.[^.]+$/u, "")}-morf`;
      const record: LazyOutputRecordV1 = {
        index: manifest.completedCount + 1,
        sourceKey: entry.key,
        sourceFileName: entry.fileName,
        fileName: createOutputFileNameFromBase(
          outputBaseName,
          recipeResult.data.outputFormat,
        ),
        byteSize: blob.size,
        format: recipeResult.data.outputFormat,
        mimeType: result.mimeType,
      };
      await writeLazyOutputFile(collection.id, record, blob);
      checkpoint.push(record);
      manifest = {
        ...manifest,
        completedCount: manifest.completedCount + 1,
        totalBytes: manifest.totalBytes + blob.size,
        updatedAt: new Date().toISOString(),
      };
      onProgress({
        status: "encoding",
        completedCount: manifest.completedCount,
        totalCount: collection.itemCount,
        activeProgress: 0,
        outputBytes: manifest.totalBytes,
      });
      if (checkpoint.length >= checkpointSize) await flush();
    }

    await flush();
    manifest = {
      ...manifest,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
    await writeLazyOutputManifest(manifest);
    return manifest;
  } catch (error) {
    await flush().catch(() => undefined);
    manifest = {
      ...manifest,
      status: signal.aborted ? "cancelled" : "error",
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: new Date().toISOString(),
    };
    await writeLazyOutputManifest(manifest).catch(() => undefined);
    if (signal.aborted) throw abortError();
    throw error;
  } finally {
    signal.removeEventListener("abort", terminateOnAbort);
    worker.worker.terminate();
  }
}
