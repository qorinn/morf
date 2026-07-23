import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  { value: "avif", label: "AVIF" },
];

function clampNumber(value: string, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function WorkspaceSettings({ disabled }: WorkspaceSettingsProps) {
  const jobs = useWorkspaceStore((state) => state.jobs);
  const groups = useWorkspaceStore((state) => state.groups);
  const activeGroupId = useWorkspaceStore((state) => state.activeGroupId);
  const setActiveGroup = useWorkspaceStore((state) => state.setActiveGroup);
  const createGroup = useWorkspaceStore((state) => state.createGroup);
  const renameGroup = useWorkspaceStore((state) => state.renameGroup);
  const applyPresetToGroup = useWorkspaceStore(
    (state) => state.applyPresetToGroup,
  );
  const updateGroupSettings = useWorkspaceStore(
    (state) => state.updateGroupSettings,
  );
  const [groupMessage, setGroupMessage] = useState<string>();
  const groupItems = useMemo(
    () =>
      groups.map((group) => {
        const count = jobs.filter((job) => job.groupId === group.id).length;
        const quality =
          group.settings.outputFormat === "png"
            ? ""
            : ` · ${group.settings.quality}%`;
        return {
          label: `${group.name || "Névtelen csoport"} · ${count} kép · ${group.settings.outputFormat.toUpperCase()}${quality}`,
          value: group.id,
        };
      }),
    [groups, jobs],
  );
  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const settings = activeGroup.settings;
  const activePreset = imagePresets.find(
    (preset) => preset.id === settings.presetId,
  );
  const qualityDisabled = settings.outputFormat === "png";

  return (
    <FieldGroup>
      <div>
        <CardTitle>Konfigurációs csoportok</CardTitle>
        <CardDescription>
          Válassz vagy hozz létre egy csoportot.
        </CardDescription>
      </div>

      <Field data-disabled={disabled || undefined}>
        <FieldLabel htmlFor="active-conversion-group">
          Szerkesztett csoport
        </FieldLabel>
        <Select
          items={groupItems}
          value={activeGroup.id}
          disabled={disabled}
          onValueChange={(value) => {
            if (!value) return;
            setActiveGroup(value);
            setGroupMessage(undefined);
          }}
        >
          <SelectTrigger id="active-conversion-group" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {groupItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field data-disabled={disabled || undefined}>
        <FieldLabel htmlFor={`group-name-${activeGroup.id}`}>
          Csoport neve
        </FieldLabel>
        <Input
          id={`group-name-${activeGroup.id}`}
          value={activeGroup.name}
          maxLength={60}
          disabled={disabled}
          onChange={(event) => renameGroup(activeGroup.id, event.target.value)}
          onBlur={(event) => {
            const name = event.target.value.trim();
            renameGroup(activeGroup.id, name || "Névtelen csoport");
          }}
        />
      </Field>

      <Button
        type="button"
        variant="default"
        className="w-full"
        disabled={disabled}
        onClick={() => {
          createGroup();
          setGroupMessage(
            "Új csoport létrehozva az előző csoport beállításaival.",
          );
        }}
      >
        Új konfigurációs csoport
      </Button>

      {groupMessage && (
        <p className="text-muted-foreground min-h-5 text-sm" aria-live="polite">
          {groupMessage}
        </p>
      )}

      <Separator />

      <div>
        <CardTitle>Konfigurációs beállítások</CardTitle>
        <CardDescription>Módosítsd a csoport beállításait.</CardDescription>
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
        <FieldLabel id={`output-format-label-${activeGroup.id}`}>
          Kimeneti formátum
        </FieldLabel>
        <ToggleGroup
          aria-labelledby={`output-format-label-${activeGroup.id}`}
          value={[settings.outputFormat]}
          variant="outline"
          disabled={disabled}
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
            <ToggleGroupItem key={format.value} value={format.value}>
              {format.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-disabled={disabled || undefined}>
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
            disabled={disabled}
            onChange={(event) =>
              updateGroupSettings(activeGroup.id, {
                maxWidth: clampNumber(event.target.value, 1, 12_000),
              })
            }
          />
        </Field>
        <Field data-disabled={disabled || undefined}>
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
            disabled={disabled}
            onChange={(event) =>
              updateGroupSettings(activeGroup.id, {
                maxHeight: clampNumber(event.target.value, 1, 12_000),
              })
            }
          />
        </Field>
      </FieldGroup>

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
          {qualityDisabled
            ? "A PNG veszteségmentes kimenetnél ez a beállítás nem használható."
            : `${settings.quality}% — nagyobb érték jobb minőséget és nagyobb fájlt jelent.`}
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}
