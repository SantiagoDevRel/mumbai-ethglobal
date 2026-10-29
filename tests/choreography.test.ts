import assert from "node:assert/strict";
import test from "node:test";
import { SCENES, SECTIONS, sceneIndex, sectionProgress } from "../shared/scenes.ts";
import { initialState, reduce, type StageState } from "../lib/stage/store.ts";

const at = (id: Parameters<typeof sceneIndex>[0]): StageState => reduce(initialState(), { type: "goto", index: sceneIndex(id) });
const next = (state: StageState) => reduce(state, { type: "next" });
const prev = (state: StageState) => reduce(state, { type: "prev" });

test("L3 runs the B3 query one filter per step, and stepping back removes it", () => {
  let state = at("L3");
  assert.equal(state.panels.query, true);
  assert.equal(state.panels.filters, true);
  assert.equal(state.chainFilters.color, undefined);
  state = next(state);
  assert.equal(state.chainFilters.color, "#fe7446");
  assert.equal(state.chainFilters.country, undefined);
  state = next(state);
  assert.equal(state.chainFilters.country, "IN");
  assert.equal(state.chainFilters.viewport, undefined);
  assert.equal(state.chainFilters.owner, undefined);
  state = prev(state);
  assert.equal(state.chainFilters.country, undefined);
  assert.equal(state.chainFilters.color, "#fe7446");
});

test("L3 stays on the globe until AND country is India, then flies to India, and back on ←", () => {
  let state = at("L3");
  assert.equal(state.camera.cue, "globe");
  const entered = state.camera.nonce;
  state = next(state);
  assert.equal(state.camera.cue, "globe");
  assert.equal(state.camera.nonce, entered, "the color filter leaves the camera where it is");
  state = next(state);
  assert.equal(state.camera.cue, "india");
  assert.equal(state.camera.nonce, entered + 1);
  assert.equal(reduce(state, { type: "resetCamera" }).camera.cue, "india", "R puts the camera back on this step's view");
  state = prev(state);
  assert.equal(state.camera.cue, "globe");
  // Coming back from Own it lands on L3's last step, on India.
  let back = at("L6");
  back = prev(back);
  assert.equal(SCENES[back.sceneIndex]!.id, "L3");
  assert.equal(back.step, 2);
  assert.equal(back.camera.cue, "india");
});

test("leaving L3 clears its filters and opens the entity card for Own it", () => {
  let state = at("L3");
  for (let i = 0; i < 2; i++) state = next(state);
  state = next(state);
  assert.equal(SCENES[state.sceneIndex]!.id, "L6");
  assert.equal(state.chainFilters.color, undefined);
  assert.equal(state.chainFilters.country, undefined);
  assert.equal(state.panels.query, false);
  assert.equal(state.panels.inspector, true);
});

test("only L3 shows the query panel", () => {
  for (const id of ["L1", "L6", "L2", "L9"] as const) assert.equal(at(id).panels.query, false, id);
  assert.equal(at("L3").panels.query, true);
});

test("L6 opens the entity card for the real transfer; the map stays on the dots", () => {
  let state = at("L6");
  assert.equal(state.panels.inspector, true);
  assert.equal(state.panels.query, false);
  state = next(state);
  assert.equal(state.map, "dots");
  assert.equal(state.transferred, false);
});

test("D shows the write! frame, a second D brings the card back, and the next scene clears it", () => {
  let state = at("S7");
  assert.equal(state.countdownAt, null);
  state = reduce(state, { type: "countdown" }, 1000);
  assert.equal(state.countdownAt, 1000);
  state = reduce(state, { type: "countdown" }, 2000);
  assert.equal(state.countdownAt, null);
  state = reduce(state, { type: "countdown" }, 3000);
  state = reduce(reduce(state, { type: "next" }, 4000), { type: "next" }, 5000);
  assert.equal(SCENES[state.sceneIndex]!.id, "L1");
  assert.equal(state.countdownAt, null);
});

test("Reset starts over at S0 on the new session and clears what the presenter did", () => {
  let state = reduce(at("L6"), { type: "hideSelected" });
  state = reduce(state, { type: "setOverlay", key: "0x01", name: "vegan", value: "yes" });
  state = reduce(state, { type: "reset", session: "NEWCODE1" });
  assert.equal(state.sceneIndex, 0);
  assert.equal(state.session, "NEWCODE1");
  assert.deepEqual([state.hidden, state.overlays, state.selected, state.inspected], [[], {}, [], null]);
  assert.equal(state.countdownAt, null);
});

test("slides after the live part close every panel, and so does the close", () => {
  for (const id of ["B4", "B5", "T1", "T2", "PZ", "L9"] as const) {
    const { panels } = at(id);
    assert.deepEqual([panels.query, panels.filters, panels.inspector], [false, false, false], id);
  }
});

test("the room scans in Build it: no QR before S7, large on S7, in the corner with the map", () => {
  assert.ok(SCENES.every((scene) => !/door/i.test(scene.title + scene.qr.label)));
  for (const scene of SCENES) {
    const expected = scene.id === "S7" ? "center" : scene.kind === "live" ? "corner" : "none";
    assert.equal(scene.qr.placement, expected, scene.id);
  }
  // Nothing before S7 is live: the map with its QR comes back only after the room has written.
  assert.ok(SCENES.slice(0, sceneIndex("S7")).every((scene) => scene.kind === "slide"));
  assert.equal(SCENES[sceneIndex("S7")]!.section, "build");
});

test("one idea per scene, in the outline's order", () => {
  const order = (id: Parameters<typeof sceneIndex>[0]) => sceneIndex(id);
  assert.deepEqual(
    SCENES.map((scene) => scene.id),
    ["S0", "ME", "IX", "W1", "W2", "W3", "W4", "ST", "S7", "L1", "B2", "B3", "L3", "L6", "L2", "B4", "B5", "T1", "T2", "PZ", "L9"],
  );
  assert.ok(order("B3") < order("L3"), "the query slide comes right before the query runs");
  assert.equal(new Set(SCENES.map((scene) => scene.title)).size, SCENES.length, "no title twice");
  for (let i = 1; i < SCENES.length; i++) assert.ok(SCENES[i]!.at > SCENES[i - 1]!.at, SCENES[i]!.id);
  // The opening (title, who I am, index) has no part; every other scene has one, and the parts run in order.
  assert.deepEqual(SCENES.filter((scene) => !scene.section).map((scene) => scene.id), ["S0", "ME", "IX"]);
  const parts = SCENES.filter((scene) => scene.section).map((scene) => SECTIONS.findIndex((section) => section.id === scene.section));
  assert.ok(parts.every((part, i) => part >= 0 && (i === 0 || part >= parts[i - 1]!)));
  assert.deepEqual([...new Set(parts)], SECTIONS.map((_, i) => i));
});

test("the outline bar fills each part on every → and finishes it before the next one starts", () => {
  const progress = (id: Parameters<typeof sceneIndex>[0], step = 0) => Object.fromEntries(sectionProgress(sceneIndex(id), step).map((part) => [part.id, part.progress]));
  assert.deepEqual(progress("IX"), { why: 0, start: 0, build: 0, tools: 0 });
  const w1 = progress("W1");
  assert.ok(w1.why! > 0 && w1.why! < 1);
  assert.ok(progress("W1", 1).why! > w1.why!, "a reveal step moves the bar");
  assert.equal(progress("W4", 1).why, 1);
  assert.deepEqual(progress("ST"), { why: 1, start: 1 / 5, build: 0, tools: 0 });
  assert.equal(progress("L9").tools, 1);
  // Walking every scene and step, the bar never moves backwards.
  let last = -1;
  for (const [index, scene] of SCENES.entries()) {
    for (let step = 0; step < scene.steps; step++) {
      const total = sectionProgress(index, step).reduce((sum, part) => sum + part.progress, 0);
      assert.ok(total >= last, `${scene.id} step ${step}`);
      last = total;
    }
  }
});
