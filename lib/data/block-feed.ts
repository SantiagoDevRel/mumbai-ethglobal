import type { BlockInfo } from "../../shared/types";

let block: BlockInfo | null = null;
const listeners = new Set<() => void>();
export const blockFeed = {
  get: () => block,
  server: () => null,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  publish(next: BlockInfo | null) { block = next; for (const listener of listeners) listener(); },
};
