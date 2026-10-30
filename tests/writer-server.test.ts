// The Vercel writer against a real Postgres (DATABASE_URL, one throwaway schema per test) and a mock
// keyed RPC. Port of writer/test/runtime.test.mjs plus the cross-instance cases a Durable Object
// never had: two function instances share one sender lease and one session read.
// Run: node --import ./tests/ts-resolve.mjs --test --experimental-strip-types tests/writer-server.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { ExpirationTime } from "@arkiv-network/sdk";
import { createDb } from "../lib/server/db.ts";
import { createWriter } from "../lib/server/writer.ts";
import { dotToCreate, NO_EXPIRATION } from "../shared/arkiv/sdk-1.0.ts";
import type { DotCreate } from "../shared/arkiv/adapter.ts";

const DATABASE_URL = process.env.DATABASE_URL;
const testKey = `0x${"11".repeat(32)}` as const;
const testAddress = privateKeyToAccount(testKey).address;
const presenter = "test-presenter-credential";
const password = "test-presenter-password";
const RPC = "https://rpc.example/";
// The access key travels as the RPC URL's last path segment.
const KEYED = `${RPC}test-rpc-credential`;
const auth = { authorization: `Bearer ${presenter}`, "content-type": "application/json" };
type Rpc = { method: string; params?: unknown[]; id?: unknown };

const realFetch = globalThis.fetch;
let onRpc: ((call: Rpc) => Promise<unknown> | unknown) | undefined;
let balance = "0x8ac7230489e80000";
const calls: Rpc[] = [];
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("https://rpc.rabdi")) throw new Error("The writer must not call the public RPC in tests.");
  if (url === RPC) throw new Error("The writer must send the access key in the RPC URL.");
  if (url !== KEYED) return realFetch(input, init);
  const call = JSON.parse(String(init?.body)) as Rpc;
  calls.push(call);
  const override = await onRpc?.(call);
  if (override !== undefined) return Response.json({ jsonrpc: "2.0", id: call.id, result: override });
  const values: Record<string, unknown> = { eth_chainId: "0x76edaf", arkiv_getBlockTiming: { current_block: 100, current_block_time: Date.now() / 1000, duration: 2 },
    eth_getBalance: balance, eth_blockNumber: "0x64", eth_getTransactionCount: "0x0", eth_getBlockByNumber: null };
  if (!(call.method in values)) throw new Error(`Unexpected RPC method ${call.method}`);
  return Response.json({ jsonrpc: "2.0", id: call.id, result: values[call.method] });
};

async function fixture({ profile = "rabdi", instances = 1 }: { profile?: string; instances?: number } = {}) {
  calls.length = 0; onRpc = undefined; balance = "0x8ac7230489e80000";
  const schema = `wtest_${randomBytes(6).toString("hex")}`;
  const db = createDb(DATABASE_URL!, schema);
  const deferred: Promise<void>[] = [];
  const env = { ARKIV_PROFILE: profile, MIN_WRITER_BALANCE_WEI: "8000000000000000000", ALLOWED_ORIGINS: "http://localhost:3000", RPC, ACCESS_KEY: "test-rpc-credential",
    WORKSHOP_PRESENTER_TOKEN: presenter, PRESENTER_PASSWORD: password, WORKSHOP_WRITER_PRIVATE_KEY: testKey };
  const writers = Array.from({ length: instances }, () => createWriter({ db, env, writerAddress: testAddress, defer: task => { deferred.push(task()); } }));
  const call = async (path: string, body?: unknown, headers: Record<string, string> = auth, instance = 0) => {
    const response = await writers[instance]!.handle(new Request(`https://app.example${path}`, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    return { status: response.status, headers: response.headers, data: await response.json() };
  };
  const drain = async () => { while (deferred.length) await Promise.allSettled(deferred.splice(0)); };
  const dispose = async () => { await drain(); await db.query(`drop schema if exists ${schema} cascade`); await db.close(); };
  return { db, call, drain, dispose, writers };
}
const opts = { skip: DATABASE_URL ? false : "DATABASE_URL is required (a Postgres for throwaway schemas)." };

test("presenter auth, CORS, session state and per-device queuing", opts, async () => {
  const { call, dispose } = await fixture();
  try {
    assert.equal((await call("/api/presenter/status", undefined, {})).status, 401);
    assert.equal((await call("/api/presenter/session/start", {}, { ...auth, origin: "https://evil.example" })).status, 403);
    const started = await call("/api/presenter/session/start", {});
    assert.equal(started.status, 200);
    const code = started.data.code;
    assert.equal((await call(`/api/session?s=${code}`, undefined, {})).data.valid, true);
    const bare = await call("/api/session", undefined, {});
    assert.equal(bare.data.valid, true);
    assert.equal(bare.data.code, code);
    assert.equal(bare.data.doors, "open");
    assert.match(bare.headers.get("vercel-cdn-cache-control") ?? "", /max-age=2/, "Phones' session polls are answered by the CDN.");
    assert.equal((await call("/api/session?s=WRONG123", undefined, {})).data.valid, false);
    const draft = { session: code, name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 900 };
    const device = { "x-device-token": "test-device-token-1234", "content-type": "application/json", origin: "https://app.example" };
    assert.equal((await call("/api/submit", { ...draft, color: "#3ddc97" }, device)).data.error, "invalid", "Only the seven palette colors are accepted.");
    await call("/api/presenter/doors", { open: false });
    assert.equal((await call("/api/submit", draft, device)).data.error, "doors_closed");
    assert.equal((await call("/api/presenter/hold", {})).data.idle, true);
    await call("/api/presenter/doors", { open: true });
    assert.equal((await call("/api/submit", { ...draft, session: "WRONG" }, device)).data.error, "bad_session");
    assert.equal((await call("/api/submit", { ...draft, lifetimeSec: 330 }, device)).data.error, "invalid");
    assert.equal((await call("/api/submit", { ...draft, name: "chutiya" }, device)).data.error, "name_blocked");
    const accepted = await call("/api/submit", draft, device);
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    assert.equal(accepted.data.position, 1);
    assert.equal(accepted.headers.get("access-control-allow-origin"), null, "Same-origin calls need no CORS.");
    assert.match(accepted.headers.get("set-cookie") ?? "", /workshop_device=/);
    // A phone can keep writing: a second entity from the same device is accepted.
    const second = await call("/api/submit", { ...draft, name: "Asha two" }, device);
    assert.equal(second.status, 200, JSON.stringify(second.data));
    assert.equal(second.data.position, 2);
    const local = await call("/api/submit", { ...draft, name: "Ravi" }, { "x-device-token": "test-device-token-5678", "content-type": "application/json", origin: "http://localhost:3000" });
    assert.equal(local.headers.get("access-control-allow-origin"), "http://localhost:3000");
    const ticket = await call(`/api/ticket/${accepted.data.ticket}`, undefined, {});
    assert.equal(ticket.data.status, "queued");
    assert.equal("dot" in ticket.data, false);
    assert.equal("device" in ticket.data, false);
    const status = (await call("/api/presenter/status")).data;
    assert.equal(status.held, true);
    assert.equal(status.queued, 3);
    await call("/api/presenter/replay", { on: true });
    assert.equal((await call("/api/submit", draft, device)).data.error, "doors_closed");
    await call("/api/presenter/session/end", {});
    const ended = (await call("/api/session", undefined, {})).data;
    assert.equal(ended.valid, false);
    assert.equal(ended.code, null);
    assert.equal((await call(`/api/ticket/${accepted.data.ticket}`, undefined, {})).data.status, "failed");
    assert.equal(calls.some(rpc => rpc.method.startsWith("eth_send")), false);
  } finally { await dispose(); }
});

test("the /map ON|OFF switch opens and pauses writes, and starts a session when none runs", opts, async () => {
  const { call, dispose } = await fixture();
  try {
    const device = { "x-device-token": "test-device-token-switch", "content-type": "application/json", origin: "https://app.example" };
    const draft = { name: "Switch", color: "#fe7446", country: "IN", lifetimeSec: 300 };
    assert.equal((await call("/api/submit", draft, device)).data.error, "doors_closed", "No session yet.");
    const on = await call("/api/presenter/writing", { on: true });
    assert.equal(on.status, 200);
    assert.match(on.data.code, /^[A-F0-9]{8}$/);
    // A session stuck in the build phase (as production was on October 28) opens again with ON.
    await call("/api/presenter/phase", { phase: "build" });
    assert.equal((await call("/api/submit", draft, device)).data.error, "doors_closed");
    assert.equal((await call("/api/presenter/writing", { on: true })).data.code, on.data.code, "ON keeps the running session.");
    assert.equal((await call("/api/presenter/hold", {})).data.idle, true);
    assert.equal((await call("/api/submit", draft, device)).status, 200);
    const off = await call("/api/presenter/writing", { on: false });
    assert.equal(off.data.code, on.data.code, "OFF keeps the session.");
    assert.equal((await call("/api/submit", draft, device)).data.error, "doors_closed");
    const status = (await call("/api/presenter/status")).data;
    assert.equal(status.doors, "closed");
    assert.equal(status.session, on.data.code);
    assert.equal((await call("/api/presenter/writing", { on: "yes" })).data.error, "invalid");
  } finally { await dispose(); }
});

test("the presenter password returns a signed login that expires, and failed attempts are limited", opts, async () => {
  const { call, dispose } = await fixture();
  try {
    const json = { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" };
    const wrong = await call("/api/login", { password: "nope" }, json);
    assert.equal(wrong.status, 401);
    assert.equal(wrong.data.error, "unauthorized");
    const login = await call("/api/login", { password }, json);
    assert.equal(login.status, 200);
    assert.match(login.data.token, /^p\.\d{13}\.[a-f0-9]{64}$/);
    assert.ok(login.data.expiresAt > Date.now() + 11 * 3_600_000 && login.data.expiresAt <= Date.now() + 12 * 3_600_000);
    assert.equal(login.data.token.includes(presenter), false);
    const bearer = (token: string) => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });
    assert.equal((await call("/api/presenter/status", undefined, bearer(login.data.token))).status, 200);
    assert.equal((await call("/api/rpc", { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }, bearer(login.data.token))).data.result, "0x64");
    const sign = (expiresAt: number, secret = presenter) => `p.${expiresAt}.${createHmac("sha256", secret).update(`presenter:${expiresAt}`).digest("hex")}`;
    assert.equal((await call("/api/presenter/status", undefined, bearer(sign(Date.now() - 1000)))).status, 401, "An expired login is rejected.");
    assert.equal((await call("/api/presenter/status", undefined, bearer(sign(Date.now() + 60_000, "other-secret")))).status, 401, "A login signed with another secret is rejected.");
    assert.equal((await call("/api/presenter/status", undefined, bearer("p.garbage"))).status, 401);
    assert.equal((await call("/api/presenter/status", undefined, bearer(sign(Date.now() + 60_000)))).status, 200, "Logins issued by the Worker keep working.");
    for (let i = 0; i < 10; i++) assert.equal((await call("/api/login", { password: `wrong-${i}` }, json)).status, 401);
    const limited = await call("/api/login", { password }, json);
    assert.equal(limited.status, 429);
    assert.equal(limited.data.error, "too_many_attempts");
    assert.equal((await call("/api/login", { password }, { ...json, "x-forwarded-for": "198.51.100.2" })).status, 200, "The limit is per IP.");
  } finally { await dispose(); }
});

test("200 written tickets on two instances share one keyed read per refresh and observe extension then expiration", opts, async () => {
  const { db, call, dispose } = await fixture({ instances: 2 });
  const ids = Array.from({ length: 200 }, () => crypto.randomUUID());
  const keys = ids.map((_, index) => `0x${(index + 1).toString(16).padStart(64, "0")}`);
  let block = 100, expiresAt = 150, live = true;
  onRpc = (rpc) => {
    if (rpc.method === "arkiv_query") {
      assert.match(String(rpc.params![0]), /session = str\('ROOM'\)/);
      assert.match(String(rpc.params![0]), /\$creator = addr\(/);
      // Pages of 100 ordered by $key; the next page continues after the last key read.
      const after = String(rpc.params![0]).match(/\$key > key\((0x[0-9a-f]{64})\)/i)?.[1];
      const limit = Number((rpc.params![1] as { limit?: string }).limit ?? "0x64");
      const rows = live ? keys.filter(key => !after || BigInt(key) > BigInt(after)).slice(0, limit) : [];
      return { blockNumber: `0x${block.toString(16)}`, data: rows.map(key => ({ key, expiresAt: `0x${expiresAt.toString(16)}` })) };
    }
    return undefined;
  };
  try {
    for (const [index, id] of ids.entries()) {
      await db.query(`insert into ${db.t("tickets")} (id, session, device, status, dot, lat, lng, entity_key, block, expires_at_block, accepted_at)
        values ($1, 'ROOM', 'private-device', 'written', '{"session":"ROOM"}', 0, 0, $2, '99', '150', 0)`, [id, keys[index]]);
    }
    // At most one chain read (three pages of up to 100 for 200 entities) per two-second window across
    // both instances, however long the wave takes.
    let budget = 0;
    const wave = async () => {
      const started = Date.now();
      const responses = await Promise.all(ids.map((id, index) => call(`/api/ticket/${id}`, undefined, {}, index % 2)));
      budget += 3 * (1 + Math.floor((Date.now() - started) / 2_000));
      assert.ok(queries() <= budget, `${queries()} chain reads for a read budget of ${budget}`);
      return responses;
    };
    const queries = () => calls.filter(rpc => rpc.method === "arkiv_query").length;
    const first = await wave();
    assert.ok(first.every(response => response.status === 200 && response.data.live && response.data.currentBlock === "100"), JSON.stringify(first.find(response => response.status !== 200)?.data));
    assert.ok(first.every(response => !("dot" in response.data) && !("device" in response.data)));
    assert.equal(calls.filter(rpc => rpc.method === "eth_blockNumber").length, 0);
    // While one instance refreshes, the other may serve the previous snapshot for one poll; the poll
    // after that sees the new chain state everywhere.
    const pause = () => new Promise(resolve => setTimeout(resolve, 2_100));
    type Wave = Awaited<ReturnType<typeof wave>>;
    const refreshed = async (previous: (data: Wave[number]["data"]) => boolean, current: (data: Wave[number]["data"]) => boolean) => {
      await pause();
      const transition = await wave();
      assert.ok(transition.every(response => previous(response.data) || current(response.data)), JSON.stringify(transition.find(response => !previous(response.data) && !current(response.data))?.data));
      await pause();
      const settled = await wave();
      assert.ok(settled.every(response => current(response.data)), JSON.stringify(settled.find(response => !current(response.data))?.data));
    };
    block = 101; expiresAt = 750;
    await refreshed(data => data.expiresAtBlock === "150" && data.live, data => data.expiresAtBlock === "750" && data.live);
    block = 750; live = false;
    await refreshed(data => data.expiresAtBlock === "750" && data.live, data => data.expiresAtBlock === "750" && data.currentBlock === "750" && data.live === false);
    assert.equal((await call("/api/presenter/read-metrics", undefined, {})).status, 401);
    assert.equal((await call("/api/presenter/read-metrics", undefined, auth, 1)).data.ticketQueries, queries(), "Session reads are counted across instances.");
  } finally { await dispose(); }
});

test("the proxy forwards allowlisted reads with the key and blocks writes", opts, async () => {
  const { call, dispose } = await fixture();
  try {
    assert.equal((await call("/api/rpc", { jsonrpc: "2.0", id: 7, method: "eth_blockNumber", params: [] })).data.result, "0x64");
    assert.equal((await call("/api/rpc", { jsonrpc: "2.0", id: 8, method: "eth_sendRawTransaction", params: ["0x00"] })).data.error.code, -32601);
    assert.equal(calls.some(rpc => rpc.method === "eth_sendRawTransaction"), false);
  } finally { await dispose(); }
});

test("an unknown network fails closed", opts, async () => {
  const { call, dispose } = await fixture({ profile: "unknown" });
  try {
    const started = await call("/api/presenter/session/start", {});
    assert.equal((await call("/api/presenter/doors", { open: true })).data.error, "network_not_configured");
    const session = (await call(`/api/session?s=${started.data.code}`, undefined, {})).data;
    assert.equal(session.network, null);
    assert.equal(session.doors, "closed");
  } finally { await dispose(); }
});

test("the balance floor closes doors and holds queued writes before any send", opts, async () => {
  const { call, drain, dispose } = await fixture();
  balance = "0x6124fee993bc0000"; // Seven test GLM.
  try {
    const { data: { code } } = await call("/api/presenter/session/start", {});
    const accepted = await call("/api/submit", { session: code, name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 900 }, { "x-device-token": "balance-floor-test-device" });
    assert.equal(accepted.status, 200);
    await drain();
    const status = (await call("/api/presenter/status")).data;
    assert.equal(status.held, true);
    assert.equal(status.doors, "closed");
    assert.equal(status.queued, 1);
    assert.equal(status.written, 0);
    assert.equal(calls.some(rpc => rpc.method.startsWith("eth_send")), false);
  } finally { await dispose(); }
});

test("a phone's one submit joins the running session and waits for its block", opts, async () => {
  const { db, call, drain, dispose } = await fixture();
  // Below the balance floor nothing is sent; the test marks the ticket written as the sender would.
  balance = "0x6124fee993bc0000";
  try {
    const phone = { "x-device-token": "one-request-phone-device", "content-type": "application/json", origin: "https://app.example" };
    const dot = { name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 300 };
    assert.equal((await call("/api/submit?wait=1", dot, phone)).data.error, "doors_closed", "Before a session starts, a phone is told to try again.");
    const { data: { code } } = await call("/api/presenter/session/start", {});
    const key = `0x${"ab".repeat(32)}`;
    const marker = (async () => {
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const [row] = await db.query<{ id: string }>(`select id from ${db.t("tickets")} where session = $1`, [code]);
        if (row) {
          await db.query(`update ${db.t("tickets")} set status = 'written', entity_key = $2, block = '120', expires_at_block = '270' where id = $1`, [row.id, key]);
          return;
        }
      }
      throw new Error("The submit never queued a ticket.");
    })();
    const started = Date.now();
    const answered = await call("/api/submit?wait=1", dot, phone);
    await marker;
    assert.equal(answered.status, 200, JSON.stringify(answered.data));
    assert.equal(answered.data.session, code);
    assert.equal(answered.data.status, "written");
    assert.equal(answered.data.entityKey, key);
    assert.equal(answered.data.block, "120");
    assert.equal(answered.data.expiresAtBlock, "270");
    assert.ok(Date.now() - started < 10_000, "The answer comes as soon as the block is in.");
    await drain();
    assert.equal(calls.some(rpc => rpc.method.startsWith("eth_send")), false);
  } finally { await dispose(); }
});

test("two instances never send at once, and hold stops a batch that was not admitted yet", opts, async () => {
  const { call, drain, dispose, writers } = await fixture({ instances: 2 });
  let release!: () => void, reached!: () => void;
  const released = new Promise<void>(resolve => { release = resolve; });
  const reachedBlock = new Promise<void>(resolve => { reached = resolve; });
  let blockCalls = 0;
  onRpc = async (rpc) => {
    if (rpc.method === "eth_blockNumber" && ++blockCalls === 1) { reached(); await released; return "0x64"; }
    return undefined;
  };
  try {
    const { data: { code } } = await call("/api/presenter/session/start", {});
    await call("/api/submit", { session: code, name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 900 }, { "x-device-token": "responsive-phone-device" });
    await Promise.race([reachedBlock, new Promise((_, reject) => setTimeout(() => reject(new Error("The sender did not start.")), 10_000))]);
    // The other instance finds the lease taken and sends nothing.
    await writers[1]!.runWriter();
    assert.equal(blockCalls, 1);
    const read = await Promise.race([call(`/api/session?s=${code}`, undefined, {}, 1), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Phone reads were blocked behind the sender.")), 5_000))]);
    assert.equal(read.data.valid, true);
    // Nothing is in flight yet, so hold resolves at once, and the sender then admits no batch.
    assert.equal((await call("/api/presenter/hold", {}, auth, 1)).data.idle, true);
    release();
    await drain();
    const status = (await call("/api/presenter/status")).data;
    assert.equal(status.inFlight, false);
    assert.equal(status.queued, 1);
    assert.equal(calls.some(rpc => rpc.method.startsWith("eth_send")), false);
  } finally { release(); await dispose(); }
});

// Santiago, October 29: text is stored in lower case, and "No expiration" reaches the create as the
// u64 maximum deadline.
test("the writer stores lower-case text and keeps No expiration for the create", opts, async () => {
  const { db, call, dispose } = await fixture();
  try {
    const { data: { code } } = await call("/api/presenter/session/start", {});
    assert.equal((await call("/api/presenter/hold", {})).data.idle, true);
    const phone = (device: string) => ({ "x-device-token": device, "content-type": "application/json", origin: "https://app.example" });
    const forever = await call("/api/submit", { name: "  ASHA Rao ", color: "#FE7446", country: "IN", lifetimeSec: 300, noExpiry: true }, phone("lower-case-phone-device-1"));
    assert.equal(forever.status, 200, JSON.stringify(forever.data));
    const timed = await call("/api/submit", { name: "Ravi", color: "#fe7446", country: "in", lifetimeSec: 300 }, phone("lower-case-phone-device-2"));
    assert.equal(timed.status, 200, JSON.stringify(timed.data));
    assert.equal((await call("/api/submit", { name: "ravi", color: "#fe7446", country: "IND", lifetimeSec: 300 }, phone("lower-case-phone-device-3"))).data.error, "invalid");
    const rows = await db.query<{ dot: DotCreate }>(`select dot from ${db.t("tickets")} where session = $1 order by seq`, [code]);
    assert.deepEqual(rows.map(({ dot }) => [dot.name, dot.color, dot.country, dot.noExpiry]), [["asha rao", "#fe7446", "in", true], ["ravi", "#fe7446", "in", undefined]]);
    assert.deepEqual(dotToCreate(rows[0]!.dot).expiration, NO_EXPIRATION);
    assert.deepEqual(dotToCreate(rows[1]!.dot).expiration, ExpirationTime.fromSeconds(300));
    // Placement read the lower-case code: both dots are in India.
    for (const { data } of [forever, timed]) assert.ok(data.lat > 6 && data.lat < 36 && data.lng > 68 && data.lng < 98, JSON.stringify(data));
    assert.equal(calls.some(rpc => rpc.method.startsWith("eth_send")), false);
  } finally { await dispose(); }
});
