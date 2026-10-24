// What each scene and reveal step does to the stage. Contract owned by the orchestrator.
//
// Applied by the store on every scene change and every → / ←, so stepping back undoes a step.
// Only pure state lives here: panels, filters, map layer, camera and the demo transfer.
// Chain writes (extend, make business) stay on presenter keys; the effect handlers run them.

import type { SceneId } from "../../shared/scenes.ts";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles.ts";
import type { ChainFilters } from "../../shared/types.ts";
import type { Panel, StageState } from "./store.ts";

type Panels = Partial<Record<Exclude<Panel, "controls">, boolean>>;

const CLOSED: Panels = { filters: false, inspector: false, query: false };

/** Panels each scene opens on entry. Anything not listed is closed. */
const SCENE_PANELS: Partial<Record<SceneId, Panels>> = {
  L1: { query: true },
  L2: { query: true },
  L3: { query: true, filters: true },
  L4: { inspector: true },
  L5: { query: true },
};

/** L3 view of India for "inside this map view" (a latitude/longitude range). */
export const INDIA_VIEW = { minLat: 6, maxLat: 36, minLng: 68, maxLng: 98 };

/** L3: one filter per →, in the order of the talk. Step 0 is the unfiltered query. */
function queryItFilters(base: ChainFilters, step: number): ChainFilters {
  const filters: ChainFilters = { ...base, color: undefined, country: undefined, viewport: undefined, owner: undefined };
  if (step >= 1) filters.color = "#fe7446";
  if (step >= 2) filters.country = "IN";
  if (step >= 3) filters.viewport = INDIA_VIEW;
  if (step >= 4) filters.owner = WRITER_ADDRESS;
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
  switch (sceneId) {
    case "L3":
      return { ...next, chainFilters: queryItFilters(next.chainFilters, next.step) };
    case "L5": {
      // Step 0 asks the question on the current dots; B patches the inspected dot (Rabby).
      // Step 1 shows the answer: business view in Mumbai. Step 2 shows the reviews.
      const business = next.step >= 1;
      const camera = business && next.camera.cue !== "mumbai-street"
        ? { cue: "mumbai-street" as const, nonce: next.camera.nonce + 1 }
        : next.camera;
      return { ...next, map: business ? "business" : "dots", camera };
    }
    case "L6":
      return { ...next, map: "owner", transferred: next.step >= 1 };
    default:
      return next;
  }
}
