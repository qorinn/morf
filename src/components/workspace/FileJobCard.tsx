import {
  Cancel01Icon,
  Delete02Icon,
  Download04Icon,
  FolderOpenIcon,
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import type {
  FileJob,
  FileJobStatus,
  ImageFormat,
} from "@/features/image-processing/types";
import {
  calculateSaving,
  createOutputFileNameFromBase,
  formatBytes,
} from "@/lib/filenames/image-filenames";

type FileJobCardProps = {
  job: FileJob;
  outputFormat: ImageFormat;
  canSaveAs: boolean;
  isSaving: boolean;
  onCancel: (id: string) => void;
  onDownload: (job: FileJob) => void;
  onRename: (id: string, outputBaseName: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onSaveAs: (job: FileJob) => void;
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

export function FileJobCard({
  job,
  outputFormat,
  canSaveAs,
  isSaving,
  onCancel,
  onDownload,
  onRename,
  onRetry,
  onRemove,
  onSaveAs,
}: FileJobCardProps) {
  const isActive = activeStatuses.includes(job.status);
  const outputFileName = createOutputFileNameFromBase(
    job.outputBaseName,
    job.result?.format ?? outputFormat,
  );
  const saving = job.result
    ? calculateSaving(job.file.size, job.result.size)
    : undefined;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={job.previewUrl}
            alt=""
            className="bg-muted size-14 shrink-0 rounded-2xl object-cover"
          />
          <div className="min-w-0">
            <CardTitle className="truncate">{job.file.name}</CardTitle>
            <CardDescription>
              {job.inputFormat.toUpperCase()} · {formatBytes(job.file.size)}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge variant={getBadgeVariant(job.status)}>
            {statusLabels[job.status]}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor={`output-name-${job.id}`}>
            Fájlnév (kiterjesztés nélkül)
          </FieldLabel>
          <Input
            id={`output-name-${job.id}`}
            value={job.outputBaseName}
            maxLength={80}
            spellCheck={false}
            disabled={isActive}
            onChange={(event) => onRename(job.id, event.target.value)}
          />
          <FieldDescription>
            Letöltéskor:{" "}
            <span className="text-foreground">{outputFileName}</span>
          </FieldDescription>
        </Field>

        {isActive && (
          <Progress
            value={job.progress}
            aria-label={`${job.file.name} feldolgozása`}
          >
            <ProgressLabel>{statusLabels[job.status]}</ProgressLabel>
            <ProgressValue />
          </Progress>
        )}

        {job.result && (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Eredeti</dt>
              <dd>{formatBytes(job.file.size)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Új méret</dt>
              <dd>{formatBytes(job.result.size)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Felbontás</dt>
              <dd>
                {job.originalWidth}×{job.originalHeight} → {job.result.width}×
                {job.result.height}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Megtakarítás</dt>
              <dd>
                {saving !== undefined && saving >= 0
                  ? `${saving}%`
                  : "Nagyobb lett"}
              </dd>
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

      <CardFooter className="flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
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
        </div>
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
      </CardFooter>
    </Card>
  );
}
