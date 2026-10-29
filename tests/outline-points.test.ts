import assert from "node:assert/strict";
import test from "node:test";
import { POINTS } from "../app/deck/points.ts";
import { SCENES } from "../shared/scenes.ts";

// /outline shows each scene as a few short points (Santiago, October 29: bullet points only).
test("every scene in the talk has one to three short points, and nothing else is listed", () => {
  assert.deepEqual(Object.keys(POINTS).sort(), SCENES.map((scene) => scene.id).sort());
  for (const scene of SCENES) {
    const points = POINTS[scene.id];
    assert.ok(points.length >= 1 && points.length <= 3, `${scene.id}: ${points.length} points`);
    for (const point of points) assert.ok(point.length <= 64, `${scene.id}: "${point}" is ${point.length} characters`);
  }
});

test("the points keep the talk's vocabulary", () => {
  const text = Object.values(POINTS).flat().join("\n");
  assert.doesNotMatch(text, /\$creator|\bTTL\b|\brecords?\b|time-to-live|on Ethereum/i);
  assert.doesNotMatch(text, /\b\d{1,2}:\d{2}\b|\bminutes?\b/, "no times on the outline");
});
