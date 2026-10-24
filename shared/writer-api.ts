// Writer HTTP API (Cloudflare Worker + one Durable Object). Contract owned by the orchestrator.
// Phones call the public endpoints; /notes and the stage call presenter endpoints with
// `Authorization: Bearer <presenter token>`. All bodies are JSON.

import { z } from "zod";
import {
  LIFETIME_MAX_SEC,
  LIFETIME_MIN_SEC,
  LIFETIME_STEP_SEC,
  NAME_MAX_CHARS,
} from "./types";

const hex = z.string().regex(/^0x[0-9a-fA-F]+$/);

// ---------- public (phones) ----------

/** Random token generated on the phone, kept in localStorage and a cookie. */
export const DEVICE_HEADER = "x-device-token";

/** POST /api/submit */
export const SubmitRequest = z.object({
  session: z.string().min(4).max(16),
  name: z.string().trim().min(1).max(NAME_MAX_CHARS),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  country: z.string().regex(/^[A-Z]{2}$/),
  lifetimeSec: z
    .number()
    .int()
    .min(LIFETIME_MIN_SEC)
    .max(LIFETIME_MAX_SEC)
    .refine((v) => v % LIFETIME_STEP_SEC === 0, "lifetime must be a multiple of 10 s"),
});
export type SubmitRequest = z.infer<typeof SubmitRequest>;

export const SubmitResponse = z.object({
  ticket: z.string(),
  /** Position in the queue when accepted. */
  position: z.number().int(),
  /** Where the writer placed the dot (stored on-chain as-is). */
  lat: z.number(),
  lng: z.number(),
});
export type SubmitResponse = z.infer<typeof SubmitResponse>;

/** Error body for any 4xx/5xx. `message` is the user-facing English copy. */
export const ErrorCode = z.enum([
  "invalid", // 400
  "bad_session", // 403: wrong or ended session code
  "doors_closed", // 409: "Hang tight. Santiago opens the doors in a moment."
  "name_blocked", // 422: "Try another name."
  "device_live", // 429: this device already has a live entity
  "device_limit", // 429: three per device per session
  "map_full", // 429: "The map is full!"
  "network_not_configured", // 503
  "unauthorized", // 401 presenter endpoints
  "internal", // 500
]);
export type ErrorCode = z.infer<typeof ErrorCode>;
export const ErrorResponse = z.object({ error: ErrorCode, message: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponse>;

/** GET /api/ticket/:ticket. Phones stop polling once `entityKey` is set (then read the RPC). */
export const TicketResponse = z.object({
  ticket: z.string(),
  status: z.enum(["queued", "sending", "written", "failed"]),
  entityKey: hex.optional(),
  txHash: hex.optional(),
  /** Block that included the create. */
  block: z.string().optional(),
  expiresAtBlock: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  error: z.string().optional(),
});
export type TicketResponse = z.infer<typeof TicketResponse>;

/** GET /api/session?s=<code>. Phones poll this every 3 s while waiting for the doors. */
export const SessionPublic = z.object({
  /** False if the code isn't the current session. */
  valid: z.boolean(),
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

/** POST /api/presenter/session/start → new session code. Ends the previous one. */
export const SessionStartResponse = z.object({ code: z.string() });
/** POST /api/presenter/session/end → {} */
/** POST /api/presenter/doors */
export const DoorsRequest = z.object({ open: z.boolean() });
/** POST /api/presenter/phase */
export const PhaseRequest = z.object({ phase: z.enum(["talk", "build"]) });
/** POST /api/presenter/replay */
export const ReplayRequest = z.object({ on: z.boolean() });
/** POST /api/presenter/hold → resolves once the writer is idle (no tx in flight). */
export const HoldResponse = z.object({ held: z.literal(true), idle: z.boolean() });
/** POST /api/presenter/resume → {} (also auto-resumes 60 s after a hold). */

/** GET /api/presenter/status, polled every 2 s by /notes. */
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
});
export type PresenterStatus = z.infer<typeof PresenterStatus>;

/** POST /api/rpc: read-only JSON-RPC proxy through the keyed RPC (presenter token).
 * Only these methods are forwarded; anything else gets a JSON-RPC error. */
export const RPC_READ_ALLOWLIST = [
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getBalance",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getLogs",
  "arkiv_query",
  "arkiv_getEntityCount",
  "arkiv_getBlockTiming",
] as const;

/** The paths, in one place. */
export const WRITER_ROUTES = {
  submit: "/api/submit",
  ticket: (t: string) => `/api/ticket/${encodeURIComponent(t)}`,
  session: (s: string) => `/api/session?s=${encodeURIComponent(s)}`,
  rpc: "/api/rpc",
  presenter: {
    sessionStart: "/api/presenter/session/start",
    sessionEnd: "/api/presenter/session/end",
    doors: "/api/presenter/doors",
    phase: "/api/presenter/phase",
    replay: "/api/presenter/replay",
    hold: "/api/presenter/hold",
    resume: "/api/presenter/resume",
    status: "/api/presenter/status",
  },
} as const;

/** Public URL of the Worker, baked into the static app at build time. */
export const WRITER_URL_ENV = "NEXT_PUBLIC_WRITER_URL";
