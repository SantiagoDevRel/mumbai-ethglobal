import { test } from "node:test";
import assert from "node:assert/strict";
import { phoneWriteMessage, ticketPollDelay } from "../lib/data/phone-ticket.ts";

test("a queued ticket is asked about every ~1.2 s with jitter, backing off on errors", () => {
  assert.equal(ticketPollDelay(0, 0.5), 1200);
  assert.equal(ticketPollDelay(0, 0), 1080);
  assert.equal(ticketPollDelay(0, 1), 1320);
  assert.equal(ticketPollDelay(1, 0.5), 2400);
  assert.equal(ticketPollDelay(2, 0.5), 4800);
  assert.equal(ticketPollDelay(100, 0.5), 60000);
});
test("phone errors use fixed copy instead of server, RPC or SDK details", () => {
  assert.equal(phoneWriteMessage("internal"), "Reconnecting…");
  assert.equal(phoneWriteMessage("viem@2.57.11 RPC429"), "Reconnecting…");
  assert.equal(phoneWriteMessage("name_blocked"), "Try another name.");
  assert.equal(phoneWriteMessage("__proto__"), "Reconnecting…");
});
