import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FileJobStatus } from "@/features/image-processing/types";

export type MascotState =
  | "idle"
  | "inspecting"
  | "loading-engine"
  | "tip"
  | "warning"
  | "processing"
  | "success"
  | "error";

type MascotAssistantProps = {
  state: MascotState;
  title: string;
  message: string;
};

const stateIcons = {
  idle: InformationCircleIcon,
  inspecting: InformationCircleIcon,
  "loading-engine": Loading03Icon,
  tip: InformationCircleIcon,
  warning: AlertCircleIcon,
  processing: Loading03Icon,
  success: CheckmarkCircle02Icon,
  error: AlertCircleIcon,
} as const;

export function getMascotState(status?: FileJobStatus): MascotState {
  if (!status || status === "queued") return "idle";
  if (status === "loading-engine") return "loading-engine";
  if (["decoding", "processing", "encoding"].includes(status))
    return "processing";
  if (status === "completed") return "success";
  if (status === "error") return "error";
  return "warning";
}

export function MascotAssistant({
  state,
  title,
  message,
}: MascotAssistantProps) {
  const icon = stateIcons[state];

  return (
    <Alert
      variant={state === "error" ? "destructive" : "default"}
      aria-live="polite"
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
