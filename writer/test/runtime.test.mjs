import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { privateKeyToAccount } from "viem/accounts";

const writerAddress = "0x2F6E6aDB6bc8F79799CB479FB5Cb237fa3Caa690";
const testKey = `0x${"11".repeat(32)}`;
const testAddress = privateKeyToAccount(testKey).address;
const source = (await readFile(new URL("../dist/index.js", import.meta.url), "utf8")).replaceAll(writerAddress, testAddress);
const presenter = "test-presenter-credential";
const password = "test-presenter-password";
const auth = { authorization: `Bearer ${presenter}`, "content-type": "application/json" };

async function fixture(profile = "tiramisu", balance = "0x8ac7230489e80000", onRpc, seedable = false) {
  const calls = [];
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: source + (seedable ? `
      export class TicketTestObject extends WriterObject {
        async fetch(request) {
          if (new URL(request.url).pathname === '/_test/seed') {
            await this.ready;
            await this.state.storage.put(await request.json());
            return Response.json({ seeded: true });
          }
          return super.fetch(request);
        }
      }` : ""), compatibilityDate: "2026-10-01", compatibilityFlags: ["nodejs_compat"],
    durableObjects: { WRITER: { className: seedable ? "TicketTestObject" : "WriterObject", useSQLite: true } },
    bindings: { ARKIV_PROFILE: profile, MIN_WRITER_BALANCE_WEI: "8000000000000000000", ALLOWED_ORIGINS: "https://app.example", RPC: "https://rpc.example", ACCESS_KEY: "test-rpc-credential", WORKSHOP_PRESENTER_TOKEN: presenter, PRESENTER_PASSWORD: password, WORKSHOP_WRITER_PRIVATE_KEY: testKey },
    outboundService: async request => {
      const call = await request.json();
      calls.push(call);
      assert.equal(request.headers.get("X-API-KEY"), "test-rpc-credential");
      const override = await onRpc?.(call);
      if (override !== undefined) return Response.json({ jsonrpc: "2.0", id: call.id, result: override });
      const values = { eth_chainId: "0x7614d1", arkiv_getBlockTiming: { current_block: 100, current_block_time: Date.now() / 1000, duration: 2 }, eth_getBalance: balance, eth_blockNumber: "0x64", eth_getTransactionCount: "0x0", eth_getBlockByNumber: null, eth_maxPriorityFeePerGas: "0x1", eth_gasPrice: "0x3b9aca00", eth_estimateGas: "0x10000" };
      if (!(call.method in values)) throw new Error(`Unexpected RPC method ${call.method}`);
      return Response.json({ jsonrpc: "2.0", id: call.id, result: values[call.method] });
    },
  }));
  const call = async (path, body, headers = auth) => {
    const response = await mf.dispatchFetch(`https://writer.example${path}`, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, headers: response.headers, data: await response.json() };
  };
  return { mf, call, calls };
}

test("workerd enforces presenter auth, CORS, session state and per-device queuing", async () => {
  const { mf, call, calls } = await fixture();
  try {
    assert.equal((await call("/api/presenter/status", undefined, {})).status, 401);
    assert.equal((await call("/api/presenter/session/start", {}, { ...auth, origin: "https://evil.example" })).status, 403);
    const started = await call("/api/presenter/session/start", {});
    assert.equal(started.status, 200);
    const code = started.data.code;
    assert.equal((await call(`/api/session?s=${code}`, undefined, {})).data.valid, true);
    // Phones type no code: the bare route hands them the running session.
    const bare = (await call("/api/session", undefined, {})).data;
    assert.equal(bare.valid, true);
    assert.equal(bare.code, code);
    assert.equal((await call("/api/session?s=WRONG123", undefined, {})).data.valid, false);
    // A new session (the presenter's Reset) is open at once.
    assert.equal(bare.doors, "open");
    const draft = { session: code, name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 900 };
    const device = { "x-device-token": "test-device-token-1234", "content-type": "application/json", origin: "https://app.example" };
    assert.equal((await call("/api/submit", { ...draft, color: "#3ddc97" }, device)).data.error, "invalid", "Only the seven palette colors are accepted.");
    await call("/api/presenter/doors", { open: false });
    assert.equal((await call("/api/submit", draft, device)).data.error, "doors_closed");
    await call("/api/presenter/hold", {});
    await call("/api/presenter/doors", { open: true });
    assert.equal((await call("/api/submit", { ...draft, session: "WRONG" }, device)).data.error, "bad_session");
    assert.equal((await call("/api/submit", { ...draft, lifetimeSec: 330 }, device)).data.error, "invalid");
    assert.equal((await call("/api/submit", { ...draft, name: "chutiya" }, device)).data.error, "name_blocked");
    const accepted = await call("/api/submit", draft, device);
    assert.equal(accepted.status, 200);
    assert.equal(accepted.headers.get("access-control-allow-origin"), "https://app.example");
    assert.match(accepted.headers.get("set-cookie"), /workshop_device=/);
    assert.equal((await call("/api/submit", draft, device)).data.error, "device_live");
    const ticket = await call(`/api/ticket/${accepted.data.ticket}`, undefined, {});
    assert.equal(ticket.data.status, "queued");
    assert.equal("dot" in ticket.data, false);
    assert.equal("device" in ticket.data, false);
    const status = (await call("/api/presenter/status")).data;
    assert.equal(status.held, true);
    assert.equal(status.queued, 1);
    assert.ok(status.requestsToday >= 10);
    await call("/api/presenter/replay", { on: true });
    assert.equal((await call("/api/submit", draft, device)).data.error, "doors_closed");
    await call("/api/presenter/session/end", {});
    const ended = (await call("/api/session", undefined, {})).data;
    assert.equal(ended.valid, false);
    assert.equal(ended.code, null);
    assert.equal((await call(`/api/ticket/${accepted.data.ticket}`, undefined, {})).data.status, "failed");
    assert.equal(calls.some(call => call.method.startsWith("eth_send")), false);
  } finally { await mf.dispose(); }
});

test("the presenter password returns a signed login that expires, and failed attempts are limited", async () => {
  const { mf, call } = await fixture();
  try {
    const json = { "content-type": "application/json" };
    const wrong = await call("/api/login", { password: "nope" }, json);
    assert.equal(wrong.status, 401);
    assert.equal(wrong.data.error, "unauthorized");
    const login = await call("/api/login", { password }, json);
    assert.equal(login.status, 200);
    assert.match(login.data.token, /^p\.\d{13}\.[a-f0-9]{64}$/);
    assert.ok(login.data.expiresAt > Date.now() + 11 * 3_600_000 && login.data.expiresAt <= Date.now() + 12 * 3_600_000);
    assert.equal(login.data.token.includes(presenter), false);
    const bearer = (token) => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });
    assert.equal((await call("/api/presenter/status", undefined, bearer(login.data.token))).status, 200);
    assert.equal((await call("/api/rpc", { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }, bearer(login.data.token))).data.result, "0x64");
    const sign = (expiresAt, secret = presenter) => `p.${expiresAt}.${createHmac("sha256", secret).update(`presenter:${expiresAt}`).digest("hex")}`;
    assert.equal((await call("/api/presenter/status", undefined, bearer(sign(Date.now() - 1000)))).status, 401, "An expired login is rejected.");
    assert.equal((await call("/api/presenter/status", undefined, bearer(sign(Date.now() + 60_000, "other-secret")))).status, 401, "A login signed with another secret is rejected.");
    assert.equal((await call("/api/presenter/status", undefined, bearer("p.garbage"))).status, 401);
    assert.equal((await call("/api/presenter/status", undefined, bearer(sign(Date.now() + 60_000)))).status, 200);
    // The successful login cleared the earlier failure; ten in a row reach the limit, then even the right password waits.
    for (let i = 0; i < 10; i++) assert.equal((await call("/api/login", { password: `wrong-${i}` }, json)).status, 401);
    const limited = await call("/api/login", { password }, json);
    assert.equal(limited.status, 429);
    assert.equal(limited.data.error, "too_many_attempts");
  } finally { await mf.dispose(); }
});

test("200 written ticket HTTP reads share one keyed query and observe extension then expiration", async () => {
  const ids = Array.from({ length: 200 }, () => crypto.randomUUID());
  const keys = ids.map((_, index) => `0x${(index + 1).toString(16).padStart(64, "0")}`);
  let block = 100, expiresAt = 150, live = true;
  const { mf, call, calls } = await fixture("tiramisu", "0x8ac7230489e80000", async rpc => {
    if (rpc.method === "arkiv_query") {
      assert.match(rpc.params[0], /session = str\('ROOM'\)/);
      assert.match(rpc.params[0], /\$creator = addr\(/);
      return { blockNumber: `0x${block.toString(16)}`, data: live ? keys.map(key => ({ key, expiresAt: `0x${expiresAt.toString(16)}` })) : [] };
    }
  }, true);
  try {
    const rows = Object.fromEntries(ids.map((id, index) => [`ticket:${id}`, {
      ticket: id, status: "written", entityKey: keys[index], block: "99", expiresAtBlock: "150", lat: 0, lng: 0,
      dot: { session: "ROOM" }, device: "private-device", acceptedAt: 0,
    }]));
    assert.equal((await call("/_test/seed", rows)).status, 200);
    const wave = () => Promise.all(ids.map(id => call(`/api/ticket/${id}`, undefined, {})));
    const first = await wave();
    assert.ok(first.every(response => response.status === 200 && response.data.live && response.data.currentBlock === "100"), JSON.stringify({ first: first[0], rpc: calls }));
    assert.ok(first.every(response => !("dot" in response.data) && !("device" in response.data)));
    assert.equal(calls.filter(call => call.method === "arkiv_query").length, 1);
    assert.equal(calls.filter(call => call.method === "eth_blockNumber").length, 0);
    block = 101; expiresAt = 750;
    await new Promise(resolve => setTimeout(resolve, 2050));
    const extended = await wave();
    assert.ok(extended.every(response => response.data.expiresAtBlock === "750" && response.data.live));
    assert.equal(calls.filter(call => call.method === "arkiv_query").length, 2);
    block = 750; live = false;
    await new Promise(resolve => setTimeout(resolve, 2050));
    const expired = await wave();
    assert.ok(expired.every(response => response.data.expiresAtBlock === "750" && response.data.currentBlock === "750" && response.data.live === false));
    assert.equal(calls.filter(call => call.method === "arkiv_query").length, 3);
    assert.equal((await call("/api/presenter/read-metrics", undefined, {})).status, 401);
    const metrics = (await call("/api/presenter/read-metrics")).data;
    assert.equal(metrics.ticketQueries, 3); assert.equal(metrics.http429, 0);
  } finally { await mf.dispose(); }
});

test("workerd proxy forwards allowlisted reads with the key and blocks writes", async () => {
  const { mf, call, calls } = await fixture();
  try {
    const read = await call("/api/rpc", { jsonrpc: "2.0", id: 7, method: "eth_blockNumber", params: [] });
    assert.equal(read.data.result, "0x64");
    const blocked = await call("/api/rpc", { jsonrpc: "2.0", id: 8, method: "eth_sendRawTransaction", params: ["0x00"] });
    assert.equal(blocked.data.error.code, -32601);
    assert.equal(calls.some(call => call.method === "eth_sendRawTransaction"), false);
  } finally { await mf.dispose(); }
});

test("workerd fails closed for a placeholder network", async () => {
  const { mf, call } = await fixture("udc");
  try {
    const started = await call("/api/presenter/session/start", {});
    assert.equal((await call("/api/presenter/doors", { open: true })).data.error, "network_not_configured");
    const session = (await call(`/api/session?s=${started.data.code}`, undefined, {})).data;
    assert.equal(session.network, null);
    assert.equal(session.doors, "closed");
  } finally { await mf.dispose(); }
});

test("the balance floor closes doors and holds queued writes before any send", async () => {
  const { mf, call, calls } = await fixture("tiramisu", "0x6124fee993bc0000"); // Seven test GLM.
  try {
    const { data: { code } } = await call("/api/presenter/session/start", {});
    await call("/api/presenter/doors", { open: true });
    const accepted = await call("/api/submit", { session: code, name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 900 }, { "x-device-token": "balance-floor-test-device" });
    assert.equal(accepted.status, 200);
    let status;
    const deadline = Date.now() + 7_000;
    do {
      await new Promise(resolve => setTimeout(resolve, 100));
      status = (await call("/api/presenter/status")).data;
    } while (!status.held && Date.now() < deadline);
    assert.equal(status.held, true);
    assert.equal(status.doors, "closed");
    assert.equal(status.queued, 1);
    assert.equal(status.written, 0);
    assert.equal(calls.some(call => call.method.startsWith("eth_send")), false);
    const requests = status.requestsToday;
    await new Promise(resolve => setTimeout(resolve, 600));
    assert.equal((await call("/api/presenter/status")).data.requestsToday, requests + 1);
  } finally { await mf.dispose(); }
});

test("a slow wallet call leaves phone reads responsive while hold waits for the batch", async () => {
  let releaseRpc;
  let reachedRpc;
  let blockCalls = 0;
  const released = new Promise(resolve => { releaseRpc = resolve; });
  const reached = new Promise(resolve => { reachedRpc = resolve; });
  const { mf, call, calls } = await fixture("tiramisu", "0x8ac7230489e80000", async rpc => {
    if (rpc.method === "eth_blockNumber" && ++blockCalls === 2) { reachedRpc(); await released; return "0x64"; }
  });
  try {
    const { data: { code } } = await call("/api/presenter/session/start", {});
    await call("/api/presenter/doors", { open: true });
    await call("/api/submit", { session: code, name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 900 }, { "x-device-token": "responsive-phone-device" });
    await Promise.race([reached, new Promise((_, reject) => setTimeout(() => reject(new Error("The batch did not enter the slow SDK call.")), 7_000))]);
    const response = await Promise.race([call(`/api/session?s=${code}`, undefined, {}), new Promise((_, reject) => setTimeout(() => reject(new Error("Phone reads were blocked behind the SDK.")), 1_000))]);
    assert.equal(response.data.valid, true);
    let held = false;
    const holding = call("/api/presenter/hold", {}).then(response => { held = true; return response; });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(held, false);
    releaseRpc();
    assert.equal((await holding).data.idle, true);
    assert.equal(calls.some(call => call.method.startsWith("eth_send")), false);
  } finally { releaseRpc(); await mf.dispose(); }
});
