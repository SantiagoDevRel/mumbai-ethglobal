import assert from "node:assert/strict";
import test from "node:test";
import { FRAMES, TALK_SCENES } from "../app/slides/scenes.ts";
import { SCENES } from "../shared/scenes.ts";

// /slides, the public copy (Santiago, November 1): the slides without the live demo, so the room
// following along never reaches /scan or the writer.
test("the public copy keeps every slide without a QR, in the talk's order, and the close", () => {
  const expected = SCENES.filter((scene) => (scene.kind === "slide" && scene.qr.placement === "none") || scene.id === "L9");
  assert.deepEqual(TALK_SCENES.map((scene) => scene.id), expected.map((scene) => scene.id));
});

test("the public copy shows no QR and no live map scene but the close", () => {
  for (const scene of TALK_SCENES) {
    assert.equal(scene.qr.placement, "none", `${scene.id} shows a QR`);
    if (scene.kind === "live") assert.equal(scene.id, "L9");
  }
  for (const id of ["S7", "L1", "L3"]) assert.ok(!TALK_SCENES.some((scene) => scene.id === id), `${id} is in /slides`);
});

// Each slide shows complete, with no reveals: its last step, and both views of a slide whose → swaps
// one for the other (W2's meme and hug, W4's network and your app, PA's query and its owners).
test("each slide is one frame at its last step, and W2, W4 and PA keep both views", () => {
  const twoViews = new Set(["W2", "W4", "PA"]);
  assert.deepEqual(
    FRAMES.map((frame) => frame.id),
    TALK_SCENES.flatMap((scene) => (twoViews.has(scene.id) ? [scene.id, `${scene.id}-2`] : [scene.id])),
  );
  for (const frame of FRAMES) {
    if (twoViews.has(frame.scene.id)) continue;
    assert.equal(frame.step, frame.scene.steps - 1, `${frame.id} is not at its last step`);
  }
  const steps = (id: string) => FRAMES.filter((frame) => frame.scene.id === id).map((frame) => frame.step);
  assert.deepEqual(steps("W2"), [0, 1]);
  assert.deepEqual(steps("W4"), [2, 5], "W4: the whole network, then the whole app view");
  assert.deepEqual(steps("PA"), [1, 3], "PA: one project's query, then every map entity with its owner");
  assert.equal(new Set(FRAMES.map((frame) => frame.id)).size, FRAMES.length, "every frame has its own address");
});
