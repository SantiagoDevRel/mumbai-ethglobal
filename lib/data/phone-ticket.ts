import { hasNoExpiry, NAME_MAX_CHARS } from "../../shared/types";

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

/** The name field as the phone keeps it: lower case as you type or paste, the same `toLowerCase()`
 * the writer applies (Arkiv compares strings exactly). A letter that grows when lowercased (İ) never
 * pushes the name past NAME_MAX_CHARS: whole characters come off the end instead. */
export function entityName(typed: string): string {
  let name = typed.toLowerCase();
  while (name.length > NAME_MAX_CHARS) name = Array.from(name).slice(0, -1).join("");
  return name;
}

/** Whether a written entity has no expiration. The writer's `expiresAtBlock` (the chain's own
 * deadline) decides when it is there; otherwise what the phone asked for. */
export function writtenWithoutExpiry(expiresAtBlock: string | undefined, requested: boolean | undefined): boolean {
  if (expiresAtBlock !== undefined && /^\d+$/.test(expiresAtBlock)) return hasNoExpiry(BigInt(expiresAtBlock));
  return requested === true;
}
