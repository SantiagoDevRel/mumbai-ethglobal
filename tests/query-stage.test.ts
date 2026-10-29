import { test } from "node:test";
import assert from "node:assert/strict";
import { queryStage } from "../lib/data/query-stage.ts";
import type { LiveEntity, QueryRun } from "../shared/types.ts";

function entity(key: `0x${string}`, session?: string): LiveEntity {
  return { key, owner: "0x01", creator: "0x01", createdAtBlock: 1n, expiresAtBlock: 100n, raw: [], attrs: { kind: "business", session, name: "cafe", category: "cafe", rating: 4.6, opens: 480, closes: 1320, city: "mumbai", lat: 19, lng: 73 } };
}
const run = (entities: LiveEntity[], block = 50n): QueryRun => ({ entities, block, rows: entities.length, pages: 1, latencyMs: 1, ranAt: 0, description: { code: "actual code", query: "actual query", appSide: [] } });
test("business view combines the audience session and seeds without leaking other sessions", async () => {
  const audience = entity("0x11", "ROOM");
  const seed = entity("0x22");
  const other = entity("0x33", "OTHER");
  const adapter = { query: async (filters: { session?: string }) => filters.session ? run([audience]) : run([seed, audience, other]) };
  const result = await queryStage(adapter, { kinds: ["dot", "business"], session: "ROOM" });
  assert.deepEqual(result.entities.map((item) => item.key), ["0x11", "0x22"]);
  assert.equal(result.rows, 4);
  assert.equal(result.pages, 2);
  assert.match(result.description.appSide[0]!, /other sessions/);
  assert.match(result.description.code, /actual code/);
});
test("never combines queries from different chain snapshots", async () => {
  const adapter = { query: async (filters: { session?: string }) => run([], filters.session ? 50n : 51n) };
  await assert.rejects(queryStage(adapter, { kinds: ["dot", "business"], session: "ROOM" }), /consistent snapshot/);
});
