import { wrap, type Remote } from "comlink";

import type { FaviconWorkerApi } from "@/features/favicon-generator/types";

export interface FaviconWorkerHandle {
  worker: Worker;
  api: Remote<FaviconWorkerApi>;
}

export function createFaviconWorker(): FaviconWorkerHandle {
  const worker = new Worker(
    new URL("../../workers/favicon.worker.ts", import.meta.url),
    {
      type: "module",
      name: "morf-favicon-worker",
    },
  );

  return { worker, api: wrap<FaviconWorkerApi>(worker) };
}
