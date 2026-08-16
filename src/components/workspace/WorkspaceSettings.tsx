import {
  BrowserIcon,
  Mail01Icon,
  Settings02Icon,
  Share08Icon,
  ShoppingBag01Icon,
  SlidersHorizontalIcon,
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
import { cn } from "@/lib/utils";
import type { ImageConverterMessages } from "@/i18n/image-converter";
import { useWorkspaceI18n } from "@/components/workspace/WorkspaceI18nProvider";
import { useWorkspaceStore } from "@/stores/workspace-store";

type WorkspaceSettingsProps = {
  disabled: boolean;
};

const presetIcons = {
  general: SlidersHorizontalIcon,
  website: BrowserIcon,
  webshop: ShoppingBag01Icon,
  social: Share08Icon,
  email: Mail01Icon,
  custom: Settings02Icon,
} satisfies Record<PresetId, typeof BrowserIcon>;

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
  const { locale, messages } = useWorkspaceI18n<ImageConverterMessages>();
  const copy = messages.workspace;
  const presetItems = imagePresets.map((preset) => ({
    icon: presetIcons[preset.id],
    label: messages.presets[preset.id].name,
    value: preset.id,
  }));
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
  const qualityDisabled =
    settings.outputFormat === "png" ||
    settings.maxFileSizeKb !== null ||
    settings.lossless;

  return (
    <FieldGroup>
      <div>
        <CardTitle>{activeGroup.name}</CardTitle>
        <CardDescription>
          {copy.selectedGroupSettings}
        </CardDescription>
      </div>

      <Field data-disabled={disabled || undefined}>
        <FieldLabel htmlFor={`morf-preset-${activeGroup.id}`}>
          {copy.usagePurpose}
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
        <FieldDescription>
          {messages.presets[settings.presetId].description}
        </FieldDescription>
      </Field>

      <Field data-disabled={disabled || undefined}>
        <FieldLabel id={`output-format-label-${activeGroup.id}`}>
          {copy.outputFormat}
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

      <div
        className={cn(
          "overflow-hidden rounded-3xl border transition-colors duration-200",
          settings.lossless ? "border-primary/35" : "border-border",
        )}
      >
        <Field
          orientation="horizontal"
          data-disabled={disabled || undefined}
          className={cn(
            "px-4 py-4 transition-colors duration-200",
            settings.lossless && "bg-primary/5",
          )}
        >
          <Checkbox
            id={`lossless-${activeGroup.id}`}
            checked={settings.lossless}
            disabled={disabled}
            aria-controls={`dependent-settings-${activeGroup.id}`}
            onCheckedChange={(checked) =>
              updateGroupSettings(activeGroup.id, {
                lossless: checked === true,
              })
            }
          />
          <FieldContent>
            <FieldLabel htmlFor={`lossless-${activeGroup.id}`}>
              {copy.lossless}
            </FieldLabel>
            <FieldDescription>
              {settings.outputFormat === "jpeg"
                ? copy.losslessJpeg
                : copy.losslessOther}
            </FieldDescription>
          </FieldContent>
        </Field>

        <div
          id={`dependent-settings-${activeGroup.id}`}
          aria-disabled={disabled || settings.lossless}
          className={cn(
            "border-border border-t p-4 transition-colors duration-200",
            settings.lossless && "bg-muted/40",
          )}
        >
          <FieldGroup className="gap-5">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field data-disabled={disabled || settings.lossless || undefined}>
                <FieldLabel htmlFor={`max-width-${activeGroup.id}`}>
                  {copy.maxWidth}
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
                  {copy.maxHeight}
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
                  <FieldLabel
                    htmlFor={`max-file-size-enabled-${activeGroup.id}`}
                  >
                    {copy.maxFileSize}
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
                    disabled ||
                    settings.lossless ||
                    settings.maxFileSizeKb === null
                  }
                  aria-label={`${copy.maxFileSize} ${copy.ui.kilobytes}`}
                  onChange={(event) =>
                    updateGroupSettings(activeGroup.id, {
                      maxFileSizeKb: clampNumber(
                        event.target.value,
                        1,
                        102_400,
                      ),
                    })
                  }
                />
                <span className="text-muted-foreground text-sm">KB</span>
              </div>
            </Field>

            <Field data-disabled={disabled || qualityDisabled || undefined}>
              <FieldLabel htmlFor={`quality-number-${activeGroup.id}`}>
                {copy.outputQuality}
              </FieldLabel>
              <div className="flex items-center gap-4">
                <Slider
                  aria-label={`${activeGroup.name} ${copy.outputQuality.toLocaleLowerCase(locale)}`}
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
            </Field>
          </FieldGroup>
        </div>
      </div>
    </FieldGroup>
  );
}
