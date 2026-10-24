// The only Arkiv interface the app and the writer use (WORKSHOP.md 6.3).
// `sdk-0.8.ts` implements it today (chain chat); `mock.ts` implements it in memory so the UI
// works from hour 1. A future `sdk-udc.ts` implements it for user-defined columns.

import type {
  BlockInfo,
  BusinessAttrs,
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
  lifetimeSec: number;
}

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
  /** Lifetime Extension of each key by `addSeconds` (one batch). */
  extend(keys: Hex[], addSeconds: number): Promise<WriteResult>;
  /** Real patch: keeps existing attributes, sets the given ones. */
  patch(key: Hex, fields: PatchFields, current: EntityAttrs): Promise<WriteResult>;
  /** Not used on stage (the ownership finale is a demo view); shown in L7. */
  changeOwner(key: Hex, newOwner: Hex): Promise<WriteResult>;
}

/** Read-only subset the phone and the stage use when no wallet is connected. */
export type ArkivReader = Pick<ArkivAdapter, "profile" | "creator" | "getBlock" | "query" | "describe">;

/** How an adapter is built. The access key never reaches a browser. Browsers read through the
 * Worker's keyed read proxy: `proxy` in the tab that holds the presenter token (/notes), `relay` in
 * the projected stage tab, which hands each call to that tab. `public` is for scripts only. */
export type ReadTransport =
  | { kind: "public" }
  | { kind: "keyed"; url: string; accessKey: string } // Worker only
  | { kind: "proxy"; url: string; presenterToken: string } // tab with the presenter token
  | { kind: "relay"; send: (method: string, params: unknown) => Promise<unknown> }; // stage tab, via /notes

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
