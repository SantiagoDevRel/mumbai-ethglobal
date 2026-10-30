import { test } from "node:test";
import assert from "node:assert/strict";
import { keyQuotaExhausted, postKeyed } from "../shared/arkiv/clients-1.0.ts";

const RPC = "https://keyed.example/rpc";
const BODY = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });

// The tests share the module's quota state, so they run in this order.
test("a keyed answer and a plain burst limit stay on the key, in the URL's path", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  const answers = [new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" })),
    new Response(JSON.stringify({ error: "RATE_LIMITED" }), { status: 429, headers: { "arkiv-quota-used-percent": "40" } })];
  globalThis.fetch = async (input) => { calls.push(String(input)); return answers.shift()!; };
  try {
    assert.equal((await postKeyed(RPC, "k", BODY, AbortSignal.timeout(1000))).response.status, 200);
    assert.equal((await postKeyed(RPC, "k", BODY, AbortSignal.timeout(1000))).response.status, 429);
    assert.deepEqual(calls, [`${RPC}/k`, `${RPC}/k`]);
    assert.equal(keyQuotaExhausted(), false);
  } finally { globalThis.fetch = original; }
});

test("a used-up quota is reported and never retried without the key", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ error: "QUOTA_EXCEEDED", message: "quota exhausted" }), { status: 429, headers: { "arkiv-quota-used-percent": "100" } });
  };
  try {
    assert.equal((await postKeyed(RPC, "k", BODY, AbortSignal.timeout(1000))).response.status, 429);
    assert.equal(keyQuotaExhausted(), true);
    assert.deepEqual(calls, [`${RPC}/k`]);
  } finally { globalThis.fetch = original; }
});
