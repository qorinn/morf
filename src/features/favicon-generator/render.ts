import { MASTER_SIZE } from "./config.ts";
import type { FaviconEditorSettings, RasterPayload } from "./types.ts";

type DrawableSource = HTMLImageElement | HTMLCanvasElement;

function sourceSize(source: DrawableSource) {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

export function calculateCornerRadius(
  size: number,
  normalizedRadius: number,
): number {
  return Math.max(0, Math.min(1, normalizedRadius)) * (size / 2);
}

export function calculatePaddedSize(size: number, padding: number): number {
  const normalizedPadding = Math.max(0, Math.min(0.4, padding));
  return size * (1 - normalizedPadding * 2);
}

export function resolveEditorBackground(
  settings: FaviconEditorSettings,
): string | null {
  switch (settings.backgroundMode) {
    case "transparent":
      return null;
    case "dominant":
      return settings.dominantColor;
    case "white":
      return "#ffffff";
    case "black":
      return "#000000";
    case "custom":
      return settings.backgroundColor;
  }
}

export function resolveWebAppBackground(
  settings: FaviconEditorSettings,
): string | null {
  const normalizedDominantColor = /^#[0-9a-f]{6}$/i.test(settings.dominantColor)
    ? settings.dominantColor.toLowerCase()
    : "#ffffff";

  switch (settings.backgroundMode) {
    case "transparent":
      return null;
    case "white":
      return "#ffffff";
    case "black":
      return "#000000";
    case "dominant":
      return normalizedDominantColor;
    case "custom":
      return /^#[0-9a-f]{6}$/i.test(settings.backgroundColor)
        ? settings.backgroundColor.toLowerCase()
        : normalizedDominantColor;
  }
}

export function renderMasterCanvas({
  source,
  settings,
  padding,
  backgroundColor,
  forceOpaque = false,
  size = MASTER_SIZE,
}: {
  source: DrawableSource;
  settings: FaviconEditorSettings;
  padding: number;
  backgroundColor: string | null;
  forceOpaque?: boolean;
  size?: number;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { alpha: !forceOpaque });
  if (!context) throw new Error("A böngésző nem tud munkavásznat létrehozni.");

  const fallbackBackground = forceOpaque
    ? backgroundColor || "#ffffff"
    : backgroundColor;
  context.clearRect(0, 0, size, size);
  if (forceOpaque && fallbackBackground) {
    context.fillStyle = fallbackBackground;
    context.fillRect(0, 0, size, size);
  }

  const radius = calculateCornerRadius(size, settings.borderRadius);
  if (radius > 0) {
    roundedRect(context, 0, 0, size, size, radius);
    context.clip();
  }

  if (!forceOpaque && fallbackBackground) {
    context.fillStyle = fallbackBackground;
    context.fillRect(0, 0, size, size);
  }

  const available = calculatePaddedSize(size, padding);
  const sourceDimensions = sourceSize(source);
  const drawScale = Math.min(
    available / sourceDimensions.width,
    available / sourceDimensions.height,
  );
  const drawWidth = sourceDimensions.width * drawScale;
  const drawHeight = sourceDimensions.height * drawScale;

  context.save();
  context.translate(size / 2, size / 2);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    source,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();
  return canvas;
}

export function canvasToRasterPayload(
  canvas: HTMLCanvasElement,
): RasterPayload {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("A munkavászon nem olvasható.");
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    buffer: image.data.buffer,
    width: image.width,
    height: image.height,
  };
}

export function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Az előnézetet nem sikerült létrehozni."));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}
