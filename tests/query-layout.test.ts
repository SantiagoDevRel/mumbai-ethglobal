import { test } from "node:test";
import assert from "node:assert/strict";
import { createArkivAdapter } from "../shared/arkiv/sdk-0.8.ts";
import { getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { queryLayout } from "../lib/data/query-layout.ts";
import { describeFilters } from "../shared/arkiv/mock.ts";

test("projection separates actual scope and changing predicates without replacing adapter text", () => {
  const adapter = createArkivAdapter({ profile: getProfile("tiramisu"), creator: WRITER_ADDRESS, read: { kind: "public" } });
  const description = adapter.describe({ kinds: ["dot"], session: "MOCK", color: "#fe7446", country: "IN", owner: WRITER_ADDRESS, viewport: { minLat: 6, maxLat: 36, minLng: 68, maxLng: 98 } });
  for (const kind of ["code", "query"] as const) {
    const result = queryLayout(description[kind], kind);
    assert.match(result.scope, /app/, description[kind]);
    assert.match(result.scope, /MOCK/);
    assert.doesNotMatch(result.scope, /#fe7446/);
    assert.match(result.changing, /#fe7446/);
    assert.match(result.changing, /IN/);
    assert.match(result.changing, /lat/);
    assert.match(result.changing, kind === "code" ? /ownedBy/ : /\$owner/);
    for (const line of result.changing.split("\n")) assert.ok(description[kind].includes(line));
    assert.doesNotMatch(result.scope + result.changing, /\$creator|createdBy/, "The talk projects $owner only.");
    if (kind === "query") {
      assert.match(result.scope, / AND /);
      assert.match(result.changing, /\nAND country/);
    }
  }
});
test("the mock describes reads in the SDK's AND form, and the projection drops $creator", () => {
  const description = describeFilters({ kinds: ["dot"], session: "MOCK", color: "#fe7446", country: "IN" }, WRITER_ADDRESS);
  assert.equal(description.query, `app = str('arkiv-mumbai-2026') AND kind = str('dot') AND session = str('MOCK') AND color = str('#fe7446') AND country = str('IN') AND $creator = addr(${WRITER_ADDRESS})`);
  const result = queryLayout(description.query, "query");
  assert.equal(result.scope, "app = str('arkiv-mumbai-2026') AND kind = str('dot') AND session = str('MOCK')");
  assert.equal(result.changing, "color = str('#fe7446')\nAND country = str('IN')");
});
test("an unfamiliar adapter description remains visible instead of being silently hidden, without $creator", () => {
  assert.equal(queryLayout("future adapter syntax", "query").changing, "future adapter syntax");
  assert.equal(queryLayout("future adapter syntax\n$creator = addr(0x01)", "query").changing, "future adapter syntax");
});

test("scope uses a single separator for comma-terminated builder predicates", () => {
  const text = '  eq("app", "mumbai-workshop"),\n  eq("kind", "dot"),\n  eq("session", "MOCK"),\n  eq("color", "#fe7446"),';
  const result = queryLayout(text, "code");
  assert.equal(result.scope, 'eq("app", "mumbai-workshop") · eq("kind", "dot") · eq("session", "MOCK")');
  assert.equal(result.changing, '  eq("color", "#fe7446"),');
});
