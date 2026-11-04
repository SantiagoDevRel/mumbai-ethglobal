// /slides' frames: the public copy of the slides, to share with the room (Santiago, November 1). Every
// slide that shows no QR, and the close (L9) for its links. Left out: the room's scan (S7) and the
// live map scenes (L1, L3), so the copy brings nobody to /scan and reads nothing from the DB-Chain.
// Each slide shows complete, at once, with no reveals (Santiago, November 1): one frame at its last
// step. A slide whose → swaps one view for another keeps both views, one frame each: W2's meme and
// its hug, W4's network and your app.

import { SCENES, type SceneDef } from "../../shared/scenes.ts";

export const TALK_SCENES: readonly SceneDef[] = SCENES.filter((scene) => scene.qr.placement === "none" && (scene.kind === "slide" || scene.id === "L9"));

/** The steps a slide shows as frames, where it is not only its last one. */
const VIEWS: Partial<Record<SceneDef["id"], number[]>> = { W2: [0, 1], W4: [2, 5] };

/** One page of the public copy: a scene at one step. `id` is its address (/slides#W4); a scene's
 * later views add their number (#W4-2). */
export type Frame = { id: string; scene: SceneDef; step: number };

export const FRAMES: readonly Frame[] = TALK_SCENES.flatMap((scene) =>
  (VIEWS[scene.id] ?? [scene.steps - 1]).map((step, i) => ({ id: i === 0 ? scene.id : `${scene.id}-${i + 1}`, scene, step })),
);
