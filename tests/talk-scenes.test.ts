import assert from "node:assert/strict";
import test from "node:test";
import { TALK_SCENES } from "../app/talk/scenes.ts";
import { SCENES } from "../shared/scenes.ts";

// /talk, the public copy (Santiago, November 1): the slides without the live demo, so the room
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
  for (const id of ["S7", "L1", "L3"]) assert.ok(!TALK_SCENES.some((scene) => scene.id === id), `${id} is in /talk`);
});
