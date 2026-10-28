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
  | "AG"
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

export type QrLabel = "Scan now" | "Join the map";

/** The talk's parts, in order. The agenda slide (AG) lists them; every other scene belongs to one. */
export const SECTIONS = [
  { id: "write", title: "Write it", line: "Scan, fill the form, and your entity lands on the map." },
  { id: "why", title: "Why Arkiv", line: "Storage and indexing, entities, and the DB-Chain behind them." },
  { id: "live", title: "Expire it. Query it. Own it.", line: "Back on the map, with the entities you just wrote." },
  { id: "build", title: "Build it this weekend", line: "Where to start, and your agent can help." },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export interface SceneDef {
  id: SceneId;
  title: string;
  /** Planned start, seconds from 0:00. */
  at: number;
  kind: SceneKind;
  /** Number of reveal steps inside the scene; → advances steps before the next scene. */
  steps: number;
  /** `none`: a slide that keeps the whole screen; the QR comes back with the map. */
  qr: { label: QrLabel; placement: "corner" | "center" | "none" };
  camera: CameraCue;
  map: MapMode;
  /** The part of the talk it belongs to; the agenda has none. */
  section?: SectionId;
  /** Where to cut when the presenter is behind schedule (WORKSHOP.md). */
  cutLine?: string;
}

export const TALK_LENGTH_SEC = 20 * 60;

// One screen, one thing at a time (Santiago, October 28): the room writes first on the map, then
// the slides explain what they just did, then the map again to expire, query and own it.
export const SCENES: readonly SceneDef[] = [
  { id: "S0", title: "Title", at: 0, kind: "slide", steps: 1, qr: { label: "Scan now", placement: "corner" }, camera: "globe-idle", map: "dots", section: "write" },
  { id: "S7", title: "Join the map", at: 40, kind: "slide", steps: 1, qr: { label: "Join the map", placement: "center" }, camera: "globe", map: "dots", section: "write" },
  { id: "L1", title: "Write it", at: 110, kind: "live", steps: 1, qr: { label: "Join the map", placement: "corner" }, camera: "globe", map: "dots", section: "write" },
  { id: "AG", title: "Agenda", at: 170, kind: "slide", steps: 1, qr: { label: "Join the map", placement: "none" }, camera: "keep", map: "dots" },
  { id: "S1", title: "Every app does two jobs", at: 190, kind: "slide", steps: 2, qr: { label: "Join the map", placement: "none" }, camera: "keep", map: "dots", section: "why" },
  { id: "S2", title: "Open Google Maps. What do you see?", at: 240, kind: "slide", steps: 2, qr: { label: "Join the map", placement: "none" }, camera: "keep", map: "dots", section: "why" },
  { id: "S3", title: "One pin = one entity", at: 290, kind: "slide", steps: 2, qr: { label: "Join the map", placement: "none" }, camera: "keep", map: "dots", section: "why" },
  { id: "S4", title: "Queries like a database. Lives on a chain.", at: 340, kind: "slide", steps: 2, qr: { label: "Join the map", placement: "none" }, camera: "keep", map: "dots", section: "why" },
  { id: "S5", title: "A chain built to be a database", at: 390, kind: "slide", steps: 2, qr: { label: "Join the map", placement: "none" }, camera: "keep", map: "dots", section: "why" },
  { id: "S6", title: "That's the whole talk", at: 430, kind: "slide", steps: 4, qr: { label: "Join the map", placement: "none" }, camera: "keep", map: "dots", section: "why" },
  { id: "L2", title: "Expire it", at: 460, kind: "live", steps: 2, qr: { label: "Join the map", placement: "corner" }, camera: "globe", map: "dots", section: "live" },
  { id: "L3", title: "Query it", at: 550, kind: "live", steps: 5, qr: { label: "Join the map", placement: "corner" }, camera: "india", map: "dots", section: "live" },
  { id: "L4", title: "Inside one entity", at: 700, kind: "live", steps: 5, qr: { label: "Join the map", placement: "corner" }, camera: "keep", map: "dots", section: "live", cutLine: "At 12:00, skip the badge-by-badge walk." },
  { id: "L5", title: "Update an entity", at: 800, kind: "live", steps: 3, qr: { label: "Join the map", placement: "corner" }, camera: "keep", map: "dots", section: "live", cutLine: "At 15:30, skip the reviews." },
  { id: "L6", title: "Own it", at: 980, kind: "live", steps: 2, qr: { label: "Join the map", placement: "corner" }, camera: "globe", map: "owner", section: "live" },
  { id: "L7", title: "Everything you just did", at: 1090, kind: "slide", steps: 1, qr: { label: "Join the map", placement: "none" }, camera: "keep", map: "owner", section: "live", cutLine: "At 18:00, skip this scene." },
  { id: "L8", title: "Your turn: build it this weekend", at: 1130, kind: "slide", steps: 1, qr: { label: "Join the map", placement: "corner" }, camera: "keep", map: "dots", section: "build" },
  { id: "L9", title: "Close", at: 1170, kind: "live", steps: 1, qr: { label: "Join the map", placement: "corner" }, camera: "globe", map: "dots", section: "build" },
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
