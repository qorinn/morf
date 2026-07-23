import { useState } from "react";
import {
  CircleArrowShrink02Icon,
  CircleArrowExpand01Icon,
  Cancel01Icon,
  Delete02Icon,
  Download04Icon,
  FolderOpenIcon,
  GripVerticalIcon,
  ImageNotFound01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { estimateImageOutputSize } from "@/features/image-processing/estimate-output-size";
import type {
  ConversionGroup,
  FileJob,
  FileJobStatus,
} from "@/features/image-processing/types";
import {
  calculateSaving,
  formatBytes,
  getImageFileExtension,
} from "@/lib/filenames/image-filenames";

type FileJobCardProps = {
  job: FileJob;
  group: ConversionGroup;
  groups: ConversionGroup[];
  isSelected: boolean;
  canSaveAs: boolean;
  isSaving: boolean;
  onCancel: (id: string) => void;
  onDimensions: (id: string, width: number, height: number) => void;
  onDownload: (job: FileJob) => void;
  onRename: (id: string, outputBaseName: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onSaveAs: (job: FileJob) => void;
  onGroupChange: (jobId: string, groupId: string) => void;
  onSelectionChange: (id: string) => void;
  selectionDisabled: boolean;
};

const statusLabels: Record<FileJobStatus, string> = {
  queued: "Várakozik",
  "loading-engine": "Motor betöltése",
  decoding: "Beolvasás",
  processing: "Átméretezés",
  encoding: "Kódolás",
  completed: "Kész",
  cancelled: "Megszakítva",
  error: "Hiba",
};

const activeStatuses: FileJobStatus[] = [
  "loading-engine",
  "decoding",
  "processing",
  "encoding",
];

function getBadgeVariant(status: FileJobStatus) {
  if (status === "completed") return "default" as const;
  if (status === "error") return "destructive" as const;
  if (status === "queued" || status === "cancelled") return "outline" as const;
  return "secondary" as const;
}

function isCardControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a, button, input, textarea, [data-card-control], [data-slot=input-group]",
      ),
    )
  );
}

export function FileJobCard({
  job,
  group,
  groups,
  isSelected,
  canSaveAs,
  isSaving,
  onCancel,
  onDimensions,
  onDownload,
  onRename,
  onRetry,
  onRemove,
  onSaveAs,
  onGroupChange,
  onSelectionChange,
  selectionDisabled,
}: FileJobCardProps) {
  const [previewFailed, setPreviewFailed] = useState(
    job.inputFormat === "heic",
  );
  const isActive = activeStatuses.includes(job.status);
  const selectionUnavailable = selectionDisabled || isActive;
  const outputExtension = getImageFileExtension(
    job.result?.format ?? group.settings.outputFormat,
  );
  const estimatedResult =
    job.originalWidth && job.originalHeight
      ? estimateImageOutputSize({
          sourceSize: job.file.size,
          sourceFormat: job.inputFormat,
          width: job.originalWidth,
          height: job.originalHeight,
          ...group.settings,
        })
      : undefined;
  const saving = job.result
    ? calculateSaving(job.file.size, job.result.size)
    : undefined;
  const groupItems = groups.map((candidate) => ({
    label: `${candidate.name} · ${candidate.settings.outputFormat.toUpperCase()}${
      candidate.settings.outputFormat === "png"
        ? ""
        : ` · ${candidate.settings.quality}%`
    }`,
    value: candidate.id,
  }));
  const hasFooterActions =
    Boolean(job.result) ||
    isActive ||
    job.status === "error" ||
    job.status === "cancelled";

  const toggleSelection = () => {
    if (!selectionUnavailable) onSelectionChange(job.id);
  };

  return (
    <Card
      size="sm"
      interactive={!selectionUnavailable}
      selected={isSelected}
      role="button"
      tabIndex={selectionUnavailable ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={selectionUnavailable || undefined}
      aria-label={`${job.file.name}: ${
        isSelected ? "kijelölés megszüntetése" : "kijelölés"
      } csoportművelethez`}
      className="[--card-spacing:--spacing(2.5)]"
      onClick={(event) => {
        if (!isCardControl(event.target)) toggleSelection();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleSelection();
      }}
    >
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <span
            data-card-control
            className="text-muted-foreground flex size-5 shrink-0 cursor-grab items-center justify-center touch-none active:cursor-grabbing"
            title="Átrendezés hamarosan"
            aria-hidden="true"
          >
            <HugeiconsIcon icon={GripVerticalIcon} strokeWidth={2} />
          </span>
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            {previewFailed ? (
              <HugeiconsIcon
                icon={ImageNotFound01Icon}
                className="text-muted-foreground"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            ) : (
              <img
                src={job.previewUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
                onError={() => setPreviewFailed(true)}
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (
                    naturalWidth > 0 &&
                    naturalHeight > 0 &&
                    (naturalWidth !== job.originalWidth ||
                      naturalHeight !== job.originalHeight)
                  ) {
                    onDimensions(job.id, naturalWidth, naturalHeight);
                  }
                }}
              />
            )}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{job.file.name}</CardTitle>
            <CardDescription>
              {job.inputFormat.toUpperCase()} · {formatBytes(job.file.size)}
            </CardDescription>
          </div>
        </div>
        <CardAction className="flex items-center gap-1.5">
          {job.status !== "queued" && (
            <Badge variant={getBadgeVariant(job.status)}>
              {statusLabels[job.status]}
            </Badge>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`${job.file.name} eltávolítása`}
            disabled={isActive}
            onClick={() => onRemove(job.id)}
          >
            <HugeiconsIcon
              icon={Delete02Icon}
              strokeWidth={2}
              data-icon="inline-start"
              aria-hidden="true"
            />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <FieldGroup className="grid gap-2">
          <Field data-disabled={selectionDisabled || isActive || undefined}>
            <FieldLabel htmlFor={`group-${job.id}`} className="sr-only">
              Konfigurációs csoport
            </FieldLabel>
            <Select
              items={groupItems}
              value={group.id}
              disabled={selectionDisabled || isActive}
              onValueChange={(value) => value && onGroupChange(job.id, value)}
            >
              <SelectTrigger id={`group-${job.id}`} className="w-full">
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

          <Field>
            <FieldLabel htmlFor={`output-name-${job.id}`} className="sr-only">
              Fájlnév
            </FieldLabel>
            <InputGroup data-disabled={isActive || undefined}>
              <InputGroupInput
                id={`output-name-${job.id}`}
                value={job.outputBaseName}
                maxLength={80}
                spellCheck={false}
                disabled={isActive}
                onChange={(event) => onRename(job.id, event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                .{outputExtension}
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>

        {isActive && (
          <Progress
            value={job.progress}
            aria-label={`${job.file.name} feldolgozása`}
          >
            <ProgressLabel>{statusLabels[job.status]}</ProgressLabel>
            <ProgressValue />
          </Progress>
        )}

        {!job.result && estimatedResult && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Várható új méret</dt>
              <dd>≈ {formatBytes(estimatedResult.bytes)}</dd>
            </div>
          </dl>
        )}

        {job.result && (
          <dl className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Eredeti</dt>
              <dd>{formatBytes(job.file.size)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Új méret</dt>
              <dd>{formatBytes(job.result.size)}</dd>
            </div>
            <div
              className="text-muted-foreground flex size-8 items-center justify-center"
              title={
                saving !== undefined && saving >= 0
                  ? `${saving}% megtakarítás`
                  : "Az új fájl nagyobb lett"
              }
            >
              <HugeiconsIcon
                icon={
                  saving !== undefined && saving >= 0
                    ? CircleArrowShrink02Icon
                    : CircleArrowExpand01Icon
                }
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="sr-only">
                {saving !== undefined && saving >= 0
                  ? `${saving}% megtakarítás`
                  : "Az új fájl nagyobb lett"}
              </span>
            </div>
          </dl>
        )}

        {job.error && (
          <div role="alert" className="flex flex-col gap-1 text-sm">
            <p className="text-destructive font-medium">{job.error.message}</p>
            <p className="text-muted-foreground">{job.error.suggestion}</p>
          </div>
        )}
      </CardContent>

      {hasFooterActions && (
        <CardFooter className="flex flex-wrap gap-2">
          {job.result && (
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={() => onDownload(job)}
            >
              <HugeiconsIcon
                icon={Download04Icon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Letöltés
            </Button>
          )}
          {job.result && canSaveAs && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSaving}
              onClick={() => onSaveAs(job)}
            >
              <HugeiconsIcon
                icon={FolderOpenIcon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Mentés másként
            </Button>
          )}
          {isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCancel(job.id)}
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Megszakítás
            </Button>
          )}
          {(job.status === "error" || job.status === "cancelled") && (
            <Button size="sm" variant="outline" onClick={() => onRetry(job.id)}>
              <HugeiconsIcon
                icon={RefreshIcon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Újrapróbálás
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
