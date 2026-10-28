// Shared domain types. Contract owned by the orchestrator: the app, the deck and the
// writer import these; change them only through the orchestrator.

export type Hex = `0x${string}`;

/** The `app` attribute on every entity this workshop writes. Every query is scoped by it. */
export const APP_ID = "arkiv-mumbai-2026";

export type EntityKind = "dot" | "business" | "review";

/** Lifetime range a participant may pick, enforced by the writer (WORKSHOP.md 4.2, 4.10). */
export const LIFETIME_MIN_SEC = 5 * 60;
export const LIFETIME_MAX_SEC = 15 * 60;
export const LIFETIME_STEP_SEC = 60;
/** The phone slider starts here. */
export const LIFETIME_DEFAULT_SEC = LIFETIME_MAX_SEC;

export const NAME_MAX_CHARS = 24;
export const MAX_ENTITIES_PER_SESSION = 400;
export const MAX_ENTITIES_PER_DEVICE = 10;

/** Seconds added by Santiago's live extension on stage (L2: "+20 minutes"). */
export const STAGE_EXTENSION_SEC = 20 * 60;

/** Columns a participant chooses (before the writer places them). */
export interface DotDraft {
  name: string;
  /** `#RRGGBB`, any color. */
  color: string;
  /** ISO 3166-1 alpha-2, upper case. */
  country: string;
  lifetimeSec: number;
}

/** Attribute values as decoded for the UI. Coordinates are plain degrees here. */
export interface DotAttrs {
  kind: "dot";
  session: string;
  name: string;
  color: string;
  country: string;
  lat: number;
  lng: number;
  /** Business category the writer picks at random (DOT_CATEGORIES); absent on older dots. */
  category?: BusinessCategory;
}

export interface BusinessAttrs {
  kind: "business";
  name: string;
  category: BusinessCategory;
  /** 0-5 with one decimal (stored on-chain as tenths). */
  rating: number;
  /** Minutes after midnight, local time of the city. */
  opens: number;
  closes: number;
  city: string;
  lat: number;
  lng: number;
  /** Plain 32-byte Swarm reference, only if the photo is really on Swarm. */
  photo?: string;
  /** Present on an audience dot that Santiago patched into a business on stage. */
  session?: string;
  color?: string;
  country?: string;
}

export interface ReviewAttrs {
  kind: "review";
  /** Entity key of the business this review points to. */
  business: Hex;
  stars: number;
  text: string;
}

export type BusinessCategory =
  | "cafe"
  | "restaurant"
  | "street-food"
  | "bakery"
  | "bookstore"
  | "gym"
  | "market"
  | "bar"
  | "parking";

/** Every phone's entity is a business of one of these kinds, picked at random by the writer. */
export const DOT_CATEGORIES = ["cafe", "restaurant", "bookstore", "parking"] as const satisfies readonly BusinessCategory[];

export type EntityAttrs = DotAttrs | BusinessAttrs | ReviewAttrs;

/** One raw attribute as the chain returned it, for the inspector ("your columns"). */
export interface RawAttribute {
  name: string;
  /** SDK type tag, e.g. `str`, `i32`. */
  type: string;
  /** Display form of the stored value (e.g. the integer as stored). */
  stored: string;
}

/** One entity as the UI sees it, straight from a query result. */
export interface LiveEntity<A extends EntityAttrs = EntityAttrs> {
  key: Hex;
  owner: Hex;
  creator: Hex;
  createdAtBlock: bigint;
  updatedAtBlock?: bigint;
  /** `$expiresAt`: the block at which the entity expires. */
  expiresAtBlock: bigint;
  attrs: A;
  raw: RawAttribute[];
}

export interface BlockInfo {
  number: bigint;
  /** Unix ms of the block timestamp. */
  timestampMs: number;
  /** Measured from the chain, never hardcoded. */
  blockTimeMs: number;
}

/** On-chain filters (WORKSHOP.md 4.5). Every query also adds `$creator` = writer and `app`. */
export interface ChainFilters {
  kinds: EntityKind[];
  session?: string;
  /** Names that start with this text (case-sensitive, on-chain STARTSWITH). */
  namePrefix?: string;
  color?: string;
  country?: string;
  viewport?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  owner?: Hex;
  expiringWithinSec?: number;
  category?: BusinessCategory;
  minRating?: number;
  /** Reviews of one business. */
  business?: Hex;
}

/** Filters done by the app after the query, always labeled *app-side* on screen. */
export interface AppSideFilters {
  openNow?: boolean;
  sort?: "name" | "expiry" | "rating";
  /** An attribute Santiago adds on stage that isn't on-chain, e.g. `vegan = yes`. */
  custom?: { name: string; value: string };
}

/** What the query panel shows: only text that matches what actually ran. */
export interface QueryDescription {
  /** The SDK call, as TypeScript. */
  code: string;
  /** The query text the SDK sends. */
  query: string;
  /** One line per app-side step, e.g. "app-side: sort by name". */
  appSide: string[];
}

export interface QueryRun<T extends EntityAttrs = EntityAttrs> {
  entities: LiveEntity<T>[];
  description: QueryDescription;
  /** Block the query was answered at. */
  block: bigint;
  rows: number;
  pages: number;
  latencyMs: number;
  ranAt: number;
}

export type WriteStatus = "queued" | "sending" | "written" | "failed";

export interface WriteResult {
  txHash: Hex;
  block: bigint;
  keys: Hex[];
}

/** Event log row on the stage (bounded list, about 6 visible). */
export interface StageEvent {
  id: string;
  type: "created" | "extended" | "expired" | "patched";
  key: Hex;
  name: string;
  detail: string;
  block: bigint;
  at: number;
}
