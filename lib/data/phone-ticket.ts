/** Phone copy is chosen by a documented error code, never a backend/SDK error message. */
export function phoneWriteMessage(code?: string): string {
  const messages: Record<string, string> = {
    invalid: "Check your name, country, color and lifetime, then try again.",
    bad_session: "The map was reset. Try again.",
    doors_closed: "Not open yet. Try again in a moment.",
    name_blocked: "Try another name.",
    device_live: "Your last entity is still on its way. Try again in a moment.",
    device_limit: "You’ve reached the limit for this session.",
    map_full: "The map is full!",
    network_not_configured: "Network not configured",
  };
  return code && Object.hasOwn(messages, code) ? messages[code]! : "Something went wrong. Try again.";
}
