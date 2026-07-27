import type { ReactNode } from "react";
import { ImageUploadIcon, LockKeyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import type { DropzoneState } from "react-dropzone";

import { Button } from "@/components/ui/button";
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
    <div
      {...getRootProps()}
      className={cn(
        "morf-dark-card border-dark-section-border relative min-h-80 rounded-3xl border border-dashed p-8 text-center transition-[border-color,box-shadow]",
        isDragActive &&
          "border-dark-section-accent ring-dark-section-accent/20 ring-3",
      )}
    >
      <img
        src={morfEmptyState.src}
        className="absolute top-1/2 left-[5%] hidden h-[80%] max-h-50 w-auto -translate-y-1/2 sm:block md:max-h-40 md:max-lg:left-1 lg:max-h-50 xl:max-h-60"
        alt=""
      />

      <div className="relative flex flex-col items-center justify-center gap-5 text-center">
        <span className="morf-icon-orb text-secondary-foreground flex size-16 items-center justify-center rounded-3xl">
          <HugeiconsIcon icon={icon} className="size-7" strokeWidth={1.8} />
        </span>

        <div className="flex max-w-xl flex-col items-center gap-2">
          <h3 className="font-heading text-xl font-medium">
            {isDragActive ? activeTitle : title}
          </h3>
          <p className="text-dark-section-muted max-w-2/3 text-balance">
            {description}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="text-foreground"
          disabled={disabled || busy}
          onClick={onBrowse}
        >
          <HugeiconsIcon icon={icon} data-icon="inline-start" strokeWidth={2} />
          {busy ? busyLabel : buttonLabel}
        </Button>

        <p className="text-dark-section-muted flex items-center gap-2 text-xs">
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
  );
}
