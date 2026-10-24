import { test } from "node:test";
import assert from "node:assert/strict";
import { diffEntities, remainingSeconds, snapshotEntities } from "../lib/data/entity-state.ts";
import type { LiveEntity, QueryRun } from "../shared/types.ts";

const entity: LiveEntity = { key: "0x01", owner: "0x02", creator: "0x02", createdAtBlock: 10n, expiresAtBlock: 20n,
  attrs: { kind: "dot", session: "TEST", name: "Priya", color: "#fe7446", country: "IN", lat: 19, lng: 73 }, raw: [] };
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
  current.attrs = { ...current.attrs, name: "New name" } as LiveEntity["attrs"];
  assert.deepEqual(diffEntities(before, run([current]), true).map((event) => event.type), ["extended", "patched"]);
});
test("interpolation uses measured block time and caps a stale clock to one block", () => {
  const block = { number: 18n, timestampMs: 10000, blockTimeMs: 3000 };
  assert.equal(remainingSeconds(entity, block, 11500), 4.5);
  assert.equal(remainingSeconds(entity, block, 90000), 3);
  assert.equal(remainingSeconds(entity, block, 9000), 6);
});
