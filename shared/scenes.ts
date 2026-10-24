// Run of show (WORKSHOP.md section 2). Contract owned by the orchestrator.
// The deck renders each scene's content (app/deck/registry.tsx); the stage engine
// (lib/stage) moves through this list. Times are planned offsets from the start, in seconds.

export type SceneId =
  | "S0"
  | "S1"
  | "S2"
  | "S3"
  | "S4"
  | "S5"
  | "S6"
  | "S7"
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "L6"
  | "L7"
  | "L8"
  | "L9";

/** `slide`: the deck covers the stage (the globe may show behind it).
 * `live`: the map is the stage; the deck draws only an overlay (caption, cards). */
export type SceneKind = "slide" | "live";

/** Where the camera should be when the scene starts. The app owns what each means. */
export type CameraCue = "globe-idle" | "globe" | "india" | "mumbai-street" | "keep";

/** Which data layer the map shows. */
export type MapMode = "dots" | "business" | "owner";

export type QrLabel = "Scan now" | "Doors open" | "Start building";

export interface SceneDef {
  id: SceneId;
  title: string;
  /** Planned start, seconds from 0:00. */
  at: number;
  kind: SceneKind;
  /** Number of reveal steps inside the scene; → advances steps before the next scene. */
  steps: number;
  qr: { label: QrLabel; placement: "corner" | "center" };
  camera: CameraCue;
  map: MapMode;
  /** Shown in /notes when the presenter is behind schedule. */
  cutLine?: string;
}

/** What the QR card says right now: "Doors open" only once the doors really are open. */
export function qrLabel(scene: SceneDef, doors: "closed" | "open"): string {
  if (scene.qr.label === "Doors open" && doors === "closed") return "Doors open in a moment";
  return scene.qr.label;
}

export const TALK_LENGTH_SEC = 20 * 60;

export const SCENES: readonly SceneDef[] = [
  { id: "S0", title: "Title", at: 0, kind: "slide", steps: 1, qr: { label: "Scan now", placement: "corner" }, camera: "globe-idle", map: "dots" },
  { id: "S1", title: "Every app does two jobs", at: 20, kind: "slide", steps: 2, qr: { label: "Scan now", placement: "corner" }, camera: "globe-idle", map: "dots" },
  { id: "S2", title: "Open Google Maps. What do you see?", at: 70, kind: "slide", steps: 2, qr: { label: "Scan now", placement: "corner" }, camera: "globe-idle", map: "dots" },
  { id: "S3", title: "One pin = one entity", at: 120, kind: "slide", steps: 2, qr: { label: "Scan now", placement: "corner" }, camera: "globe-idle", map: "dots" },
  { id: "S4", title: "Queries like a database. Lives on a chain.", at: 170, kind: "slide", steps: 2, qr: { label: "Scan now", placement: "corner" }, camera: "globe-idle", map: "dots" },
  { id: "S5", title: "A chain built to be a database", at: 220, kind: "slide", steps: 2, qr: { label: "Scan now", placement: "corner" }, camera: "globe-idle", map: "dots" },
  { id: "S6", title: "That's the whole talk", at: 260, kind: "slide", steps: 4, qr: { label: "Scan now", placement: "corner" }, camera: "globe-idle", map: "dots" },
  { id: "S7", title: "Doors open", at: 290, kind: "slide", steps: 1, qr: { label: "Doors open", placement: "center" }, camera: "globe", map: "dots" },
  { id: "L1", title: "Write it", at: 330, kind: "live", steps: 1, qr: { label: "Doors open", placement: "corner" }, camera: "globe", map: "dots" },
  { id: "L2", title: "Expire it", at: 420, kind: "live", steps: 2, qr: { label: "Doors open", placement: "corner" }, camera: "keep", map: "dots" },
  { id: "L3", title: "Query it", at: 510, kind: "live", steps: 5, qr: { label: "Doors open", placement: "corner" }, camera: "india", map: "dots" },
  { id: "L4", title: "Inside one entity", at: 660, kind: "live", steps: 5, qr: { label: "Doors open", placement: "corner" }, camera: "keep", map: "dots", cutLine: "At 11:00, skip the badge-by-badge walk." },
  { id: "L5", title: "Make it a business", at: 780, kind: "live", steps: 3, qr: { label: "Doors open", placement: "corner" }, camera: "keep", map: "dots", cutLine: "At 15:00, skip the reviews." },
  { id: "L6", title: "Own it", at: 960, kind: "live", steps: 2, qr: { label: "Doors open", placement: "corner" }, camera: "globe", map: "owner" },
  { id: "L7", title: "Everything you saw, in a few lines", at: 1080, kind: "slide", steps: 1, qr: { label: "Doors open", placement: "corner" }, camera: "keep", map: "owner", cutLine: "At 17:30, skip this scene." },
  { id: "L8", title: "Your turn: build it this weekend", at: 1125, kind: "slide", steps: 1, qr: { label: "Start building", placement: "corner" }, camera: "keep", map: "dots" },
  { id: "L9", title: "Close", at: 1170, kind: "live", steps: 1, qr: { label: "Start building", placement: "corner" }, camera: "globe", map: "dots" },
];

export function sceneIndex(id: SceneId): number {
  return SCENES.findIndex((s) => s.id === id);
}

/** Planned length of a scene in seconds (until the next one, or the end of the talk). */
export function sceneDuration(index: number): number {
  const s = SCENES[index];
  if (!s) return 0;
  const next = SCENES[index + 1];
  return (next ? next.at : TALK_LENGTH_SEC) - s.at;
}
