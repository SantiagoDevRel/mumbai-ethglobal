// What each scene does to the stage. Contract owned by the orchestrator.
//
// Applied by the store on every scene change and every → / ←. Only pure state lives here: panels,
// filters and camera. Chain writes (extend, transfer) run from the entity card; the effect
// handlers run them.
//
// October 29: no scene sets a filter. L3 opens on the whole globe, unfiltered, and the presenter
// filters by hand (name, country, color); a country filter flies the camera to that country
// (`filterCamera`). The close (L9) keeps the map quiet (`quietMap`).

import type { CameraCue, SceneId } from "../../shared/scenes.ts";
import type { ChainFilters } from "../../shared/types.ts";
import type { Panel, StageState } from "./store.ts";

type Panels = Partial<Record<Exclude<Panel, "controls">, boolean>>;

const CLOSED: Panels = { filters: false, inspector: false, query: false };

/** Panels each scene opens on entry. Anything not listed is closed. */
// Only "Query it, live" shows the query panel and the filter bar; L1 keeps the map and the list of
// writes clear.
const SCENE_PANELS: Partial<Record<SceneId, Panels>> = {
  L3: { query: true, filters: true },
};

/** Scenes where the map is only a backdrop: no panel, counter or event log, and a dot click does
 * nothing. The close draws its own content over the globe. */
export function quietMap(sceneId: SceneId): boolean {
  return sceneId === "L9";
}

/** The camera a filter asks for, where a scene has one: on L3 a country filter frames that country
 * and no country shows the whole globe. Null elsewhere: other scenes keep their camera. */
export function filterCamera(sceneId: SceneId, filters: ChainFilters): CameraCue | null {
  if (sceneId !== "L3") return null;
  return filters.country ? `country:${filters.country.toLowerCase()}` : "globe";
}

/**
 * The stage state for `state.sceneIndex` at `state.step`, given the scene was just entered
 * (`entered`) or a step changed inside it. Steps change nothing on the map.
 */
export function choreograph(state: StageState, sceneId: SceneId, entered: boolean): StageState {
  if (!entered) return state;
  // Every scene opens its own panels on an unfiltered query: filters set by hand on L3 belong to
  // that visit.
  return {
    ...state,
    panels: { ...state.panels, ...CLOSED, ...SCENE_PANELS[sceneId] },
    chainFilters: { kinds: state.chainFilters.kinds },
  };
}
