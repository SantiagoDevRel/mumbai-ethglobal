import { test } from "node:test";
import assert from "node:assert/strict";
import { keyQuotaExhausted, postKeyed } from "../shared/arkiv/clients-0.8.ts";

const KEYED = "https://keyed.example/rpc";
const PUBLIC = "https://public.example/rpc";
const BODY = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });

// The tests share the module's quota state, so they run in this order.
test("a keyed answer and a plain burst limit stay on the key", async () => {
  const original = globalThis.fetch;
  const calls: { url: string; key: string | null }[] = [];
  const answers = [new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" })),
    new Response(JSON.stringify({ error: "RATE_LIMITED" }), { status: 429, headers: { "arkiv-quota-used-percent": "40" } })];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), key: new Headers(init?.headers).get("x-api-key") });
    return answers.shift()!;
  };
  try {
    assert.equal((await postKeyed(KEYED, "k", PUBLIC, BODY, AbortSignal.timeout(1000))).viaPublic, false);
    const limited = await postKeyed(KEYED, "k", PUBLIC, BODY, AbortSignal.timeout(1000));
    assert.equal(limited.viaPublic, false);
    assert.equal(limited.response.status, 429);
    assert.deepEqual(calls, [{ url: KEYED, key: "k" }, { url: KEYED, key: "k" }]);
    assert.equal(keyQuotaExhausted(), false);
  } finally { globalThis.fetch = original; }
});

test("a used-up quota retries on the public RPC without the key, then skips the key", async () => {
  const original = globalThis.fetch;
  const calls: { url: string; key: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), key: new Headers(init?.headers).get("x-api-key") });
    return String(input) === KEYED
      ? new Response(JSON.stringify({ error: "QUOTA_EXCEEDED", message: "quota exhausted" }), { status: 429, headers: { "arkiv-quota-used-percent": "100" } })
      : new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x2" }));
  };
  try {
    const first = await postKeyed(KEYED, "k", PUBLIC, BODY, AbortSignal.timeout(1000));
    assert.equal(first.viaPublic, true);
    assert.deepEqual(await first.response.json(), { jsonrpc: "2.0", id: 1, result: "0x2" });
    assert.equal(keyQuotaExhausted(), true);
    assert.equal((await postKeyed(KEYED, "k", PUBLIC, BODY, AbortSignal.timeout(1000))).viaPublic, true);
    assert.deepEqual(calls, [{ url: KEYED, key: "k" }, { url: PUBLIC, key: null }, { url: PUBLIC, key: null }]);
  } finally { globalThis.fetch = original; }
});
