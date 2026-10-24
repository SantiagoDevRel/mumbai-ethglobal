import { test } from "node:test";
import assert from "node:assert/strict";
import { createArkivAdapter } from "../shared/arkiv/sdk-0.8.ts";
import { getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { queryLayout } from "../lib/data/query-layout.ts";

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
  }
});
test("an unfamiliar adapter description remains visible instead of being silently hidden", () => {
  assert.equal(queryLayout("future adapter syntax", "query").changing, "future adapter syntax");
});
