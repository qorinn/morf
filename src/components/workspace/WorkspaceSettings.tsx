import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ImageFormat } from "@/features/image-processing/types";
import { imagePresets, type PresetId } from "@/lib/presets/image-presets";
import { useWorkspaceStore } from "@/stores/workspace-store";

type WorkspaceSettingsProps = {
  disabled: boolean;
};

const presetItems = imagePresets.map((preset) => ({
  label: preset.recipe.name,
  value: preset.id,
}));

const outputFormats: Array<{ value: ImageFormat; label: string }> = [
  { value: "jpeg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
];

function clampNumber(value: string, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function WorkspaceSettings({ disabled }: WorkspaceSettingsProps) {
  const settings = useWorkspaceStore((state) => state.settings);
  const applyPreset = useWorkspaceStore((state) => state.applyPreset);
  const updateSettings = useWorkspaceStore((state) => state.updateSettings);
  const activePreset = imagePresets.find(
    (preset) => preset.id === settings.presetId,
  );
  const qualityDisabled = settings.outputFormat === "png";

  return (
    <FieldGroup>
      <Field data-disabled={disabled || undefined}>
        <FieldLabel htmlFor="morf-preset">Felhasználási cél</FieldLabel>
        <Select
          items={presetItems}
          value={settings.presetId}
          disabled={disabled}
          onValueChange={(value) => value && applyPreset(value as PresetId)}
        >
          <SelectTrigger id="morf-preset" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {presetItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>{activePreset?.description}</FieldDescription>
      </Field>

      <Field data-disabled={disabled || undefined}>
        <FieldLabel id="output-format-label">Kimeneti formátum</FieldLabel>
        <ToggleGroup
          aria-labelledby="output-format-label"
          value={[settings.outputFormat]}
          variant="outline"
          disabled={disabled}
          onValueChange={(values) => {
            const value = values[0] as ImageFormat | undefined;
            if (value) updateSettings({ outputFormat: value });
          }}
        >
          {outputFormats.map((format) => (
            <ToggleGroupItem key={format.value} value={format.value}>
              {format.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-disabled={disabled || undefined}>
          <FieldLabel htmlFor="max-width">Max. szélesség</FieldLabel>
          <Input
            id="max-width"
            type="number"
            inputMode="numeric"
            min={1}
            max={12000}
            value={settings.maxWidth}
            disabled={disabled}
            onChange={(event) =>
              updateSettings({
                maxWidth: clampNumber(event.target.value, 1, 12_000),
              })
            }
          />
        </Field>
        <Field data-disabled={disabled || undefined}>
          <FieldLabel htmlFor="max-height">Max. magasság</FieldLabel>
          <Input
            id="max-height"
            type="number"
            inputMode="numeric"
            min={1}
            max={12000}
            value={settings.maxHeight}
            disabled={disabled}
            onChange={(event) =>
              updateSettings({
                maxHeight: clampNumber(event.target.value, 1, 12_000),
              })
            }
          />
        </Field>
      </FieldGroup>

      <Field data-disabled={disabled || qualityDisabled || undefined}>
        <FieldLabel htmlFor="quality-number">Minőség</FieldLabel>
        <div className="flex items-center gap-4">
          <Slider
            aria-label="Kimeneti minőség"
            min={1}
            max={100}
            step={1}
            value={settings.quality}
            disabled={disabled || qualityDisabled}
            onValueChange={(value) =>
              updateSettings({
                quality: Array.isArray(value) ? value[0] : value,
              })
            }
          />
          <Input
            id="quality-number"
            className="w-20"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={settings.quality}
            disabled={disabled || qualityDisabled}
            onChange={(event) =>
              updateSettings({
                quality: clampNumber(event.target.value, 1, 100),
              })
            }
          />
        </div>
        <FieldDescription>
          {qualityDisabled
            ? "A PNG veszteségmentes kimenetnél ez a beállítás nem használható."
            : `${settings.quality}% — nagyobb érték jobb minőséget és nagyobb fájlt jelent.`}
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}
