import {
  BrowserIcon,
  Mail01Icon,
  Settings02Icon,
  Share08Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
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
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ImageFormat } from "@/features/image-processing/types";
import { imagePresets, type PresetId } from "@/lib/presets/image-presets";
import { useWorkspaceStore } from "@/stores/workspace-store";

type WorkspaceSettingsProps = {
  disabled: boolean;
};

const presetIcons = {
  website: BrowserIcon,
  webshop: ShoppingBag01Icon,
  social: Share08Icon,
  email: Mail01Icon,
  custom: Settings02Icon,
} satisfies Record<PresetId, typeof BrowserIcon>;

const presetItems = imagePresets.map((preset) => ({
  icon: presetIcons[preset.id],
  label: preset.recipe.name,
  value: preset.id,
}));

const outputFormats: Array<{ value: ImageFormat; label: string }> = [
  { value: "jpeg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
];

function clampNumber(value: string, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function WorkspaceSettings({ disabled }: WorkspaceSettingsProps) {
  const groups = useWorkspaceStore((state) => state.groups);
  const activeGroupId = useWorkspaceStore((state) => state.activeGroupId);
  const applyPresetToGroup = useWorkspaceStore(
    (state) => state.applyPresetToGroup,
  );
  const updateGroupSettings = useWorkspaceStore(
    (state) => state.updateGroupSettings,
  );
  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const settings = activeGroup.settings;
  const activePreset = imagePresets.find(
    (preset) => preset.id === settings.presetId,
  );
  const qualityDisabled =
    settings.outputFormat === "png" ||
    settings.maxFileSizeKb !== null ||
    settings.lossless;

  return (
    <FieldGroup>
      <div>
        <CardTitle>{activeGroup.name}</CardTitle>
        <CardDescription>
          A kijelölt csoport konvertálási beállításai.
        </CardDescription>
      </div>

      <Field data-disabled={disabled || undefined}>
        <FieldLabel htmlFor={`morf-preset-${activeGroup.id}`}>
          Felhasználási cél
        </FieldLabel>
        <Select
          items={presetItems}
          value={settings.presetId}
          disabled={disabled}
          onValueChange={(value) =>
            value && applyPresetToGroup(activeGroup.id, value as PresetId)
          }
        >
          <SelectTrigger
            id={`morf-preset-${activeGroup.id}`}
            className="w-full"
          >
            <SelectValue>
              {(value) => {
                const selectedItem = presetItems.find(
                  (item) => item.value === value,
                );

                return selectedItem ? (
                  <>
                    <HugeiconsIcon
                      icon={selectedItem.icon}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    {selectedItem.label}
                  </>
                ) : null;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {presetItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  <HugeiconsIcon
                    icon={item.icon}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>{activePreset?.description}</FieldDescription>
      </Field>

      <Field data-disabled={disabled || undefined}>
        <FieldLabel id={`output-format-label-${activeGroup.id}`}>
          Kimeneti formátum
        </FieldLabel>
        <ToggleGroup
          aria-labelledby={`output-format-label-${activeGroup.id}`}
          value={[settings.outputFormat]}
          variant="outline"
          spacing={0}
          disabled={disabled}
          className="w-full"
          onValueChange={(values) => {
            const value = values[0] as ImageFormat | undefined;
            if (value) {
              updateGroupSettings(activeGroup.id, {
                outputFormat: value,
              });
            }
          }}
        >
          {outputFormats.map((format) => (
            <ToggleGroupItem
              key={format.value}
              value={format.value}
              className="min-w-0 flex-1"
            >
              {format.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field orientation="horizontal" data-disabled={disabled || undefined}>
        <Checkbox
          id={`lossless-${activeGroup.id}`}
          checked={settings.lossless}
          disabled={disabled}
          onCheckedChange={(checked) =>
            updateGroupSettings(activeGroup.id, {
              lossless: checked === true,
            })
          }
        />
        <FieldContent>
          <FieldLabel htmlFor={`lossless-${activeGroup.id}`}>
            Veszteségmentes mód
          </FieldLabel>
          <FieldDescription>
            {settings.outputFormat === "jpeg"
              ? "A JPG nem támogat valódi veszteségmentes kódolást, ezért ennél a formátumnál a legmagasabb elérhető minőséget használja."
              : "Az eredeti felbontást megtartja, és veszteségmentesen kódol."}
          </FieldDescription>
        </FieldContent>
      </Field>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-disabled={disabled || settings.lossless || undefined}>
          <FieldLabel htmlFor={`max-width-${activeGroup.id}`}>
            Max. szélesség
          </FieldLabel>
          <Input
            id={`max-width-${activeGroup.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={12000}
            value={settings.maxWidth}
            disabled={disabled || settings.lossless}
            onChange={(event) =>
              updateGroupSettings(activeGroup.id, {
                maxWidth: clampNumber(event.target.value, 1, 12_000),
              })
            }
          />
        </Field>
        <Field data-disabled={disabled || settings.lossless || undefined}>
          <FieldLabel htmlFor={`max-height-${activeGroup.id}`}>
            Max. magasság
          </FieldLabel>
          <Input
            id={`max-height-${activeGroup.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={12000}
            value={settings.maxHeight}
            disabled={disabled || settings.lossless}
            onChange={(event) =>
              updateGroupSettings(activeGroup.id, {
                maxHeight: clampNumber(event.target.value, 1, 12_000),
              })
            }
          />
        </Field>
      </FieldGroup>

      <Field data-disabled={disabled || settings.lossless || undefined}>
        <div className="flex items-start gap-3">
          <Checkbox
            id={`max-file-size-enabled-${activeGroup.id}`}
            checked={settings.maxFileSizeKb !== null}
            disabled={disabled || settings.lossless}
            onCheckedChange={(checked) =>
              updateGroupSettings(activeGroup.id, {
                maxFileSizeKb: checked === true ? 500 : null,
              })
            }
          />
          <FieldContent>
            <FieldLabel htmlFor={`max-file-size-enabled-${activeGroup.id}`}>
              Maximum fájlméret
            </FieldLabel>
          </FieldContent>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id={`max-file-size-${activeGroup.id}`}
            className="w-32 tabular-nums"
            type="number"
            inputMode="numeric"
            min={1}
            max={102400}
            value={settings.maxFileSizeKb ?? 500}
            disabled={
              disabled || settings.lossless || settings.maxFileSizeKb === null
            }
            aria-label="Maximum fájlméret kilobájtban"
            onChange={(event) =>
              updateGroupSettings(activeGroup.id, {
                maxFileSizeKb: clampNumber(event.target.value, 1, 102_400),
              })
            }
          />
          <span className="text-muted-foreground text-sm">KB</span>
        </div>
      </Field>

      <Field data-disabled={disabled || qualityDisabled || undefined}>
        <FieldLabel htmlFor={`quality-number-${activeGroup.id}`}>
          Minőség
        </FieldLabel>
        <div className="flex items-center gap-4">
          <Slider
            aria-label={`${activeGroup.name} kimeneti minősége`}
            min={1}
            max={100}
            step={1}
            value={settings.quality}
            disabled={disabled || qualityDisabled}
            onValueChange={(value) =>
              updateGroupSettings(activeGroup.id, {
                quality: Array.isArray(value) ? value[0] : value,
              })
            }
          />
          <Input
            id={`quality-number-${activeGroup.id}`}
            className="w-20"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={settings.quality}
            disabled={disabled || qualityDisabled}
            onChange={(event) =>
              updateGroupSettings(activeGroup.id, {
                quality: clampNumber(event.target.value, 1, 100),
              })
            }
          />
        </div>
        <FieldDescription>
          {settings.lossless
            ? "A veszteségmentes mód felülírja ezt a beállítást."
            : settings.maxFileSizeKb !== null
              ? "A maximum fájlméret alapján a motor automatikusan választ minőséget."
              : settings.outputFormat === "png"
                ? "A PNG veszteségmentes kimenetnél ez a beállítás nem használható."
                : `${settings.quality}% — nagyobb érték jobb minőséget és nagyobb fájlt jelent.`}
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}
