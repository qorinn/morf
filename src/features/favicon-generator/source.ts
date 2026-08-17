import { MAX_SOURCE_SIZE, MIN_SOURCE_DIMENSION } from "./config.ts";
import type { FaviconSource, SourceKind } from "./types.ts";
import type { FaviconMessages } from "@/i18n/favicon";

type SourceErrorCopy = FaviconMessages["sourceErrors"];

const rasterMimeTypes: Record<Exclude<SourceKind, "svg">, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export class FaviconSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaviconSourceError";
  }
}

export function sniffSourceKind(
  bytes: Uint8Array,
  textSample = "",
): SourceKind | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }

  const normalizedText = textSample.replace(/^\uFEFF/, "").trimStart();
  if (/^(?:<\?xml[\s\S]*?\?>\s*)?<svg(?:\s|>)/i.test(normalizedText)) {
    return "svg";
  }

  return null;
}

function isSameDocumentReference(value: string): boolean {
  return value.trim().startsWith("#");
}

function isEmbeddedRaster(value: string): boolean {
  return /^data:image\/(?:png|jpeg|webp);base64,/i.test(value.trim());
}

export function sanitizeSvgText(
  source: string,
  copy: SourceErrorCopy,
): string {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) {
    throw new FaviconSourceError(copy.svgForbiddenDoctype);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(source, "image/svg+xml");
  if (
    document.querySelector("parsererror") ||
    document.documentElement.localName !== "svg"
  ) {
    throw new FaviconSourceError(copy.svgInvalidStructure);
  }

  document
    .querySelectorAll(
      "script, foreignObject, iframe, object, embed, audio, video, canvas, link",
    )
    .forEach((element) => element.remove());

  document.querySelectorAll("style").forEach((element) => {
    const css = element.textContent || "";
    if (
      /@import|@font-face|expression\s*\(|javascript:|url\s*\(\s*['\"]?(?!#)/i.test(
        css,
      )
    ) {
      element.remove();
    }
  });

  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === "href" || name === "xlink:href" || name === "src") {
        const canKeep =
          isSameDocumentReference(value) ||
          (element.localName === "image" && isEmbeddedRaster(value));
        if (!canKeep) element.removeAttribute(attribute.name);
        continue;
      }

      if (/javascript:|vbscript:|data:text\/html/i.test(value)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (/url\s*\(\s*['\"]?(?!#)/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  const svg = document.documentElement;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(svg);
}

async function loadImage(
  url: string,
  copy: SourceErrorCopy,
): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  try {
    await image.decode();
  } catch {
    throw new FaviconSourceError(copy.decodeFailed);
  }
  return image;
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((value) =>
      Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"),
    )
    .join("")}`;
}

function analyzeImage(image: HTMLImageElement, copy: SourceErrorCopy) {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new FaviconSourceError(copy.canvasUnavailable);

  context.clearRect(0, 0, size, size);
  const ratio = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * ratio;
  const height = image.naturalHeight * ratio;
  context.drawImage(
    image,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );
  const pixels = context.getImageData(0, 0, size, size).data;
  const colors = new Map<
    string,
    { count: number; red: number; green: number; blue: number }
  >();
  let transparent = 0;
  let visible = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 245) transparent += 1;
    if (alpha < 24) continue;

    visible += 1;
    const red = Math.round(pixels[index] / 24) * 24;
    const green = Math.round(pixels[index + 1] / 24) * 24;
    const blue = Math.round(pixels[index + 2] / 24) * 24;
    const key = `${red}-${green}-${blue}`;
    const color = colors.get(key) || { count: 0, red, green, blue };
    color.count += alpha / 255;
    colors.set(key, color);
  }

  if (visible === 0) {
    throw new FaviconSourceError(copy.fullyTransparent);
  }

  const dominant = [...colors.values()].sort(
    (left, right) => right.count - left.count,
  )[0];
  return {
    hasTransparency: transparent > 0,
    transparentRatio: transparent / (size * size),
    dominantColor: dominant
      ? rgbToHex(dominant.red, dominant.green, dominant.blue)
      : "#ffffff",
  };
}

export async function validateFaviconSource(
  file: File,
  copy: SourceErrorCopy,
): Promise<FaviconSource> {
  if (file.size > MAX_SOURCE_SIZE) {
    throw new FaviconSourceError(copy.fileTooLarge);
  }

  const sampleBuffer = await file.slice(0, 4096).arrayBuffer();
  const sampleBytes = new Uint8Array(sampleBuffer);
  let textSample = "";
  try {
    textSample = new TextDecoder().decode(sampleBytes);
  } catch {
    // A bináris képeknél nem szükséges szövegminta.
  }

  const kind = sniffSourceKind(sampleBytes, textSample);
  if (!kind) {
    throw new FaviconSourceError(copy.unsupportedFormat);
  }

  let sanitizedSvg: string | undefined;
  let objectUrl: string;
  if (kind === "svg") {
    sanitizedSvg = sanitizeSvgText(await file.text(), copy);
    objectUrl = URL.createObjectURL(
      new Blob([sanitizedSvg], { type: "image/svg+xml" }),
    );
  } else {
    objectUrl = URL.createObjectURL(
      new Blob([file], { type: rasterMimeTypes[kind] }),
    );
  }

  try {
    const image = await loadImage(objectUrl, copy);
    if (
      image.naturalWidth < MIN_SOURCE_DIMENSION ||
      image.naturalHeight < MIN_SOURCE_DIMENSION
    ) {
      throw new FaviconSourceError(copy.tooSmall);
    }
    const analysis = analyzeImage(image, copy);

    return {
      file,
      kind,
      width: image.naturalWidth,
      height: image.naturalHeight,
      sanitizedSvg,
      objectUrl,
      ...analysis,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export { loadImage };
