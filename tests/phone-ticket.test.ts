import { test } from "node:test";
import assert from "node:assert/strict";
import { entityName, phoneWriteMessage, writtenWithoutExpiry } from "../lib/data/phone-ticket.ts";
import { NAME_MAX_CHARS, NO_EXPIRY_BLOCK } from "../shared/types.ts";
import { SubmitRequest } from "../shared/writer-api.ts";

test("phone errors use fixed copy instead of server, RPC or SDK details", () => {
  assert.equal(phoneWriteMessage("internal"), "Something went wrong. Try again.");
  assert.equal(phoneWriteMessage("viem@2.57.11 RPC429"), "Something went wrong. Try again.");
  assert.equal(phoneWriteMessage("name_blocked"), "Try another name.");
  assert.equal(phoneWriteMessage("__proto__"), "Something went wrong. Try again.");
});

// Participants cannot type upper case (Santiago, October 29): the field lowercases as they type.
test("the name field is lower case as you type, within the name limit", () => {
  assert.equal(entityName("Priya SHAH"), "priya shah");
  assert.equal(entityName("José ÁLVAREZ"), "josé álvarez");
  assert.equal(entityName("प्रिया"), "प्रिया");
  assert.equal(entityName("ada "), "ada ", "Spaces stay while typing; the writer trims.");
  // İ lowercases to two characters: whole characters come off the end, never past the limit.
  const grown = entityName("İ".repeat(NAME_MAX_CHARS));
  assert.ok(grown.length <= NAME_MAX_CHARS);
  assert.equal(grown, grown.toLowerCase());
  for (const typed of ["KABIR", "İstanbul", "Ωmega", "A".repeat(NAME_MAX_CHARS)]) {
    assert.equal(SubmitRequest.parse({ name: entityName(typed), color: "#fe7446", country: "in", lifetimeSec: 300 }).name, entityName(typed), "What the phone shows is what the writer stores.");
  }
});

test("the chain's deadline decides whether a written entity has no expiration", () => {
  assert.equal(writtenWithoutExpiry(NO_EXPIRY_BLOCK.toString(), undefined), true);
  assert.equal(writtenWithoutExpiry("18446744073709551615", false), true);
  assert.equal(writtenWithoutExpiry("250", true), false, "A real deadline counts down, whatever was asked.");
  assert.equal(writtenWithoutExpiry(undefined, true), true);
  assert.equal(writtenWithoutExpiry(undefined, undefined), false);
  assert.equal(writtenWithoutExpiry("0x10", true), true, "A value that is not a block number falls back to the request.");
});
