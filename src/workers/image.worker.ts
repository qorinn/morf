/// <reference lib="webworker" />

import { expose, transfer } from "comlink";

import { calculateContainedDimensions } from "@/features/image-processing/dimensions";
import { encodeAtHighestQualityUnderLimit } from "@/features/image-processing/target-size";
import type {
  ImageFormat,
  InputImageFormat,
  ProcessImageApi,
  ProcessImageRequest,
  ProcessImageResult,
  ProcessProgress,
} from "@/features/image-processing/types";

type Decoder = (buffer: ArrayBuffer) => Promise<ImageData>;
type EncoderOptions = {
  quality: number;
  lossless: boolean;
  mode: "normal" | "target" | "lossless";
};
type Encoder = (
  image: ImageData,
  options: EncoderOptions,
) => Promise<ArrayBuffer>;

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
      return (image, options) =>
        encode(image, {
          quality: options.quality,
          chroma_quality: options.quality,
        });
    }
    case "png": {
      const { encode } = await import("@jsquash/png");
      return (image) => encode(image);
    }
    case "webp": {
      const { encode } = await import("@jsquash/webp");
      return (image, options) =>
        encode(image, {
          quality: options.quality,
          lossless: options.lossless ? 1 : 0,
          exact: options.lossless ? 1 : 0,
          method: options.mode === "target" ? 3 : 4,
        });
    }
    case "avif": {
      const { encode } = await import("@jsquash/avif");
      return (image, options) =>
        encode(image, {
          quality: options.quality,
          qualityAlpha: options.quality,
          lossless: options.lossless,
          speed: options.mode === "target" ? 8 : 6,
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

async function resizeImage(
  image: ImageData,
  width: number,
  height: number,
): Promise<ImageData> {
  const { default: resize } = await import("@jsquash/resize");
  return resize(image, {
    width,
    height,
    method: "lanczos3",
    fitMethod: "contain",
    premultiply: true,
    linearRGB: true,
  });
}

function getSmallerDimensions(
  image: ImageData,
  encodedBytes: number,
  maxBytes: number,
): { width: number; height: number } {
  const estimatedScale = Math.sqrt(maxBytes / Math.max(1, encodedBytes)) * 0.96;
  const scale = Math.min(0.9, Math.max(0.1, estimatedScale));
  let width = Math.max(1, Math.floor(image.width * scale));
  let height = Math.max(1, Math.floor(image.height * scale));

  if (width === image.width && width > 1) width -= 1;
  if (height === image.height && height > 1) height -= 1;

  return { width, height };
}

async function encodeUnderTargetSize(
  initialImage: ImageData,
  format: ImageFormat,
  encoder: Encoder,
  maxBytes: number,
  onProgress: (progress: ProcessProgress) => void,
): Promise<{ buffer: ArrayBuffer; image: ImageData }> {
  let image = initialImage;
  let attempt = 0;

  while (true) {
    attempt += 1;
    report(
      onProgress,
      "encoding",
      Math.min(98, 72 + Math.round(Math.min(attempt, 13) * 2)),
    );

    if (format === "png") {
      const buffer = await encoder(image, {
        quality: 100,
        lossless: true,
        mode: "target",
      });
      if (buffer.byteLength <= maxBytes) return { buffer, image };

      if (image.width === 1 && image.height === 1) {
        throw new Error("TARGET_SIZE_UNREACHABLE");
      }

      const target = getSmallerDimensions(image, buffer.byteLength, maxBytes);
      image = await resizeImage(image, target.width, target.height);
      continue;
    }

    let minimumQualityBuffer: ArrayBuffer | undefined;
    const candidate = await encodeAtHighestQualityUnderLimit(
      async (quality) => {
        const buffer = await encoder(image, {
          quality,
          lossless: false,
          mode: "target",
        });
        if (quality === 1) minimumQualityBuffer = buffer;
        return buffer;
      },
      maxBytes,
    );
    if (candidate) return { buffer: candidate.buffer, image };

    if (image.width === 1 && image.height === 1) {
      throw new Error("TARGET_SIZE_UNREACHABLE");
    }

    minimumQualityBuffer ??= await encoder(image, {
      quality: 1,
      lossless: false,
      mode: "target",
    });
    const target = getSmallerDimensions(
      image,
      minimumQualityBuffer.byteLength,
      maxBytes,
    );
    image = await resizeImage(image, target.width, target.height);
  }
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
    const { outputFormat, lossless, maxFileSizeBytes } = request.recipe;

    const canReturnOriginal =
      request.inputFormat === outputFormat &&
      (lossless ||
        (maxFileSizeBytes !== null &&
          request.buffer.byteLength <= maxFileSizeBytes));

    if (canReturnOriginal) {
      report(onProgress, "encoding", 100);
      return transfer(
        {
          buffer: request.buffer,
          originalWidth,
          originalHeight,
          width: originalWidth,
          height: originalHeight,
          mimeType: mimeTypes[outputFormat],
          extension: extensions[outputFormat],
        },
        [request.buffer],
      );
    }

    const target = lossless
      ? { width: image.width, height: image.height }
      : calculateContainedDimensions(
          image.width,
          image.height,
          request.recipe.resize.maxWidth,
          request.recipe.resize.maxHeight,
        );

    if (target.width !== image.width || target.height !== image.height) {
      report(onProgress, "processing", 48);
      image = await resizeImage(image, target.width, target.height);
    } else {
      report(onProgress, "processing", 58);
    }

    report(onProgress, "loading-engine", 68);
    const encoder = await loadEncoder(outputFormat);

    if (outputFormat === "jpeg") {
      image = compositeTransparencyOnWhite(image);
    }

    report(onProgress, "encoding", 78);
    let buffer: ArrayBuffer;

    if (lossless) {
      buffer = await encoder(image, {
        quality: 100,
        lossless: true,
        mode: "lossless",
      });
    } else if (maxFileSizeBytes !== null) {
      const result = await encodeUnderTargetSize(
        image,
        outputFormat,
        encoder,
        maxFileSizeBytes,
        onProgress,
      );
      buffer = result.buffer;
      image = result.image;
    } else {
      buffer = await encoder(image, {
        quality: request.recipe.quality,
        lossless: outputFormat === "png",
        mode: "normal",
      });
    }
    report(onProgress, "encoding", 100);

    return transfer(
      {
        buffer,
        originalWidth,
        originalHeight,
        width: image.width,
        height: image.height,
        mimeType: mimeTypes[outputFormat],
        extension: extensions[outputFormat],
      },
      [buffer],
    );
  },
};

expose(api);
