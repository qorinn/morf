import { z } from "zod";

export const imageRecipeSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  outputFormat: z.enum(["jpeg", "png", "webp", "avif"]),
  resize: z.object({
    maxWidth: z.number().int().positive().max(12_000).optional(),
    maxHeight: z.number().int().positive().max(12_000).optional(),
    keepAspectRatio: z.literal(true),
  }),
  quality: z.number().int().min(1).max(100),
  maxFileSizeBytes: z.number().int().positive().nullable(),
  lossless: z.boolean(),
  stripMetadata: z.literal(true),
});

export type ImageRecipe = z.infer<typeof imageRecipeSchema>;

export const presetIds = [
  "website",
  "webshop",
  "social",
  "email",
  "custom",
] as const;

export type PresetId = (typeof presetIds)[number];

export type ImagePreset = {
  id: PresetId;
  description: string;
  recipe: ImageRecipe;
};

const rawPresets: ImagePreset[] = [
  {
    id: "website",
    description: "WebP kimenet, webes megjelenítéshez igazított méret.",
    recipe: {
      schemaVersion: 1,
      name: "Weboldalhoz",
      outputFormat: "webp",
      resize: { maxWidth: 1920, maxHeight: 1920, keepAspectRatio: true },
      quality: 80,
      maxFileSizeBytes: null,
      lossless: false,
      stripMetadata: true,
    },
  },
  {
    id: "webshop",
    description: "Részletgazdag, egységes méretű termékképekhez.",
    recipe: {
      schemaVersion: 1,
      name: "Webshop termékképhez",
      outputFormat: "webp",
      resize: { maxWidth: 1600, maxHeight: 1600, keepAspectRatio: true },
      quality: 85,
      maxFileSizeBytes: null,
      lossless: false,
      stripMetadata: true,
    },
  },
  {
    id: "social",
    description: "Nagy felbontású, széles körben kompatibilis közösségi kép.",
    recipe: {
      schemaVersion: 1,
      name: "Közösségi médiához",
      outputFormat: "jpeg",
      resize: { maxWidth: 1920, maxHeight: 1920, keepAspectRatio: true },
      quality: 85,
      maxFileSizeBytes: null,
      lossless: false,
      stripMetadata: true,
    },
  },
  {
    id: "email",
    description: "Kisebb, könnyebben továbbítható JPEG melléklet.",
    recipe: {
      schemaVersion: 1,
      name: "E-mail melléklethez",
      outputFormat: "jpeg",
      resize: { maxWidth: 1600, maxHeight: 1600, keepAspectRatio: true },
      quality: 75,
      maxFileSizeBytes: null,
      lossless: false,
      stripMetadata: true,
    },
  },
  {
    id: "custom",
    description: "Saját formátum-, méret- és minőségbeállítás.",
    recipe: {
      schemaVersion: 1,
      name: "Egyedi beállítás",
      outputFormat: "webp",
      resize: { maxWidth: 1920, maxHeight: 1920, keepAspectRatio: true },
      quality: 80,
      maxFileSizeBytes: null,
      lossless: false,
      stripMetadata: true,
    },
  },
];

export const imagePresets = rawPresets.map((preset) => ({
  ...preset,
  recipe: imageRecipeSchema.parse(preset.recipe),
}));

export function getImagePreset(id: PresetId): ImagePreset {
  const preset = imagePresets.find((candidate) => candidate.id === id);

  if (!preset) {
    throw new Error(`Ismeretlen képpreset: ${id}`);
  }

  return preset;
}
