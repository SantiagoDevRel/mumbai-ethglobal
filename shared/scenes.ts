// Run of show (outline v3, October 28: MUMBAI-ETHGLOBAL/OUTLINE.md). Contract owned by the orchestrator.
// The deck renders each scene's content (app/deck/registry.tsx); the stage engine
// (lib/stage) moves through this list. Times are planned offsets from the start, in seconds.

export type SceneId =
  | "S0"
  | "IX"
  | "W1"
  | "W2"
  | "W3"
  | "W4"
  | "ST"
  | "S7"
  | "L1"
  | "B2"
  | "B3"
  | "L3"
  | "L6"
  | "L2"
  | "B4"
  | "B5"
  | "T1"
  | "T2"
  | "PZ"
  | "L9";

/** `slide`: the deck covers the stage (the globe may show behind it).
 * `live`: the map is the stage; the deck draws only an overlay (caption, cards). */
export type SceneKind = "slide" | "live";

/** Where the camera should be when the scene starts. The app owns what each means. */
export type CameraCue = "globe-idle" | "globe" | "india" | "mumbai-street" | "keep";

/** Which data layer the map shows. */
export type MapMode = "dots" | "business" | "owner";

export type QrLabel = "Scan now" | "Join the map";

/** The talk's parts, in order. The index (IX) lists them and the outline bar across the top tracks
 * them; every scene after the index belongs to one. */
export const SECTIONS = [
  { id: "why", title: "Why Arkiv", line: "Your data, the web3 way, and what Arkiv is." },
  { id: "start", title: "Five steps", line: "What you need before your first write." },
  { id: "build", title: "Build it, live", line: "Scan the QR: we write, query, own and expire your entities together." },
  { id: "tools", title: "Tools and prizes", line: "The Hub, the docs, your agent and this weekend's prizes." },
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
  /** The part of the talk it belongs to; the title and the index have none. */
  section?: SectionId;
}

export const TALK_LENGTH_SEC = 20 * 60;

const NO_QR = { label: "Join the map", placement: "none" } as const;
const CORNER_QR = { label: "Join the map", placement: "corner" } as const;

// One idea per scene, never twice (Santiago, October 28). The room scans in "Build it, live" and
// every idea after that is shown on the entities they just wrote: a slide for the idea, the map for
// the result.
export const SCENES: readonly SceneDef[] = [
  { id: "S0", title: "Title", at: 0, kind: "slide", steps: 1, qr: NO_QR, camera: "globe-idle", map: "dots" },
  { id: "IX", title: "What we'll do", at: 20, kind: "slide", steps: 1, qr: NO_QR, camera: "keep", map: "dots" },
  { id: "W1", title: "Your data, their terms", at: 40, kind: "slide", steps: 2, qr: NO_QR, camera: "keep", map: "dots", section: "why" },
  { id: "W2", title: "Meme: eyes on Web3 data", at: 90, kind: "slide", steps: 1, qr: NO_QR, camera: "keep", map: "dots", section: "why" },
  { id: "W3", title: "Your data, the web3 way", at: 110, kind: "slide", steps: 3, qr: NO_QR, camera: "keep", map: "dots", section: "why" },
  { id: "W4", title: "What is Arkiv", at: 160, kind: "slide", steps: 2, qr: NO_QR, camera: "keep", map: "dots", section: "why" },
  { id: "ST", title: "Five steps to get started", at: 220, kind: "slide", steps: 5, qr: NO_QR, camera: "keep", map: "dots", section: "start" },
  { id: "S7", title: "Your entity: scan and fill the form", at: 310, kind: "slide", steps: 2, qr: { label: "Scan now", placement: "center" }, camera: "globe", map: "dots", section: "build" },
  { id: "L1", title: "Write it: your entities, live", at: 400, kind: "live", steps: 1, qr: CORNER_QR, camera: "globe", map: "dots", section: "build" },
  { id: "B2", title: "Write it: the SDK call", at: 440, kind: "slide", steps: 2, qr: NO_QR, camera: "keep", map: "dots", section: "build" },
  { id: "B3", title: "Query it like a database", at: 500, kind: "slide", steps: 2, qr: NO_QR, camera: "keep", map: "dots", section: "build" },
  { id: "L3", title: "Query it, live", at: 560, kind: "live", steps: 3, qr: CORNER_QR, camera: "india", map: "dots", section: "build" },
  { id: "L6", title: "Own it", at: 620, kind: "live", steps: 2, qr: CORNER_QR, camera: "keep", map: "dots", section: "build" },
  { id: "L2", title: "Expire it", at: 695, kind: "live", steps: 2, qr: CORNER_QR, camera: "globe", map: "dots", section: "build" },
  { id: "B4", title: "Encrypt what's private", at: 755, kind: "slide", steps: 3, qr: NO_QR, camera: "keep", map: "dots", section: "build" },
  { id: "B5", title: "Explore it with no code", at: 800, kind: "slide", steps: 1, qr: NO_QR, camera: "keep", map: "dots", section: "build" },
  { id: "T1", title: "Hub and docs", at: 845, kind: "slide", steps: 2, qr: NO_QR, camera: "keep", map: "dots", section: "tools" },
  { id: "T2", title: "Your agent knows Arkiv", at: 885, kind: "slide", steps: 3, qr: NO_QR, camera: "keep", map: "dots", section: "tools" },
  { id: "PZ", title: "Arkiv prizes at ETHGlobal Mumbai", at: 945, kind: "slide", steps: 6, qr: NO_QR, camera: "keep", map: "dots", section: "tools" },
  { id: "L9", title: "Close", at: 1005, kind: "live", steps: 1, qr: CORNER_QR, camera: "globe", map: "dots", section: "tools" },
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

/**
 * Where the talk is, for the outline bar: for each part, how far through it the presenter is, from
 * 0 (not started) to 1 (done). Inside the current part, each scene and each of its reveal steps counts
 * the same, so the bar moves on every →.
 */
export function sectionProgress(index: number, step: number): { id: SectionId; progress: number }[] {
  return SECTIONS.map(({ id }) => {
    const members = SCENES.map((scene, i) => ({ scene, i })).filter(({ scene }) => scene.section === id);
    const first = members[0]?.i ?? 0;
    const last = members.at(-1)?.i ?? 0;
    if (index > last) return { id, progress: 1 };
    if (index < first) return { id, progress: 0 };
    const units = members.reduce((sum, { scene }) => sum + scene.steps, 0);
    const done = members.filter(({ i }) => i < index).reduce((sum, { scene }) => sum + scene.steps, 0) + step + 1;
    return { id, progress: Math.min(1, done / units) };
  });
}
