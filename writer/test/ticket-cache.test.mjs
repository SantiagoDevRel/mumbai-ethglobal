import { test } from "node:test";
import assert from "node:assert/strict";
import { TicketCache, countdownTicket } from "../src/ticket-cache.ts";

function fixture(fetchSession) {
  let now = 10000;
  const values = new Map();
  const storage = { async get(key) { return structuredClone(values.get(key)); }, async put(key, value) { values.set(key, structuredClone(value)); } };
  return { storage, clock: () => now, advance: ms => { now += ms; }, cache: new TicketCache(storage, fetchSession, () => now) };
}
const key = "0x" + "12".repeat(32);
const ticket = { ticket: "phone-ticket", status: "written", entityKey: key, block: "99", expiresAtBlock: "150", lat: 0, lng: 0 };

test("200 concurrent written tickets share a session read; extensions and removal survive eviction", async () => {
  let calls = 0, block = 100n, expiresAt = 150n, live = true;
  const f = fixture(async session => {
    calls++; assert.equal(session, "ROOM");
    await new Promise(resolve => setTimeout(resolve, 5));
    return { block, entities: live ? [{ key, expiresAt }] : [] };
  });
  const wave = () => Promise.all(Array.from({ length: 200 }, () => f.cache.read("ROOM")));
  const first = await wave();
  assert.equal(calls, 1);
  assert.ok(first.every(snapshot => countdownTicket(ticket, snapshot).live));
  f.advance(1999); await wave(); assert.equal(calls, 1);
  f.advance(1); block = 101n; expiresAt = 750n;
  const extended = await wave(); assert.equal(calls, 2);
  assert.equal(countdownTicket(ticket, extended[0]).expiresAtBlock, "750");
  f.advance(2000); block = 750n; live = false;
  const removed = await wave(); assert.equal(calls, 3);
  assert.deepEqual(countdownTicket(ticket, removed[0]), { ...ticket, expiresAtBlock: "750", currentBlock: "750", live: false });
  const restarted = new TicketCache(f.storage, async () => { throw new Error("A fresh persisted snapshot must be reused."); }, f.clock);
  assert.equal(countdownTicket(ticket, await restarted.read("ROOM")).expiresAtBlock, "750");
  assert.equal(countdownTicket(ticket, await restarted.read("ROOM")).live, false);
});

test("an upstream failure has one shared attempt and backoff; it never means expired", async () => {
  let calls = 0, failing = false;
  const f = fixture(async () => {
    calls++; if (failing) throw new Error("RPC 429");
    return { block: 100n, entities: [{ key, expiresAt: 150n }] };
  });
  await f.cache.read("ROOM");
  f.advance(2000); failing = true;
  const results = await Promise.allSettled(Array.from({ length: 200 }, () => f.cache.read("ROOM")));
  assert.equal(calls, 2); assert.ok(results.every(result => result.status === "rejected"));
  await assert.rejects(f.cache.read("ROOM"), /RPC 429/); assert.equal(calls, 2);
  f.advance(2000); failing = false;
  assert.equal(countdownTicket(ticket, await f.cache.read("ROOM")).live, true); assert.equal(calls, 3);
});

test("a cached snapshot older than a create receipt cannot report a new entity expired", () => {
  const result = countdownTicket({ ...ticket, block: "101" }, { block: "100", fetchedAt: 0, liveKeys: [], expirations: {} });
  assert.equal(result.currentBlock, "101"); assert.equal(result.live, true); assert.equal(result.expiresAtBlock, "150");
});
