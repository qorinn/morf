import assert from "node:assert/strict";
import test from "node:test";

import {
  addSpeedPoint,
  createSpeedCurveFileName,
  defaultSpeedCurve,
  defaultSpeedTransition,
  estimateOutputDuration,
  frameNumberAtSourceTime,
  normalizeSpeedCurve,
  outputTimeAtSourceTime,
  snapSpeed,
  sourceTimeAtPosition,
  speedAt,
  speedPresets,
  sampleSpeedCurve,
  updateSpeedPointTransition,
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
  assert.equal(normalizeSpeedCurve({ points: [{ position: 0.5, speed: 0.55 }] }).points[1].speed, 0.6);
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

test("a bal és jobb hard cut valódi függőleges sebességugrást készít", () => {
  const leftCut = {
    points: [
      { position: 0, speed: 1 },
      { position: 0.5, speed: 2.8, incomingTransition: "hard-cut" as const },
      { position: 1, speed: 1 },
    ],
  };
  assert.equal(speedAt(leftCut, 0.499), 1);
  assert.equal(speedAt(leftCut, 0.5), 2.8);

  const rightCut = updateSpeedPointTransition(leftCut, 1, "outgoing", "hard-cut");
  assert.equal(speedAt(rightCut, 0.5), 2.8);
  assert.equal(speedAt(rightCut, 0.501), 1);
  assert.ok(sampleSpeedCurve(rightCut).some((sample, index, samples) => index > 0 && sample.position === samples[index - 1].position && sample.speed !== samples[index - 1].speed));
});
