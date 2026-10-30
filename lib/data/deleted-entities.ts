// Entities deleted from the entity card, kept for the page's life (a handful). The leading /map
// records them and shares them with the other windows of this browser (a second /map that follows
// it), so none of them ever calls a deleted dot "expired". The query stays the authority for what the
// map draws. This only tells the event log why a dot left ("deleted", never "expired"), keeps it out
// of the expired memory and keeps Extend from targeting it before the next query lands.

import type { Hex, LiveEntity } from "../../shared/types.ts";

export interface Deletion {
  /** The entity as the card showed it, for the event log row. */
  entity: LiveEntity;
  /** Block of the delete's receipt. */
  block: bigint;
}

/** `channel`: the BroadcastChannel name the windows share their deletions on (none: this window only). */
export function createDeletions(channel?: string) {
  const blocks = new Map<string, bigint>();
  const listeners = new Set<(deletion: Deletion) => void>();
  const peers = channel && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channel) : null;
  const keep = ({ entity, block }: Deletion): boolean => {
    if (blocks.has(entity.key)) return false;
    blocks.set(entity.key, block);
    for (const listener of listeners) listener({ entity, block });
    return true;
  };
  if (peers) peers.onmessage = (event: MessageEvent) => {
    const data = event.data as Partial<Deletion> | null;
    if (data?.entity && typeof data.entity.key === "string" && typeof data.block === "bigint") keep({ entity: data.entity, block: data.block });
  };
  return {
    record(entity: LiveEntity, block: bigint): void {
      if (!keep({ entity, block })) return;
      // Best effort: this window's log is right either way.
      try { peers?.postMessage({ entity, block }); } catch { /* not cloneable: other windows rely on their queries */ }
    },
    has: (key: Hex): boolean => blocks.has(key),
    /** Key → block of its delete (for diffEntities and rememberExpired). */
    blocks: (): ReadonlyMap<string, bigint> => blocks,
    subscribe(listener: (deletion: Deletion) => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Stops hearing the other windows (tests; a page keeps it for its life). */
    close(): void { peers?.close(); },
  };
}

export type Deletions = ReturnType<typeof createDeletions>;

/** This browser's deletions: the leading /map records them, every window's live data reads them. */
export const deletions = createDeletions(typeof window === "undefined" ? undefined : "arkiv-mumbai-deleted");
