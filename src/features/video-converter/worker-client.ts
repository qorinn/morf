import { transfer, wrap, type Remote } from "comlink";

import type { VideoConverterRequest, VideoConverterWorkerApi } from "./types";

export type VideoConverterWorkerHandle = {
  worker: Worker;
  api: Remote<VideoConverterWorkerApi>;
};

export function createVideoConverterWorker(): VideoConverterWorkerHandle {
  const worker = new Worker(
    new URL("../../workers/video-converter.worker.ts", import.meta.url),
    { type: "module", name: "morf-video-converter-worker" },
  );
  return { worker, api: wrap<VideoConverterWorkerApi>(worker) };
}

export function transferableVideoConverterRequest(request: VideoConverterRequest): VideoConverterRequest {
  return transfer(request, []) as VideoConverterRequest;
}
