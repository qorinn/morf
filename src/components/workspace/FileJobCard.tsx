import {
  Cancel01Icon,
  Delete02Icon,
  Download04Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import type { FileJob, FileJobStatus } from "@/features/image-processing/types";
import { calculateSaving, formatBytes } from "@/lib/filenames/image-filenames";
import { cn } from "@/lib/utils";

type FileJobCardProps = {
  job: FileJob;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
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
  onCancel,
  onRetry,
  onRemove,
}: FileJobCardProps) {
  const isActive = activeStatuses.includes(job.status);
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
            <a
              href={job.result.url}
              download={job.result.fileName}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <HugeiconsIcon
                icon={Download04Icon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Letöltés
            </a>
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
