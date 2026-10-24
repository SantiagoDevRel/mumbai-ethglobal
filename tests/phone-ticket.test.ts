import { test } from "node:test";
import assert from "node:assert/strict";
import type { TicketResponse } from "../shared/writer-api.ts";
import { advanceTicketClock, phoneWriteMessage, ticketPollDelay, ticketSeconds } from "../lib/data/phone-ticket.ts";

const ticket = (currentBlock?: string, expiresAtBlock = "130"): TicketResponse => ({ ticket: "fixture", status: "written", block: "100", expiresAtBlock, currentBlock, live: true, lat: 19, lng: 72 });
test("ticket clocks start with authoritative blocks and measure seconds without an assumed rate", () => {
  assert.equal(advanceTicketClock(ticket(), null, 0), null);
  const first = advanceTicketClock(ticket("110"), null, 1000)!;
  assert.equal(ticketSeconds(first, 1000), null);
  const second = advanceTicketClock(ticket("113"), first, 7000)!;
  assert.equal(second.blockTimeMs, 2000);
  assert.equal(ticketSeconds(second, 7000), 34);
  assert.equal(ticketSeconds(second, 8000), 33);
  assert.equal(ticketSeconds(second, 70000), 32, "A stale clock advances at most one block, retaining the last reading.");
  assert.deepEqual(advanceTicketClock(ticket("112"), second, 9000), second);
  assert.deepEqual(advanceTicketClock(ticket("113"), second, 9000), second, "Repeated blocks do not reset the measured anchor.");
  const extension = advanceTicketClock(ticket("116", "730"), second, 13000)!;
  assert.equal(extension.expiresAt, 730n);
  assert.equal(ticketSeconds(extension, 13000), 1228);
  assert.equal(ticketSeconds(advanceTicketClock(ticket("730", "730"), extension, 14000), 14000), 0);
  assert.throws(() => advanceTicketClock(ticket("bad"), second, 14000));
});
test("written polling is jittered around5s, backs off on errors, and resets on success", () => {
  assert.equal(ticketPollDelay(false, 0, 0.5), 1200);
  assert.equal(ticketPollDelay(true, 0, 0.5), 5000);
  assert.equal(ticketPollDelay(true, 0, 0), 4500);
  assert.equal(ticketPollDelay(true, 0, 1), 5500);
  assert.equal(ticketPollDelay(true, 1, 0.5), 10000);
  assert.equal(ticketPollDelay(true, 2, 0.5), 20000);
  assert.equal(ticketPollDelay(true, 100, 0.5), 60000);
  assert.equal(ticketPollDelay(true, 0, 0.5), 5000);
});
test("clock measurements average across samples instead of swinging with each poll's block count", () => {
  const first = advanceTicketClock(ticket("110"), null, 0)!;
  const second = advanceTicketClock(ticket("112"), first, 5000)!;
  const third = advanceTicketClock(ticket("115"), second, 10000)!;
  assert.equal(second.blockTimeMs, 2500);
  assert.equal(third.blockTimeMs, 2000);
});
test("phone errors use fixed copy instead of server, RPC or SDK details", () => {
  assert.equal(phoneWriteMessage("internal"), "Reconnecting…");
  assert.equal(phoneWriteMessage("viem@2.57.11 RPC429"), "Reconnecting…");
  assert.equal(phoneWriteMessage("name_blocked"), "Try another name.");
  assert.equal(phoneWriteMessage("__proto__"), "Reconnecting…");
});
