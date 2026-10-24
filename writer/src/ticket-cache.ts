import type { TicketResponse } from "../../shared/writer-api.ts";

export interface SessionSnapshot {
  block: string;
  fetchedAt: number;
  liveKeys: string[];
  /** Retain last observed expirations after removal, including extensions. */
  expirations: Record<string, string>;
}
interface Entry { snapshot?: SessionSnapshot; pending?: Promise<SessionSnapshot>; retryAt: number; error?: unknown }
export class TicketReadUnavailable extends Error {}

/** One in-flight session query and a shared two-second refresh/error window. */
export class TicketCache {
  private entries = new Map<string, Entry>();
  private readonly storage: { get<T>(key: string): Promise<T | undefined>; put<T>(key: string, value: T): Promise<void> };
  private readonly fetchSession: (session: string) => Promise<{ block: bigint; entities: readonly { key: string; expiresAt: bigint }[] }>;
  private readonly now: () => number;
  constructor(
    storage: TicketCache["storage"], fetchSession: TicketCache["fetchSession"], now: () => number = Date.now,
  ) { this.storage = storage; this.fetchSession = fetchSession; this.now = now; }

  async read(session: string): Promise<SessionSnapshot> {
    let entry = this.entries.get(session);
    if (!entry) {
      if (this.entries.size >= 8) {
        const idle = [...this.entries].find(([, value]) => !value.pending);
        if (!idle) throw new TicketReadUnavailable("Session reads are busy.");
        this.entries.delete(idle[0]);
      }
      entry = { retryAt: 0 };
      this.entries.set(session, entry);
    }
    // LRU order is independent of concurrent refresh ownership.
    this.entries.delete(session); this.entries.set(session, entry);
    if (entry.pending) return entry.pending;
    if (entry.error && this.now() < entry.retryAt) throw entry.error;
    if (entry.snapshot && this.now() - entry.snapshot.fetchedAt < 2000) return entry.snapshot;
    const current = entry;
    current.pending = (async () => {
      try {
        current.snapshot ??= await this.storage.get<SessionSnapshot>(`session-read:${session}`);
        if (current.snapshot && this.now() - current.snapshot.fetchedAt < 2000) return current.snapshot;
        const result = await this.fetchSession(session);
        const expirations = { ...current.snapshot?.expirations };
        for (const entity of result.entities) expirations[entity.key.toLowerCase()] = String(entity.expiresAt);
        const snapshot: SessionSnapshot = { block: String(result.block), fetchedAt: this.now(),
          liveKeys: result.entities.map(entity => entity.key.toLowerCase()), expirations };
        // Persist before serving: eviction must not lose an observed extension.
        await this.storage.put(`session-read:${session}`, snapshot);
        current.snapshot = snapshot; current.error = undefined;
        return snapshot;
      } catch (error) {
        current.error = error; current.retryAt = this.now() + 2000;
        // An upstream failure is never reported to the phone as expiration.
        throw error;
      } finally { current.pending = undefined; }
    })();
    return current.pending;
  }
}

export function countdownTicket(ticket: TicketResponse, snapshot: SessionSnapshot): TicketResponse {
  const key = ticket.entityKey!.toLowerCase();
  const block = BigInt(snapshot.block), included = BigInt(ticket.block!);
  // A create receipt newer than the shared snapshot proves this new entity is
  // live. Do not mislabel it absent while waiting for the next session refresh.
  return { ...ticket, currentBlock: String(block < included ? included : block),
    expiresAtBlock: snapshot.expirations[key] ?? ticket.expiresAtBlock,
    live: block < included || snapshot.liveKeys.includes(key) };
}
