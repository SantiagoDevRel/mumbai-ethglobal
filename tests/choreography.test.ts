import assert from "node:assert/strict";
import test from "node:test";
import { SCENES, SECTIONS, sceneIndex } from "../shared/scenes.ts";
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

test("the QR invites the room from the first slide; no scene waits for doors", () => {
  assert.equal(SCENES[0]!.qr.label, "Scan now");
  assert.equal(SCENES[sceneIndex("L1")]!.qr.label, "Join the map");
  assert.ok(SCENES.every((scene) => !/door/i.test(scene.title + scene.qr.label)));
});

test("D runs the 3 · 2 · 1 countdown and a second D brings the card back", () => {
  let state = at("S7");
  assert.equal(state.countdownAt, null);
  state = reduce(state, { type: "countdown" }, 1000);
  assert.equal(state.countdownAt, 1000);
  state = reduce(state, { type: "countdown" }, 2000);
  assert.equal(state.countdownAt, null);
});

test("Reset starts over at S0 on the new session and clears what the presenter did", () => {
  let state = reduce(at("L4"), { type: "hideSelected" });
  state = reduce(state, { type: "setOverlay", key: "0x01", name: "vegan", value: "yes" });
  state = reduce(state, { type: "reset", session: "NEWCODE1" });
  assert.equal(state.sceneIndex, 0);
  assert.equal(state.session, "NEWCODE1");
  assert.deepEqual([state.hidden, state.overlays, state.selected, state.inspected], [[], {}, [], null]);
  assert.equal(state.countdownAt, null);
});

test("closing scenes close every panel", () => {
  for (const id of ["L7", "L8", "L9"] as const) {
    const { panels } = at(id);
    assert.deepEqual([panels.query, panels.filters, panels.inspector], [false, false, false], id);
  }
});

test("one screen, one thing at a time: the room writes on the map, then the slides, then the map", () => {
  const order = (id: Parameters<typeof sceneIndex>[0]) => sceneIndex(id);
  assert.ok(order("S0") < order("S7") && order("S7") < order("L1") && order("L1") < order("AG") && order("AG") < order("S1"));
  assert.ok(order("S6") < order("L2"));
  for (let i = 1; i < SCENES.length; i++) assert.ok(SCENES[i]!.at > SCENES[i - 1]!.at, SCENES[i]!.id);
  // Every scene but the agenda belongs to a part, and the parts run in the agenda's order.
  const parts = SCENES.filter((scene) => scene.id !== "AG").map((scene) => SECTIONS.findIndex((section) => section.id === scene.section));
  assert.ok(parts.every((part, i) => part >= 0 && (i === 0 || part >= parts[i - 1]!)));
  assert.deepEqual([...new Set(parts)], SECTIONS.map((_, i) => i));
  // Slides keep the whole screen; the QR shows on the title, large on S7, and with the map.
  for (const scene of SCENES) {
    const expected = scene.id === "S7" ? "center" : scene.kind === "live" || scene.id === "S0" || scene.id === "L8" ? "corner" : "none";
    assert.equal(scene.qr.placement, expected, scene.id);
  }
});
