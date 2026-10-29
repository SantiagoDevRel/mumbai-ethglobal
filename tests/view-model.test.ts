import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAppFilters, isOpen, mumbaiMinutes } from "../lib/data/view-model.ts";
import type { LiveEntity } from "../shared/types.ts";
test("opening hours wrap midnight and exclude closing time", () => {
  assert.equal(isOpen(1200, 120, 30), true);
  assert.equal(isOpen(1200, 120, 600), false);
  assert.equal(isOpen(480, 1320, 1320), false);
  assert.equal(mumbaiMinutes(Date.UTC(2026, 9, 24, 20, 0)), 90);
});
test("custom overlays are filtered app-side without modifying chain attributes", () => {
  const entity: LiveEntity = { key: "0x01", owner: "0x02", creator: "0x02", createdAtBlock: 1n, expiresAtBlock: 50n, raw: [], attrs: { kind: "dot", name: "priya", country: "in", color: "#000000", lat: 19, lng: 73, session: "TEST" } };
  const result = applyAppFilters([entity], { custom: { name: "vegan", value: "yes" } }, { "0x01": { vegan: "yes" } }, 0);
  assert.equal(result.entities.length, 1);
  assert.equal("vegan" in entity.attrs, false);
  assert.match(result.steps[0]!, /local overlay/);
  assert.equal(applyAppFilters([entity], { custom: { name: "vegan", value: "no" } }, { "0x01": { vegan: "yes" } }, 0).entities.length, 0);
});
