// What each scene and reveal step does to the stage. Contract owned by the orchestrator.
//
// Applied by the store on every scene change and every → / ←, so stepping back undoes a step.
// Only pure state lives here: panels, filters, map layer and camera.
// Chain writes (extend, transfer) run from the inspector; the effect handlers run them.

import type { SceneId } from "../../shared/scenes.ts";
import type { ChainFilters } from "../../shared/types.ts";
import type { Panel, StageState } from "./store.ts";

type Panels = Partial<Record<Exclude<Panel, "controls">, boolean>>;

const CLOSED: Panels = { filters: false, inspector: false, query: false };

/** Panels each scene opens on entry. Anything not listed is closed. */
// Only "Query it" shows the query panel; L1 and L2 keep the map and the list of writes clear.
const SCENE_PANELS: Partial<Record<SceneId, Panels>> = {
  L3: { query: true, filters: true },
  L6: { inspector: true },
};

/** L3: one filter per →, the query from the B3 slide (color is orange AND country is India).
 * Step 0 is the unfiltered query. */
function queryItFilters(base: ChainFilters, step: number): ChainFilters {
  const filters: ChainFilters = { ...base, color: undefined, country: undefined, viewport: undefined, owner: undefined };
  if (step >= 1) filters.color = "#fe7446";
  if (step >= 2) filters.country = "IN";
  return filters;
}

/**
 * The stage state for `state.sceneIndex` at `state.step`, given the scene was just entered
 * (`entered`) or a step changed inside it.
 */
export function choreograph(state: StageState, sceneId: SceneId, entered: boolean): StageState {
  let next = state;
  if (entered) {
    next = { ...next, panels: { ...next.panels, ...CLOSED, ...SCENE_PANELS[sceneId] } };
    // L3 filters belong to L3: every other scene queries everything again.
    if (sceneId !== "L3") next = { ...next, chainFilters: queryItFilters(next.chainFilters, 0) };
  }
  if (sceneId === "L3") return { ...next, chainFilters: queryItFilters(next.chainFilters, next.step) };
  return next;
}
