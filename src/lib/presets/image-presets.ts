import { z } from "zod";
import { imageConverterMessages } from "../../i18n/image-converter.ts";

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
  "general",
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
    id: "general",
    description: imageConverterMessages.hu.presets.general.description,
    recipe: {
      schemaVersion: 1,
      name: imageConverterMessages.hu.presets.general.name,
      outputFormat: "webp",
      resize: { maxWidth: 1920, maxHeight: 1920, keepAspectRatio: true },
      quality: 100,
      maxFileSizeBytes: null,
      lossless: true,
      stripMetadata: true,
    },
  },
  {
    id: "website",
    description: imageConverterMessages.hu.presets.website.description,
    recipe: {
      schemaVersion: 1,
      name: imageConverterMessages.hu.presets.website.name,
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
    description: imageConverterMessages.hu.presets.webshop.description,
    recipe: {
      schemaVersion: 1,
      name: imageConverterMessages.hu.presets.webshop.name,
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
    description: imageConverterMessages.hu.presets.social.description,
    recipe: {
      schemaVersion: 1,
      name: imageConverterMessages.hu.presets.social.name,
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
    description: imageConverterMessages.hu.presets.email.description,
    recipe: {
      schemaVersion: 1,
      name: imageConverterMessages.hu.presets.email.name,
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
    description: imageConverterMessages.hu.presets.custom.description,
    recipe: {
      schemaVersion: 1,
      name: imageConverterMessages.hu.presets.custom.name,
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
