// Writer HTTP API (Cloudflare Worker + one Durable Object). Contract owned by the orchestrator.
// Phones call the public endpoints. The presenter pages (/map, /slides) trade the password for a
// signed token at /api/login and call presenter endpoints with `Authorization: Bearer <token>`;
// scripts send the presenter secret itself. All bodies are JSON.

import { z } from "zod";
import {
  LIFETIME_MAX_SEC,
  LIFETIME_MIN_SEC,
  LIFETIME_STEP_SEC,
  NAME_MAX_CHARS,
} from "./types";
import { DOT_PALETTE } from "./encoding";

const hex = z.string().regex(/^0x[0-9a-fA-F]+$/);

// ---------- public (phones) ----------

/** Random token generated on the phone, kept in localStorage and a cookie. */
export const DEVICE_HEADER = "x-device-token";

/** Characters that draw nothing on their own: spaces of every kind, controls, zero-width and other
 * format marks, combining marks without a letter, and the Hangul and Braille fillers that render as
 * a blank. A name made only of these would put an empty label on the map. */
const BLANK_CHARS = /[\p{White_Space}\p{Cc}\p{Cf}\p{M}ᅟᅠ⠀ㅤﾠ]/gu;

/** True when the name has at least one character you can see. Every entity needs one (Santiago,
 * October 29: never an empty name). */
export function hasVisibleName(name: string): boolean {
  return name.replace(BLANK_CHARS, "").length > 0;
}

/** POST /api/submit. Text is stored in lower case (Santiago, October 29): Arkiv compares strings
 * exactly, so parsing lowercases name, color and country first, whatever the client sent, and the
 * length checks, the blocklist and placement all see the lowercased values. */
export const SubmitRequest = z.object({
  /** Optional: without it the writer uses the session that is running. Phones send none. */
  session: z.string().min(4).max(16).optional(),
  name: z.string().trim().toLowerCase().min(1).max(NAME_MAX_CHARS).refine(hasVisibleName, "the name needs a visible character"),
  /** One of the seven preset colors. */
  color: z.string().toLowerCase().pipe(z.enum(DOT_PALETTE)),
  /** ISO 3166-1 alpha-2 (`in`). */
  country: z.string().toLowerCase().regex(/^[a-z]{2}$/),
  /** Checked even with `noExpiry` (the phone always sends the slider's value); ignored then. */
  lifetimeSec: z
    .number()
    .int()
    .min(LIFETIME_MIN_SEC)
    .max(LIFETIME_MAX_SEC)
    .refine((v) => v % LIFETIME_STEP_SEC === 0, `lifetime must be a multiple of ${LIFETIME_STEP_SEC} s`),
  /** No expiration: the writer creates the entity with `ExpirationTime.permanent()`. */
  noExpiry: z.boolean().optional(),
});
export type SubmitRequest = z.infer<typeof SubmitRequest>;

export const SubmitResponse = z.object({
  ticket: z.string(),
  /** Position in the queue when accepted. */
  position: z.number().int(),
  /** Where the writer placed the dot (stored on-chain as-is). */
  lat: z.number(),
  lng: z.number(),
  /** The session the entity joined. */
  session: z.string().optional(),
  /** With `?wait=1`: the ticket once its block is in (or "queued" if it took longer than the wait). */
  status: z.enum(["queued", "sending", "written", "failed"]).optional(),
  entityKey: hex.optional(),
  block: z.string().optional(),
  expiresAtBlock: z.string().optional(),
});
export type SubmitResponse = z.infer<typeof SubmitResponse>;

/** Error body for any 4xx/5xx. `message` is the user-facing English copy. */
export const ErrorCode = z.enum([
  "invalid", // 400
  "bad_session", // 403: wrong or ended session code
  "doors_closed", // 409: writing is paused (balance floor, seed or load test)
  "name_blocked", // 422: "Try another name."
  "device_live", // 429: a double tap: this device's previous submit is still being accepted
  "device_limit", // 429: MAX_ENTITIES_PER_DEVICE per device per session
  "map_full", // 429: "The map is full!"
  "network_not_configured", // 503
  "unauthorized", // 401 presenter endpoints and a wrong password
  "too_many_attempts", // 429: too many wrong passwords from one IP
  "internal", // 500
]);
export type ErrorCode = z.infer<typeof ErrorCode>;
export const ErrorResponse = z.object({ error: ErrorCode, message: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponse>;

/**
 * GET /api/ticket/:ticket. Phones keep polling this after `written` for their countdown and never
 * call the public RPC: a room shares one IP, and the public RPC limits each IP (600 requests a minute).
 * After `written`, the Worker answers from one session read per block, shared by every ticket.
 */
export const TicketResponse = z.object({
  ticket: z.string(),
  status: z.enum(["queued", "sending", "written", "failed"]),
  entityKey: hex.optional(),
  txHash: hex.optional(),
  /** Block that included the create. */
  block: z.string().optional(),
  /** Current expiration block; it moves when the entity gets a Lifetime Extension. */
  expiresAtBlock: z.string().optional(),
  /** After `written`: the latest block the Worker read, and whether the entity was still there. */
  currentBlock: z.string().optional(),
  live: z.boolean().optional(),
  lat: z.number(),
  lng: z.number(),
  error: z.string().optional(),
});
export type TicketResponse = z.infer<typeof TicketResponse>;

/** GET /api/session. Phones poll this every 3 s and join whatever session is running: no code to type.
 * With `?s=<code>`, `valid` says whether that code is still the current session. */
export const SessionPublic = z.object({
  /** Without `s`: whether a session is running. With `s`: whether it is that session. */
  valid: z.boolean(),
  /** The current session code, or null when no session is running. */
  code: z.string().nullable(),
  /** `open` from the moment a session starts; `closed` only while the writer is paused. */
  doors: z.enum(["closed", "open"]),
  /** `talk` during the talk; `build` after L8 (phone switches to resources). */
  phase: z.enum(["talk", "build"]),
  /** True in Plan B replay mode: phones show "We're in replay mode". */
  replay: z.boolean(),
  /** Network profile name, or null when the writer failed closed. */
  network: z.string().nullable(),
});
export type SessionPublic = z.infer<typeof SessionPublic>;

// ---------- presenter (Bearer token) ----------

export const PRESENTER_AUTH_HEADER = "authorization"; // `Bearer <token>`

/** POST /api/login (public): the presenter password for a signed token, valid 12 hours. */
export const LoginRequest = z.object({ password: z.string().min(1).max(200) });
export const LoginResponse = z.object({ token: z.string(), expiresAt: z.number().int() });
export type LoginResponse = z.infer<typeof LoginResponse>;

/** POST /api/presenter/session/start → new session code, open for writes. Ends the previous one (the presenter's Reset). */
export const SessionStartResponse = z.object({ code: z.string() });
/** POST /api/presenter/session/end → {} */
/** POST /api/presenter/doors: pause or resume writes (scripts only: seed, load test). */
export const DoorsRequest = z.object({ open: z.boolean() });
/** POST /api/presenter/writing: the /map ON|OFF switch. ON starts a session if none is running and
 * opens writes (doors open, talk phase, replay off); OFF pauses writes and keeps the session. */
export const WritingRequest = z.object({ on: z.boolean() });
export const WritingResponse = z.object({ code: z.string().nullable() });
/** POST /api/presenter/phase */
export const PhaseRequest = z.object({ phase: z.enum(["talk", "build"]) });
/** POST /api/presenter/replay */
export const ReplayRequest = z.object({ on: z.boolean() });
/** POST /api/presenter/hold → resolves once the writer is idle (no tx in flight). */
export const HoldResponse = z.object({ held: z.literal(true), idle: z.boolean() });
/** POST /api/presenter/resume → {} (also auto-resumes 60 s after a hold). */

/** GET /api/presenter/status, polled every 3 s by /map. */
export const PresenterStatus = z.object({
  session: z.string().nullable(),
  doors: z.enum(["closed", "open"]),
  phase: z.enum(["talk", "build"]),
  replay: z.boolean(),
  held: z.boolean(),
  queued: z.number().int(),
  inFlight: z.boolean(),
  written: z.number().int(),
  failed: z.number().int(),
  lastBatch: z
    .object({ txHash: hex, block: z.string(), size: z.number().int(), at: z.number() })
    .nullable(),
  /** Writer balance in wei, as a decimal string. */
  balanceWei: z.string(),
  network: z.string().nullable(),
  /** Worker requests counted today (free-plan budget). */
  requestsToday: z.number().int(),
  /** The access key's monthly quota is used up: the writer reads and sends through the public RPC. */
  keyQuotaExhausted: z.boolean().optional(),
});
export type PresenterStatus = z.infer<typeof PresenterStatus>;

/** GET /api/presenter/rabdi: what a wallet needs to add Rabdi, for the Add network button on the
 * Five steps slide. Rabdi was announced only inside the team, so the writer reads these from
 * server-only env vars (lib/server/rabdi.ts) and this repo never holds them; while any is missing it
 * answers 503 `network_not_configured`. */
export const RabdiNetwork = z.object({
  /** The chain ID in decimal, and in hex for wallet_addEthereumChain. */
  chainId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  chainIdHex: hex,
  rpcUrl: z.string().regex(/^https:\/\/\S+$/),
  explorerUrl: z.string().regex(/^https:\/\/\S+$/),
  /** The native token's symbol, as the wallet shows it. */
  currencySymbol: z.string().regex(/^[A-Za-z0-9]{2,6}$/),
});
export type RabdiNetwork = z.infer<typeof RabdiNetwork>;

/** POST /api/rpc: read-only JSON-RPC proxy through the keyed RPC (presenter token or login token).
 * Only these methods are forwarded; anything else gets a JSON-RPC error. */
export const RPC_READ_ALLOWLIST = [
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getBalance",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getLogs",
  // writeParams (shared/arkiv/sdk-1.0.ts): the nonce and gas price every presenter write sends.
  "eth_getTransactionCount",
  "eth_gasPrice",
  "arkiv_query",
  "arkiv_getEntity",
  "arkiv_getEntityCount",
  "arkiv_getBlockTiming",
] as const;

/** The paths, in one place. */
export const WRITER_ROUTES = {
  submit: "/api/submit",
  ticket: (t: string) => `/api/ticket/${encodeURIComponent(t)}`,
  session: (s?: string) => (s ? `/api/session?s=${encodeURIComponent(s)}` : "/api/session"),
  rpc: "/api/rpc",
  login: "/api/login",
  presenter: {
    sessionStart: "/api/presenter/session/start",
    sessionEnd: "/api/presenter/session/end",
    doors: "/api/presenter/doors",
    phase: "/api/presenter/phase",
    writing: "/api/presenter/writing",
    replay: "/api/presenter/replay",
    hold: "/api/presenter/hold",
    resume: "/api/presenter/resume",
    status: "/api/presenter/status",
    rabdi: "/api/presenter/rabdi",
  },
} as const;

/** Public URL of the Worker, baked into the static app at build time. */
export const WRITER_URL_ENV = "NEXT_PUBLIC_WRITER_URL";
