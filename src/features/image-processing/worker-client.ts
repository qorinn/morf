import { wrap, type Remote } from "comlink";

import type { ProcessImageApi } from "@/features/image-processing/types";

export type ImageWorkerHandle = {
  worker: Worker;
  api: Remote<ProcessImageApi>;
};

export function createImageWorker(): ImageWorkerHandle {
  const worker = new Worker(
    new URL("../../workers/image.worker.ts", import.meta.url),
    {
      type: "module",
      name: "morf-image-worker",
    },
  );

  return { worker, api: wrap<ProcessImageApi>(worker) };
}
