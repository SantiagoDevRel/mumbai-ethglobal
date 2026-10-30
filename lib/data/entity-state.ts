import { hasNoExpiry, type BlockInfo, type LiveEntity, type QueryRun, type StageEvent } from "../../shared/types.ts";

export interface VisualStageEvent extends StageEvent {
  color?: string;
  country?: string;
  lifetimeBlocks: bigint;
  /** Written with no expiration (`$expiresAt` = 2**64 - 1): the event log says so instead of a lifetime. */
  noExpiry: boolean;
}

/** Keys this window deleted from the entity card, each with the block of its delete (deleted-entities.ts). */
export type DeletedKeys = ReadonlyMap<string, bigint>;
const NONE: DeletedKeys = new Map();

/** Interpolation is visual only. The query remains the authority for disappearance. An entity with
 * no expiration never runs out: Infinity, so nothing draws a countdown for it. */
export function remainingSeconds(entity: LiveEntity, block: BlockInfo | null, now: number): number {
  if (hasNoExpiry(entity.expiresAtBlock)) return Infinity;
  if (!block || block.blockTimeMs <= 0) return 0;
  const elapsed = Math.max(0, Math.min(now - block.timestampMs, block.blockTimeMs));
  return Math.max(0, (Number(entity.expiresAtBlock - block.number) * block.blockTimeMs - elapsed) / 1000);
}

/** One event log row about `entity` at `block`. */
function stageEvent(entity: LiveEntity, type: StageEvent["type"], detail: string, block: bigint, at: number): VisualStageEvent {
  return { id: `${block}:${entity.key}:${type}`, type, key: entity.key,
    name: "name" in entity.attrs ? entity.attrs.name : "Review", detail, block, at,
    color: "color" in entity.attrs ? entity.attrs.color : undefined,
    country: "country" in entity.attrs ? entity.attrs.country : undefined,
    lifetimeBlocks: entity.expiresAtBlock - entity.createdAtBlock,
    noExpiry: hasNoExpiry(entity.expiresAtBlock) };
}

/** The log row of an entity deleted from the entity card at `block` (the block of its delete). */
export function deletedEvent(entity: LiveEntity, block: bigint, at: number): VisualStageEvent {
  return stageEvent(entity, "deleted", `deleted at block #${block}`, block, at);
}

/** What changed between two reads. A dot gone from the same query is "expired" only once its
 * deadline has passed; one this window deleted (`deleted`) is "deleted", never "expired". */
export function diffEntities(previous: LiveEntity[], run: QueryRun, sameQuery: boolean, deleted: DeletedKeys = NONE): VisualStageEvent[] {
  const before = new Map(previous.map((entity) => [entity.key, entity]));
  const after = new Set(run.entities.map((entity) => entity.key));
  const events: VisualStageEvent[] = [];
  function add(entity: LiveEntity, type: StageEvent["type"], detail: string) {
    events.push(stageEvent(entity, type, detail, run.block, run.ranAt));
  }
  for (const entity of run.entities) {
    const old = before.get(entity.key);
    if (!old) {
      // A read that lags behind a delete may still return the entity: it is not new.
      if (!deleted.has(entity.key) && (sameQuery || entity.createdAtBlock === run.block)) add(entity, "created", "country" in entity.attrs ? entity.attrs.country ?? "" : "");
    } else {
      if (entity.expiresAtBlock > old.expiresAtBlock) add(entity, "extended", "Lifetime Extension");
      if (JSON.stringify(entity.attrs) !== JSON.stringify(old.attrs)) add(entity, "patched", "Attributes updated");
    }
  }
  for (const entity of previous) {
    if (after.has(entity.key)) continue;
    const deletedAt = deleted.get(entity.key);
    // Filtered out by any query, a deleted entity still left because of its delete.
    if (deletedAt !== undefined) events.push(deletedEvent(entity, deletedAt, run.ranAt));
    else if (sameQuery && entity.expiresAtBlock <= run.block) {
      add(entity, "expired", `expired at block #${entity.expiresAtBlock}`);
      events[events.length - 1]!.block = entity.expiresAtBlock;
    }
  }
  return events;
}

/**
 * The event log with `fresh` rows (in the order diffEntities returns them) added on top, newest
 * first, at most `limit` rows. Each delete is logged once, and it replaces an "expired" row for the
 * same entity: a read can notice the dot gone before the delete's receipt arrives.
 */
export function logEvents(log: readonly VisualStageEvent[], fresh: readonly VisualStageEvent[], limit = 120): VisualStageEvent[] {
  const deleted = new Set(log.filter((event) => event.type === "deleted").map((event) => event.key));
  const added: VisualStageEvent[] = [];
  for (const event of [...fresh].reverse()) {
    if (event.type === "deleted") {
      if (deleted.has(event.key)) continue;
      deleted.add(event.key);
    }
    added.push(event);
  }
  return [...added, ...log].filter((event) => event.type !== "expired" || !deleted.has(event.key)).slice(0, limit);
}

/** Mock adapters may mutate their entities; keep a detached previous query for diffing. */
export function snapshotEntities(entities: LiveEntity[]): LiveEntity[] {
  return entities.map((entity) => ({ ...entity, attrs: { ...entity.attrs }, raw: entity.raw.map((attr) => ({ ...attr })) }));
}

/**
 * Dots this screen has seen that are past their expiration and gone from the query. App-side
 * memory: the DB-Chain no longer has them, so the map draws them grey and never selects them.
 * `seen` keeps the latest copy of every dot, so an extension seen in time keeps it alive. A dot with
 * no expiration is never past its deadline (no block reaches 2**64 - 1), so it is never remembered,
 * and neither is a dot this window deleted (`deleted`): it did not expire.
 */
export function rememberExpired(seen: Map<string, LiveEntity>, run: QueryRun, deleted: DeletedKeys = NONE): LiveEntity[] {
  const live = new Set(run.entities.map((entity) => entity.key));
  for (const key of deleted.keys()) seen.delete(key);
  for (const entity of run.entities) if (entity.attrs.kind === "dot" && !deleted.has(entity.key)) seen.set(entity.key, entity);
  return [...seen.values()].filter((entity) => !live.has(entity.key) && entity.expiresAtBlock <= run.block);
}
