import assert from "node:assert/strict";
import test from "node:test";
import { hasVisibleName, SubmitRequest } from "../shared/writer-api.ts";

const draft = { color: "orange", country: "IN", lifetimeSec: 15 * 60 };

// Every entity's name labels its dot on the map, so the writer refuses one you can't see (Santiago,
// October 29). The phone checks the same rule before it sends anything.
test("a name with nothing visible is refused", () => {
  const blanks = ["", "   ", "\t\n", "  ", "​", "​‍⁠", "﻿", "　", "ㅤ", "ﾠ", "⠀", "́", "ᅟᅠ", "­"];
  for (const name of blanks) {
    assert.equal(hasVisibleName(name), false, JSON.stringify(name));
    assert.equal(SubmitRequest.safeParse({ ...draft, name }).success, false, JSON.stringify(name));
  }
});

test("real names pass, in any script, and keep their joiners", () => {
  for (const name of ["Priya", "प्रिया", "K", "😀", "👨‍👩‍👧", "  Kabir  ", "​Arjun", "José"]) {
    assert.equal(hasVisibleName(name), true, name);
    const parsed = SubmitRequest.safeParse({ ...draft, name });
    assert.equal(parsed.success, true, name);
    assert.equal(parsed.data?.name, name.trim().toLowerCase());
  }
});

// Arkiv compares strings exactly, so everything is stored in lower case (Santiago, October 29),
// whatever the phone sent, and every check runs on the lowercased value.
test("name, color and country are stored in lower case", () => {
  const parsed = SubmitRequest.parse({ name: "  KABIR Rao ", color: "ORANGE", country: "IN", lifetimeSec: 300 });
  assert.equal(parsed.name, "kabir rao");
  assert.equal(parsed.color, "orange");
  assert.equal(parsed.country, "in");
  assert.equal(SubmitRequest.parse({ ...draft, name: "José ÁLVAREZ" }).name, "josé álvarez");
  assert.equal(SubmitRequest.safeParse({ ...draft, name: "A".repeat(24) }).success, true);
  assert.equal(SubmitRequest.safeParse({ ...draft, name: "A".repeat(25) }).success, false);
  for (const country of ["IND", "I", "1N", "", "in "]) assert.equal(SubmitRequest.safeParse({ ...draft, name: "asha", country }).success, false, country);
  for (const color of ["purple", "#fe7446", "#123456"]) assert.equal(SubmitRequest.safeParse({ ...draft, name: "asha", color }).success, false, color);
});

test("phones write 5 to 15 minutes only: the six-month choice is refused (Santiago, November 2)", () => {
  assert.equal(SubmitRequest.safeParse({ ...draft, name: "ada", noExpiry: true }).success, false);
  assert.equal(SubmitRequest.parse({ ...draft, name: "ada", noExpiry: false }).noExpiry, false);
  assert.equal(SubmitRequest.parse({ ...draft, name: "ada" }).noExpiry, undefined);
  assert.equal(SubmitRequest.safeParse({ ...draft, name: "ada", noExpiry: "yes" }).success, false);
  assert.equal(SubmitRequest.safeParse({ ...draft, name: "ada", lifetimeSec: 330 }).success, false);
  assert.equal(SubmitRequest.safeParse({ ...draft, name: "ada", lifetimeSec: 120 }).success, false);
});
