import { test } from "node:test";
import assert from "node:assert/strict";
import { queryChange } from "../lib/data/query-change.ts";

test("highlights the changed predicate without changing the executed query text", () => {
  const text = 'country = "IN" && color = "#fe7446"';
  const change = queryChange('country = "CO" && color = "#fe7446"', text);
  assert.equal(change.changed, "IN");
  assert.equal(change.before + change.changed + change.after, text);
});
test("removing a filter keeps the exact text and marks its removal boundary", () => {
  const text = 'country = "IN"';
  const change = queryChange(text + ' && color = "#fe7446"', text);
  assert.equal(change.removed, true);
  assert.equal(change.before + change.changed + change.after, text);
});
