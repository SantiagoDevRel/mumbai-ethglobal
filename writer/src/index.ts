import { phaseZero } from "./phase-zero.ts";
import { decodeEventLog, keccak256, parseTransaction, recoverTransactionAddress, type TransactionSerialized } from "viem";
import { ENTITY_EVENTS_ABI } from "@arkiv-network/sdk/entity";
import { eq } from "@arkiv-network/sdk/query";
import { key as keyValue } from "@arkiv-network/sdk/attr";
import { createSdkClients, type RpcObserver } from "../../shared/arkiv/clients-0.8.ts";
import { countdownTicket, TicketCache } from "./ticket-cache.ts";
import { dotToCreate } from "../../shared/arkiv/sdk-0.8.ts";
import { getProfile, WRITER_ADDRESS, NetworkNotConfiguredError } from "../../shared/arkiv/profiles.ts";
import type { DotCreate } from "../../shared/arkiv/adapter.ts";
import { APP_ID, MAX_ENTITIES_PER_SESSION, type Hex } from "../../shared/types.ts";
import { DEVICE_HEADER, DoorsRequest, LoginRequest, PhaseRequest, ReplayRequest, RPC_READ_ALLOWLIST, SubmitRequest, WRITER_ROUTES, type ErrorCode, type PresenterStatus, type TicketResponse } from "../../shared/writer-api.ts";
import { admissionError, deviceToken, nameBlocked, placeDot } from "./policy.ts";
import { REJECTION_MESSAGE } from "../../shared/data/blocklist.ts";

export interface Env {
  WRITER: DurableObjectNamespace;
  ARKIV_PROFILE: string;
  ALLOWED_ORIGINS: string;
  WORKSHOP_WRITER_PRIVATE_KEY: string;
  RPC: string;
  ACCESS_KEY: string;
  WORKSHOP_PRESENTER_TOKEN: string;
  /** The presenter pages' password. /api/login trades it for a signed 12-hour presenter token. */
  PRESENTER_PASSWORD?: string;
  MIN_WRITER_BALANCE_WEI?: string;
}

const LOGIN_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const bytes = (value: string) => new TextEncoder().encode(value);
async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
/** `p.<expiry ms>.<HMAC of the expiry, keyed by the presenter secret>`. Rotating the secret ends every login. */
async function signPresenter(secret: string, expiresAt: number): Promise<string> {
  return `p.${expiresAt}.${toHex(await crypto.subtle.sign("HMAC", await hmacKey(secret), bytes(`presenter:${expiresAt}`)))}`;
}
async function verifyPresenter(secret: string, token: string): Promise<boolean> {
  const match = /^p\.(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match || Number(match[1]) <= Date.now()) return false;
  const signature = new Uint8Array(match[2]!.match(/../g)!.map(pair => parseInt(pair, 16)));
  return crypto.subtle.verify("HMAC", await hmacKey(secret), signature, bytes(`presenter:${match[1]}`));
}
/** Constant-time password check: both sides are hashed to the same length first. */
async function samePassword(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([given, expected].map(value => crypto.subtle.digest("SHA-256", bytes(value))));
  return crypto.subtle.timingSafeEqual(a!, b!);
}

const REGISTRY = "0x4400000000000000000000000000000000000044";
type Clients = ReturnType<typeof createSdkClients>;
interface Ticket extends TicketResponse { dot: DotCreate; device: string; acceptedAt: number }
interface Device { count: number; lastTicket: string }
interface InFlight { tickets: string[]; nonce: number; startBlock: string; txHash?: Hex; raw?: Hex }
interface Meta {
  session: string | null; doors: "open" | "closed"; phase: "talk" | "build"; replay: boolean;
  heldUntil: number; queue: string[]; inFlight: InFlight | null; accepted: number;
  written: number; failed: number; lastBatch: PresenterStatus["lastBatch"]; lastFlushBlock: string;
  requestDay: string; requestsToday: number;
  rpcMetrics?: { calls: number; byMethod: Record<string, number>; http429: number; rpc429: number; errors: number; ticketQueries: number };
}
function initialMeta(): Meta {
  return { session: null, doors: "closed", phase: "talk", replay: false, heldUntil: 0, queue: [], inFlight: null,
    accepted: 0, written: 0, failed: 0, lastBatch: null, lastFlushBlock: "0", requestDay: "", requestsToday: 0 };
}
class ApiError extends Error {
  constructor(readonly code: ErrorCode, readonly status: number, message: string) { super(message); }
}
function fail(code: ErrorCode, status: number, message: string): never { throw new ApiError(code, status, message); }
async function jsonBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > 64_000) fail("invalid", 400, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) fail("invalid", 400, "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 64_000) { await reader.cancel(); fail("invalid", 400, "Request is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { return fail("invalid", 400, "Send valid JSON."); }
}

export class WriterObject implements DurableObject {
  private meta!: Meta;
  private ready: Promise<void>;
  private tail: Promise<unknown> = Promise.resolve();
  private clients?: Clients;
  private networkCheckedAt = 0;
  private balanceWei = "0";
  private blockTimeMs = 2_000;
  private batchTask: Promise<void> | null = null;
  private networkTask?: Promise<void>;
  private ticketCache: TicketCache;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {
    this.ready = state.blockConcurrencyWhile(async () => {
      this.meta = await state.storage.get<Meta>("meta") ?? initialMeta();
      this.meta.rpcMetrics ??= { calls: 0, byMethod: {}, http429: 0, rpc429: 0, errors: 0, ticketQueries: 0 };
    });
    this.ticketCache = new TicketCache(state.storage, async session => {
      const { reader } = await this.network();
      this.meta.rpcMetrics!.ticketQueries++;
      // The query supplies its canonical block: no per-phone block-number RPC.
      // SDK/node page size is 200; a larger room shares at most two pages.
      let page = await reader.select({ key: true, expiresAt: true }).createdBy(WRITER_ADDRESS)
        .where(eq("app", APP_ID), eq("session", session)).limit(200).fetch();
      const block = page.blockNumber;
      const entities: { key: string; expiresAt: bigint }[] = [];
      for (;;) {
        if (page.blockNumber !== block) throw new Error("Session snapshot changed between pages.");
        entities.push(...page.entities);
        if (!page.hasNextPage()) break;
        if (entities.length >= MAX_ENTITIES_PER_SESSION) throw new Error("Session exceeds its admission limit.");
        this.meta.rpcMetrics!.ticketQueries++;
        page = await page.next();
      }
      return { block, entities };
    });
  }

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const next = this.tail.then(async () => { await this.ready; return work(); });
    this.tail = next.catch(() => undefined);
    return next;
  }
  private save() { return this.state.storage.put("meta", this.meta); }
  private observeRpc: RpcObserver = event => {
    const metrics = this.meta.rpcMetrics!;
    if (event.phase === "request") { metrics.calls++; metrics.byMethod[event.method] = (metrics.byMethod[event.method] ?? 0) + 1; }
    if (event.phase === "response" && event.httpStatus === 429) metrics.http429++;
    if (event.phase === "response" && event.rpcCode === 429) metrics.rpc429++;
    if (event.phase === "error") metrics.errors++;
  };
  private async countRequest() {
    const day = new Date().toISOString().slice(0, 10);
    if (this.meta.requestDay !== day) { this.meta.requestDay = day; this.meta.requestsToday = 0; }
    this.meta.requestsToday++;
    await this.save();
  }
  private async network(force = false): Promise<Clients> {
    if (!this.env.ARKIV_PROFILE || !this.env.RPC || !this.env.ACCESS_KEY || !this.env.WORKSHOP_WRITER_PRIVATE_KEY) throw new NetworkNotConfiguredError("writer configuration is incomplete");
    if (!this.clients) {
      const profile = getProfile(this.env.ARKIV_PROFILE);
      this.clients = createSdkClients({ profile, creator: WRITER_ADDRESS,
        read: { kind: "keyed", url: this.env.RPC, accessKey: this.env.ACCESS_KEY },
        wallet: { kind: "privateKey", privateKey: this.env.WORKSHOP_WRITER_PRIVATE_KEY as Hex },
      }, { beforeSend: async (raw, hash) => this.exclusive(async () => {
        const flight = this.meta.inFlight;
        if (!flight) throw new Error("No durable batch is admitted.");
        const tx = parseTransaction(raw);
        if (tx.nonce !== flight.nonce || tx.chainId !== profile.chainId || tx.to?.toLowerCase() !== REGISTRY ||
          (await recoverTransactionAddress({ serializedTransaction: raw as TransactionSerialized })).toLowerCase() !== WRITER_ADDRESS.toLowerCase()) throw new Error("Signed transaction differs from the admitted writer.");
        flight.raw = raw; flight.txHash = hash;
        // This checkpoint completes before the custom transport forwards signed bytes.
        await this.save();
      }) }, this.observeRpc);
    }
    if (this.clients.writer!.account!.address.toLowerCase() !== WRITER_ADDRESS.toLowerCase()) throw new NetworkNotConfiguredError("writer account mismatch");
    if (force || Date.now() - this.networkCheckedAt > 30_000) {
      this.networkTask ??= (async () => {
        await this.clients!.checkNetwork();
        const timing = await this.clients!.reader.getBlockTiming();
        if (!Number.isFinite(timing.blockDuration) || timing.blockDuration <= 0) throw new NetworkNotConfiguredError("block timing is unavailable");
        this.blockTimeMs = timing.blockDuration * 1000;
        this.networkCheckedAt = Date.now();
      })().finally(() => { this.networkTask = undefined; });
      await this.networkTask;
    }
    return this.clients;
  }
  /** Scripts send the presenter secret itself; the presenter pages send a token from /api/login. */
  private async requirePresenter(request: Request) {
    const secret = this.env.WORKSHOP_PRESENTER_TOKEN;
    const header = request.headers.get("authorization") ?? "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!secret || !bearer || (bearer !== secret && !(await verifyPresenter(secret, bearer)))) fail("unauthorized", 401, "Enter the presenter password.");
  }
  private loginFailures = new Map<string, { count: number; resetAt: number }>();
  private async login(request: Request): Promise<Response> {
    if (!this.env.PRESENTER_PASSWORD || !this.env.WORKSHOP_PRESENTER_TOKEN) fail("unauthorized", 401, "Presenter login is not configured.");
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const now = Date.now();
    const record = this.loginFailures.get(ip);
    if (record && record.resetAt > now && record.count >= LOGIN_MAX_FAILURES) fail("too_many_attempts", 429, "Too many attempts. Wait a few minutes.");
    const data = LoginRequest.safeParse(await jsonBody(request));
    if (!data.success || !(await samePassword(data.data.password, this.env.PRESENTER_PASSWORD))) {
      const current = record && record.resetAt > now ? record : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
      current.count++;
      this.loginFailures.set(ip, current);
      fail("unauthorized", 401, "Wrong password.");
    }
    this.loginFailures.delete(ip);
    const expiresAt = now + LOGIN_TTL_MS;
    return Response.json({ token: await signPresenter(this.env.WORKSHOP_PRESENTER_TOKEN, expiresAt), expiresAt });
  }
  private held() { return this.meta.heldUntil > Date.now(); }
  private async schedule(delay = this.blockTimeMs) {
    if (!this.meta.queue.length && !this.meta.inFlight) return;
    const at = Date.now() + Math.max(250, delay);
    const existing = await this.state.storage.getAlarm();
    if (existing === null || existing > at) await this.state.storage.setAlarm(at);
  }
  private async cancelQueued() {
    const before = structuredClone(this.meta);
    const updates: Record<string, Ticket | Device | Meta> = {};
    for (const id of this.meta.queue) {
      const ticket = await this.state.storage.get<Ticket>(`ticket:${id}`);
      if (ticket) {
        ticket.status = "failed"; ticket.error = "The session ended before this entity was sent.";
        updates[`ticket:${id}`] = ticket; this.meta.failed++; this.meta.accepted--;
        const device = await this.state.storage.get<Device>(ticket.device);
        if (device) { device.count = Math.max(0, device.count - 1); updates[ticket.device] = device; }
      }
    }
    this.meta.queue = [];
    updates.meta = this.meta;
    try { await this.state.storage.put(updates); }
    catch (error) { this.meta = before; throw error; }
  }

  async fetch(request: Request): Promise<Response> {
    const response = await this.exclusive(async () => {
      await this.countRequest();
      const origin = request.headers.get("origin");
      const allowed = this.env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).filter(Boolean);
      let response: Response;
      try {
        if (origin && !allowed.includes(origin)) fail("invalid", 403, "This origin is not allowed.");
        response = request.method === "OPTIONS" ? new Response(null, { status: 204 }) : await this.route(request);
      } catch (error) {
        const code = error instanceof ApiError ? error.code : error instanceof NetworkNotConfiguredError ? "network_not_configured" : "internal";
        const status = error instanceof ApiError ? error.status : error instanceof NetworkNotConfiguredError ? 503 : 500;
        response = Response.json({ error: code, message: error instanceof ApiError ? error.message : code === "network_not_configured" ? "Network not configured." : "The writer could not complete this request." }, { status });
      }
      const headers = new Headers(response.headers);
      headers.set("cache-control", "no-store");
      headers.set("vary", "Origin");
      headers.set("x-content-type-options", "nosniff");
      if (origin && allowed.includes(origin)) {
        headers.set("access-control-allow-origin", origin);
        headers.set("access-control-allow-credentials", "true");
        headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
        headers.set("access-control-allow-headers", "content-type, authorization, x-device-token");
        headers.set("access-control-max-age", "600");
      }
      return new Response(response.body, { status: response.status, headers });
    });
    if (request.method === "GET" && new URL(request.url).pathname.startsWith("/api/ticket/") && response.ok) {
      const ticket = await response.json() as TicketResponse;
      if (ticket.status !== "written" || !ticket.entityKey || !ticket.block) return Response.json(ticket, { headers: response.headers });
      // Cache refreshes run outside the request mutex, as do batch receipt waits.
      // Every concurrent phone joins the same session refresh promise.
      try {
        const stored = await this.state.storage.get<Ticket>(`ticket:${ticket.ticket}`);
        if (!stored) throw new Error("Ticket disappeared.");
        const snapshot = await this.ticketCache.read(stored.dot.session);
        return Response.json(countdownTicket(ticket, snapshot), { headers: response.headers });
      } catch (error) {
        return Response.json({ error: error instanceof NetworkNotConfiguredError ? "network_not_configured" : "internal",
          message: "The countdown is temporarily unavailable. Please retry." },
        { status: 503, headers: { ...Object.fromEntries(response.headers), "retry-after": "2" } });
      }
    }
    // Hold marks the lease under the mutex, then waits outside it: the active
    // batch still needs that mutex to checkpoint signed bytes and its receipt.
    if (request.method === "POST" && new URL(request.url).pathname === "/api/presenter/hold" && response.ok) {
      await this.batchTask;
      return this.exclusive(async () => {
        if (this.meta.inFlight) await this.reconcile();
        return Response.json({ held: true, idle: this.meta.inFlight === null }, { headers: response.headers });
      });
    }
    return response;
  }

  private async route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === WRITER_ROUTES.login && request.method === "POST") return this.login(request);
    if (path.startsWith("/api/presenter/") || path === "/api/rpc") await this.requirePresenter(request);
    if (path === "/api/session" && request.method === "GET") {
      let network: string | null = null;
      try { await this.network(); network = getProfile(this.env.ARKIV_PROFILE).name; } catch { /* Fail closed in the public state. */ }
      const asked = url.searchParams.get("s");
      return Response.json({ valid: this.meta.session !== null && (asked === null || asked === this.meta.session), code: this.meta.session,
        doors: network ? this.meta.doors : "closed", phase: this.meta.phase, replay: this.meta.replay, network });
    }
    if (path === "/api/submit" && request.method === "POST") return this.submit(request);
    if (path.startsWith("/api/ticket/") && request.method === "GET") {
      const id = path.slice("/api/ticket/".length);
      if (!/^[a-f0-9-]{36}$/i.test(id)) fail("invalid", 400, "Invalid ticket.");
      const ticket = await this.state.storage.get<Ticket>(`ticket:${id}`);
      if (!ticket) fail("invalid", 404, "Ticket not found.");
      const { dot: _dot, device: _device, acceptedAt: _at, ...publicTicket } = ticket;
      return Response.json(publicTicket);
    }
    if (path === "/api/rpc" && request.method === "POST") return this.proxy(request);
    if (path === "/api/presenter/read-metrics" && request.method === "GET") {
      return Response.json({ ...this.meta.rpcMetrics, requestsToday: this.meta.requestsToday });
    }
    if (path === "/api/presenter/status" && request.method === "GET") {
      let network: string | null = null;
      try {
        const { reader } = await this.network();
        network = getProfile(this.env.ARKIV_PROFILE).name;
        this.balanceWei = String(await reader.getBalance({ address: WRITER_ADDRESS }));
      } catch { /* Status remains available for recovery. */ }
      const status: PresenterStatus = { session: this.meta.session, doors: this.meta.doors, phase: this.meta.phase,
        replay: this.meta.replay, held: this.held(), queued: this.meta.queue.length, inFlight: this.meta.inFlight !== null,
        written: this.meta.written, failed: this.meta.failed, lastBatch: this.meta.lastBatch,
        balanceWei: this.balanceWei, network, requestsToday: this.meta.requestsToday };
      return Response.json(status);
    }
    if (request.method !== "POST") fail("invalid", 404, "Route not found.");
    if (path === "/api/presenter/check") {
      if (this.meta.queue.length || this.meta.inFlight) fail("internal", 409, "Wait for the writer to become idle.");
      return phaseZero(this.state, this.env);
    }
    if (path === "/api/presenter/session/start") {
      if (this.meta.inFlight) fail("internal", 409, "An uncertain transaction needs reconciliation first.");
      await this.cancelQueued();
      this.meta.session = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
      // A new session takes writes at once: the presenter's Reset is this call.
      this.meta.doors = "open"; this.meta.phase = "talk"; this.meta.replay = false; this.meta.heldUntil = 0;
      this.meta.accepted = 0; this.meta.written = 0; this.meta.failed = 0; this.meta.lastBatch = null;
      await this.save();
      return Response.json({ code: this.meta.session });
    }
    if (path === "/api/presenter/session/end") {
      this.meta.doors = "closed"; this.meta.session = null;
      await this.cancelQueued();
    } else if (path === "/api/presenter/doors") {
      const data = DoorsRequest.safeParse(await jsonBody(request));
      if (!data.success) fail("invalid", 400, "Choose whether the doors are open.");
      if (data.data.open && !this.meta.session) fail("bad_session", 403, "Start a session first.");
      if (data.data.open) await this.network(true);
      this.meta.doors = data.data.open ? "open" : "closed";
    } else if (path === "/api/presenter/phase") {
      const data = PhaseRequest.safeParse(await jsonBody(request));
      if (!data.success) fail("invalid", 400, "Choose a valid workshop phase.");
      this.meta.phase = data.data.phase;
    } else if (path === "/api/presenter/replay") {
      const data = ReplayRequest.safeParse(await jsonBody(request));
      if (!data.success) fail("invalid", 400, "Choose whether replay is on.");
      this.meta.replay = data.data.on;
      if (!this.meta.replay) await this.schedule(250);
    } else if (path === "/api/presenter/hold") {
      this.meta.heldUntil = Date.now() + 60_000;
      await this.save();
      if (this.meta.inFlight && !this.batchTask) await this.reconcile();
      await this.schedule(60_000);
      return Response.json({ held: true, idle: this.meta.inFlight === null });
    } else if (path === "/api/presenter/resume") {
      this.meta.heldUntil = 0;
      await this.schedule(250);
    } else fail("invalid", 404, "Route not found.");
    await this.save();
    return Response.json({});
  }

  private async submit(request: Request): Promise<Response> {
    const parsed = SubmitRequest.safeParse(await jsonBody(request));
    if (!parsed.success) fail("invalid", 400, "Check your name, color, country and lifetime.");
    const data = parsed.data;
    if (data.session !== this.meta.session) fail("bad_session", 403, "This session has ended or the code is incorrect.");
    if (this.meta.doors !== "open" || this.meta.phase !== "talk" || this.meta.replay) fail("doors_closed", 409, "Writing is paused. Try again in a moment.");
    if (nameBlocked(data.name)) fail("name_blocked", 422, REJECTION_MESSAGE);
    const token = deviceToken(request.headers.get(DEVICE_HEADER), request.headers.get("cookie"));
    if (!token) fail("invalid", 400, "A valid device token is required.");
    const ticketId = crypto.randomUUID();
    const point = placeDot(data.country, ticketId);
    if (!point) fail("invalid", 400, "Choose a supported country.");
    const { reader } = await this.network();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)))).map(b => b.toString(16).padStart(2, "0")).join("");
    const deviceId = `device:${data.session}:${hash}`;
    const device = await this.state.storage.get<Device>(deviceId) ?? { count: 0, lastTicket: "" };
    let live = false;
    if (device.lastTicket) {
      const previous = await this.state.storage.get<Ticket>(`ticket:${device.lastTicket}`);
      live = previous?.status === "queued" || previous?.status === "sending";
      if (previous?.status === "written" && previous.entityKey) {
        const page = await reader.select({ key: true }).createdBy(WRITER_ADDRESS)
          .where(eq("app", APP_ID), eq("$key", keyValue(previous.entityKey as Hex))).fetch();
        live = page.entities.length > 0;
      }
    }
    const denied = admissionError(live, device.count, this.meta.accepted);
    if (denied) fail(denied, 429, denied === "map_full" ? "The map is full!" : denied === "device_live" ? "Your device already has a live entity." : "Your device has reached the session limit.");
    const ticket: Ticket = { ticket: ticketId, status: "queued", ...point,
      dot: { session: data.session, name: data.name, color: data.color.toLowerCase(), country: data.country, lifetimeSec: data.lifetimeSec, ...point }, device: deviceId, acceptedAt: Date.now() };
    const before = structuredClone(this.meta);
    this.meta.queue.push(ticketId); this.meta.accepted++;
    device.count++; device.lastTicket = ticketId;
    try { await this.state.storage.transaction(async storage => {
      await storage.put({ [`ticket:${ticketId}`]: ticket, [deviceId]: device, meta: this.meta });
      // Alarm creation and acceptance commit together: a crash cannot strand an accepted ticket.
      if (await storage.getAlarm() === null) await storage.setAlarm(Date.now() + this.blockTimeMs);
    }); } catch (error) { this.meta = before; throw error; }
    return Response.json({ ticket: ticketId, position: this.meta.queue.length, ...point }, { headers: { "set-cookie": `workshop_device=${token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=86400` } });
  }

  private async proxy(request: Request): Promise<Response> {
    await this.network();
    const input = await jsonBody(request);
    const calls = Array.isArray(input) ? input : [input];
    if (!calls.length || calls.length > 20) fail("invalid", 400, "Invalid RPC batch.");
    const responses: unknown[] = [];
    for (const call of calls) {
      if (!call || typeof call !== "object" || typeof call.method !== "string" || !(RPC_READ_ALLOWLIST as readonly string[]).includes(call.method)) {
        responses.push({ jsonrpc: "2.0", id: call?.id ?? null, error: { code: -32601, message: "Read method not allowed." } });
        continue;
      }
      try {
        this.observeRpc({ method: call.method, phase: "request" });
        const response = await fetch(this.env.RPC, { method: "POST", headers: { "content-type": "application/json", "X-API-KEY": this.env.ACCESS_KEY },
          body: JSON.stringify({ jsonrpc: "2.0", id: call.id ?? null, method: call.method, params: call.params ?? [] }), signal: AbortSignal.timeout(15_000) });
        if (!response.ok) { this.observeRpc({ method: call.method, phase: "response", httpStatus: response.status }); throw new Error("RPC rejected."); }
        const body = await response.json() as { result?: unknown; error?: { code: number } };
        this.observeRpc({ method: call.method, phase: "response", httpStatus: response.status, rpcCode: body.error?.code });
        responses.push(body.error ? { jsonrpc: "2.0", id: call.id ?? null, error: { code: body.error.code, message: "RPC read failed." } } : { jsonrpc: "2.0", id: call.id ?? null, result: body.result });
      } catch { this.observeRpc({ method: call.method, phase: "error" }); responses.push({ jsonrpc: "2.0", id: call.id ?? null, error: { code: -32000, message: "RPC read unavailable." } }); }
    }
    return Response.json(Array.isArray(input) ? responses : responses[0]);
  }

  async alarm(): Promise<void> {
    if (this.batchTask) { await this.exclusive(() => this.countRequest()); return; }
    const task = this.runAlarm();
    this.batchTask = task;
    try { await task; } finally { if (this.batchTask === task) this.batchTask = null; }
  }

  private async runAlarm(): Promise<void> {
    let nextDelay: number | undefined = 250;
    try {
      const prepared = await this.exclusive(async () => {
      await this.countRequest();
        if (this.meta.inFlight) { await this.reconcile(); if (this.meta.inFlight) { nextDelay = 5_000; return; } }
        if (this.held()) { nextDelay = this.meta.heldUntil - Date.now(); return; }
        if (this.meta.replay || !this.meta.queue.length) { nextDelay = undefined; return; }
        const { reader, writer } = await this.network(true);
        const block = await reader.getBlockNumber();
        if (block <= BigInt(this.meta.lastFlushBlock)) { nextDelay = this.blockTimeMs; return; }
        const balance = await reader.getBalance({ address: WRITER_ADDRESS });
        this.balanceWei = String(balance);
        const minimum = BigInt(this.env.MIN_WRITER_BALANCE_WEI ?? "0");
        if (balance < minimum) {
          this.meta.doors = "closed";
          this.meta.heldUntil = Date.now() + 60_000;
          await this.save();
          nextDelay = 60_000;
          return;
        }
        const ids = this.meta.queue.slice(0, 20);
        const tickets = await Promise.all(ids.map(id => this.state.storage.get<Ticket>(`ticket:${id}`)));
        if (tickets.some(ticket => !ticket)) throw new Error("Queue checkpoint missing.");
        const nonce = await reader.getTransactionCount({ address: WRITER_ADDRESS, blockTag: "pending" });
        this.meta.inFlight = { tickets: ids, nonce, startBlock: String(block) };
        this.meta.queue = this.meta.queue.slice(ids.length);
        this.meta.lastFlushBlock = String(block);
        const updates: Record<string, Ticket | Meta> = { meta: this.meta };
        for (const ticket of tickets as Ticket[]) { ticket.status = "sending"; updates[`ticket:${ticket.ticket}`] = ticket; }
        await this.state.storage.put(updates);
        return { writer: writer!, tickets: tickets as Ticket[], nonce };
      });
      if (prepared) {
        try {
          const result = await prepared.writer.executeBatch({ creates: prepared.tickets.map(ticket => dotToCreate(ticket.dot)) }, { nonce: prepared.nonce });
          await this.exclusive(async () => {
            if (this.meta.inFlight?.txHash !== result.txHash) throw new Error("Receipt hash differs from the signed batch.");
            await this.reconcile();
          });
        } catch {
          await this.exclusive(async () => {
            if (this.meta.inFlight && !this.meta.inFlight.txHash) await this.failBatch("The transaction was not broadcast. Please try again.");
          });
          // A captured hash is never resent. A later alarm reconciles the same receipt.
        }
      }
    } catch { nextDelay = 5_000; /* Keep the durable queue for the next bounded alarm. */ }
    finally {
      // A receipt normally arrives in the next block. Admit its successor there,
      // while lastFlushBlock still prevents two sends during the same block.
      await this.exclusive(async () => {
        if (this.meta.replay && !this.meta.inFlight) return;
        if (nextDelay !== undefined) await this.schedule(this.meta.inFlight ? 5_000 : this.held() ? this.meta.heldUntil - Date.now() : nextDelay);
      });
    }
  }

  private async failBatch(message: string) {
    const flight = this.meta.inFlight;
    if (!flight) return;
    const before = structuredClone(this.meta);
    const updates: Record<string, Ticket | Meta | Device> = {};
    for (const id of flight.tickets) {
      const ticket = await this.state.storage.get<Ticket>(`ticket:${id}`);
      if (ticket && ticket.status !== "written" && ticket.status !== "failed") {
        ticket.status = "failed"; ticket.error = message;
        if (flight.txHash) ticket.txHash = flight.txHash;
        updates[`ticket:${id}`] = ticket; this.meta.failed++; this.meta.accepted--;
        const device = await this.state.storage.get<Device>(ticket.device);
        if (device) { device.count = Math.max(0, device.count - 1); updates[ticket.device] = device; }
      }
    }
    this.meta.inFlight = null; updates.meta = this.meta;
    try { await this.state.storage.put(updates); }
    catch (error) { this.meta = before; throw error; }
  }

  private async reconcile() {
    const flight = this.meta.inFlight;
    if (!flight) return;
    const before = structuredClone(this.meta);
    // An interrupted prepare with no captured signed bytes never entered the provider.
    if (!flight.txHash || !flight.raw) { await this.failBatch("The transaction was not broadcast."); return; }
    if (keccak256(flight.raw) !== flight.txHash) throw new Error("Transaction checkpoint is inconsistent.");
    const { reader } = await this.network(true);
    let receipt;
    try { receipt = await reader.getTransactionReceipt({ hash: flight.txHash }); } catch { return; }
    if (receipt.status === "reverted") { await this.failBatch("The transaction reverted. Please try again."); return; }
    const tx = await reader.getTransaction({ hash: flight.txHash });
    const signed = parseTransaction(flight.raw);
    if (tx.from.toLowerCase() !== WRITER_ADDRESS.toLowerCase() || tx.nonce !== flight.nonce || tx.input !== signed.data || tx.to?.toLowerCase() !== REGISTRY) throw new Error("Receipt is not the admitted transaction.");
    const created: { key: Hex; expiresAt: bigint }[] = [];
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== REGISTRY) continue;
      const event = decodeEventLog({ abi: ENTITY_EVENTS_ABI, data: log.data, topics: log.topics });
      if (event.eventName === "EntityCreated") {
        if (event.args.owner.toLowerCase() !== WRITER_ADDRESS.toLowerCase() || !(event.args.creationFlags & 2)) throw new Error("Create event differs from the workshop policy.");
        created.push({ key: event.args.entityKey, expiresAt: event.args.expiresAt });
      }
    }
    if (created.length !== flight.tickets.length || new Set(created.map(item => item.key)).size !== created.length) throw new Error("Create events do not match the admitted batch.");
    const updates: Record<string, Ticket | Meta> = {};
    for (let index = 0; index < flight.tickets.length; index++) {
      const id = flight.tickets[index]!;
      const ticket = await this.state.storage.get<Ticket>(`ticket:${id}`);
      if (!ticket) throw new Error("Ticket checkpoint missing.");
      if (ticket.status !== "written") this.meta.written++;
      ticket.status = "written"; ticket.entityKey = created[index]!.key; ticket.expiresAtBlock = String(created[index]!.expiresAt);
      ticket.txHash = flight.txHash; ticket.block = String(receipt.blockNumber);
      updates[`ticket:${id}`] = ticket;
    }
    this.meta.lastBatch = { txHash: flight.txHash, block: String(receipt.blockNumber), size: created.length, at: Date.now() };
    this.meta.inFlight = null; updates.meta = this.meta;
    try { await this.state.storage.put(updates); }
    catch (error) { this.meta = before; throw error; }
    this.balanceWei = String(await reader.getBalance({ address: WRITER_ADDRESS }));
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.WRITER.idFromName("main");
    return env.WRITER.get(id).fetch(request);
  },
} satisfies ExportedHandler<Env>;
