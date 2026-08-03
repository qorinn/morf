/// <reference lib="webworker" />

import { expose } from "comlink";
import {
  BlobSource,
  Input,
  MP4,
  QTFF,
  VideoSampleSink,
  WEBM,
} from "mediabunny";

import {
  frameFileName,
  shouldSelectFrame,
} from "@/features/video-frames/sampling";
import { isStorageNearLimit } from "@/features/video-frames/storage-capacity";
import {
  readFrameSetManifest,
  writeFrameBlob,
  writeFrameChunk,
  writeFrameSetManifest,
} from "@/features/video-frames/storage";
import {
  frameCheckpointSeconds,
  frameSetSchemaVersion,
  type ExtractFramesRequest,
  type ExtractFramesResult,
  type FrameChunkIndexV1,
  type FrameExtractionProgress,
  type FrameRecordV1,
  type FrameSetManifestV1,
  type InspectVideoResult,
  type VideoFrameMetadata,
  type VideoFrameWorkerApi,
} from "@/features/video-frames/types";

const supportedFormats = [MP4, QTFF, WEBM];
const timestampEpsilon = 1e-7;

let pauseRequested = false;
let cancelRequested = false;

function createInput(file: File) {
  return new Input({
    formats: supportedFormats,
    source: new BlobSource(file, {
      maxCacheSize: 8 * 1024 * 1024,
      useStreamReader: true,
    }),
  });
}

async function inspectVideo(file: File): Promise<InspectVideoResult> {
  if (!/\.(mp4|m4v|mov|webm)$/i.test(file.name)) {
    return {
      valid: false,
      message: "Ez a fájltípus nem támogatott.",
      suggestion: "Válassz MP4, MOV vagy WebM videót.",
    };
  }

  const input = createInput(file);
  try {
    if (!(await input.canRead())) {
      return {
        valid: false,
        message: "A videó konténere nem olvasható.",
        suggestion: "Próbálj szabványos MP4, MOV vagy WebM fájlt.",
      };
    }

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      return {
        valid: false,
        message: "A fájl nem tartalmaz videósávot.",
        suggestion: "Válassz képet is tartalmazó videófájlt.",
      };
    }

    const canDecode = await videoTrack.canDecode();
    if (!canDecode) {
      const codec = await videoTrack.getCodec();
      return {
        valid: false,
        message: `A böngésződ nem tudja dekódolni ezt a videokodeket${codec ? ` (${codec})` : ""}.`,
        suggestion:
          "Próbáld meg egy másik modern böngészőben, vagy használj H.264-es MP4 vagy VP9-es WebM videót.",
      };
    }

    const [duration, firstTimestamp, width, height, rotation, codec, stats] =
      await Promise.all([
        videoTrack.computeDuration(),
        videoTrack.getFirstTimestamp(),
        videoTrack.getDisplayWidth(),
        videoTrack.getDisplayHeight(),
        videoTrack.getRotation(),
        videoTrack.getCodec(),
        videoTrack.computePacketStats(500),
      ]);
    const sourceFps =
      Number.isFinite(stats.averagePacketRate) && stats.averagePacketRate > 0
        ? stats.averagePacketRate
        : 30;
    const visibleDuration = Math.max(0, duration - Math.max(0, firstTimestamp));

    const metadata: VideoFrameMetadata = {
      fileName: file.name,
      fileSize: file.size,
      duration,
      firstTimestamp: Math.max(0, firstTimestamp),
      width,
      height,
      rotation,
      sourceFps,
      approximateFrameCount: Math.max(
        1,
        Math.round(visibleDuration * sourceFps),
      ),
      codec: codec ?? "ismeretlen",
    };

    return { valid: true, metadata };
  } catch (error) {
    return {
      valid: false,
      message: "A videó metaadatait nem sikerült beolvasni.",
      suggestion:
        error instanceof Error
          ? error.message
          : "Próbáld újra egy sértetlen MP4, MOV vagy WebM fájllal.",
    };
  } finally {
    input.dispose();
  }
}

async function getStorageRemaining(): Promise<number | undefined> {
  try {
    const estimate = await navigator.storage.estimate();
    if (estimate.quota === undefined || estimate.usage === undefined) {
      return undefined;
    }
    return Math.max(0, estimate.quota - estimate.usage);
  } catch {
    return undefined;
  }
}

function createManifest(request: ExtractFramesRequest): FrameSetManifestV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: frameSetSchemaVersion,
    id: request.frameSetId,
    sourceName: request.file.name,
    sourceSize: request.file.size,
    createdAt: now,
    updatedAt: now,
    status: "extracting",
    metadata: request.metadata,
    rangeStart: request.rangeStart,
    rangeEnd: request.rangeEnd,
    extractionFps: request.extractionFps,
    selectionFps: request.extractionFps,
    frameCount: 0,
    totalBytes: 0,
    chunkCount: 0,
    lastTimestamp: null,
    lastSelectedTimestamp: null,
  };
}

async function extractFrames(
  request: ExtractFramesRequest,
  onProgress: (progress: FrameExtractionProgress) => void,
): Promise<ExtractFramesResult> {
  pauseRequested = false;
  cancelRequested = false;

  let manifest = request.resume
    ? await readFrameSetManifest(request.frameSetId)
    : createManifest(request);
  manifest = {
    ...manifest,
    status: "extracting",
    updatedAt: new Date().toISOString(),
    errorMessage: undefined,
  };
  await writeFrameSetManifest(manifest);

  const input = createInput(request.file);
  let currentDecodedTimestamp =
    manifest.lastTimestamp ?? Math.max(request.rangeStart, 0);
  let currentChunkStart = currentDecodedTimestamp;
  let currentChunkFrames: FrameRecordV1[] = [];
  let lastWrittenFrameSize = 0;
  let canvas: OffscreenCanvas | undefined;
  let context: OffscreenCanvasRenderingContext2D | null = null;

  const report = (
    status: FrameExtractionProgress["status"],
    storageRemaining?: number,
    reason?: FrameExtractionProgress["reason"],
  ) => {
    onProgress({
      status,
      currentTimestamp: currentDecodedTimestamp,
      rangeStart: request.rangeStart,
      rangeEnd: request.rangeEnd,
      frameCount: manifest.frameCount,
      totalBytes: manifest.totalBytes,
      storageRemaining,
      reason,
    });
  };

  const flushCheckpoint = async () => {
    if (currentChunkFrames.length > 0) {
      const chunkNumber = manifest.chunkCount + 1;
      const chunk: FrameChunkIndexV1 = {
        schemaVersion: frameSetSchemaVersion,
        frameSetId: manifest.id,
        chunkNumber,
        startTimestamp: currentChunkStart,
        endTimestamp: currentDecodedTimestamp,
        frames: currentChunkFrames,
      };
      await writeFrameChunk(chunk);
      manifest.chunkCount = chunkNumber;
      currentChunkFrames = [];
    }

    manifest.lastTimestamp = currentDecodedTimestamp;
    manifest.updatedAt = new Date().toISOString();
    await writeFrameSetManifest(manifest);
    currentChunkStart = currentDecodedTimestamp;
  };

  try {
    report("preparing");
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) {
      throw new Error("A videósáv ebben a böngészőben nem dekódolható.");
    }

    const initialStorageRemaining = await getStorageRemaining();
    if (isStorageNearLimit(initialStorageRemaining, 0)) {
      manifest.status = "paused";
      manifest.updatedAt = new Date().toISOString();
      await writeFrameSetManifest(manifest);
      report("paused", initialStorageRemaining, "storage");
      return { manifest, reason: "storage" };
    }
    report("decoding", initialStorageRemaining);

    const sink = new VideoSampleSink(videoTrack);
    const resumeAfter = manifest.lastTimestamp;
    const iteratorStart =
      resumeAfter === null
        ? request.rangeStart
        : Math.max(request.rangeStart, resumeAfter);

    for await (const sample of sink.samples(iteratorStart, request.rangeEnd)) {
      try {
        if (
          resumeAfter !== null &&
          sample.timestamp <= resumeAfter + timestampEpsilon
        ) {
          continue;
        }

        currentDecodedTimestamp = sample.timestamp;

        const shouldExport = shouldSelectFrame(
          sample.timestamp,
          manifest.lastSelectedTimestamp,
          request.extractionFps,
        );

        if (shouldExport) {
          report("decoding");
          if (
            !canvas ||
            canvas.width !== sample.displayWidth ||
            canvas.height !== sample.displayHeight
          ) {
            canvas = new OffscreenCanvas(
              sample.displayWidth,
              sample.displayHeight,
            );
            context = canvas.getContext("2d", { alpha: true });
          }
          if (!canvas || !context) {
            throw new Error("A böngésző nem tud rajzvásznat létrehozni.");
          }

          context.clearRect(0, 0, canvas.width, canvas.height);
          sample.draw(context, 0, 0, canvas.width, canvas.height);
          const blob = await canvas.convertToBlob({ type: "image/png" });
          const nextIndex = manifest.frameCount + 1;
          const fileName = frameFileName(request.file.name, nextIndex);

          report("writing");
          await writeFrameBlob(manifest.id, fileName, blob);
          currentChunkFrames.push({
            index: nextIndex,
            timestamp: sample.timestamp,
            duration: sample.duration,
            fileName,
            byteSize: blob.size,
          });
          manifest.frameCount = nextIndex;
          manifest.totalBytes += blob.size;
          manifest.lastSelectedTimestamp = sample.timestamp;
          lastWrittenFrameSize = blob.size;
        }

        const reachedCheckpoint =
          currentDecodedTimestamp - currentChunkStart >= frameCheckpointSeconds;
        if (reachedCheckpoint || pauseRequested || cancelRequested) {
          await flushCheckpoint();
          const storageRemaining = await getStorageRemaining();

          if (cancelRequested) {
            manifest.status = "cancelled";
            manifest.updatedAt = new Date().toISOString();
            await writeFrameSetManifest(manifest);
            return { manifest, reason: "cancelled" };
          }

          if (isStorageNearLimit(storageRemaining, lastWrittenFrameSize)) {
            manifest.status = "paused";
            manifest.updatedAt = new Date().toISOString();
            await writeFrameSetManifest(manifest);
            report("paused", storageRemaining, "storage");
            return { manifest, reason: "storage" };
          }

          if (pauseRequested) {
            manifest.status = "paused";
            manifest.updatedAt = new Date().toISOString();
            await writeFrameSetManifest(manifest);
            report("paused", storageRemaining, "user");
            return { manifest, reason: "paused" };
          }

          report("decoding", storageRemaining);
        }
      } finally {
        sample.close();
      }
    }

    await flushCheckpoint();
    manifest.status = "ready";
    manifest.updatedAt = new Date().toISOString();
    await writeFrameSetManifest(manifest);
    report("completed", await getStorageRemaining());
    return { manifest, reason: "completed" };
  } catch (error) {
    manifest.status = "error";
    manifest.errorMessage =
      error instanceof Error ? error.message : String(error);
    manifest.updatedAt = new Date().toISOString();
    await writeFrameSetManifest(manifest);
    throw error;
  } finally {
    input.dispose();
  }
}

const api: VideoFrameWorkerApi = {
  inspectVideo,
  extractFrames,
  pause() {
    pauseRequested = true;
  },
  cancel() {
    cancelRequested = true;
  },
};

expose(api);
