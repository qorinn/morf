import assert from "node:assert/strict";
import test from "node:test";

import {
  createDndGroupOrders,
  createDndGroupOrdersFromItems,
  createDndJobItems,
} from "./dnd-job-order.ts";

const groupIds = ["first", "second", "empty"];
const jobs = [
  { id: "a", groupId: "first" },
  { id: "b", groupId: "first" },
  { id: "c", groupId: "first" },
  { id: "d", groupId: "second" },
];

test("a store sorrendjéből kontrollált DnD listákat készít", () => {
  assert.deepEqual(createDndJobItems(groupIds, jobs), {
    first: ["a", "b", "c"],
    second: ["d"],
    empty: [],
  });
});

test("a húzás közbeni sorrendet teljes csoportsorrenddé alakítja", () => {
  assert.deepEqual(
    createDndGroupOrdersFromItems(groupIds, {
      first: ["b", "c"],
      second: ["d", "a"],
      empty: [],
    }),
    [
      { groupId: "first", jobIds: ["b", "c"] },
      { groupId: "second", jobIds: ["d", "a"] },
      { groupId: "empty", jobIds: [] },
    ],
  );
});

test("csoporton belül a megadott pozícióra rendezi a képet", () => {
  assert.deepEqual(
    createDndGroupOrders({
      groupIds,
      jobs,
      jobId: "a",
      targetGroupId: "first",
      targetIndex: 2,
    }),
    [
      { groupId: "first", jobIds: ["b", "c", "a"] },
      { groupId: "second", jobIds: ["d"] },
      { groupId: "empty", jobIds: [] },
    ],
  );
});

test("másik, nem üres csoportba a megfelelő helyre teszi a képet", () => {
  assert.deepEqual(
    createDndGroupOrders({
      groupIds,
      jobs,
      jobId: "b",
      targetGroupId: "second",
      targetIndex: 0,
    }),
    [
      { groupId: "first", jobIds: ["a", "c"] },
      { groupId: "second", jobIds: ["b", "d"] },
      { groupId: "empty", jobIds: [] },
    ],
  );
});

test("üres csoportba is áthelyezi a képet", () => {
  assert.deepEqual(
    createDndGroupOrders({
      groupIds,
      jobs,
      jobId: "c",
      targetGroupId: "empty",
      targetIndex: 0,
    }),
    [
      { groupId: "first", jobIds: ["a", "b"] },
      { groupId: "second", jobIds: ["d"] },
      { groupId: "empty", jobIds: ["c"] },
    ],
  );
});

test("a listán kívüli indexet biztonságosan korlátozza", () => {
  const before = createDndGroupOrders({
    groupIds,
    jobs,
    jobId: "c",
    targetGroupId: "second",
    targetIndex: -10,
  });
  const after = createDndGroupOrders({
    groupIds,
    jobs,
    jobId: "c",
    targetGroupId: "second",
    targetIndex: 99,
  });

  assert.deepEqual(before?.[1].jobIds, ["c", "d"]);
  assert.deepEqual(after?.[1].jobIds, ["d", "c"]);
});

test("ismeretlen képet vagy célcsoportot elutasít", () => {
  assert.equal(
    createDndGroupOrders({
      groupIds,
      jobs,
      jobId: "missing",
      targetGroupId: "first",
      targetIndex: 0,
    }),
    undefined,
  );
  assert.equal(
    createDndGroupOrders({
      groupIds,
      jobs,
      jobId: "a",
      targetGroupId: "missing",
      targetIndex: 0,
    }),
    undefined,
  );
});

test("egymást követő csoportváltásokat és a visszahúzást is kezeli", () => {
  const firstMove = createDndGroupOrders({
    groupIds,
    jobs,
    jobId: "a",
    targetGroupId: "second",
    targetIndex: 1,
  });
  assert.ok(firstMove);

  const jobsAfterFirstMove = firstMove.flatMap((order) =>
    order.jobIds.map((id) => ({ id, groupId: order.groupId })),
  );
  const secondMove = createDndGroupOrders({
    groupIds,
    jobs: jobsAfterFirstMove,
    jobId: "b",
    targetGroupId: "second",
    targetIndex: 0,
  });
  assert.ok(secondMove);
  assert.deepEqual(secondMove[1].jobIds, ["b", "d", "a"]);

  const jobsAfterSecondMove = secondMove.flatMap((order) =>
    order.jobIds.map((id) => ({ id, groupId: order.groupId })),
  );
  const moveBack = createDndGroupOrders({
    groupIds,
    jobs: jobsAfterSecondMove,
    jobId: "a",
    targetGroupId: "first",
    targetIndex: 0,
  });

  assert.deepEqual(moveBack, [
    { groupId: "first", jobIds: ["a", "c"] },
    { groupId: "second", jobIds: ["b", "d"] },
    { groupId: "empty", jobIds: [] },
  ]);
});
