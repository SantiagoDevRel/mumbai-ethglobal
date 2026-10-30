import { test } from "node:test";
import assert from "node:assert/strict";
import { deletedEvent, diffEntities, logEvents, rememberExpired, remainingSeconds, snapshotEntities } from "../lib/data/entity-state.ts";
import { NO_EXPIRY_BLOCK, type LiveEntity, type QueryRun } from "../shared/types.ts";

// Text attributes are stored in lower case (October 29): the phone and the writer lower-case them.
const entity: LiveEntity = { key: "0x01", owner: "0x02", creator: "0x02", createdAtBlock: 10n, expiresAtBlock: 20n,
  attrs: { kind: "dot", session: "TEST", name: "priya", color: "#fe7446", country: "in", lat: 19, lng: 73 }, raw: [] };
/** Written with ExpirationTime.permanent(): `$expiresAt` is 2**64 - 1. */
const endless: LiveEntity = { ...entity, key: "0x05", expiresAtBlock: NO_EXPIRY_BLOCK,
  attrs: { kind: "dot", session: "TEST", name: "ada", color: "#14f195", country: "in", lat: 19.12, lng: 72.85 } };
function run(entities: LiveEntity[], block = 20n): QueryRun {
  return { entities, block, rows: entities.length, pages: 1, latencyMs: 2, ranAt: 20000, description: { code: "", query: "", appSide: [] } };
}
test("zero countdown does not remove a query result or report expiration", () => {
  assert.equal(remainingSeconds(entity, { number: 20n, timestampMs: 20000, blockTimeMs: 2000 }, 21000), 0);
  assert.deepEqual(diffEntities([entity], run([entity]), true), []);
  assert.equal(diffEntities([entity], run([]), true)[0]?.type, "expired");
});
test("filter changes never produce expiration events", () => {
  assert.deepEqual(diffEntities([entity], run([]), false), []);
  assert.deepEqual(diffEntities([entity], run([], 19n), true), []);
});
test("a late query reports the authoritative expiration block, not the polling block", () => {
  const event = diffEntities([entity], run([], 23n), true)[0]!;
  assert.equal(event.block, 20n);
  assert.equal(event.detail, "expired at block #20");
});
test("extension and patch are detected even when an adapter mutates its entity", () => {
  const current = snapshotEntities([entity])[0]!;
  const before = snapshotEntities([current]);
  current.expiresAtBlock += 600n;
  current.attrs = { ...current.attrs, name: "new name" } as LiveEntity["attrs"];
  assert.deepEqual(diffEntities(before, run([current]), true).map((event) => event.type), ["extended", "patched"]);
});
test("interpolation uses measured block time and caps a stale clock to one block", () => {
  const block = { number: 18n, timestampMs: 10000, blockTimeMs: 3000 };
  assert.equal(remainingSeconds(entity, block, 11500), 4.5);
  assert.equal(remainingSeconds(entity, block, 90000), 3);
  assert.equal(remainingSeconds(entity, block, 9000), 6);
});
test("expired dots are remembered grey; filtered-out or extended ones are not", () => {
  const seen = new Map<string, LiveEntity>();
  const other: LiveEntity = { ...entity, key: "0x03", expiresAtBlock: 40n };
  assert.deepEqual(rememberExpired(seen, run([entity, other], 15n)), []);
  // Past its expiration and gone from the query: expired. Gone but not yet due: just filtered out.
  assert.deepEqual(rememberExpired(seen, run([], 21n)).map((e) => e.key), ["0x01"]);
  // An extension seen before the old deadline keeps the dot alive.
  const extended = { ...other, expiresAtBlock: 80n };
  assert.deepEqual(rememberExpired(seen, run([extended], 50n)).map((e) => e.key), ["0x01"]);
  assert.deepEqual(rememberExpired(seen, run([], 60n)).map((e) => e.key), ["0x01"]);
  // Businesses and reviews never become grey dots.
  const business = { ...entity, key: "0x04", attrs: { kind: "business", name: "cafe", category: "cafe", rating: 4.5, opens: 480, closes: 1320, city: "mumbai", lat: 19, lng: 73 } } as LiveEntity;
  assert.deepEqual(rememberExpired(new Map(), run([business], 15n)), []);
  const onlyBusinessSeen = new Map<string, LiveEntity>();
  rememberExpired(onlyBusinessSeen, run([business], 15n));
  assert.equal(onlyBusinessSeen.size, 0);
});

test("an entity with no expiration never runs out: no countdown, with or without a block", () => {
  assert.equal(remainingSeconds(endless, null, 0), Infinity);
  assert.equal(remainingSeconds(endless, { number: 20n, timestampMs: 20000, blockTimeMs: 2000 }, 21000), Infinity);
  assert.equal(remainingSeconds(endless, { number: NO_EXPIRY_BLOCK, timestampMs: 0, blockTimeMs: 2000 }, 0), Infinity);
  // The card's "less than 60 s" and the label's "<1 min" both test seconds < 60: never true here.
  assert.ok(!(remainingSeconds(endless, { number: 20n, timestampMs: 20000, blockTimeMs: 2000 }, 21000) < 60));
});

test("the event log marks an entity with no expiration, and it never expires", () => {
  const [created] = diffEntities([], run([endless, entity]), true);
  assert.equal(created?.type, "created");
  assert.equal(created?.noExpiry, true);
  assert.equal(diffEntities([], run([entity]), true)[0]?.noExpiry, false);
  // Gone from a later read (filtered out, or hidden) is never reported as expired.
  assert.deepEqual(diffEntities([endless], run([], 1_000_000n), true), []);
  const seen = new Map<string, LiveEntity>();
  rememberExpired(seen, run([endless], 15n));
  assert.deepEqual(rememberExpired(seen, run([], 1_000_000n)), [], "never remembered as a grey dot");
});

// Delete in the entity card (October 30): the dot leaves on the next query, and the log says deleted.
test("a deleted entity leaves the log as deleted at its delete's block, never as expired", () => {
  const deleted = new Map<string, bigint>([[entity.key, 15n]]);
  // Gone past its deadline: without the delete this read would say expired at block #20.
  const [event, ...rest] = diffEntities([entity], run([], 23n), true, deleted);
  assert.deepEqual(rest, []);
  assert.equal(event?.type, "deleted");
  assert.equal(event?.block, 15n);
  assert.equal(event?.detail, "deleted at block #15");
  assert.equal(event?.name, "priya");
  // Also when the filters changed on that read, and for an entity with no expiration.
  assert.deepEqual(diffEntities([entity], run([], 16n), false, deleted).map((item) => item.type), ["deleted"]);
  assert.deepEqual(diffEntities([endless], run([], 16n), true, new Map<string, bigint>([[endless.key, 15n]])).map((item) => item.type), ["deleted"]);
  // A read that lags behind the delete and still returns the entity does not make it new.
  assert.deepEqual(diffEntities([], run([entity], 14n), true, deleted), []);
  // Never a grey dot either, even once its old deadline passes.
  const seen = new Map<string, LiveEntity>();
  rememberExpired(seen, run([entity], 14n));
  assert.deepEqual(rememberExpired(seen, run([], 21n), deleted), []);
  assert.deepEqual(rememberExpired(seen, run([entity], 22n), deleted), []);
  assert.equal(seen.size, 0);
});

test("the log keeps one deleted row per entity and drops an expired row the delete explains", () => {
  const created = diffEntities([], run([entity], 10n), true)[0]!;
  // A read noticed the dot gone (after its deadline) before the delete's receipt came back.
  const expired = diffEntities([entity], run([], 21n), true)[0]!;
  assert.equal(expired.type, "expired");
  let log = logEvents([], [created]);
  log = logEvents(log, [expired]);
  log = logEvents(log, [deletedEvent(entity, 19n, 30000)]);
  assert.deepEqual(log.map((item) => item.type), ["deleted", "created"]);
  assert.equal(log[0]!.detail, "deleted at block #19");
  // Logged again by a later read: still one row.
  log = logEvents(log, diffEntities([entity], run([], 22n), true, new Map<string, bigint>([[entity.key, 19n]])));
  assert.deepEqual(log.map((item) => item.type), ["deleted", "created"]);
  // Newest first, as many rows as the limit allows.
  const other: LiveEntity = { ...entity, key: "0x09", createdAtBlock: 30n, expiresAtBlock: 90n };
  assert.deepEqual(logEvents(log, diffEntities([], run([other], 30n), true), 2).map((item) => item.key), ["0x09", entity.key]);
});
