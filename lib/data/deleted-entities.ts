// Entities this window deleted from the entity card, kept for the page's life (a handful). The query
// stays the authority for what the map draws. This only tells the event log why a dot left
// ("deleted", never "expired") and keeps Extend from targeting it before the next query lands.

import type { Hex, LiveEntity } from "../../shared/types.ts";

export interface Deletion {
  /** The entity as the card showed it, for the event log row. */
  entity: LiveEntity;
  /** Block of the delete's receipt. */
  block: bigint;
}

export function createDeletions() {
  const blocks = new Map<string, bigint>();
  const listeners = new Set<(deletion: Deletion) => void>();
  return {
    record(entity: LiveEntity, block: bigint): void {
      if (blocks.has(entity.key)) return;
      blocks.set(entity.key, block);
      for (const listener of listeners) listener({ entity, block });
    },
    has: (key: Hex): boolean => blocks.has(key),
    /** Key → block of its delete (for diffEntities and rememberExpired). */
    blocks: (): ReadonlyMap<string, bigint> => blocks,
    subscribe(listener: (deletion: Deletion) => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export type Deletions = ReturnType<typeof createDeletions>;

/** This window's deletions: the leader /map records them, its live data reads them. */
export const deletions = createDeletions();
