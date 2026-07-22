/// <reference lib="webworker" />

import { expose, transfer } from "comlink";

import { generateFaviconPackage } from "@/features/favicon-generator/engine";
import type { FaviconWorkerApi } from "@/features/favicon-generator/types";

const api: FaviconWorkerApi = {
  async generatePackage(request, onProgress) {
    const result = await generateFaviconPackage(request, onProgress);
    return transfer(result, [result.archiveBuffer]);
  },
};

expose(api);
