/// <reference lib="webworker" />

import { expose, transfer } from "comlink";

import { calculateContainedDimensions } from "@/features/image-processing/dimensions";
import type {
  ImageFormat,
  InputImageFormat,
  ProcessImageApi,
  ProcessImageRequest,
  ProcessImageResult,
  ProcessProgress,
} from "@/features/image-processing/types";

type Decoder = (buffer: ArrayBuffer) => Promise<ImageData>;
type Encoder = (image: ImageData, quality: number) => Promise<ArrayBuffer>;

const mimeTypes: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

const extensions: Record<ImageFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

async function loadDecoder(format: InputImageFormat): Promise<Decoder> {
  switch (format) {
    case "jpeg": {
      const { decode } = await import("@jsquash/jpeg");
      return (buffer) => decode(buffer, { preserveOrientation: true });
    }
    case "png": {
      const { decode } = await import("@jsquash/png");
      return decode;
    }
    case "webp": {
      const { decode } = await import("@jsquash/webp");
      return decode;
    }
    case "avif": {
      const { decode } = await import("@jsquash/avif");
      return async (buffer) => {
        const image = await decode(buffer);
        if (!image) throw new Error("AVIF decode failed.");
        return image;
      };
    }
    case "heic": {
      const { default: decodeHeic } = await import("heic-decode");
      return async (buffer) => {
        const image = await decodeHeic({ buffer: new Uint8Array(buffer) });
        return {
          data: image.data,
          width: image.width,
          height: image.height,
          colorSpace: "srgb",
        } as ImageData;
      };
    }
  }
}

async function loadEncoder(format: ImageFormat): Promise<Encoder> {
  switch (format) {
    case "jpeg": {
      const { encode } = await import("@jsquash/jpeg");
      return (image, quality) => encode(image, { quality });
    }
    case "png": {
      const { encode } = await import("@jsquash/png");
      return (image) => encode(image);
    }
    case "webp": {
      const { encode } = await import("@jsquash/webp");
      return (image, quality) => encode(image, { quality });
    }
    case "avif": {
      const { encode } = await import("@jsquash/avif");
      return (image, quality) =>
        encode(image, {
          quality,
          qualityAlpha: quality,
          speed: 6,
        });
    }
  }
}

function report(
  onProgress: (progress: ProcessProgress) => void,
  status: ProcessProgress["status"],
  value: number,
) {
  onProgress({ status, value });
}

function compositeTransparencyOnWhite(image: ImageData): ImageData {
  const pixels = image.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha === 1) continue;

    pixels[index] = Math.round(pixels[index] * alpha + 255 * (1 - alpha));
    pixels[index + 1] = Math.round(
      pixels[index + 1] * alpha + 255 * (1 - alpha),
    );
    pixels[index + 2] = Math.round(
      pixels[index + 2] * alpha + 255 * (1 - alpha),
    );
    pixels[index + 3] = 255;
  }

  return image;
}

const api: ProcessImageApi = {
  async processImage(
    request: ProcessImageRequest,
    onProgress: (progress: ProcessProgress) => void,
  ): Promise<ProcessImageResult> {
    report(onProgress, "loading-engine", 8);
    const decoder = await loadDecoder(request.inputFormat);

    report(onProgress, "decoding", 25);
    let image = await decoder(request.buffer);
    const originalWidth = image.width;
    const originalHeight = image.height;

    const target = calculateContainedDimensions(
      image.width,
      image.height,
      request.recipe.resize.maxWidth,
      request.recipe.resize.maxHeight,
    );

    if (target.width !== image.width || target.height !== image.height) {
      report(onProgress, "processing", 48);
      const { default: resize } = await import("@jsquash/resize");
      image = await resize(image, {
        width: target.width,
        height: target.height,
        method: "lanczos3",
        fitMethod: "contain",
        premultiply: true,
        linearRGB: true,
      });
    } else {
      report(onProgress, "processing", 58);
    }

    report(onProgress, "loading-engine", 68);
    const encoder = await loadEncoder(request.recipe.outputFormat);

    if (request.recipe.outputFormat === "jpeg") {
      image = compositeTransparencyOnWhite(image);
    }

    report(onProgress, "encoding", 78);
    const buffer = await encoder(image, request.recipe.quality);
    report(onProgress, "encoding", 100);

    return transfer(
      {
        buffer,
        originalWidth,
        originalHeight,
        width: image.width,
        height: image.height,
        mimeType: mimeTypes[request.recipe.outputFormat],
        extension: extensions[request.recipe.outputFormat],
      },
      [buffer],
    );
  },
};

expose(api);
