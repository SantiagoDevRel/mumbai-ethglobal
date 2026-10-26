import { test } from "node:test";
import assert from "node:assert/strict";
import { phoneWriteMessage } from "../lib/data/phone-ticket.ts";

test("phone errors use fixed copy instead of server, RPC or SDK details", () => {
  assert.equal(phoneWriteMessage("internal"), "Something went wrong. Try again.");
  assert.equal(phoneWriteMessage("viem@2.57.11 RPC429"), "Something went wrong. Try again.");
  assert.equal(phoneWriteMessage("name_blocked"), "Try another name.");
  assert.equal(phoneWriteMessage("__proto__"), "Something went wrong. Try again.");
});
