import type { ReactNode } from "react";
import { ImageUploadIcon, LockKeyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import type { DropzoneState } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import morfEmptyState from "../../assets/morf-actions/morf-drag-here-2.webp";

interface FileUploadDropzoneProps {
  getRootProps: DropzoneState["getRootProps"];
  isDragActive: boolean;
  onBrowse: () => void;
  title: string;
  description: ReactNode;
  buttonLabel: string;
  activeTitle?: string;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  privacyNote?: string;
  icon?: HugeiconsIconProps["icon"];
}

export function FileUploadDropzone({
  getRootProps,
  isDragActive,
  onBrowse,
  title,
  description,
  buttonLabel,
  activeTitle = "Engedd el a fájlokat",
  busy = false,
  busyLabel = buttonLabel,
  disabled = false,
  privacyNote = "A fájlok nem hagyják el az eszközödet.",
  icon = ImageUploadIcon,
}: FileUploadDropzoneProps) {
  return (
    <Card>
      <CardContent>
        <div
          {...getRootProps()}
          className={cn(
            "relative min-h-80 rounded-4xl border border-dashed p-8 text-center transition-all",
            isDragActive ? "border-primary bg-primary/10" : "border-border/80 morf-dropzone",
          )}
        >
          <img src={morfEmptyState.src} className="absolute h-[80%] max-h-40 sm:max-h-50 md:max-h-40 lg:max-h-50 xl:max-h-60 w-auto left-[5%] md:max-lg:left-1 top-1/2 -translate-y-1/2" alt="" />

          <div className="flex flex-col items-center justify-center gap-5 text-center relative">
            <span className="morf-icon-orb flex size-16 items-center justify-center rounded-3xl text-secondary-foreground">
              <HugeiconsIcon icon={icon} className="size-7" strokeWidth={1.8} />
            </span>

            <div className="flex max-w-xl flex-col items-center gap-2">
              <h3 className="font-heading text-xl font-medium">
                {isDragActive ? activeTitle : title}
              </h3>
              <p className="text-muted-foreground text-balance max-w-2/3">{description}</p>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={disabled || busy}
              onClick={onBrowse}
            >
              <HugeiconsIcon
                icon={icon}
                data-icon="inline-start"
                strokeWidth={2}
              />
              {busy ? busyLabel : buttonLabel}
            </Button>

            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <HugeiconsIcon
                icon={LockKeyIcon}
                className="size-4"
                strokeWidth={2}
                aria-hidden="true"
              />
              {privacyNote}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
