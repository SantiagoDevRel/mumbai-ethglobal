import assert from "node:assert/strict";
import test from "node:test";
import { SCENES, SECTIONS, sceneIndex, sectionProgress } from "../shared/scenes.ts";
import { initialState, reduce, type StageState } from "../lib/stage/store.ts";
import { filterCamera, quietMap } from "../lib/stage/choreography.ts";

const at = (id: Parameters<typeof sceneIndex>[0]): StageState => reduce(initialState(), { type: "goto", index: sceneIndex(id) });
const next = (state: StageState) => reduce(state, { type: "next" });
const prev = (state: StageState) => reduce(state, { type: "prev" });
/** What the filter bar does: merge one field into the current filters. */
const filter = (state: StageState, change: Partial<StageState["chainFilters"]>) => reduce(state, { type: "setChainFilters", filters: { ...state.chainFilters, ...change } });

test("L3 opens on the whole globe with no filter, and no → adds one", () => {
  const state = at("L3");
  assert.equal(state.panels.query, true);
  assert.equal(state.panels.filters, true);
  assert.deepEqual(state.chainFilters, { kinds: ["dot"] });
  assert.equal(state.camera.cue, "globe");
  assert.equal(SCENES[state.sceneIndex]!.qr.placement, "none", "no QR on L3");
  // The presenter filters by hand: → leaves the scene instead of adding a filter.
  assert.equal(SCENES[next(state).sceneIndex]!.id, "B4");
});

test("a country filter on L3 flies the camera there; a name or a color leaves it alone", () => {
  let state = at("L3");
  const entered = state.camera.nonce;
  state = filter(state, { namePrefix: "pri" });
  assert.equal(state.camera.cue, "globe");
  assert.equal(state.camera.nonce, entered, "typing a name keeps the camera where the presenter put it");
  state = filter(state, { color: "#fe7446" });
  assert.equal(state.camera.nonce, entered);
  state = filter(state, { country: "in" });
  assert.deepEqual(state.camera, { cue: "country:in", nonce: entered + 1 });
  state = filter(state, { namePrefix: "priy" });
  assert.equal(state.camera.nonce, entered + 1, "still India: no second flight");
  assert.equal(reduce(state, { type: "resetCamera" }).camera.cue, "country:in", "R flies back to the filtered country");
  state = filter(state, { country: "co" });
  assert.deepEqual(state.camera, { cue: "country:co", nonce: entered + 2 });
  state = filter(state, { country: undefined });
  assert.deepEqual(state.camera, { cue: "globe", nonce: entered + 3 }, "clearing the country flies back to the globe");
  assert.equal(reduce(state, { type: "resetCamera" }).camera.cue, "globe");
});

test("filters move the camera only on L3, and the cue is lower case", () => {
  for (const id of ["L1", "B4", "L9"] as const) {
    const state = at(id);
    assert.deepEqual(filter(state, { country: "in" }).camera, state.camera, id);
  }
  assert.equal(filterCamera("L1", { kinds: ["dot"], country: "in" }), null);
  assert.equal(filterCamera("L3", { kinds: ["dot"], country: "IN" }), "country:in");
  assert.equal(filterCamera("L3", { kinds: ["dot"], namePrefix: "a" }), "globe");
});

test("filters set by hand belong to that visit: leaving L3 and coming back starts unfiltered", () => {
  let state = filter(filter(at("L3"), { country: "in" }), { color: "#fe7446", namePrefix: "pri" });
  state = next(state);
  assert.equal(SCENES[state.sceneIndex]!.id, "B4");
  assert.deepEqual(state.chainFilters, { kinds: ["dot"] });
  state = prev(state);
  assert.equal(SCENES[state.sceneIndex]!.id, "L3");
  assert.deepEqual(state.chainFilters, { kinds: ["dot"] });
  assert.equal(state.camera.cue, "globe");
  // A filter left on any other scene doesn't reach L3 either.
  state = reduce(filter(at("L1"), { country: "in", color: "#fe7446" }), { type: "goto", index: sceneIndex("L3") });
  assert.deepEqual(state.chainFilters, { kinds: ["dot"] });
});

test("only L3 shows the query panel and the filter bar", () => {
  for (const id of ["L1", "L9"] as const) {
    const { panels } = at(id);
    assert.deepEqual([panels.query, panels.filters, panels.inspector], [false, false, false], id);
  }
  assert.equal(at("L3").panels.query, true);
});

test("the entity card opens from a dot on L1 and L3: transfer and extend live there", () => {
  for (const id of ["L1", "L3"] as const) {
    const state = reduce(at(id), { type: "inspect", key: "0x01" });
    assert.equal(state.panels.inspector, true, id);
    assert.equal(state.map, "dots", id);
    assert.equal(reduce(state, { type: "transferTo", key: "0x01", newOwner: "0x02" }), state, "a transfer is a side effect, not a state change");
  }
});

test("the close keeps the map quiet; no other scene does", () => {
  assert.deepEqual(SCENES.filter((scene) => quietMap(scene.id)).map((scene) => scene.id), ["L9"]);
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
  let state = filter(reduce(reduce(at("L3"), { type: "select", keys: ["0x01"], mode: "set" }), { type: "hideSelected" }), { country: "in" });
  state = reduce(state, { type: "setOverlay", key: "0x01", name: "vegan", value: "yes" });
  state = reduce(state, { type: "reset", session: "NEWCODE1" });
  assert.equal(state.sceneIndex, 0);
  assert.equal(state.session, "NEWCODE1");
  assert.deepEqual([state.hidden, state.overlays, state.selected, state.inspected], [[], {}, [], null]);
  assert.deepEqual(state.chainFilters, { kinds: ["dot"] });
  assert.equal(state.camera.cue, SCENES[0]!.camera);
  assert.equal(state.countdownAt, null);
});

test("slides after the live part close every panel, and so does the close", () => {
  for (const id of ["B4", "B5", "T1", "T2", "PZ", "L9"] as const) {
    const { panels } = at(id);
    assert.deepEqual([panels.query, panels.filters, panels.inspector], [false, false, false], id);
  }
});

test("the room scans in Build your entity: no QR before S7, large on S7, in the corner on L1 only", () => {
  assert.ok(SCENES.every((scene) => !/door/i.test(scene.title + scene.qr.label)));
  for (const scene of SCENES) {
    const expected = scene.id === "S7" ? "center" : scene.id === "L1" ? "corner" : "none";
    assert.equal(scene.qr.placement, expected, scene.id);
  }
  // Nothing before S7 is live: the map with its QR comes back only after the room has written.
  assert.ok(SCENES.slice(0, sceneIndex("S7")).every((scene) => scene.kind === "slide"));
  assert.equal(SCENES[sceneIndex("S7")]!.section, "build");
});

test("one idea per scene, in the outline's order", () => {
  const order = (id: Parameters<typeof sceneIndex>[0]) => sceneIndex(id);
  // Own it (L6) and Expire it (L2) are gone (October 29); What Arkiv DB-Chain is not (NT) follows the five steps.
  assert.deepEqual(
    SCENES.map((scene) => scene.id),
    ["S0", "ME", "IX", "W1", "W2", "W3", "W4", "ST", "NT", "S7", "L1", "L3", "B4", "B5", "T1", "T2", "PZ", "L9"],
  );
  assert.equal(order("L3"), order("L1") + 1, "the query runs right after the write: L1's Write it and Query it buttons open the code on the map");
  assert.equal(new Set(SCENES.map((scene) => scene.title)).size, SCENES.length, "no title twice");
  for (let i = 1; i < SCENES.length; i++) assert.ok(SCENES[i]!.at > SCENES[i - 1]!.at, SCENES[i]!.id);
  for (const id of ["L1", "L3", "L9"] as const) assert.equal(SCENES[order(id)]!.steps, 1, `${id} has no reveal steps`);
  // The opening (title, who I am, index) has no part; every other scene has one, and the parts run in order.
  assert.deepEqual(SCENES.filter((scene) => !scene.section).map((scene) => scene.id), ["S0", "ME", "IX"]);
  const parts = SCENES.filter((scene) => scene.section).map((scene) => SECTIONS.findIndex((section) => section.id === scene.section));
  assert.ok(parts.every((part, i) => part >= 0 && (i === 0 || part >= parts[i - 1]!)));
  assert.deepEqual([...new Set(parts)], SECTIONS.map((_, i) => i));
});

test("W2 turns to the hug on its →, and W4 adds one column of the app view per →", () => {
  const where = (state: StageState) => [SCENES[state.sceneIndex]!.id, state.step];
  let state = next(at("W2"));
  assert.deepEqual(where(state), ["W2", 1], "the meme gives way to the hug");
  assert.deepEqual(where(prev(state)), ["W2", 0], "← brings the meme back");
  assert.deepEqual(where(next(state)), ["W3", 0]);
  // W4: the network, then the DB-Chain, your logic and storage, one → each.
  state = at("W4");
  for (let step = 1; step < 4; step++) {
    state = next(state);
    assert.deepEqual(where(state), ["W4", step]);
  }
  assert.deepEqual(where(next(state)), ["ST", 0]);
});

test("the outline bar fills each part on every → and finishes it before the next one starts", () => {
  const progress = (id: Parameters<typeof sceneIndex>[0], step = 0) => Object.fromEntries(sectionProgress(sceneIndex(id), step).map((part) => [part.id, part.progress]));
  assert.deepEqual(progress("IX"), { why: 0, start: 0, build: 0, tools: 0 });
  const w1 = progress("W1");
  assert.ok(w1.why! > 0 && w1.why! < 1);
  assert.ok(progress("W1", 1).why! > w1.why!, "a reveal step moves the bar");
  // W4 builds up one column per → (four steps); its last step finishes "Why Arkiv".
  assert.ok(progress("W4", 2).why! < 1);
  assert.equal(progress("W4", SCENES[sceneIndex("W4")]!.steps - 1).why, 1);
  // "Five steps" holds ST (five reveals) and NT (three): eight units.
  assert.deepEqual(progress("ST"), { why: 1, start: 1 / 8, build: 0, tools: 0 });
  assert.equal(progress("NT", 2).start, 1);
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
