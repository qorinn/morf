import assert from "node:assert/strict";
import test from "node:test";

import {
  addHardCut,
  addSpeedPoint,
  createSpeedCurveFileName,
  defaultSpeedCurve,
  defaultSpeedTransition,
  estimateOutputDuration,
  frameNumberAtSourceTime,
  isHardCut,
  normalizeSpeedCurve,
  outputTimeAtSourceTime,
  snapSpeed,
  sourceTimeAtPosition,
  speedAt,
  speedPresets,
  sampleSpeedCurve,
  updateHardCutPosition,
  updateHardCutSpeed,
  updateSpeedPoint,
} from "./curve.ts";

test("a görbe végpontjait rögzíti és a sebességet tartományba kényszeríti", () => {
  assert.deepEqual(normalizeSpeedCurve({ points: [{ position: 0.4, speed: 20 }] }), {
    points: [
      { position: 0, speed: 1, incomingTransition: defaultSpeedTransition, outgoingTransition: defaultSpeedTransition },
      { position: 0.4, speed: 10, incomingTransition: defaultSpeedTransition, outgoingTransition: defaultSpeedTransition },
      { position: 1, speed: 1, incomingTransition: defaultSpeedTransition, outgoingTransition: defaultSpeedTransition },
    ],
  });
});

test("a simított interpoláció nem lép ki a szomszédos sebességek közül", () => {
  const curve = { points: [{ position: 0, speed: 0.2 }, { position: 1, speed: 7 }] };
  for (let index = 0; index <= 100; index += 1) {
    const value = speedAt(curve, index / 100);
    assert.ok(value >= 0.2 && value <= 7);
  }
});

test("a normál görbe nem változtatja a becsült hosszt", () => {
  assert.equal(estimateOutputDuration(defaultSpeedCurve, 120), 120);
});

test("a gyorsabb görbe rövidebb kimenetet becsül", () => {
  assert.ok(estimateOutputDuration(speedPresets[3].curve, 60) < 60);
});

test("a köztes pont a végpontok között marad húzáskor", () => {
  const curve = addSpeedPoint(defaultSpeedCurve, { position: 0.5, speed: 2 });
  const updated = updateSpeedPoint(curve, 1, { position: 1.5, speed: 3 });
  assert.equal(updated.points[1].position, 0.99);
  assert.ok(updated.points[1].position < updated.points[2].position);
});

test("a kezdő- és végpont sebessége szerkeszthető, de a pozíciójuk rögzített", () => {
  const startAdjusted = updateSpeedPoint(defaultSpeedCurve, 0, { position: 0.4, speed: 2.34 });
  const adjusted = updateSpeedPoint(startAdjusted, startAdjusted.points.length - 1, { position: 0.6, speed: 0.56 });
  const first = adjusted.points[0];
  const last = adjusted.points.at(-1);

  assert.ok(first && !isHardCut(first));
  assert.ok(last && !isHardCut(last));
  assert.equal(first.position, 0);
  assert.equal(first.speed, 2.3);
  assert.equal(last.position, 1);
  assert.equal(last.speed, 0.6);
});

test("a letöltési név a forrásnévből készül", () => {
  assert.equal(createSpeedCurveFileName("nyaralás.mov"), "nyaralás-speed-curve.mp4");
});

test("a görbepont forrásideje és képkockája pontosan számolódik", () => {
  assert.equal(sourceTimeAtPosition(0.5, 12), 6);
  assert.equal(frameNumberAtSourceTime(1.234, 30), 38);
  assert.equal(frameNumberAtSourceTime(0, 25), 1);
});

test("a sebességpontok 0,1×-es lépésekre igazodnak", () => {
  assert.equal(snapSpeed(2.34), 2.3);
  assert.equal(snapSpeed(2.36), 2.4);
  const normalized = normalizeSpeedCurve({ points: [{ position: 0.5, speed: 0.55 }] });
  assert.ok(!isHardCut(normalized.points[1]));
  assert.equal(normalized.points[1].speed, 0.6);
});

test("a forrásidőből számolt preview idő a kimeneti hosszhoz igazodik", () => {
  const curve = { points: [{ position: 0, speed: 2 }, { position: 1, speed: 2 }] };
  assert.ok(Math.abs(outputTimeAtSourceTime(curve, 20, 10) - 5) < 0.0001);
  assert.ok(Math.abs(outputTimeAtSourceTime(curve, 20, 20) - estimateOutputDuration(curve, 20)) < 0.0001);
});

test("a lineáris átmenet középen is lineáris sebességet ad", () => {
  const curve = {
    points: [
      { position: 0, speed: 1, outgoingTransition: "linear" as const },
      { position: 1, speed: 3, incomingTransition: "linear" as const },
    ],
  };
  assert.ok(Math.abs(speedAt(curve, 0.5) - 2) < 0.0001);
});

test("a kétoldali easing eltér a lineáris átmenettől, de a végértékeket megtartja", () => {
  const curve = {
    points: [
      { position: 0, speed: 1, outgoingTransition: "ease-in" as const },
      { position: 1, speed: 5, incomingTransition: "ease-out" as const },
    ],
  };
  assert.equal(speedAt(curve, 0), 1);
  assert.equal(speedAt(curve, 1), 5);
  assert.notEqual(Number(speedAt(curve, 0.25).toFixed(3)), 2);
});

test("a hard cut két azonos időbélyegű pont között valódi függőleges ugrást készít", () => {
  const cut = {
    points: [
      { position: 0, speed: 1 },
      { kind: "hard-cut" as const, position: 0.5, beforeSpeed: 1, afterSpeed: 2.8, incomingTransition: "linear" as const, outgoingTransition: "linear" as const },
      { position: 1, speed: 1 },
    ],
  };
  assert.equal(speedAt(cut, 0.499), 1);
  assert.equal(speedAt(cut, 0.5), 2.8);
  assert.ok(sampleSpeedCurve(cut).some((sample, index, samples) => sample.position === 0.5 && sample.speed === 1 && samples[index + 1]?.speed === 2.8));
});

test("a hard cut két vége külön állítható, az időpontjuk együtt mozog", () => {
  const inserted = addHardCut(defaultSpeedCurve, { position: 0.5, afterSpeed: 2.8 });
  const beforeAdjusted = updateHardCutSpeed(inserted, 1, "before", 1.7);
  const adjusted = updateHardCutPosition(updateHardCutSpeed(beforeAdjusted, 1, "after", 0.6), 1, 0.65);
  const samples = sampleSpeedCurve(adjusted);

  assert.ok(isHardCut(adjusted.points[1]));
  assert.equal(adjusted.points[1].position, 0.65);
  assert.equal(adjusted.points[1].beforeSpeed, 1.7);
  assert.equal(adjusted.points[1].afterSpeed, 0.6);
  assert.ok(samples.some((sample, index) => sample.position === 0.65 && sample.speed === 1.7 && samples[index + 1]?.speed === 0.6));
  assert.equal(speedAt(adjusted, 0.65), 0.6);
});
