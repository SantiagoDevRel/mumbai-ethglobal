import type { TicketResponse } from "../../shared/writer-api.ts";

export interface TicketClock {
  block: bigint;
  expiresAt: bigint;
  sampledAt: number;
  firstBlock: bigint;
  firstSampledAt: number;
  blockTimeMs: number | null;
}

export function ticketBlock(value: string | undefined): bigint | null {
  if (value === undefined) return null;
  if (!/^\d+$/.test(value)) throw new Error("Invalid ticket block");
  return BigInt(value);
}

/** No assumed block time: the first sample gives blocks; later samples measure seconds. */
export function advanceTicketClock(ticket: TicketResponse, previous: TicketClock | null, now: number): TicketClock | null {
  ticketBlock(ticket.block);
  const block = ticketBlock(ticket.currentBlock), expiresAt = ticketBlock(ticket.expiresAtBlock);
  if (block === null || expiresAt === null) return previous;
  if (previous && block < previous.block) return previous;
  if (previous && block === previous.block) return { ...previous, expiresAt };
  const firstBlock = previous?.firstBlock ?? block, firstSampledAt = previous?.firstSampledAt ?? now;
  const measured = block > firstBlock && now > firstSampledAt ? (now - firstSampledAt) / Number(block - firstBlock) : null;
  return { block, expiresAt, sampledAt: now, firstBlock, firstSampledAt, blockTimeMs: measured ?? previous?.blockTimeMs ?? null };
}

/** Interpolate at most one measured block; only the Worker's live=false confirms expiration. */
export function ticketSeconds(clock: TicketClock | null, now: number): number | null {
  if (!clock?.blockTimeMs) return null;
  const elapsed = Math.max(0, Math.min(now - clock.sampledAt, clock.blockTimeMs));
  return Math.max(0, (Number(clock.expiresAt - clock.block) * clock.blockTimeMs - elapsed) / 1000);
}

export function ticketPollDelay(written: boolean, failures: number, random = Math.random()): number {
  const base = written ? 5000 : 1200;
  return Math.round(Math.min(60000, base * 2 ** Math.min(failures, 6)) * (0.9 + random * 0.2));
}

/** Phone copy is chosen by a documented error code, never a backend/SDK error message. */
export function phoneWriteMessage(code?: string): string {
  const messages: Record<string, string> = {
    invalid: "Check your name, country, color and lifetime, then try again.",
    bad_session: "This session has ended. Enter the current code on the screen.",
    doors_closed: "Hang tight. Santiago opens the doors in a moment.",
    name_blocked: "Try another name.",
    device_live: "You already have a live entity.",
    device_limit: "You’ve reached the limit for this session.",
    map_full: "The map is full!",
    network_not_configured: "Network not configured",
  };
  return code && Object.hasOwn(messages, code) ? messages[code]! : "Reconnecting…";
}
