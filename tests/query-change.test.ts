import { test } from "node:test";
import assert from "node:assert/strict";
import { queryChange } from "../lib/data/query-change.ts";

// Country codes are stored in lower case (October 29).
test("highlights the changed predicate without changing the executed query text", () => {
  const text = 'country = "in" && color = "#fe7446"';
  const change = queryChange('country = "co" && color = "#fe7446"', text);
  assert.equal(change.changed, "in");
  assert.equal(change.before + change.changed + change.after, text);
});
test("removing a filter keeps the exact text and marks its removal boundary", () => {
  const text = 'country = "in"';
  const change = queryChange(text + ' && color = "#fe7446"', text);
  assert.equal(change.removed, true);
  assert.equal(change.before + change.changed + change.after, text);
});
