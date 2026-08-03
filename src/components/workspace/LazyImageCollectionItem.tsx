import {
  Cancel01Icon,
  FileZipIcon,
  FolderDownloadIcon,
  FolderLibraryIcon,
  InformationCircleIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LazyImageCollection } from "@/features/lazy-image-collections/types";
import { formatBytes } from "@/lib/filenames/image-filenames";

type Props = {
  collection: LazyImageCollection;
  disabled: boolean;
  saving: boolean;
  saveCompleted: number;
  canSaveDirectory: boolean;
  onCancel(): void;
  onRetry(): void;
  onSaveDirectory(): void;
  onSaveZip(): void;
};

export function LazyImageCollectionItem({
  collection,
  disabled,
  saving,
  saveCompleted,
  canSaveDirectory,
  onCancel,
  onRetry,
  onSaveDirectory,
  onSaveZip,
}: Props) {
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const isActive = [
    "loading-engine",
    "decoding",
    "processing",
    "encoding",
  ].includes(collection.status);
  const progress = saving
    ? collection.completedCount > 0
      ? (saveCompleted / collection.completedCount) * 100
      : 0
    : collection.progress;
  const statusLabel =
    collection.status === "completed"
      ? "Kész"
      : collection.status === "error"
        ? "Hiba"
        : isActive
          ? "Feldolgozás"
          : collection.status === "cancelled"
            ? "Megszakítva"
            : null;

  return (
    <div className="border-border bg-muted/35 flex flex-col gap-3 rounded-2xl border p-3">
      <div className="flex items-start gap-3">
        <span className="border-border bg-background text-primary flex size-10 shrink-0 items-center justify-center rounded-xl border">
          <HugeiconsIcon
            icon={FolderLibraryIcon}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={collection.name}>
            {collection.name}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {collection.sourceLabel} · {collection.itemCount} kép ·{" "}
            {formatBytes(collection.totalBytes)}
          </p>
        </div>
        {statusLabel && (
          <Badge
            variant={
              collection.status === "completed" ? "secondary" : "outline"
            }
          >
            {statusLabel}
          </Badge>
        )}
      </div>

      <TooltipProvider>
        <Tooltip open={isGroupInfoOpen} onOpenChange={setIsGroupInfoOpen}>
          <TooltipTrigger
            closeOnClick={false}
            className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={() => setIsGroupInfoOpen(true)}
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              className="size-4"
              strokeWidth={2}
              aria-hidden="true"
            />
            Nagy képcsoport
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="start"
            sideOffset={8}
            className="max-w-72 flex-col items-start gap-1 px-3 py-3 text-left whitespace-normal"
          >
            <p className="font-medium">Sok kép, egyetlen csoportban</p>
            <p className="text-background/80 leading-relaxed">
              A Morf nem nyitja meg egyszerre az összes képet, hanem sorban
              halad rajtuk. Így sok kép sem lassítja
              le feleslegesen az oldalt.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {(isActive || saving) && (
        <Progress value={progress} aria-label={`${collection.name} folyamata`}>
          <ProgressLabel>
            {saving ? "Mentés" : "Konvertálás"} ·{" "}
            {saving ? saveCompleted : collection.completedCount} /{" "}
            {collection.itemCount}
          </ProgressLabel>
        </Progress>
      )}

      {collection.status === "error" && collection.errorMessage && (
        <p className="text-destructive text-xs">{collection.errorMessage}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {isActive && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              data-icon="inline-start"
              aria-hidden="true"
            />
            Megszakítás
          </Button>
        )}
        {(collection.status === "error" ||
          collection.status === "cancelled") && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={onRetry}
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Újrapróbálás
            </Button>
          )}
        {collection.status === "completed" && (
          <>
            {canSaveDirectory && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || saving}
                onClick={onSaveDirectory}
              >
                <HugeiconsIcon
                  icon={FolderDownloadIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Mappába mentés
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || saving}
              onClick={onSaveZip}
            >
              <HugeiconsIcon
                icon={FileZipIcon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden="true"
              />
              ZIP-részek
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
