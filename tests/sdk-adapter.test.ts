import { test } from "node:test";
import assert from "node:assert/strict";
import { createArkivAdapter, dotToCreate, encodedFields } from "../shared/arkiv/sdk-0.8.ts";
import { createSdkClients } from "../shared/arkiv/clients-0.8.ts";
import { getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { APP_ID, type Hex } from "../shared/types.ts";

test("adapter walks every immutable page and describes the exact query sent", async () => {
  const original = globalThis.fetch;
  const queries: { query: string; cursor?: string }[] = [];
  const key = (digit: string) => `0x${digit.repeat(64)}` as Hex;
  const row = (digit: string) => ({ key: key(digit), owner: WRITER_ADDRESS, creator: WRITER_ADDRESS,
    createdAt: "0x60", updatedAt: "0x60", expiresAt: "0x80",
    attributes: [ { name: "app", type: "str", value: APP_ID }, { name: "kind", type: "str", value: "dot" },
      { name: "session", type: "str", value: "TEST" }, { name: "name", type: "str", value: "Asha" },
      { name: "color", type: "str", value: "#fe7446" }, { name: "country", type: "str", value: "CO" },
      { name: "lat", type: "i32", value: -4_500_000 }, { name: "lng", type: "i32", value: -74_000_000 } ] });
  globalThis.fetch = async (_input, options) => {
    const body = JSON.parse(String(options?.body)) as { id: number; method: string; params: [string, { cursor?: string }] };
    let result: unknown;
    if (body.method === "eth_chainId") result = "0x7614d1";
    else {
      assert.equal(body.method, "arkiv_query");
      queries.push({ query: body.params[0], cursor: body.params[1].cursor });
      result = body.params[1].cursor ? { blockNumber: "0x64", data: [row("2")] } : { blockNumber: "0x64", data: [row("1")], cursor: "next-page" };
    }
    return Response.json({ jsonrpc: "2.0", id: body.id, result });
  };
  try {
    const adapter = createArkivAdapter({ profile: getProfile("tiramisu"), creator: WRITER_ADDRESS, read: { kind: "public" } });
    const filters = { kinds: ["dot" as const], session: "TEST", viewport: { minLat: -10, maxLat: 20, minLng: -90, maxLng: -50 } };
    const description = adapter.describe(filters);
    const result = await adapter.query(filters);
    assert.equal(result.pages, 2);
    assert.equal(result.rows, 2);
    assert.equal(result.block, 100n);
    assert.deepEqual(queries.map(item => item.query), [description.query, description.query]);
    assert.equal(queries[1]!.cursor, "next-page");
    assert.deepEqual(result.description, description);
    assert.equal(result.entities[0]!.attrs.kind === "dot" && result.entities[0]!.attrs.lat, -4.5);
    assert.deepEqual(result.entities[0]!.raw.find(attribute => attribute.name === "lng"), { name: "lng", type: "i32", stored: "-74000000" });
    assert.match(description.query, /i32\(-10000000\)/);
    assert.match(description.code, /\.createdBy/);
  } finally { globalThis.fetch = original; }
});

test("write encoding preserves signed coordinates, empty payload and extension permission", () => {
  const create = dotToCreate({ session: "TEST", name: "Asha", country: "CO", color: "#fe7446", lat: -4.5, lng: -74, lifetimeSec: 20 });
  assert.equal(create.payload.length, 0);
  assert.equal(create.flags.permissionlessExtension, true);
  assert.deepEqual((create.attributes as Record<string, unknown>).lat, { type: "i32", value: -4_500_000 });
  assert.deepEqual(encodedFields({ rating: 4.5 }).rating, { type: "i32", value: 45 });
  assert.throws(() => encodedFields({ photo: "a".repeat(128) }), /plain Swarm reference/);
});

test("raw-send journal failure prevents forwarding; lost responses are never transport-retried", async () => {
  const original = globalThis.fetch;
  let forwards = 0;
  globalThis.fetch = async () => { forwards++; throw new Error("Lost provider response."); };
  const options = { profile: getProfile("tiramisu"), creator: WRITER_ADDRESS, read: { kind: "keyed" as const, url: "https://rpc.example", accessKey: "test-rpc-credential" } };
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
    return Response.json({ jsonrpc: "2.0", id: body.id, result: "0x7614d1" });
  };
  try {
    const adapter = createArkivAdapter({ profile: getProfile("tiramisu"), creator: WRITER_ADDRESS, read: { kind: "public" }, wallet: {
      kind: "eip1193", account: WRITER_ADDRESS, provider: { request: async () => { prompts++; throw Object.assign(new Error("User rejected the request."), { code: 4001 }); } },
    } });
    const dots = [{ session: "TEST", name: "Asha", country: "IN", color: "#fe7446", lat: 20, lng: 75, lifetimeSec: 20 }];
    await assert.rejects(adapter.createDots(dots));
    await assert.rejects(adapter.createDots(dots));
    assert.equal(prompts, 2);
  } finally { globalThis.fetch = original; }
});
