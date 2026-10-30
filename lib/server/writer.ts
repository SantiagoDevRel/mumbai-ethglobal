// The workshop writer on Vercel: the same HTTP API the Cloudflare Worker served (shared/writer-api.ts),
// with its state in Postgres instead of a Durable Object.
//
// One sender at a time: a batch is sent only by the holder of a short lease row in Postgres, and
// every write the holder makes re-checks that it still holds the lease, including the checkpoint of
// the signed bytes right before broadcast. A function instance takes the lease after a submit, a
// queued ticket poll or a presenter status poll (instead of the Durable Object's alarm), sends one
// batch per block while tickets wait, and releases it when the queue is empty.
//
// Reads never go through the sender: GET /api/session is cached by the CDN for two seconds, and
// written tickets share one session read per two seconds across all instances.

import { decodeEventLog, keccak256, parseTransaction, recoverTransactionAddress, type TransactionSerialized } from "viem";
import { ENTITY_EVENTS_ABI, key as entityKey } from "@arkiv-network/sdk";
import { asc, eq, gt } from "@arkiv-network/sdk/query";
import { createSdkClients, keyQuotaExhausted, postKeyed, type RpcObserver } from "../../shared/arkiv/clients-1.0";
import { dotToCreate } from "../../shared/arkiv/sdk-1.0";
import { getProfile, NetworkNotConfiguredError } from "../../shared/arkiv/profiles";
import type { DotCreate } from "../../shared/arkiv/adapter";
import { APP_ID, DOT_CATEGORIES, MAX_ENTITIES_PER_SESSION, type Hex } from "../../shared/types";
import { DEVICE_HEADER, DoorsRequest, LoginRequest, PhaseRequest, ReplayRequest, RPC_READ_ALLOWLIST, SubmitRequest, WritingRequest, WRITER_ROUTES, type ErrorCode, type PresenterStatus, type TicketResponse } from "../../shared/writer-api";
import { REJECTION_MESSAGE } from "../../shared/data/blocklist";
import { admissionError, deviceToken, nameBlocked, placeDot } from "./policy";
import { countdownTicket, type SessionSnapshot } from "./countdown";
import { sameSecret, signPresenter, verifyPresenter } from "./presenter-token";
import { runPhaseZero } from "./phase-zero";
import { rabdiNetwork, type RabdiEnv } from "./rabdi";
import type { Db, Query } from "./db";

export interface WriterEnv extends RabdiEnv {
  ARKIV_PROFILE?: string;
  RPC?: string;
  ACCESS_KEY?: string;
  WORKSHOP_WRITER_PRIVATE_KEY?: string;
  WORKSHOP_PRESENTER_TOKEN?: string;
  PRESENTER_PASSWORD?: string;
  MIN_WRITER_BALANCE_WEI?: string;
  /** Extra origins allowed to call the API cross-origin (local development). Same-origin always is. */
  ALLOWED_ORIGINS?: string;
}
export interface WriterConfig {
  db: Db;
  env: WriterEnv;
  writerAddress: Hex;
  /** Runs work after the response is sent (Next's `after`). */
  defer: (task: () => Promise<void>) => void;
}

const REGISTRY = "0x4400000000000000000000000000000000000044";
const LOGIN_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const LEASE_MS = 30_000;
/** One sender run stays well inside the function's maximum duration; the next kick continues. */
const RUN_MS = 90_000;
/** How long a phone's submit waits for its block before answering "on its way". */
const SUBMIT_WAIT_MS = 25_000;
const HOLD_MS = 60_000;
const SNAPSHOT_MS = 2_000;
const BALANCE_MS = 15_000;
const BATCH_SIZE = 20;

interface InFlight { tickets: string[]; nonce: number; startBlock: string; txHash?: Hex; raw?: Hex }
interface Meta {
  session: string | null; doors: "open" | "closed"; phase: "talk" | "build"; replay: boolean; heldUntil: number;
  accepted: number; written: number; failed: number; lastBatch: PresenterStatus["lastBatch"]; lastFlushBlock: string;
  inFlight: InFlight | null; leaseHolder: string | null; leaseUntil: number; balanceWei: string; balanceAt: number;
  opDay: string; opsToday: number;
}
interface TicketRow {
  id: string; session: string; device: string; status: TicketResponse["status"]; dot: DotCreate; lat: number; lng: number;
  entity_key: string | null; tx_hash: string | null; block: string | null; expires_at_block: string | null; error: string | null;
}
const META_COLUMNS = "session, doors, phase, replay, held_until, accepted, written, failed, last_batch, last_flush_block, in_flight, lease_holder, lease_until, balance_wei, balance_at, op_day, ops_today";
const TICKET_COLUMNS = "id, session, device, status, dot, lat, lng, entity_key, tx_hash, block, expires_at_block, error";

function toMeta(row: Record<string, unknown>): Meta {
  return {
    session: row.session as string | null, doors: row.doors as Meta["doors"], phase: row.phase as Meta["phase"], replay: Boolean(row.replay),
    heldUntil: Number(row.held_until), accepted: Number(row.accepted), written: Number(row.written), failed: Number(row.failed),
    lastBatch: (row.last_batch ?? null) as Meta["lastBatch"], lastFlushBlock: String(row.last_flush_block),
    inFlight: (row.in_flight ?? null) as InFlight | null, leaseHolder: row.lease_holder as string | null, leaseUntil: Number(row.lease_until),
    balanceWei: String(row.balance_wei), balanceAt: Number(row.balance_at), opDay: String(row.op_day), opsToday: Number(row.ops_today),
  };
}
function publicTicket(row: TicketRow): TicketResponse {
  const ticket: TicketResponse = { ticket: row.id, status: row.status, lat: row.lat, lng: row.lng };
  if (row.entity_key) ticket.entityKey = row.entity_key;
  if (row.tx_hash) ticket.txHash = row.tx_hash;
  if (row.block) ticket.block = row.block;
  if (row.expires_at_block) ticket.expiresAtBlock = row.expires_at_block;
  if (row.error) ticket.error = row.error;
  return ticket;
}

class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  constructor(code: ErrorCode, status: number, message: string) { super(message); this.code = code; this.status = status; }
}
function fail(code: ErrorCode, status: number, message: string): never { throw new ApiError(code, status, message); }
class LeaseLost extends Error {}
class TicketReadUnavailable extends Error {}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function jsonBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > 64_000) fail("invalid", 400, "Request is too large.");
  const text = await request.text().catch(() => fail("invalid", 400, "A JSON body is required."));
  if (text.length > 64_000) fail("invalid", 400, "Request is too large.");
  try { return JSON.parse(text); } catch { return fail("invalid", 400, "Send valid JSON."); }
}

export function createWriter({ db, env, writerAddress, defer }: WriterConfig) {
  const t = db.t;
  const address = writerAddress.toLowerCase();
  type Clients = ReturnType<typeof createSdkClients>;
  let clients: Clients | undefined;
  let networkCheckedAt = 0;
  let networkTask: Promise<void> | undefined;
  let blockTimeMs = 2_000;
  /** Set only while this instance's lease holder sends a batch: the signed-bytes checkpoint. */
  let journal: ((raw: Hex, hash: Hex) => Promise<void>) | null = null;
  let lastKickAt = 0;
  const writtenTickets = new Map<string, TicketRow>();
  const snapshots = new Map<string, { snapshot: SessionSnapshot; checkedAt: number }>();
  // Concurrent ticket polls on one instance wait for the same snapshot lookup.
  const pendingSnapshots = new Map<string, Promise<SessionSnapshot>>();
  const rpcMetrics = { calls: 0, byMethod: {} as Record<string, number>, http429: 0, rpc429: 0, errors: 0, ticketQueries: 0 };
  const observeRpc: RpcObserver = event => {
    if (event.phase === "request") { rpcMetrics.calls++; rpcMetrics.byMethod[event.method] = (rpcMetrics.byMethod[event.method] ?? 0) + 1; }
    if (event.phase === "response" && event.httpStatus === 429) rpcMetrics.http429++;
    if (event.phase === "response" && event.rpcCode === 429) rpcMetrics.rpc429++;
    if (event.phase === "error") rpcMetrics.errors++;
  };

  async function readMeta(): Promise<Meta> {
    return toMeta((await db.query(`select ${META_COLUMNS} from ${t("meta")} where id = 1`))[0]!);
  }
  async function lockMeta(q: Query): Promise<Meta> {
    return toMeta((await q(`select ${META_COLUMNS} from ${t("meta")} where id = 1 for update`))[0]!);
  }
  async function saveMeta(q: Query, meta: Meta) {
    const day = new Date().toISOString().slice(0, 10);
    if (meta.opDay !== day) { meta.opDay = day; meta.opsToday = 0; }
    meta.opsToday++;
    await q(`update ${t("meta")} set session = $1, doors = $2, phase = $3, replay = $4, held_until = $5, accepted = $6, written = $7,
      failed = $8, last_batch = $9, last_flush_block = $10, in_flight = $11, balance_wei = $12, balance_at = $13, op_day = $14, ops_today = $15 where id = 1`,
    [meta.session, meta.doors, meta.phase, meta.replay, meta.heldUntil, meta.accepted, meta.written, meta.failed,
      meta.lastBatch === null ? null : JSON.stringify(meta.lastBatch), meta.lastFlushBlock, meta.inFlight === null ? null : JSON.stringify(meta.inFlight),
      meta.balanceWei, meta.balanceAt, meta.opDay, meta.opsToday]);
  }
  const held = (meta: Meta) => meta.heldUntil > Date.now();

  async function network(force = false): Promise<Clients> {
    if (!env.ARKIV_PROFILE || !env.RPC || !env.ACCESS_KEY || !env.WORKSHOP_WRITER_PRIVATE_KEY) throw new NetworkNotConfiguredError("writer configuration is incomplete");
    if (!clients) {
      const profile = getProfile(env.ARKIV_PROFILE);
      clients = createSdkClients({ profile, creator: writerAddress,
        read: { kind: "keyed", url: env.RPC, accessKey: env.ACCESS_KEY },
        wallet: { kind: "privateKey", privateKey: env.WORKSHOP_WRITER_PRIVATE_KEY as Hex },
      }, { beforeSend: async (raw, hash) => {
        if (!journal) throw new Error("No durable batch is admitted.");
        await journal(raw, hash);
      } }, observeRpc);
    }
    if (clients.writer!.account!.address.toLowerCase() !== address) throw new NetworkNotConfiguredError("writer account mismatch");
    if (force || Date.now() - networkCheckedAt > 30_000) {
      networkTask ??= (async () => {
        await clients!.checkNetwork();
        const timing = await clients!.reader.getBlockTiming();
        if (!Number.isFinite(timing.blockDuration) || timing.blockDuration <= 0) throw new NetworkNotConfiguredError("block timing is unavailable");
        blockTimeMs = timing.blockDuration * 1000;
        networkCheckedAt = Date.now();
      })().finally(() => { networkTask = undefined; });
      await networkTask;
    }
    return clients;
  }
  async function networkName(): Promise<string | null> {
    try { await network(); return getProfile(env.ARKIV_PROFILE).name; } catch { return null; }
  }

  async function requirePresenter(request: Request) {
    const secret = env.WORKSHOP_PRESENTER_TOKEN;
    const header = request.headers.get("authorization") ?? "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!secret || !bearer || !(await sameSecret(bearer, secret) || await verifyPresenter(secret, bearer))) fail("unauthorized", 401, "Enter the presenter password.");
  }
  async function login(request: Request): Promise<Response> {
    if (!env.PRESENTER_PASSWORD || !env.WORKSHOP_PRESENTER_TOKEN) fail("unauthorized", 401, "Presenter login is not configured.");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const [record] = await db.query<{ count: number; reset_at: string }>(`select count, reset_at from ${t("logins")} where ip = $1`, [ip]);
    if (record && Number(record.reset_at) > now && record.count >= LOGIN_MAX_FAILURES) fail("too_many_attempts", 429, "Too many attempts. Wait a few minutes.");
    const data = LoginRequest.safeParse(await jsonBody(request));
    if (!data.success || !(await sameSecret(data.data.password, env.PRESENTER_PASSWORD))) {
      await db.query(`insert into ${t("logins")} (ip, count, reset_at) values ($1, 1, $3) on conflict (ip) do update set
        count = case when ${t("logins")}.reset_at > $2 then ${t("logins")}.count + 1 else 1 end,
        reset_at = case when ${t("logins")}.reset_at > $2 then ${t("logins")}.reset_at else $3 end`, [ip, now, now + LOGIN_WINDOW_MS]);
      fail("unauthorized", 401, "Wrong password.");
    }
    await db.query(`delete from ${t("logins")} where ip = $1`, [ip]);
    const expiresAt = now + LOGIN_TTL_MS;
    return Response.json({ token: await signPresenter(env.WORKSHOP_PRESENTER_TOKEN, expiresAt), expiresAt });
  }

  // ---------- the one sender ----------

  /** Start a sender run after this response unless one ran from this instance in the last second. */
  function kick() {
    if (Date.now() - lastKickAt < 1_000) return;
    lastKickAt = Date.now();
    defer(() => runWriter().catch(error => console.error("writer run failed:", error instanceof Error ? error.message : String(error))));
  }
  async function acquire(holder: string): Promise<boolean> {
    const now = Date.now();
    return (await db.query(`update ${t("meta")} set lease_holder = $1, lease_until = $2 where id = 1 and lease_until < $3 returning id`, [holder, now + LEASE_MS, now])).length === 1;
  }
  async function release(holder: string) {
    await db.query(`update ${t("meta")} set lease_holder = null, lease_until = 0 where id = 1 and lease_holder = $1`, [holder]);
  }
  /** Runs `work` while holding the lease, renewing it every ten seconds. False if another holder has it. */
  async function withLease(work: (holder: string) => Promise<void>): Promise<boolean> {
    const holder = crypto.randomUUID();
    if (!await acquire(holder)) return false;
    const beat = setInterval(() => {
      void db.query(`update ${t("meta")} set lease_until = $2 where id = 1 and lease_holder = $1`, [holder, Date.now() + LEASE_MS]).catch(() => undefined);
    }, 10_000);
    try { await work(holder); }
    finally { clearInterval(beat); await release(holder).catch(() => undefined); }
    return true;
  }
  async function holderTransaction<T>(holder: string, work: (q: Query, meta: Meta) => Promise<T>): Promise<T> {
    return db.transaction(async q => {
      const meta = await lockMeta(q);
      if (meta.leaseHolder !== holder) throw new LeaseLost("The writer lease moved to another sender.");
      return work(q, meta);
    });
  }

  async function runWriter(): Promise<void> {
    await withLease(async holder => {
      const deadline = Date.now() + RUN_MS;
      while (Date.now() < deadline) {
        const next = await flushOnce(holder);
        if (next === "stop" || next > 8_000) return;
        if (next > 0) await sleep(next);
      }
    });
  }

  /** One step of the old alarm. A number is the wait before the next step; "stop" ends the run. */
  async function flushOnce(holder: string): Promise<number | "stop"> {
    let meta = await readMeta();
    if (meta.leaseHolder !== holder) return "stop";
    if (meta.inFlight) {
      await reconcile(holder);
      meta = await readMeta();
      if (meta.inFlight) return 2_000;
    }
    if (held(meta) || meta.replay) return "stop";
    const { reader, writer } = await network(true);
    // Independent reads go out together: every sequential round trip here can push the batch a block later.
    const [[{ n }], block, balance, nonce] = await Promise.all([
      db.query<{ n: number }>(`select count(*)::int as n from ${t("tickets")} where status = 'queued'`) as Promise<[{ n: number }]>,
      reader.getBlockNumber(), reader.getBalance({ address: writerAddress }),
      reader.getTransactionCount({ address: writerAddress, blockTag: "pending" })]);
    if (!n) return "stop";
    if (block <= BigInt(meta.lastFlushBlock)) return Math.max(250, Math.round(blockTimeMs / 2));
    if (balance < BigInt(env.MIN_WRITER_BALANCE_WEI ?? "0")) {
      await holderTransaction(holder, async (q, locked) => {
        locked.doors = "closed"; locked.heldUntil = Date.now() + HOLD_MS;
        locked.balanceWei = String(balance); locked.balanceAt = Date.now();
        await saveMeta(q, locked);
      });
      return "stop";
    }
    const prepared = await holderTransaction(holder, async (q, locked) => {
      locked.balanceWei = String(balance); locked.balanceAt = Date.now();
      if (locked.inFlight || held(locked) || locked.replay) { await saveMeta(q, locked); return null; }
      const rows = await q<TicketRow>(`select ${TICKET_COLUMNS} from ${t("tickets")} where status = 'queued' order by seq limit ${BATCH_SIZE} for update`);
      if (!rows.length) return null;
      const ids = rows.map(row => row.id);
      await q(`update ${t("tickets")} set status = 'sending' where id = any($1::uuid[])`, [ids]);
      locked.inFlight = { tickets: ids, nonce, startBlock: String(block) };
      locked.lastFlushBlock = String(block);
      await saveMeta(q, locked);
      return rows;
    });
    if (!prepared) return 0;
    const profile = getProfile(env.ARKIV_PROFILE);
    journal = (raw, hash) => holderTransaction(holder, async (q, locked) => {
      const flight = locked.inFlight;
      if (!flight) throw new Error("No durable batch is admitted.");
      const tx = parseTransaction(raw);
      if (tx.nonce !== flight.nonce || tx.chainId !== profile.chainId || tx.to?.toLowerCase() !== REGISTRY ||
        (await recoverTransactionAddress({ serializedTransaction: raw as TransactionSerialized })).toLowerCase() !== address) throw new Error("Signed transaction differs from the admitted writer.");
      flight.raw = raw; flight.txHash = hash;
      // This checkpoint commits before the transport forwards the signed bytes.
      await saveMeta(q, locked);
    });
    try {
      const result = await writer!.executeBatch({ creates: prepared.map(row => dotToCreate(row.dot)) }, { nonce });
      journal = null;
      if ((await readMeta()).inFlight?.txHash !== result.txHash) throw new Error("Receipt hash differs from the signed batch.");
      await reconcile(holder);
    } catch (error) {
      journal = null;
      if (error instanceof LeaseLost) return "stop";
      const current = await readMeta();
      if (current.inFlight && !current.inFlight.txHash) await failBatch(holder, "The transaction was not broadcast. Please try again.");
      // A captured hash is never resent: the next step reconciles the same receipt.
      return 2_000;
    }
    return 0;
  }

  async function failBatch(holder: string, message: string) {
    await holderTransaction(holder, async (q, meta) => {
      const flight = meta.inFlight;
      if (!flight) return;
      const failed = await q<{ device: string }>(`update ${t("tickets")} set status = 'failed', error = $2, tx_hash = coalesce($3, tx_hash)
        where id = any($1::uuid[]) and status not in ('written', 'failed') returning device`, [flight.tickets, message, flight.txHash ?? null]);
      await releaseDevices(q, failed.map(row => row.device));
      meta.failed += failed.length; meta.accepted -= failed.length;
      meta.inFlight = null;
      await saveMeta(q, meta);
    });
  }
  async function releaseDevices(q: Query, devices: string[]) {
    const counts = new Map<string, number>();
    for (const device of devices) counts.set(device, (counts.get(device) ?? 0) + 1);
    for (const [device, n] of counts) await q(`update ${t("devices")} set count = greatest(0, count - $2) where id = $1`, [device, n]);
  }

  async function reconcile(holder: string) {
    const meta = await readMeta();
    const flight = meta.inFlight;
    if (!flight) return;
    // An interrupted prepare with no captured signed bytes never reached the RPC.
    if (!flight.txHash || !flight.raw) { await failBatch(holder, "The transaction was not broadcast."); return; }
    if (keccak256(flight.raw) !== flight.txHash) throw new Error("Transaction checkpoint is inconsistent.");
    const { reader } = await network(true);
    let receipt, tx;
    // Not mined yet (or a transient read error): the next step asks again.
    try { [receipt, tx] = await Promise.all([reader.getTransactionReceipt({ hash: flight.txHash }), reader.getTransaction({ hash: flight.txHash })]); } catch { return; }
    if (receipt.status === "reverted") { await failBatch(holder, "The transaction reverted. Please try again."); return; }
    const signed = parseTransaction(flight.raw);
    if (tx.from.toLowerCase() !== address || tx.nonce !== flight.nonce || tx.input !== signed.data || tx.to?.toLowerCase() !== REGISTRY) throw new Error("Receipt is not the admitted transaction.");
    const created: { key: Hex; expiresAt: bigint }[] = [];
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== REGISTRY) continue;
      const event = decodeEventLog({ abi: ENTITY_EVENTS_ABI, data: log.data, topics: log.topics });
      if (event.eventName === "EntityCreated") {
        if (event.args.owner.toLowerCase() !== address || !(event.args.creationFlags & 2)) throw new Error("Create event differs from the workshop policy.");
        // Any deadline is accepted, NO_EXPIRY_BLOCK (2**64 - 1) included; it is stored as exact text.
        created.push({ key: event.args.entityKey, expiresAt: event.args.expiresAt });
      }
    }
    if (created.length !== flight.tickets.length || new Set(created.map(item => item.key)).size !== created.length) throw new Error("Create events do not match the admitted batch.");
    await holderTransaction(holder, async (q, locked) => {
      if (locked.inFlight?.txHash !== flight.txHash) return;
      // One statement for the whole batch; tickets pair with create events in admission order.
      const updated = await q<{ was: string }>(`with input as (select * from unnest($1::uuid[], $2::text[], $3::text[]) as i(id, entity_key, expires_at_block)),
          before as (select ticket.id, ticket.status as was from ${t("tickets")} as ticket join input using (id))
        update ${t("tickets")} as ticket set status = 'written', entity_key = input.entity_key, expires_at_block = input.expires_at_block, tx_hash = $4, block = $5
        from input join before using (id) where ticket.id = input.id returning before.was`,
      [flight.tickets, created.map(item => item.key), created.map(item => String(item.expiresAt)), flight.txHash, String(receipt.blockNumber)]);
      if (updated.length !== flight.tickets.length) throw new Error("Ticket checkpoint missing.");
      locked.written += updated.filter(row => row.was !== "written").length;
      locked.lastBatch = { txHash: flight.txHash!, block: String(receipt.blockNumber), size: created.length, at: Date.now() };
      locked.inFlight = null;
      await saveMeta(q, locked);
    });
  }

  // ---------- reads ----------

  async function fetchSession(session: string) {
    const { reader } = await network();
    rpcMetrics.ticketQueries++;
    let pages = 0;
    // The query supplies its block: no per-phone block-number RPC. Pages hold 100 rows, ordered by
    // $key; each next page continues after the last key read.
    // One session only: entities with no expiration from earlier sessions never enter this read.
    let block = 0n;
    let after: Hex | undefined;
    const entities: { key: string; expiresAt: bigint }[] = [];
    for (;;) {
      if (pages) rpcMetrics.ticketQueries++;
      pages++;
      const query = reader.select({ $key: true, $expiresAt: true }).createdBy(writerAddress)
        .where(eq("app", APP_ID), eq("session", session)).orderBy(asc("$key")).limit(100);
      if (after) query.where(gt("$key", entityKey(after)));
      const page = await query.fetch();
      if (page.blockNumber > block) block = page.blockNumber;
      entities.push(...page.entities.map(entity => ({ key: entity.$key, expiresAt: entity.$expiresAt })));
      if (page.entities.length < 100) break;
      if (entities.length >= MAX_ENTITIES_PER_SESSION) throw new Error("Session exceeds its admission limit.");
      after = page.entities.at(-1)!.$key;
    }
    return { block, entities, pages };
  }
  /** One chain read per session every two seconds across all instances: the instance that claims the
   * refresh queries; the others serve the stored snapshot. An observed extension is never lost. */
  async function sessionSnapshot(session: string): Promise<SessionSnapshot> {
    const memo = snapshots.get(session);
    if (memo && Date.now() - memo.checkedAt < 1_000) return memo.snapshot;
    let pending = pendingSnapshots.get(session);
    if (!pending) {
      pending = loadSnapshot(session).finally(() => pendingSnapshots.delete(session));
      pendingSnapshots.set(session, pending);
    }
    return pending;
  }
  async function loadSnapshot(session: string): Promise<SessionSnapshot> {
    const key = `session-read:${session}`;
    const read = async () => (await db.query<{ value: SessionSnapshot | null; updated_at: string }>(`select value, updated_at from ${t("kv")} where key = $1`, [key]))[0];
    const keep = (snapshot: SessionSnapshot) => {
      if (snapshots.size > 16) snapshots.clear();
      snapshots.set(session, { snapshot, checkedAt: Date.now() });
      return snapshot;
    };
    const stored = await read();
    if (stored?.value && Date.now() - Number(stored.updated_at) < SNAPSHOT_MS) return keep(stored.value);
    const now = Date.now();
    const claimed = await db.query(`insert into ${t("kv")} (key, value, updated_at, lock_until) values ($1, null, 0, $2)
      on conflict (key) do update set lock_until = $2 where ${t("kv")}.lock_until < $3 and ${t("kv")}.updated_at < $4 returning key`, [key, now + 5_000, now, now - SNAPSHOT_MS]);
    if (claimed.length) {
      try {
        const result = await fetchSession(session);
        const expirations = { ...stored?.value?.expirations };
        for (const entity of result.entities) expirations[entity.key.toLowerCase()] = String(entity.expiresAt);
        const snapshot: SessionSnapshot = { block: String(result.block), fetchedAt: Date.now(),
          liveKeys: result.entities.map(entity => entity.key.toLowerCase()), expirations };
        await db.query(`update ${t("kv")} set value = $2, updated_at = $3, lock_until = 0 where key = $1`, [key, JSON.stringify(snapshot), Date.now()]);
        // Instances keep their own RPC counters; session reads are counted here for all of them.
        await db.query(`insert into ${t("kv")} as k (key, value, updated_at, lock_until) values ('metrics', jsonb_build_object('ticketQueries', $1::bigint), $2, 0)
          on conflict (key) do update set value = jsonb_build_object('ticketQueries', coalesce((k.value->>'ticketQueries')::bigint, 0) + $1::bigint), updated_at = $2`, [result.pages, Date.now()]).catch(() => undefined);
        return keep(snapshot);
      } catch (error) {
        await db.query(`update ${t("kv")} set lock_until = $2 where key = $1`, [key, Date.now() + SNAPSHOT_MS]).catch(() => undefined);
        throw error;
      }
    }
    // Another instance is refreshing: a snapshot a few seconds old still counts down correctly.
    if (stored?.value && Date.now() - Number(stored.updated_at) < 15_000) return keep(stored.value);
    // Wait as long as the other instance's claim lasts; its read is then stored or its claim lapses.
    while (Date.now() < now + 5_000) {
      await sleep(300);
      const retried = await read();
      if (retried?.value && Date.now() - Number(retried.updated_at) < 15_000) return keep(retried.value);
    }
    throw new TicketReadUnavailable("Session read is not ready.");
  }

  async function ticketRow(id: string): Promise<TicketRow | undefined> {
    const cached = writtenTickets.get(id);
    if (cached) return cached;
    const [row] = await db.query<TicketRow>(`select ${TICKET_COLUMNS} from ${t("tickets")} where id = $1`, [id]);
    if (row?.status === "written") {
      if (writtenTickets.size > 2_000) writtenTickets.clear();
      writtenTickets.set(id, row);
    }
    return row;
  }

  // ---------- routes ----------

  async function submit(request: Request): Promise<Response> {
    const parsed = SubmitRequest.safeParse(await jsonBody(request));
    if (!parsed.success) fail("invalid", 400, "Check your name, color, country and lifetime.");
    // Name, color and country are already in lower case, whatever the client sent: every check below
    // (blocklist, placement) and the stored entity see what Arkiv will compare exactly.
    const data = parsed.data;
    const current = await readMeta();
    // Phones send no session: they join whatever session is running when they press the button.
    const session = data.session ?? current.session;
    if (!session) fail("doors_closed", 409, "Not open yet. Try again in a moment.");
    if (session !== current.session) fail("bad_session", 403, "This session has ended or the code is incorrect.");
    if (current.doors !== "open" || current.phase !== "talk" || current.replay) fail("doors_closed", 409, "Writing is paused. Try again in a moment.");
    if (nameBlocked(data.name)) fail("name_blocked", 422, REJECTION_MESSAGE);
    const token = deviceToken(request.headers.get(DEVICE_HEADER), request.headers.get("cookie"));
    if (!token) fail("invalid", 400, "A valid device token is required.");
    const ticketId = crypto.randomUUID();
    // Many phones pick the same country (India): keep each new dot away from the ones already there.
    // lower(): tickets accepted before country codes were stored in lower case still count.
    const placed = await db.query<{ lat: number; lng: number }>(`select lat, lng from ${t("tickets")} where session = $1 and lower(dot->>'country') = $2 order by accepted_at desc limit 400`, [session, data.country]);
    const point = placeDot(data.country, ticketId, placed);
    if (!point) fail("invalid", 400, "Choose a supported country.");
    // Every entity is a business of a random kind (cafe, restaurant, bookstore, parking).
    const category = DOT_CATEGORIES[parseInt(ticketId.slice(0, 8), 16) % DOT_CATEGORIES.length]!;
    await network();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)))).map(b => b.toString(16).padStart(2, "0")).join("");
    const deviceId = `device:${session}:${hash}`;
    // A phone may keep several entities live (up to MAX_ENTITIES_PER_DEVICE per session).
    const [device] = await db.query<{ count: number; last_ticket: string | null }>(`select count, last_ticket from ${t("devices")} where id = $1`, [deviceId]);
    // "No expiration" travels with the ticket to dotToCreate, which writes the u64 maximum deadline (2**64 - 1).
    const dot: DotCreate = { session, name: data.name, color: data.color, country: data.country, category, lifetimeSec: data.lifetimeSec, ...(data.noExpiry ? { noExpiry: true } : {}), ...point };
    const position = await db.transaction(async q => {
      const meta = await lockMeta(q);
      if (session !== meta.session) fail("bad_session", 403, "This session has ended or the code is incorrect.");
      if (meta.doors !== "open" || meta.phase !== "talk" || meta.replay) fail("doors_closed", 409, "Writing is paused. Try again in a moment.");
      const [locked] = await q<{ count: number; last_ticket: string | null }>(`select count, last_ticket from ${t("devices")} where id = $1 for update`, [deviceId]);
      // A second submit from the same phone raced this one (a double tap): keep only the first.
      if ((locked?.last_ticket ?? null) !== (device?.last_ticket ?? null)) fail("device_live", 429, "Your last entity is still on its way.");
      const denied = admissionError(false, locked?.count ?? 0, meta.accepted);
      if (denied) fail(denied, 429, denied === "map_full" ? "The map is full!" : denied === "device_live" ? "Your device already has a live entity." : "Your device has reached the session limit.");
      await q(`insert into ${t("tickets")} (id, session, device, status, dot, lat, lng, accepted_at) values ($1, $2, $3, 'queued', $4, $5, $6, $7)`,
        [ticketId, session, deviceId, JSON.stringify(dot), point.lat, point.lng, Date.now()]);
      await q(`insert into ${t("devices")} (id, count, last_ticket) values ($1, 1, $2) on conflict (id) do update set count = ${t("devices")}.count + 1, last_ticket = $2`, [deviceId, ticketId]);
      meta.accepted++;
      await saveMeta(q, meta);
      const [{ n }] = await q<{ n: number }>(`select count(*)::int as n from ${t("tickets")} where status = 'queued'`) as [{ n: number }];
      return n;
    });
    const headers = { "set-cookie": `workshop_device=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400` };
    if (new URL(request.url).searchParams.get("wait") !== "1") {
      kick();
      return Response.json({ ticket: ticketId, position, ...point, session }, { headers });
    }
    // The phone sends once and waits here for its block, so it never polls. This request starts a
    // sender itself (the lease keeps it to one) and starts another if the queue is left waiting.
    const runs: Promise<void>[] = [];
    const start = () => runs.push(runWriter().catch(error => console.error("writer run failed:", error instanceof Error ? error.message : String(error))));
    start();
    defer(() => Promise.all(runs).then(() => undefined));
    const deadline = Date.now() + SUBMIT_WAIT_MS;
    let row: TicketRow | undefined, lastStart = Date.now();
    while (Date.now() < deadline) {
      await sleep(400);
      [row] = await db.query<TicketRow>(`select ${TICKET_COLUMNS} from ${t("tickets")} where id = $1`, [ticketId]);
      if (row?.status === "written" || row?.status === "failed") break;
      if (Date.now() - lastStart > 3_000) { lastStart = Date.now(); start(); }
    }
    const result = row ? publicTicket(row) : null;
    return Response.json({ ticket: ticketId, position, ...point, session, status: result?.status ?? "queued",
      entityKey: result?.entityKey, block: result?.block, expiresAtBlock: result?.expiresAtBlock }, { headers });
  }

  async function ticket(id: string): Promise<Response> {
    if (!/^[a-f0-9-]{36}$/i.test(id)) fail("invalid", 400, "Invalid ticket.");
    const row = await ticketRow(id.toLowerCase());
    if (!row) fail("invalid", 404, "Ticket not found.");
    const response = publicTicket(row);
    if (row.status === "queued" || row.status === "sending") { kick(); return Response.json(response); }
    if (row.status !== "written" || !response.entityKey || !response.block) return Response.json(response);
    try {
      return Response.json(countdownTicket(response, await sessionSnapshot(row.session)));
    } catch (error) {
      // The runtime log shows why phones see "Reconnecting…"; the phone gets fixed copy only.
      console.error("ticket countdown unavailable:", error instanceof Error ? error.message : String(error));
      return Response.json({ error: error instanceof NetworkNotConfiguredError ? "network_not_configured" : "internal",
        message: "The countdown is temporarily unavailable. Please retry." }, { status: 503, headers: { "retry-after": "2" } });
    }
  }

  async function proxy(request: Request): Promise<Response> {
    await network();
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
        observeRpc({ method: call.method, phase: "request" });
        const { response } = await postKeyed(env.RPC!, env.ACCESS_KEY!,
          JSON.stringify({ jsonrpc: "2.0", id: call.id ?? null, method: call.method, params: call.params ?? [] }), AbortSignal.timeout(15_000));
        if (!response.ok) {
          observeRpc({ method: call.method, phase: "response", httpStatus: response.status });
          // For the runtime log: the upstream's reason and limit headers (never the key or the request).
          console.error("rpc read rejected:", call.method, response.status, response.headers.get("ratelimit"), (await response.text()).slice(0, 200));
          throw new Error("RPC rejected.");
        }
        const body = await response.json() as { result?: unknown; error?: { code: number } };
        observeRpc({ method: call.method, phase: "response", httpStatus: response.status, rpcCode: body.error?.code });
        responses.push(body.error ? { jsonrpc: "2.0", id: call.id ?? null, error: { code: body.error.code, message: "RPC read failed." } } : { jsonrpc: "2.0", id: call.id ?? null, result: body.result });
      } catch { observeRpc({ method: call.method, phase: "error" }); responses.push({ jsonrpc: "2.0", id: call.id ?? null, error: { code: -32000, message: "RPC read unavailable." } }); }
    }
    return Response.json(Array.isArray(input) ? responses : responses[0]);
  }

  async function status(): Promise<Response> {
    const [row] = await db.query(`select ${META_COLUMNS}, (select count(*)::int from ${t("tickets")} where status = 'queued') as queued from ${t("meta")} where id = 1`);
    const meta = toMeta(row!);
    const queued = Number(row!.queued);
    const network = await networkName();
    if (network && Date.now() - meta.balanceAt > BALANCE_MS) {
      try {
        meta.balanceWei = String(await clients!.reader.getBalance({ address: writerAddress }));
        await db.query(`update ${t("meta")} set balance_wei = $1, balance_at = $2 where id = 1`, [meta.balanceWei, Date.now()]);
      } catch { /* Status remains available for recovery. */ }
    }
    // The presenter's poll stands in for the old alarm: a waiting queue or batch gets a sender.
    if ((queued || meta.inFlight) && !held(meta) && meta.leaseUntil < Date.now()) kick();
    const body: PresenterStatus = { session: meta.session, doors: meta.doors, phase: meta.phase, replay: meta.replay, held: held(meta),
      queued, inFlight: meta.inFlight !== null, written: meta.written, failed: meta.failed, lastBatch: meta.lastBatch,
      balanceWei: meta.balanceWei, network, requestsToday: meta.opDay === new Date().toISOString().slice(0, 10) ? meta.opsToday : 0,
      keyQuotaExhausted: keyQuotaExhausted() };
    return Response.json(body);
  }

  /** Every presenter change runs under the meta row lock. */
  function presenterChange(change: (q: Query, meta: Meta) => Promise<Response | void>) {
    return db.transaction(async q => {
      const meta = await lockMeta(q);
      const response = await change(q, meta);
      await saveMeta(q, meta);
      return response ?? Response.json({});
    });
  }
  async function cancelQueued(q: Query, meta: Meta) {
    const cancelled = await q<{ device: string }>(`update ${t("tickets")} set status = 'failed', error = 'The session ended before this entity was sent.'
      where status = 'queued' returning device`);
    await releaseDevices(q, cancelled.map(row => row.device));
    meta.failed += cancelled.length; meta.accepted -= cancelled.length;
  }

  async function hold(): Promise<Response> {
    await presenterChange(async (_q, meta) => { meta.heldUntil = Date.now() + HOLD_MS; });
    // Resolve once no batch is in flight: a running sender finishes its batch; an abandoned
    // checkpoint is reconciled here.
    const deadline = Date.now() + 25_000;
    for (;;) {
      const meta = await readMeta();
      if (!meta.inFlight) return Response.json({ held: true, idle: true });
      if (Date.now() > deadline) return Response.json({ held: true, idle: false });
      if (meta.leaseUntil < Date.now()) await withLease(holder => reconcile(holder)).catch(() => undefined);
      await sleep(500);
    }
  }

  async function route(request: Request, path: string): Promise<Response> {
    if (path === WRITER_ROUTES.login && request.method === "POST") return login(request);
    if (path.startsWith("/api/presenter/") || path === "/api/rpc") await requirePresenter(request);
    if (path === "/api/session" && request.method === "GET") {
      const meta = await readMeta();
      const network = await networkName();
      const asked = new URL(request.url).searchParams.get("s");
      return Response.json({ valid: meta.session !== null && (asked === null || asked === meta.session), code: meta.session,
        doors: network ? meta.doors : "closed", phase: meta.phase, replay: meta.replay, network }, {
        // Every phone polls this: the CDN answers them all from one function call every two seconds.
        headers: { "cache-control": "public, max-age=0, must-revalidate", "vercel-cdn-cache-control": "max-age=2, stale-while-revalidate=2" },
      });
    }
    if (path === "/api/submit" && request.method === "POST") return submit(request);
    if (path.startsWith("/api/ticket/") && request.method === "GET") return ticket(path.slice("/api/ticket/".length));
    if (path === "/api/rpc" && request.method === "POST") return proxy(request);
    if (path === "/api/presenter/read-metrics" && request.method === "GET") {
      const [shared] = await db.query<{ value: { ticketQueries?: string | number } | null }>(`select value from ${t("kv")} where key = 'metrics'`);
      return Response.json({ ...rpcMetrics, ticketQueries: Number(shared?.value?.ticketQueries ?? 0), requestsToday: (await readMeta()).opsToday,
        scope: "ticketQueries counts every function instance; the other counters cover only the instance that answered." });
    }
    if (path === "/api/presenter/status" && request.method === "GET") return status();
    // The Five steps slide's Add network: Rabdi's details from server-only env vars (lib/server/rabdi.ts).
    if (path === WRITER_ROUTES.presenter.rabdi && request.method === "GET") {
      const rabdi = rabdiNetwork(env);
      if (!rabdi.ok) fail("network_not_configured", 503, rabdi.message);
      return Response.json(rabdi.network);
    }
    if (request.method !== "POST") fail("invalid", 404, "Route not found.");
    if (path === "/api/presenter/check") {
      const meta = await readMeta();
      const [{ n }] = await db.query<{ n: number }>(`select count(*)::int as n from ${t("tickets")} where status = 'queued'`) as [{ n: number }];
      if (n || meta.inFlight) fail("internal", 409, "Wait for the writer to become idle.");
      let response: Response | undefined;
      const ran = await withLease(async () => { response = await runPhaseZero(db, env, writerAddress); });
      if (!ran || !response) fail("internal", 409, "Wait for the writer to become idle.");
      return response;
    }
    if (path === "/api/presenter/session/start") {
      return presenterChange(async (q, meta) => {
        if (meta.inFlight) fail("internal", 409, "An uncertain transaction needs reconciliation first.");
        await cancelQueued(q, meta);
        meta.session = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
        // A new session takes writes at once: the presenter's Reset is this call.
        meta.doors = "open"; meta.phase = "talk"; meta.replay = false; meta.heldUntil = 0;
        meta.accepted = 0; meta.written = 0; meta.failed = 0; meta.lastBatch = null;
        return Response.json({ code: meta.session });
      });
    }
    if (path === "/api/presenter/session/end") return presenterChange(async (q, meta) => { meta.doors = "closed"; meta.session = null; await cancelQueued(q, meta); });
    if (path === "/api/presenter/doors") {
      const data = DoorsRequest.safeParse(await jsonBody(request));
      if (!data.success) fail("invalid", 400, "Choose whether the doors are open.");
      if (data.data.open) await network(true);
      return presenterChange(async (_q, meta) => {
        if (data.data.open && !meta.session) fail("bad_session", 403, "Start a session first.");
        meta.doors = data.data.open ? "open" : "closed";
      });
    }
    if (path === "/api/presenter/writing") {
      const data = WritingRequest.safeParse(await jsonBody(request));
      if (!data.success) fail("invalid", 400, "Choose whether writing is on.");
      if (data.data.on) await network(true);
      return presenterChange(async (_q, meta) => {
        if (data.data.on) {
          if (!meta.session) {
            meta.session = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
            meta.accepted = 0; meta.written = 0; meta.failed = 0; meta.lastBatch = null;
          }
          meta.doors = "open"; meta.phase = "talk"; meta.replay = false;
        } else meta.doors = "closed";
        return Response.json({ code: meta.session });
      });
    }
    if (path === "/api/presenter/phase") {
      const data = PhaseRequest.safeParse(await jsonBody(request));
      if (!data.success) fail("invalid", 400, "Choose a valid workshop phase.");
      return presenterChange(async (_q, meta) => { meta.phase = data.data.phase; });
    }
    if (path === "/api/presenter/replay") {
      const data = ReplayRequest.safeParse(await jsonBody(request));
      if (!data.success) fail("invalid", 400, "Choose whether replay is on.");
      const response = await presenterChange(async (_q, meta) => { meta.replay = data.data.on; });
      if (!data.data.on) kick();
      return response;
    }
    if (path === "/api/presenter/hold") return hold();
    if (path === "/api/presenter/resume") {
      const response = await presenterChange(async (_q, meta) => { meta.heldUntil = 0; });
      lastKickAt = 0; kick();
      return response;
    }
    fail("invalid", 404, "Route not found.");
  }

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const extra = (env.ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean);
    const crossOrigin = origin !== null && origin !== url.origin;
    let response: Response;
    try {
      if (crossOrigin && !extra.includes(origin)) fail("invalid", 403, "This origin is not allowed.");
      response = request.method === "OPTIONS" ? new Response(null, { status: 204 }) : await route(request, url.pathname.replace(/\/$/, ""));
    } catch (error) {
      if (!(error instanceof ApiError) && !(error instanceof NetworkNotConfiguredError)) console.error("writer request failed:", url.pathname, error instanceof Error ? error.message : String(error));
      const code = error instanceof ApiError ? error.code : error instanceof NetworkNotConfiguredError ? "network_not_configured" : "internal";
      const status = error instanceof ApiError ? error.status : error instanceof NetworkNotConfiguredError ? 503 : 500;
      response = Response.json({ error: code, message: error instanceof ApiError ? error.message : code === "network_not_configured" ? "Network not configured." : "The writer could not complete this request." }, { status });
    }
    const headers = new Headers(response.headers);
    if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
    headers.set("x-content-type-options", "nosniff");
    if (crossOrigin && extra.includes(origin)) {
      headers.set("vary", "Origin");
      headers.set("access-control-allow-origin", origin);
      headers.set("access-control-allow-credentials", "true");
      headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
      headers.set("access-control-allow-headers", "content-type, authorization, x-device-token");
      headers.set("access-control-max-age", "600");
    }
    return new Response(response.body, { status: response.status, headers });
  }

  return { handle, runWriter };
}
