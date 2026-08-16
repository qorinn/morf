import { transfer, wrap, type Remote } from "comlink";

import type {
  VideoSpeedExportRequest,
  VideoSpeedWorkerApi,
} from "./types";

export type VideoSpeedWorkerHandle = {
  worker: Worker;
  api: Remote<VideoSpeedWorkerApi>;
};

export function createVideoSpeedWorker(): VideoSpeedWorkerHandle {
  const worker = new Worker(
    new URL("../../workers/video-speed.worker.ts", import.meta.url),
    { type: "module", name: "morf-video-speed-worker" },
  );
  return { worker, api: wrap<VideoSpeedWorkerApi>(worker) };
}

export function transferableExportRequest(
  request: VideoSpeedExportRequest,
): VideoSpeedExportRequest {
  const transferables = request.audio?.channels ?? [];
  return transfer(request, transferables) as VideoSpeedExportRequest;
}
