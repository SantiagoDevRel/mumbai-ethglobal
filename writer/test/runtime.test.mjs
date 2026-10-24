import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { privateKeyToAccount } from "viem/accounts";

const writerAddress = "0x2F6E6aDB6bc8F79799CB479FB5Cb237fa3Caa690";
const testKey = `0x${"11".repeat(32)}`;
const testAddress = privateKeyToAccount(testKey).address;
const source = (await readFile(new URL("../dist/index.js", import.meta.url), "utf8")).replaceAll(writerAddress, testAddress);
const presenter = "test-presenter-credential";
const auth = { authorization: `Bearer ${presenter}`, "content-type": "application/json" };

async function fixture(profile = "tiramisu", balance = "0x8ac7230489e80000", onRpc) {
  const calls = [];
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: source, compatibilityDate: "2026-10-01", compatibilityFlags: ["nodejs_compat"],
    durableObjects: { WRITER: { className: "WriterObject", useSQLite: true } },
    bindings: { ARKIV_PROFILE: profile, MIN_WRITER_BALANCE_WEI: "8000000000000000000", ALLOWED_ORIGINS: "https://app.example", RPC: "https://rpc.example", ACCESS_KEY: "test-rpc-credential", WORKSHOP_PRESENTER_TOKEN: presenter, WORKSHOP_WRITER_PRIVATE_KEY: testKey },
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
    const draft = { session: code, name: "Asha", color: "#FE7446", country: "IN", lifetimeSec: 120 };
    const device = { "x-device-token": "test-device-token-1234", "content-type": "application/json", origin: "https://app.example" };
    assert.equal((await call("/api/submit", draft, device)).data.error, "doors_closed");
    await call("/api/presenter/hold", {});
    await call("/api/presenter/doors", { open: true });
    assert.equal((await call("/api/submit", { ...draft, session: "WRONG" }, device)).data.error, "bad_session");
    assert.equal((await call("/api/submit", { ...draft, lifetimeSec: 21 }, device)).data.error, "invalid");
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
    assert.equal((await call(`/api/ticket/${accepted.data.ticket}`, undefined, {})).data.status, "failed");
    assert.equal(calls.some(call => call.method.startsWith("eth_send")), false);
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
    const accepted = await call("/api/submit", { session: code, name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 120 }, { "x-device-token": "balance-floor-test-device" });
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
    await call("/api/submit", { session: code, name: "Asha", color: "#fe7446", country: "IN", lifetimeSec: 120 }, { "x-device-token": "responsive-phone-device" });
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
