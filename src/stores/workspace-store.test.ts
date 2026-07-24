import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultConversionGroupId,
  useWorkspaceStore,
} from "./workspace-store.ts";

function addImages(count: number) {
  useWorkspaceStore.getState().addJobs(
    Array.from({ length: count }, (_, index) => ({
      file: new File(["image"], `image-${index + 1}.jpg`, {
        type: "image/jpeg",
      }),
      inputFormat: "jpeg" as const,
      previewUrl: `blob:preview-${index + 1}`,
    })),
  );
}

test.beforeEach(() => {
  useWorkspaceStore.getState().clearJobs();
});

test("feltöltéskor minden kép az alapcsoportba kerül kijelölés nélkül", () => {
  useWorkspaceStore.getState().createGroup();
  addImages(3);

  const state = useWorkspaceStore.getState();
  assert.equal(state.jobs.length, 3);
  assert.deepEqual(
    state.jobs.map((job) => job.groupId),
    [
      defaultConversionGroupId,
      defaultConversionGroupId,
      defaultConversionGroupId,
    ],
  );
  assert.equal(state.activeGroupId, defaultConversionGroupId);
  assert.deepEqual(state.selectedJobIds, []);
});

test("a kijelölt képek egy meglévő közös csoportba rendezhetők", () => {
  addImages(3);
  useWorkspaceStore.getState().createGroup();
  const targetGroupId = useWorkspaceStore.getState().activeGroupId;
  const [first, second] = useWorkspaceStore.getState().jobs;

  useWorkspaceStore.getState().toggleJobSelection(first.id);
  useWorkspaceStore.getState().toggleJobSelection(second.id);
  useWorkspaceStore.getState().assignSelectedJobsToGroup(targetGroupId);

  const state = useWorkspaceStore.getState();
  assert.equal(state.jobs[0].groupId, targetGroupId);
  assert.equal(state.jobs[1].groupId, targetGroupId);
  assert.equal(state.jobs[2].groupId, defaultConversionGroupId);
  assert.deepEqual(state.selectedJobIds, []);
});

test("egy kép csoportváltása nem módosítja a kijelölését", () => {
  addImages(2);
  useWorkspaceStore.getState().createGroup();
  const targetGroupId = useWorkspaceStore.getState().activeGroupId;
  const [selectedJob, unselectedJob] = useWorkspaceStore.getState().jobs;

  useWorkspaceStore.getState().toggleJobSelection(selectedJob.id);
  useWorkspaceStore.getState().assignJobToGroup(selectedJob.id, targetGroupId);
  useWorkspaceStore
    .getState()
    .assignJobToGroup(unselectedJob.id, targetGroupId);

  const state = useWorkspaceStore.getState();
  assert.deepEqual(state.selectedJobIds, [selectedJob.id]);
  assert.equal(state.jobs[0].groupId, targetGroupId);
  assert.equal(state.jobs[1].groupId, targetGroupId);
});

test("a kijelölt képekből képenként külön, azonos beállítású csoport készül", () => {
  addImages(3);
  useWorkspaceStore
    .getState()
    .updateGroupSettings(defaultConversionGroupId, { quality: 73 });
  const [first, second] = useWorkspaceStore.getState().jobs;

  useWorkspaceStore.getState().toggleJobSelection(first.id);
  useWorkspaceStore.getState().toggleJobSelection(second.id);
  useWorkspaceStore.getState().createSeparateGroupsFromSelectedJobs();

  const state = useWorkspaceStore.getState();
  assert.equal(state.groups.length, 3);
  assert.notEqual(state.jobs[0].groupId, state.jobs[1].groupId);
  assert.equal(state.jobs[2].groupId, defaultConversionGroupId);
  assert.equal(
    state.groups.find((group) => group.id === state.jobs[0].groupId)?.settings
      .quality,
    73,
  );
  assert.equal(
    state.groups.find((group) => group.id === state.jobs[1].groupId)?.settings
      .quality,
    73,
  );
  assert.deepEqual(state.selectedJobIds, []);
});

test("az egyetlen képet tartalmazó csoportok kijelölése nem hoz létre üres csoportokat", () => {
  addImages(5);

  const jobIds = useWorkspaceStore.getState().jobs.map((job) => job.id);
  for (const jobId of jobIds.slice(1)) {
    useWorkspaceStore.getState().createGroup();
    useWorkspaceStore
      .getState()
      .assignJobToGroup(jobId, useWorkspaceStore.getState().activeGroupId);
  }

  for (const jobId of jobIds) {
    useWorkspaceStore.getState().toggleJobSelection(jobId);
  }

  const createdGroupCount = useWorkspaceStore
    .getState()
    .createSeparateGroupsFromSelectedJobs();
  const state = useWorkspaceStore.getState();

  assert.equal(createdGroupCount, 0);
  assert.equal(state.groups.length, 5);
  assert.deepEqual(
    state.groups.map(
      (group) => state.jobs.filter((job) => job.groupId === group.id).length,
    ),
    [1, 1, 1, 1, 1],
  );
  assert.deepEqual(state.selectedJobIds, []);
});

test("teljesen kijelölt csoportnál egy kép az eredeti csoportban marad", () => {
  addImages(5);
  const jobIds = useWorkspaceStore.getState().jobs.map((job) => job.id);

  for (const jobId of jobIds) {
    useWorkspaceStore.getState().toggleJobSelection(jobId);
  }

  const createdGroupCount = useWorkspaceStore
    .getState()
    .createSeparateGroupsFromSelectedJobs();
  const state = useWorkspaceStore.getState();

  assert.equal(createdGroupCount, 4);
  assert.equal(state.groups.length, 5);
  assert.equal(
    state.jobs.filter((job) => job.groupId === defaultConversionGroupId).length,
    1,
  );
  assert.ok(
    state.groups.every((group) =>
      state.jobs.some((job) => job.groupId === group.id),
    ),
  );
  assert.equal(new Set(state.jobs.map((job) => job.groupId)).size, 5);
});

test("az új közös csoport az első kijelölt kép konfigurációját másolja", () => {
  addImages(2);
  useWorkspaceStore.getState().createGroup();
  const secondGroupId = useWorkspaceStore.getState().activeGroupId;
  useWorkspaceStore
    .getState()
    .updateGroupSettings(secondGroupId, { quality: 61 });
  const [first, second] = useWorkspaceStore.getState().jobs;
  useWorkspaceStore.getState().assignJobToGroup(first.id, secondGroupId);

  useWorkspaceStore.getState().toggleJobSelection(first.id);
  useWorkspaceStore.getState().toggleJobSelection(second.id);
  useWorkspaceStore.getState().createGroupFromSelectedJobs();

  const state = useWorkspaceStore.getState();
  const newGroup = state.groups.find(
    (group) => group.id === state.activeGroupId,
  );
  assert.ok(newGroup);
  assert.equal(newGroup.settings.quality, 61);
  assert.equal(state.jobs[0].groupId, newGroup.id);
  assert.equal(state.jobs[1].groupId, newGroup.id);
});

test("a csoport konvertálás kapcsolója minden benne lévő képre érvényes", () => {
  addImages(3);
  useWorkspaceStore
    .getState()
    .setGroupProcessing(defaultConversionGroupId, false);

  assert.deepEqual(
    useWorkspaceStore.getState().jobs.map((job) => job.shouldProcess),
    [false, false, false],
  );
  assert.equal(useWorkspaceStore.getState().groups[0].shouldProcess, false);

  useWorkspaceStore
    .getState()
    .setGroupProcessing(defaultConversionGroupId, true);

  assert.deepEqual(
    useWorkspaceStore.getState().jobs.map((job) => job.shouldProcess),
    [true, true, true],
  );
});

test("az inaktív csoportba áthelyezett kép is kimarad a konvertálásból", () => {
  addImages(2);
  useWorkspaceStore.getState().createGroup();
  const inactiveGroupId = useWorkspaceStore.getState().activeGroupId;
  const firstJob = useWorkspaceStore.getState().jobs[0];

  useWorkspaceStore.getState().setGroupProcessing(inactiveGroupId, false);
  useWorkspaceStore.getState().assignJobToGroup(firstJob.id, inactiveGroupId);

  const state = useWorkspaceStore.getState();
  assert.equal(state.jobs[0].groupId, inactiveGroupId);
  assert.equal(state.jobs[0].shouldProcess, false);
});

test("a kép ugyanabba a csoportba önálló feladatként duplikálható", () => {
  addImages(1);
  const source = useWorkspaceStore.getState().jobs[0];

  useWorkspaceStore.getState().renameJob(source.id, "kampanykep");
  useWorkspaceStore.getState().duplicateJob(source.id);

  const [original, copy] = useWorkspaceStore.getState().jobs;
  assert.equal(useWorkspaceStore.getState().jobs.length, 2);
  assert.notEqual(copy.id, original.id);
  assert.notEqual(copy.previewUrl, original.previewUrl);
  assert.strictEqual(copy.file, original.file);
  assert.equal(copy.groupId, original.groupId);
  assert.equal(copy.outputBaseName, "kampanykep-masolat");
  assert.equal(copy.status, "queued");
  assert.equal(copy.result, undefined);
});

test("a kép másolata új, azonos beállítású csoportba kerül", () => {
  addImages(1);
  const source = useWorkspaceStore.getState().jobs[0];
  const sourceGroup = useWorkspaceStore.getState().groups[0];

  useWorkspaceStore.getState().duplicateJobToNewGroup(source.id);

  const state = useWorkspaceStore.getState();
  const copy = state.jobs[1];
  const newGroup = state.groups[1];
  assert.equal(state.groups.length, 2);
  assert.equal(copy.groupId, newGroup.id);
  assert.deepEqual(newGroup.settings, sourceGroup.settings);
  assert.equal(state.activeGroupId, newGroup.id);
});

test("a kijelölt képek együtt törölhetők, a többi megmarad", () => {
  addImages(3);
  const [first, second, third] = useWorkspaceStore.getState().jobs;
  useWorkspaceStore.getState().toggleJobSelection(first.id);
  useWorkspaceStore.getState().toggleJobSelection(second.id);

  const removedCount = useWorkspaceStore.getState().removeSelectedJobs();
  const state = useWorkspaceStore.getState();

  assert.equal(removedCount, 2);
  assert.deepEqual(
    state.jobs.map((job) => job.id),
    [third.id],
  );
  assert.deepEqual(state.selectedJobIds, []);
});
