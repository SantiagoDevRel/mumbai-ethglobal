import { test } from "node:test";
import assert from "node:assert/strict";
import { ExpirationTime } from "@arkiv-network/sdk";
import { createArkivAdapter, dotToCreate, encodedFields, extensionsFor, lifetime, LONGEST_EXPIRATION, writeGas } from "../shared/arkiv/sdk-1.0.ts";
import { NOTHING_TO_EXTEND, WriteNotSentError } from "../shared/arkiv/adapter.ts";
import { createSdkClients, keyedUrl } from "../shared/arkiv/clients-1.0.ts";
import { getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { APP_ID, LONGEST_LIFETIME_BLOCKS, MAX_LIFETIME_BLOCKS, NO_EXPIRY_BLOCK, type Hex } from "../shared/types.ts";

test("adapter walks every page by $key and describes the exact query sent", async () => {
  const original = globalThis.fetch;
  const queries: { query: string; limit?: string }[] = [];
  const key = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;
  const row = (n: number) => ({ key: key(n), owner: WRITER_ADDRESS, creator: WRITER_ADDRESS,
    createdAt: "0x60", updatedAt: "0x60", expiresAt: "0x80",
    attributes: [ { name: "app", type: "str", value: APP_ID }, { name: "kind", type: "str", value: "dot" },
      { name: "session", type: "str", value: "TEST" }, { name: "name", type: "str", value: "Asha" },
      { name: "color", type: "str", value: "#fe7446" }, { name: "country", type: "str", value: "colombia" },
      { name: "lat", type: "i32", value: -4_500_000 }, { name: "lng", type: "i32", value: -74_000_000 } ] });
  globalThis.fetch = async (_input, options) => {
    const body = JSON.parse(String(options?.body)) as { id: number; method: string; params: [string, { limit?: string }] };
    let result: unknown;
    if (body.method === "eth_chainId") result = "0x76edaf";
    else {
      assert.equal(body.method, "arkiv_query");
      queries.push({ query: body.params[0], limit: body.params[1].limit });
      // A full first page of 100 rows, then one more row after the last key.
      result = queries.length === 1 ? { blockNumber: "0x64", data: Array.from({ length: 100 }, (_, n) => row(n + 1)) } : { blockNumber: "0x65", data: [row(101)] };
    }
    return Response.json({ jsonrpc: "2.0", id: body.id, result });
  };
  try {
    const adapter = createArkivAdapter({ profile: getProfile("rabdi"), creator: WRITER_ADDRESS, read: { kind: "public" } });
    const filters = { kinds: ["dot" as const], session: "TEST", viewport: { minLat: -10, maxLat: 20, minLng: -90, maxLng: -50 } };
    const description = adapter.describe(filters);
    const result = await adapter.query(filters);
    assert.equal(result.pages, 2);
    assert.equal(result.rows, 101);
    assert.equal(result.block, 101n);
    assert.equal(queries[0]!.query, description.query);
    assert.ok(queries[1]!.query.includes(key(100).slice(2)), "the next page continues after the last key read");
    assert.match(description.query, /ORDER BY/i);
    assert.equal(queries[0]!.limit, "0x64");
    assert.deepEqual(result.description, description);
    assert.equal(result.entities[0]!.attrs.kind === "dot" && result.entities[0]!.attrs.lat, -4.5);
    assert.deepEqual(result.entities[0]!.raw.find(attribute => attribute.name === "lng"), { name: "lng", type: "i32", stored: "-74000000" });
    assert.match(description.query, /i32\(-10000000\)/);
    assert.match(description.code, /\.createdBy/);
  } finally { globalThis.fetch = original; }
});

test("the access key is the RPC URL's last path segment", () => {
  assert.equal(keyedUrl("https://rpc.rabdi.db-chain.testnet.arkiv.network/", "a/b"), "https://rpc.rabdi.db-chain.testnet.arkiv.network/a%2Fb");
  assert.throws(() => keyedUrl("https://rpc.example", ""), /access key/);
});

test("write encoding preserves signed coordinates, schema columns and extension permission", () => {
  const create = dotToCreate({ session: "TEST", name: "Asha", country: "CO", color: "#fe7446", lat: -4.5, lng: -74, lifetimeSec: 20 });
  assert.deepEqual(Object.keys(create).sort(), ["expiration", "flags", "schema", "values"]);
  assert.equal(create.flags.permissionlessExtension, true);
  const values = create.values as Record<string, unknown>;
  assert.equal(values.lat, -4_500_000);
  assert.equal(values.country, "colombia");
  assert.equal(values.kind, "dot");
  const columns = create.schema.columns as Record<string, { isIndexed: boolean } | undefined>;
  for (const name of ["app", "kind", "name", "session", "color", "country", "lat", "lng"]) assert.equal(columns[name]?.isIndexed, true, `${name} is filterable`);
  assert.equal(encodedFields({ rating: 4.5 }).rating, 45);
  assert.throws(() => encodedFields({ photo: "a".repeat(128) }), /plain Swarm reference/);
});

test("raw-send journal failure prevents forwarding; lost responses are never transport-retried", async () => {
  const original = globalThis.fetch;
  let forwards = 0;
  globalThis.fetch = async () => { forwards++; throw new Error("Lost provider response."); };
  const options = { profile: getProfile("rabdi"), creator: WRITER_ADDRESS, read: { kind: "keyed" as const, url: "https://rpc.example", accessKey: "test-rpc-credential" } };
  try {
    const stopped = createSdkClients(options, { async beforeSend() { throw new Error("Checkpoint unavailable."); } });
    const request = stopped.reader.transport.request as (call: { method: string; params: string[] }) => Promise<unknown>;
    await assert.rejects(request({ method: "eth_sendRawTransaction", params: ["0x02"] }));
    assert.equal(forwards, 0);
    const captured: { raw: Hex; hash: Hex }[] = [];
    const admitted = createSdkClients(options, { async beforeSend(raw, hash) { captured.push({ raw, hash }); } });
    const send = admitted.reader.transport.request as typeof request;
    await assert.rejects(send({ method: "eth_sendRawTransaction", params: ["0x02"] }));
    assert.equal(forwards, 1);
    assert.equal(captured.length, 1);
    assert.equal(captured[0]!.raw, "0x02");
    assert.match(captured[0]!.hash, /^0x[a-f0-9]{64}$/);
  } finally { globalThis.fetch = original; }
});

test("an explicit wallet rejection permits the next explicit user action", async () => {
  const original = globalThis.fetch;
  let prompts = 0;
  globalThis.fetch = async (_input, options) => {
    const body = JSON.parse(String(options?.body)) as { id: number };
    return Response.json({ jsonrpc: "2.0", id: body.id, result: "0x76edaf" });
  };
  try {
    const adapter = createArkivAdapter({ profile: getProfile("rabdi"), creator: WRITER_ADDRESS, read: { kind: "public" }, wallet: {
      kind: "eip1193", account: WRITER_ADDRESS, provider: { request: async () => { prompts++; throw Object.assign(new Error("User rejected the request."), { code: 4001 }); } },
    } });
    const dots = [{ session: "TEST", name: "Asha", country: "IN", color: "#fe7446", lat: 20, lng: 75, lifetimeSec: 20 }];
    await assert.rejects(adapter.createDots(dots));
    await assert.rejects(adapter.createDots(dots));
    assert.equal(prompts, 2);
  } finally { globalThis.fetch = original; }
});

test("the stage relay reads without any fetch: no browser touches the public RPC", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("A relay read must not fetch."); };
  const calls: string[] = [];
  try {
    const { reader } = createSdkClients({ profile: getProfile("rabdi"), creator: WRITER_ADDRESS,
      read: { kind: "relay", send: async (method) => { calls.push(method); return method === "eth_chainId" ? "0x76edaf" : "0x10"; } } });
    assert.equal(await reader.getBlockNumber(), 16n);
    assert.deepEqual(calls, ["eth_blockNumber"]);
  } finally { globalThis.fetch = original; }
});

// The phone's longest choice is Rabdi's maximum lifetime: a deadline at 2**64 - 1 reverts there
// (ExpiryBeyondMaxLifetime, 7,884,000 blocks, October 31).
test("the longest choice writes Rabdi's maximum lifetime, and neither lifetime choice is an attribute", () => {
  const dot = { session: "TEST", name: "asha", country: "in", color: "#fe7446", lat: 19.1, lng: 72.9, lifetimeSec: 900 };
  const forever = dotToCreate({ ...dot, noExpiry: true });
  assert.deepEqual(forever.expiration, LONGEST_EXPIRATION);
  assert.deepEqual(forever.expiration, ExpirationTime.fromBlocks(Number(LONGEST_LIFETIME_BLOCKS)));
  assert.ok(LONGEST_LIFETIME_BLOCKS <= MAX_LIFETIME_BLOCKS);
  for (const timed of [dotToCreate(dot), dotToCreate({ ...dot, noExpiry: false })]) assert.deepEqual(timed.expiration, ExpirationTime.fromSeconds(900));
  // Any number of seconds becomes whole 2 s blocks, rounded up.
  assert.deepEqual(lifetime(901), ExpirationTime.fromBlocks(451));
  for (const create of [forever, dotToCreate(dot)]) {
    const attributes = create.values as Record<string, unknown>;
    assert.equal("noExpiry" in attributes, false);
    assert.equal("lifetimeSec" in attributes, false);
    // Stored by its full name (Santiago, October 30), not the code the writer placed it with.
    assert.equal(attributes.country, "india");
  }
});

test("writes carry gas with at least twice the measured use, under the block gas limit", () => {
  // Measured on Rabdi, October 31: one create 190,179 gas, ten creates 1,500,092.
  assert.ok(writeGas(1) >= 2n * 190_179n);
  assert.ok(writeGas(10) >= 2n * 1_500_092n);
  assert.ok(writeGas(20) < 30_000_000n);
});

test("Lifetime Extension skips entities with the longest lifetime and refuses when none is left", () => {
  const timed = `0x${"1".repeat(64)}` as Hex, endless = `0x${"2".repeat(64)}` as Hex;
  // Extending an entity already at Rabdi's maximum would revert: it stays as it is.
  assert.deepEqual(extensionsFor([{ key: timed, expiresAt: 128n }, { key: endless, expiresAt: NO_EXPIRY_BLOCK }], 600n),
    [{ entityKey: timed, expiration: ExpirationTime.atBlock(728n) }]);
  assert.throws(() => extensionsFor([{ key: endless, expiresAt: NO_EXPIRY_BLOCK }], 600n), (error: unknown) => error instanceof WriteNotSentError && error.message === NOTHING_TO_EXTEND);
});

test("extending only entities with the longest lifetime signs nothing and leaves the next write free", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("A relay read must not fetch."); };
  const timed = `0x${"4".repeat(64)}` as Hex, endless = `0x${"3".repeat(64)}` as Hex;
  const methods: string[] = [];
  let walletCalls = 0;
  const row = (key: Hex) => ({ key, owner: WRITER_ADDRESS, creator: WRITER_ADDRESS, createdAt: "0x60", updatedAt: "0x60",
    expiresAt: key === endless ? "0xffffffffffffffff" : "0x80",
    attributes: [{ name: "app", type: "str", value: APP_ID }, { name: "kind", type: "str", value: "dot" }] });
  const answers: Record<string, (params: unknown) => unknown> = {
    eth_chainId: () => "0x76edaf",
    eth_getBlockByNumber: () => ({ number: "0x64", timestamp: "0x6720f000", hash: `0x${"5".repeat(64)}` }),
    arkiv_getBlockTiming: () => ({ current_block: 100, current_block_time: 1_730_000_000, duration: 2 }),
    // writeParams reads the nonce and gas price before every write.
    eth_getTransactionCount: () => "0x0",
    eth_gasPrice: () => "0x3b9aca00",
    // getEntity is one arkiv_getEntity call: answer with the entity whose key it names.
    arkiv_getEntity: (params) => row(String((params as [string])[0]).toLowerCase() as Hex),
  };
  try {
    const adapter = createArkivAdapter({ profile: getProfile("rabdi"), creator: WRITER_ADDRESS,
      read: { kind: "relay", send: async (method, params) => { methods.push(method); const answer = answers[method]; if (!answer) throw new Error(`Unexpected RPC method ${method}`); return answer(params); } },
      wallet: { kind: "eip1193", account: WRITER_ADDRESS, provider: { request: async () => { walletCalls++; throw Object.assign(new Error("User rejected the request."), { code: 4001 }); } } } });
    // Refused before signing, so no uncertainty barrier: the second try gets the same refusal.
    for (let attempt = 0; attempt < 2; attempt++) {
      await assert.rejects(adapter.extend([endless], 20 * 60), (error: unknown) => error instanceof WriteNotSentError && error.message === NOTHING_TO_EXTEND);
    }
    assert.equal(walletCalls, 0);
    assert.ok(methods.includes("arkiv_getEntity"));
    assert.equal(methods.some(method => method.startsWith("eth_send")), false);
    // With an entity that expires in the set, the extension goes on to the wallet.
    await assert.rejects(adapter.extend([timed, endless], 20 * 60));
    assert.ok(walletCalls > 0);
  } finally { globalThis.fetch = original; }
});

// The entity card's Delete (October 30), signed like Transfer by the workshop wallet.
test("Delete sends one deleteEntity from the workshop wallet and returns its receipt's block", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("A relay read must not fetch."); };
  const key = `0x${"7".repeat(64)}` as Hex, hash = `0x${"a".repeat(64)}` as Hex;
  const sent: { from?: string; to?: string; data?: string }[] = [];
  const walletMethods: string[] = [];
  const receipt = () => ({ transactionHash: hash, transactionIndex: "0x0", blockHash: `0x${"b".repeat(64)}`, blockNumber: "0x64",
    from: WRITER_ADDRESS.toLowerCase(), to: sent[0]?.to ?? null, contractAddress: null, cumulativeGasUsed: "0x5208", gasUsed: "0x5208",
    effectiveGasPrice: "0x1", logs: [], logsBloom: `0x${"0".repeat(512)}`, status: "0x1", type: "0x2" });
  try {
    const adapter = createArkivAdapter({ profile: getProfile("rabdi"), creator: WRITER_ADDRESS,
      read: { kind: "relay", send: async (method) => {
        if (method === "eth_chainId") return "0x76edaf";
        if (method === "eth_getTransactionReceipt") return receipt();
        if (method === "eth_getTransactionCount") return "0x0";
        if (method === "eth_gasPrice") return "0x3b9aca00";
        throw new Error(`Unexpected RPC method ${method}`);
      } },
      wallet: { kind: "eip1193", account: WRITER_ADDRESS, provider: { request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        walletMethods.push(method);
        if (method === "eth_chainId") return "0x76edaf";
        if (method === "eth_sendTransaction") { sent.push((params as [{ from?: string; to?: string; data?: string }])[0]); return hash; }
        if (method === "eth_blockNumber") return "0x64";
        if (method === "eth_getTransactionReceipt") return receipt();
        throw new Error(`Unexpected wallet method ${method}`);
      } } } });
    assert.deepEqual(await adapter.deleteEntity(key), { txHash: hash, block: 100n, keys: [key] });
    assert.equal(sent.length, 1);
    assert.equal(sent[0]!.from?.toLowerCase(), WRITER_ADDRESS.toLowerCase());
    assert.ok(sent[0]!.data?.toLowerCase().includes(key.slice(2)), "the transaction names the entity's key");
    assert.equal(walletMethods.filter((method) => method.endsWith("_sendTransaction")).length, 1);
  } finally { globalThis.fetch = original; }
});

test("a delete rejected in the wallet leaves the next delete free", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("A relay read must not fetch."); };
  let prompts = 0;
  try {
    const adapter = createArkivAdapter({ profile: getProfile("rabdi"), creator: WRITER_ADDRESS,
      read: { kind: "relay", send: async (method) => {
        if (method === "eth_chainId") return "0x76edaf";
        if (method === "eth_getTransactionCount") return "0x0";
        if (method === "eth_gasPrice") return "0x3b9aca00";
        throw new Error(`Unexpected RPC method ${method}`);
      } },
      wallet: { kind: "eip1193", account: WRITER_ADDRESS, provider: { request: async () => { prompts++; throw Object.assign(new Error("User rejected the request."), { code: 4001 }); } } } });
    const key = `0x${"7".repeat(64)}` as Hex;
    // A rejection sent nothing, so there is nothing to reconcile: the second delete asks the wallet again.
    await assert.rejects(adapter.deleteEntity(key));
    await assert.rejects(adapter.deleteEntity(key));
    assert.equal(prompts, 2);
  } finally { globalThis.fetch = original; }
});
