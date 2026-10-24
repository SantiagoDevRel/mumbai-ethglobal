import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_BUSINESSES, validateSeed } from "./seed-businesses.ts";

test("seed businesses pass validation", () => {
  assert.deepEqual(validateSeed(), []);
});

test("seed has between 35 and 45 businesses", () => {
  assert.ok(SEED_BUSINESSES.length >= 35 && SEED_BUSINESSES.length <= 45, `count ${SEED_BUSINESSES.length}`);
});

test("validator catches bad data", () => {
  const first = SEED_BUSINESSES[0]!;
  const bad = [
    first,
    { ...first, business: { ...first.business, rating: 5.5, name: "x".repeat(25) } },
    { id: "bad-two", business: { ...first.business, name: "Other" }, reviews: [{ stars: 6, text: "Great records here" }] },
  ];
  const problems = validateSeed(bad).join("\n");
  assert.match(problems, /duplicate id/);
  assert.match(problems, /rating 5.5/);
  assert.match(problems, /name length 25/);
  assert.match(problems, /stars 6/);
  assert.match(problems, /banned word/);
  assert.match(problems, /1 reviews/);
});
