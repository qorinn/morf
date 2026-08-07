import { useState } from "react";
import {
  DragDropVerticalIcon,
  Download04Icon,
  ImageNotFound01Icon,
  LayerAddIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Feedback } from "@dnd-kit/dom";
import { useSortable } from "@dnd-kit/react/sortable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import type {
  ConversionGroup,
  FileJob,
  FileJobStatus,
} from "@/features/image-processing/types";
import { calculateSaving, formatBytes } from "@/lib/filenames/image-filenames";
import { cn } from "@/lib/utils";
import { imageJobDndType } from "@/components/workspace/DndJobList";

type FileJobCardProps = {
  job: FileJob;
  group: ConversionGroup;
  sortIndex: number;
  isSelected: boolean;
  onDimensions: (id: string, width: number, height: number) => void;
  onDownload: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, outputBaseName: string) => void;
  onSelectionChange: (id: string) => void;
  selectionDisabled: boolean;
  dragDisabled: boolean;
};

const statusLabels: Record<FileJobStatus, string> = {
  queued: "",
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

function isCardSelectionClick(
  target: EventTarget | null,
  card: Element,
): boolean {
  if (!(target instanceof Element) || !card.contains(target)) return false;

  return !target.closest(
    "a, button, input, label, select, textarea, [role=combobox], [data-card-control], [data-slot=input-group]",
  );
}

export function FileJobCard({
  job,
  group,
  sortIndex,
  isSelected,
  onDimensions,
  onDownload,
  onDuplicate,
  onRename,
  onSelectionChange,
  selectionDisabled,
  dragDisabled,
}: FileJobCardProps) {
  const [previewFailed, setPreviewFailed] = useState(
    job.inputFormat === "heic",
  );
  const isActive = activeStatuses.includes(job.status);
  const selectionUnavailable = selectionDisabled || isActive;
  const saving = job.result
    ? calculateSaving(job.file.size, job.result.size)
    : undefined;

  const toggleSelection = () => {
    if (!selectionUnavailable) onSelectionChange(job.id);
  };

  const sourceDetails =
    job.originalWidth && job.originalHeight
      ? `${job.originalWidth} × ${job.originalHeight} px`
      : `${job.inputFormat.toUpperCase()} · ${formatBytes(job.file.size)}`;
  const { ref, handleRef, isDragging } = useSortable({
    id: job.id,
    index: sortIndex,
    group: group.id,
    type: imageJobDndType,
    accept: imageJobDndType,
    disabled: dragDisabled || isActive,
    plugins: (defaults) => [
      ...defaults,
      Feedback.configure({ feedback: "clone" }),
    ],
    data: {
      kind: imageJobDndType,
      groupId: group.id,
    },
    transition: {
      duration: 250,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  return (
    <div
      ref={ref}
      role="listitem"
      data-dnd-job-id={job.id}
      className={cn("min-w-0", isDragging && "morf-dnd-drag-source")}
    >
      <Card
        size="sm"
        data-selected={isSelected ? "true" : undefined}
        role="button"
        tabIndex={selectionUnavailable ? -1 : 0}
        aria-pressed={isSelected}
        aria-disabled={selectionUnavailable || undefined}
        aria-label={`${job.file.name}: ${
          isSelected ? "kijelölés megszüntetése" : "kijelölés"
        } csoportművelethez`}
        className="border-foreground/20 border bg-card ring-0 [--card-spacing:--spacing(2)] data-[selected=true]:border-ring data-[selected=true]:bg-primary/5 data-[selected=true]:ring-2 data-[selected=true]:ring-ring/20"
        onClick={(event) => {
          if (isCardSelectionClick(event.target, event.currentTarget)) {
            toggleSelection();
          }
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggleSelection();
        }}
      >
        <CardContent className="flex flex-col gap-2 px-1.5">
          <div className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] gap-x-1.5">
            <span
              ref={handleRef}
              data-dnd-handle
              role="button"
              tabIndex={dragDisabled || isActive ? -1 : 0}
              aria-label={`${job.file.name} áthelyezése`}
              aria-disabled={dragDisabled || isActive || undefined}
              className="text-muted-foreground row-span-2 flex size-5 cursor-grab touch-none items-center justify-center self-center active:cursor-grabbing aria-disabled:cursor-not-allowed"
              title="Áthelyezési fogantyú"
              onClick={(event) => event.stopPropagation()}
            >
              <HugeiconsIcon
                icon={DragDropVerticalIcon}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>

            <div className="flex w-full min-w-0 items-center justify-between gap-3 pb-1">
              <p
                className="min-w-0 truncate text-xs leading-tight font-medium"
                title={job.file.name}
              >
                {job.file.name}
              </p>
              <p className="text-muted-foreground shrink-0 text-[10px] leading-tight whitespace-nowrap tabular-nums">
                {sourceDetails}
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-1">
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
                      const { naturalWidth, naturalHeight } =
                        event.currentTarget;
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

              <InputGroup
                className="min-w-0"
                data-card-control
                data-disabled={isActive || undefined}
              >
                <InputGroupInput
                  aria-label={`${job.file.name} új fájlneve`}
                  value={job.outputBaseName}
                  maxLength={80}
                  spellCheck={false}
                  disabled={isActive}
                  onChange={(event) => onRename(job.id, event.target.value)}
                />
              </InputGroup>

              <div className="flex items-center">
                {job.status === "completed" && job.result && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${job.file.name} letöltése`}
                    title="Letöltés"
                    onClick={() => onDownload(job.id)}
                  >
                    <HugeiconsIcon
                      icon={Download04Icon}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </Button>
                )}

                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`${job.file.name} duplikálása`}
                  disabled={selectionDisabled || isActive}
                  onClick={() => onDuplicate(job.id)}
                >
                  <HugeiconsIcon
                    icon={LayerAddIcon}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </Button>
              </div>
            </div>
          </div>

          {isActive && (
            <Progress
              value={job.progress}
              aria-label={`${job.file.name} feldolgozása`}
            >
              <ProgressLabel>{statusLabels[job.status]}</ProgressLabel>
              <ProgressValue />
            </Progress>
          )}

          {!isActive && job.status !== "queued" && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getBadgeVariant(job.status)}>
                {statusLabels[job.status]}
              </Badge>
              {job.result && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatBytes(job.file.size)} → {formatBytes(job.result.size)}
                  {saving !== undefined && saving >= 0
                    ? ` · ${saving}% megtakarítás`
                    : ""}
                </span>
              )}
            </div>
          )}

          {job.status === "queued" &&
            (group.settings.maxFileSizeKb !== null ||
              group.settings.lossless) && (
              <p className="text-muted-foreground truncate text-xs tabular-nums">
                {group.settings.maxFileSizeKb !== null
                  ? `Célméret: ≤ ${formatBytes(group.settings.maxFileSizeKb * 1024)}`
                  : "Veszteségmentes feldolgozás"}
              </p>
            )}

          {job.error && (
            <div role="alert" className="flex flex-col gap-1 text-xs">
              <p className="text-destructive font-medium">
                {job.error.message}
              </p>
              <p className="text-muted-foreground">{job.error.suggestion}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
