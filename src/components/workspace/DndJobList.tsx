import { type ReactNode } from "react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { useDragOperation, useDroppable } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import { cn } from "@/lib/utils";

export const imageJobDndType = "morf-image-job";
export const imageGroupDndKind = "morf-image-group";
export const imageNewGroupDndKind = "morf-image-new-group";
export const newGroupTarget = "__new-group__";

type DndJobListProps = {
  groupId: string;
  ariaLabel: string;
  disabled: boolean;
  className?: string;
  children: ReactNode;
};

type DndNewGroupTargetProps = {
  disabled: boolean;
  children: (isActiveTarget: boolean) => ReactNode;
};

export function getDndGroupDropId(groupId: string) {
  return groupId;
}

export function getDndTargetGroupId(
  target: ReturnType<typeof useDragOperation>["target"] | null | undefined,
): string | undefined {
  if (!target) return undefined;

  if (isSortable(target)) {
    return target.group === undefined ? undefined : String(target.group);
  }

  return target.data?.kind === imageGroupDndKind &&
    typeof target.data.groupId === "string"
    ? target.data.groupId
    : undefined;
}

export function DndJobList({
  groupId,
  ariaLabel,
  disabled,
  className,
  children,
}: DndJobListProps) {
  const { ref, isDropTarget } = useDroppable({
    id: getDndGroupDropId(groupId),
    type: imageGroupDndKind,
    accept: imageJobDndType,
    collisionPriority: CollisionPriority.Low,
    disabled,
    data: { kind: imageGroupDndKind, groupId },
  });
  const { source, target } = useDragOperation();
  const isActiveTarget =
    source?.type === imageJobDndType &&
    (isDropTarget || getDndTargetGroupId(target) === groupId);

  return (
    <div
      ref={ref}
      data-dnd-group-id={groupId}
      data-dnd-drop-target={isActiveTarget || undefined}
      role="list"
      aria-label={ariaLabel}
      className={cn(
        "morf-dnd-group-target min-h-full",
        isActiveTarget && "morf-dnd-drop-target",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DndNewGroupTarget({
  disabled,
  children,
}: DndNewGroupTargetProps) {
  const { ref, isDropTarget } = useDroppable({
    id: newGroupTarget,
    type: imageNewGroupDndKind,
    accept: imageJobDndType,
    collisionPriority: CollisionPriority.Low,
    disabled,
    data: { kind: imageNewGroupDndKind },
  });
  const { source, target } = useDragOperation();
  const isActiveTarget =
    source?.type === imageJobDndType &&
    (isDropTarget || target?.id === newGroupTarget);

  return (
    <div ref={ref} className="h-full min-w-0">
      {children(isActiveTarget)}
    </div>
  );
}
