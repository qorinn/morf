export const MASTER_SIZE = 1024;
export const MAX_SOURCE_SIZE = 20 * 1024 * 1024;
export const MIN_SOURCE_DIMENSION = 64;
export const RECOMMENDED_SOURCE_DIMENSION = 512;

export const STANDARD_PNG_TARGETS = [
  { filename: "favicon-16x16.png", width: 16, height: 16 },
  { filename: "favicon-32x32.png", width: 32, height: 32 },
  { filename: "favicon-48x48.png", width: 48, height: 48 },
] as const;

export const APPLE_TARGET = {
  filename: "apple-touch-icon.png",
  width: 180,
  height: 180,
} as const;

export const PWA_TARGETS = [
  {
    filename: "web-app-manifest-192x192.png",
    width: 192,
    height: 192,
    purpose: "any",
  },
  {
    filename: "web-app-manifest-512x512.png",
    width: 512,
    height: 512,
    purpose: "any",
  },
] as const;

export const MASKABLE_TARGETS = [
  {
    filename: "web-app-manifest-192x192-maskable.png",
    width: 192,
    height: 192,
    purpose: "maskable",
  },
  {
    filename: "web-app-manifest-512x512-maskable.png",
    width: 512,
    height: 512,
    purpose: "maskable",
  },
] as const;

export const ICO_SIZES = [16, 32, 48] as const;
