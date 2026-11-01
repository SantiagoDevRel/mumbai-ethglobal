// /talk's scenes: the public copy of the slides, to share with the room (Santiago, November 1). Every
// slide that shows no QR, and the close (L9) for its links. Left out: the room's scan (S7) and the
// live map scenes (L1, L3), so the copy brings nobody to /scan and reads nothing from the DB-Chain.

import { SCENES, type SceneDef } from "../../shared/scenes.ts";

export const TALK_SCENES: readonly SceneDef[] = SCENES.filter((scene) => scene.qr.placement === "none" && (scene.kind === "slide" || scene.id === "L9"));
