// The only Arkiv interface the app and the writer use (WORKSHOP.md 6.3).
// `sdk-0.8.ts` implements it today (chain chat); `mock.ts` implements it in memory so the UI
// works from hour 1. A future `sdk-udc.ts` implements it for user-defined columns.

import type {
  BlockInfo,
  BusinessAttrs,
  BusinessCategory,
  ChainFilters,
  DotAttrs,
  EntityAttrs,
  Hex,
  QueryDescription,
  QueryRun,
  ReviewAttrs,
  WriteResult,
} from "../types";
import type { NetworkProfile } from "./profiles";

/** A dot ready to write: the writer has already placed it inside its country. */
export interface DotCreate {
  session: string;
  name: string;
  color: string;
  country: string;
  lat: number;
  lng: number;
  category?: BusinessCategory;
  lifetimeSec: number;
  /** No expiration: created with `ExpirationTime.permanent()`, so `$expiresAt` is `NO_EXPIRY_BLOCK`
   * and `lifetimeSec` is ignored. Neither is written as an attribute. */
  noExpiry?: boolean;
}

/** A write refused before anything was signed or sent. Unlike a failed send it leaves nothing to
 * reconcile, so the adapter takes the next write. */
export class WriteNotSentError extends Error {
  constructor(message: string) { super(message); this.name = "WriteNotSentError"; }
}

/** Why a Lifetime Extension of entities that all have no expiration sends nothing (stage copy). */
export const NOTHING_TO_EXTEND = "Nothing to extend: an entity with no expiration never expires.";

export type BusinessCreate = Omit<BusinessAttrs, "kind"> & { lifetimeSec: number };
export type ReviewCreate = Omit<ReviewAttrs, "kind"> & { lifetimeSec: number };

/** Fields a patch may set. "Make it a business" sends category, rating, opens and closes. */
export type PatchFields = Partial<Omit<BusinessAttrs, "kind">> & { kind?: "business" };

export interface ArkivAdapter {
  readonly profile: NetworkProfile;
  /** Address whose `$creator` scopes every query (the writer). */
  readonly creator: Hex;

  /** Latest block plus the measured block time. */
  getBlock(): Promise<BlockInfo>;

  /** Runs the query for these filters, walking every page (Arkiv has no count). */
  query<T extends EntityAttrs = EntityAttrs>(filters: ChainFilters): Promise<QueryRun<T>>;

  /** The Code and Query panel text for these filters, matching what `query` sends. */
  describe(filters: ChainFilters): QueryDescription;

  // Writes. Need a wallet transport (the Worker's key, or Rabby on the presenter screen).
  /** One executeBatch of creates, in order; returns keys in the same order. */
  createDots(dots: DotCreate[]): Promise<WriteResult>;
  createBusinesses(items: BusinessCreate[]): Promise<WriteResult>;
  createReviews(items: ReviewCreate[]): Promise<WriteResult>;
  /** Lifetime Extension of each key by `addSeconds` (one batch), returning the keys it extended.
   * Entities with no expiration are skipped; if none is left it rejects with `WriteNotSentError`. */
  extend(keys: Hex[], addSeconds: number): Promise<WriteResult>;
  /** Real patch: keeps existing attributes, sets the given ones. */
  patch(key: Hex, fields: PatchFields, current: EntityAttrs): Promise<WriteResult>;
  /** The entity card's Transfer ownership (signed in Rabby by the workshop wallet; the mock moves $owner in place). */
  changeOwner(key: Hex, newOwner: Hex): Promise<WriteResult>;
}

/** Read-only subset the phone and the stage use when no wallet is connected. */
export type ArkivReader = Pick<ArkivAdapter, "profile" | "creator" | "getBlock" | "query" | "describe">;

/** How an adapter is built. The access key never reaches a browser. Browsers read through the
 * Worker's keyed read proxy: `proxy` with the presenter login (/map, /slides). `relay` hands each
 * call to a function (without a login it rejects every read). `public` is for scripts only. */
export type ReadTransport =
  | { kind: "public" }
  | { kind: "keyed"; url: string; accessKey: string } // Worker only
  | { kind: "proxy"; url: string; presenterToken: string } // presenter pages, logged in
  | { kind: "relay"; send: (method: string, params: unknown) => Promise<unknown> };

export type WalletTransport =
  | { kind: "privateKey"; privateKey: Hex } // Worker and scripts only
  | { kind: "eip1193"; provider: unknown; account: Hex }; // Rabby on the presenter screen

export interface AdapterOptions {
  profile: NetworkProfile;
  creator: Hex;
  read: ReadTransport;
  wallet?: WalletTransport;
}

export type { DotAttrs };
