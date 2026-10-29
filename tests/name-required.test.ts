import assert from "node:assert/strict";
import test from "node:test";
import { hasVisibleName, SubmitRequest } from "../shared/writer-api.ts";

const draft = { color: "#fe7446", country: "IN", lifetimeSec: 15 * 60 };

// Every entity's name labels its dot on the map, so the writer refuses one you can't see (Santiago,
// October 29). The phone checks the same rule before it sends anything.
test("a name with nothing visible is refused", () => {
  const blanks = ["", "   ", "\t\n", "  ", "​", "​‍⁠", "﻿", "　", "ㅤ", "ﾠ", "⠀", "́", "ᅟᅠ", "­"];
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
    assert.equal(parsed.data?.name, name.trim());
  }
});
