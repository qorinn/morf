import { ColorsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  BackgroundMode,
  FaviconEditorSettings,
} from "@/features/favicon-generator/types";

interface FaviconSettingsProps {
  settings: FaviconEditorSettings;
  onChange: (patch: Partial<FaviconEditorSettings>) => void;
}

const backgroundModes: Array<{ value: BackgroundMode; label: string }> = [
  { value: "transparent", label: "Átlátszó" },
  { value: "custom", label: "Egyedi" },
  { value: "dominant", label: "Domináns" },
  { value: "white", label: "Fehér" },
  { value: "black", label: "Fekete" },
];

function sliderValue(value: number | readonly number[]): number {
  return typeof value === "number" ? value : value[0];
}

function colorInputValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
}

function PercentField({
  id,
  label,
  value,
  min,
  max,
  description,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  description?: string;
  onChange: (value: number) => void;
}) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="text-muted-foreground text-xs tabular-nums">
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider
        id={id}
        aria-label={label}
        min={min}
        max={max}
        step={0.01}
        value={value}
        onValueChange={(next) => onChange(sliderValue(next))}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

export function FaviconSettings({ settings, onChange }: FaviconSettingsProps) {
  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend className="flex items-center gap-2">
          <HugeiconsIcon icon={ColorsIcon} className="size-4" strokeWidth={2} />
          Háttér és térköz
        </FieldLegend>
        <Field>
          <FieldLabel id="favicon-background-mode">Háttér</FieldLabel>
          <ToggleGroup
            aria-labelledby="favicon-background-mode"
            className="w-full flex-wrap"
            value={[settings.backgroundMode]}
            variant="outline"
            size="sm"
            onValueChange={(values) => {
              const value = values[0] as BackgroundMode | undefined;
              if (value) onChange({ backgroundMode: value });
            }}
          >
            {backgroundModes.map((mode) => (
              <ToggleGroupItem key={mode.value} value={mode.value}>
                {mode.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        {settings.backgroundMode === "custom" && (
          <Field>
            <FieldLabel htmlFor="favicon-background-color">
              Egyedi háttérszín
            </FieldLabel>
            <div className="flex items-center gap-3">
              <Input
                id="favicon-background-color-picker"
                className="size-10 shrink-0 p-1"
                type="color"
                value={colorInputValue(settings.backgroundColor)}
                aria-label="Háttérszín választása"
                onChange={(event) =>
                  onChange({ backgroundColor: event.target.value })
                }
              />
              <Input
                id="favicon-background-color"
                value={settings.backgroundColor}
                pattern="#[0-9a-fA-F]{6}"
                onChange={(event) =>
                  onChange({ backgroundColor: event.target.value })
                }
              />
            </div>
          </Field>
        )}

        <PercentField
          id="favicon-standard-padding"
          label="Normál ikon belső margója"
          min={0}
          max={0.4}
          value={settings.standardPadding}
          onChange={(standardPadding) => onChange({ standardPadding })}
        />
        <PercentField
          id="favicon-maskable-padding"
          label="Maskable safe-zone"
          min={0}
          max={0.4}
          value={settings.maskablePadding}
          description="A legalább 20%-os margó segít, hogy Androidon se vágódjon le a grafika."
          onChange={(maskablePadding) => onChange({ maskablePadding })}
        />
        <PercentField
          id="favicon-radius"
          label="Sarokkerekítés"
          min={0}
          max={1}
          value={settings.borderRadius}
          onChange={(borderRadius) => onChange({ borderRadius })}
        />
      </FieldSet>
    </FieldGroup>
  );
}
