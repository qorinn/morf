import { wrap, type Remote } from "comlink";

import type { VideoFrameWorkerApi } from "@/features/video-frames/types";

export type VideoFrameWorkerHandle = {
  worker: Worker;
  api: Remote<VideoFrameWorkerApi>;
};

export function createVideoFrameWorker(): VideoFrameWorkerHandle {
  const worker = new Worker(
    new URL("../../workers/video-frames.worker.ts", import.meta.url),
    {
      type: "module",
      name: "morf-video-frame-worker",
    },
  );

  return { worker, api: wrap<VideoFrameWorkerApi>(worker) };
}
