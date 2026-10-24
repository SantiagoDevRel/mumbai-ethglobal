// What the deck provides for each scene. Contract owned by the orchestrator;
// the deck chat implements it in app/deck/registry.tsx.

import type { ComponentType } from "react";
import type { SceneDef, SceneId } from "../../shared/scenes";

export interface SceneContentProps {
  scene: SceneDef;
  /** Current reveal step, 0-based (S6 lights its four tiles one per step). */
  step: number;
}

export interface DeckEntry {
  /** Full slide for `kind: "slide"` scenes. Drawn in a 1920x1080 box scaled to fit;
   * design in CSS pixels at 1920x1080. The globe keeps running behind it. */
  Slide?: ComponentType<SceneContentProps>;
  /** Overlay for `kind: "live"` scenes (captions, L6 small print, L9 tagline). Drawn in the
   * same 1920x1080 box above the map with `pointer-events: none`; opt back in per element. */
  Overlay?: ComponentType<SceneContentProps>;
  /** The scene's script, one paragraph per item (reference only; not shown on screen). */
  notes: string[];
}

export type DeckRegistry = Record<SceneId, DeckEntry>;
