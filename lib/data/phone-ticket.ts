/** Until its block is in, a ticket is asked about every ~1.2 s, backing off on errors. */
export function ticketPollDelay(failures: number, random = Math.random()): number {
  return Math.round(Math.min(60000, 1200 * 2 ** Math.min(failures, 6)) * (0.9 + random * 0.2));
}

/** Phone copy is chosen by a documented error code, never a backend/SDK error message. */
export function phoneWriteMessage(code?: string): string {
  const messages: Record<string, string> = {
    invalid: "Check your name, country, color and lifetime, then try again.",
    bad_session: "The map was reset. Try again.",
    doors_closed: "Writing is paused. Try again in a moment.",
    name_blocked: "Try another name.",
    device_live: "You already have a live entity.",
    device_limit: "You’ve reached the limit for this session.",
    map_full: "The map is full!",
    network_not_configured: "Network not configured",
  };
  return code && Object.hasOwn(messages, code) ? messages[code]! : "Reconnecting…";
}
