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
import { useWorkspaceI18n } from "@/components/workspace/WorkspaceI18nProvider";
import type { FaviconMessages } from "@/i18n/favicon";
import type {
  BackgroundMode,
  FaviconEditorSettings,
} from "@/features/favicon-generator/types";

interface FaviconSettingsProps {
  settings: FaviconEditorSettings;
  onChange: (patch: Partial<FaviconEditorSettings>) => void;
}

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
  const { messages } = useWorkspaceI18n<FaviconMessages>();
  const copy = messages.settings;
  const backgroundModes = copy.backgroundModes as ReadonlyArray<{
    value: BackgroundMode;
    label: string;
  }>;

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend className="flex items-center gap-2">
          <HugeiconsIcon icon={ColorsIcon} className="size-4" strokeWidth={2} />
          {copy.legend}
        </FieldLegend>
        <Field>
          <FieldLabel id="favicon-background-mode">{copy.backgroundLabel}</FieldLabel>
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
              {copy.customColorLabel}
            </FieldLabel>
            <div className="flex items-center gap-3">
              <Input
                id="favicon-background-color-picker"
                className="size-10 shrink-0 p-1"
                type="color"
                value={colorInputValue(settings.backgroundColor)}
                aria-label={copy.customColorAriaLabel}
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
          label={copy.standardPadding.label}
          min={0}
          max={0.4}
          value={settings.standardPadding}
          onChange={(standardPadding) => onChange({ standardPadding })}
        />
        <PercentField
          id="favicon-maskable-padding"
          label={copy.maskablePadding.label}
          min={0}
          max={0.4}
          value={settings.maskablePadding}
          description={copy.maskablePadding.description}
          onChange={(maskablePadding) => onChange({ maskablePadding })}
        />
        <PercentField
          id="favicon-radius"
          label={copy.borderRadius.label}
          min={0}
          max={1}
          value={settings.borderRadius}
          onChange={(borderRadius) => onChange({ borderRadius })}
        />
      </FieldSet>
    </FieldGroup>
  );
}
