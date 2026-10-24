import assert from "node:assert/strict";
import test from "node:test";
import { SCENES, qrLabel, sceneIndex } from "../shared/scenes.ts";
import { WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { initialState, reduce, type StageState } from "../lib/stage/store.ts";
import { INDIA_VIEW } from "../lib/stage/choreography.ts";

const at = (id: Parameters<typeof sceneIndex>[0]): StageState => reduce(initialState(), { type: "goto", index: sceneIndex(id) });
const next = (state: StageState) => reduce(state, { type: "next" });
const prev = (state: StageState) => reduce(state, { type: "prev" });

test("L3 adds one filter per step and stepping back removes it", () => {
  let state = at("L3");
  assert.equal(state.panels.query, true);
  assert.equal(state.panels.filters, true);
  assert.equal(state.chainFilters.color, undefined);
  state = next(state);
  assert.equal(state.chainFilters.color, "#fe7446");
  state = next(state);
  assert.equal(state.chainFilters.country, "IN");
  state = next(state);
  assert.deepEqual(state.chainFilters.viewport, INDIA_VIEW);
  state = next(state);
  assert.equal(state.chainFilters.owner, WRITER_ADDRESS);
  state = prev(state);
  assert.equal(state.chainFilters.owner, undefined);
  assert.deepEqual(state.chainFilters.viewport, INDIA_VIEW);
});

test("leaving L3 clears its filters", () => {
  let state = at("L3");
  for (let i = 0; i < 4; i++) state = next(state);
  state = next(state);
  assert.equal(SCENES[state.sceneIndex]!.id, "L4");
  assert.equal(state.chainFilters.color, undefined);
  assert.equal(state.chainFilters.owner, undefined);
  assert.equal(state.panels.query, false);
  assert.equal(state.panels.inspector, true);
});

test("L5 asks on the dots, then answers in Mumbai business view", () => {
  let state = at("L5");
  assert.equal(state.map, "dots");
  const cameraBefore = state.camera.nonce;
  state = next(state);
  assert.equal(state.map, "business");
  assert.equal(state.camera.cue, "mumbai-street");
  assert.ok(state.camera.nonce > cameraBefore);
  const nonce = state.camera.nonce;
  state = next(state);
  assert.equal(state.camera.nonce, nonce, "reviews step keeps the camera");
  state = prev(prev(state));
  assert.equal(state.map, "dots");
});

test("L6 step 2 runs the demo transfer; panels close", () => {
  let state = at("L6");
  assert.equal(state.transferred, false);
  assert.equal(state.panels.query, false);
  state = next(state);
  assert.equal(state.transferred, true);
  state = prev(state);
  assert.equal(state.transferred, false);
});

test("the QR only says the doors are open once they are", () => {
  const l1 = SCENES[sceneIndex("L1")]!;
  assert.equal(qrLabel(l1, "closed"), "Doors open in a moment");
  assert.equal(qrLabel(l1, "open"), "Doors open");
  assert.equal(qrLabel(SCENES[0]!, "closed"), "Scan now");
});

test("closing scenes close every panel", () => {
  for (const id of ["L7", "L8", "L9"] as const) {
    const { panels } = at(id);
    assert.deepEqual([panels.query, panels.filters, panels.inspector], [false, false, false], id);
  }
});
