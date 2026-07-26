export type DndGroupOrder = {
  groupId: string;
  jobIds: string[];
};

export type DndJobItems = Record<string, string[]>;

type DndJob = {
  id: string;
  groupId: string;
};

type CreateDndGroupOrdersInput = {
  groupIds: string[];
  jobs: DndJob[];
  jobId: string;
  targetGroupId: string;
  targetIndex: number;
};

export function createDndJobItems(
  groupIds: string[],
  jobs: DndJob[],
): DndJobItems {
  return Object.fromEntries(
    groupIds.map((groupId) => [
      groupId,
      jobs.filter((job) => job.groupId === groupId).map((job) => job.id),
    ]),
  );
}

export function createDndGroupOrdersFromItems(
  groupIds: string[],
  items: DndJobItems,
): DndGroupOrder[] {
  return groupIds.map((groupId) => ({
    groupId,
    jobIds: items[groupId] ?? [],
  }));
}

export function createDndGroupOrders({
  groupIds,
  jobs,
  jobId,
  targetGroupId,
  targetIndex,
}: CreateDndGroupOrdersInput): DndGroupOrder[] | undefined {
  if (
    !groupIds.includes(targetGroupId) ||
    !jobs.some((job) => job.id === jobId)
  ) {
    return undefined;
  }

  const orders = createDndGroupOrdersFromItems(
    groupIds,
    createDndJobItems(groupIds, jobs),
  ).map((order) => ({
    ...order,
    jobIds: order.jobIds.filter((id) => id !== jobId),
  }));
  const targetOrder = orders.find((order) => order.groupId === targetGroupId);
  if (!targetOrder) return undefined;

  const insertionIndex = Math.min(
    Math.max(0, targetIndex),
    targetOrder.jobIds.length,
  );
  targetOrder.jobIds.splice(insertionIndex, 0, jobId);

  return orders;
}
