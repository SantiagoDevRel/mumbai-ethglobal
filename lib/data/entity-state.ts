import { hasNoExpiry, type BlockInfo, type LiveEntity, type QueryRun, type StageEvent } from "../../shared/types.ts";

export interface VisualStageEvent extends StageEvent {
  color?: string;
  country?: string;
  lifetimeBlocks: bigint;
  /** Written with no expiration (`$expiresAt` = 2**64 - 1): the event log says so instead of a lifetime. */
  noExpiry: boolean;
}

/** Interpolation is visual only. The query remains the authority for disappearance. An entity with
 * no expiration never runs out: Infinity, so nothing draws a countdown for it. */
export function remainingSeconds(entity: LiveEntity, block: BlockInfo | null, now: number): number {
  if (hasNoExpiry(entity.expiresAtBlock)) return Infinity;
  if (!block || block.blockTimeMs <= 0) return 0;
  const elapsed = Math.max(0, Math.min(now - block.timestampMs, block.blockTimeMs));
  return Math.max(0, (Number(entity.expiresAtBlock - block.number) * block.blockTimeMs - elapsed) / 1000);
}

export function diffEntities(previous: LiveEntity[], run: QueryRun, sameQuery: boolean): VisualStageEvent[] {
  const before = new Map(previous.map((entity) => [entity.key, entity]));
  const after = new Set(run.entities.map((entity) => entity.key));
  const events: VisualStageEvent[] = [];
  function add(entity: LiveEntity, type: StageEvent["type"], detail: string) {
    events.push({ id: `${run.block}:${entity.key}:${type}`, type, key: entity.key,
      name: "name" in entity.attrs ? entity.attrs.name : "Review", detail, block: run.block, at: run.ranAt,
      color: "color" in entity.attrs ? entity.attrs.color : undefined,
      country: "country" in entity.attrs ? entity.attrs.country : undefined,
      lifetimeBlocks: entity.expiresAtBlock - entity.createdAtBlock,
      noExpiry: hasNoExpiry(entity.expiresAtBlock) });
  }
  for (const entity of run.entities) {
    const old = before.get(entity.key);
    if (!old) {
      if (sameQuery || entity.createdAtBlock === run.block) add(entity, "created", "country" in entity.attrs ? entity.attrs.country ?? "" : "");
    } else {
      if (entity.expiresAtBlock > old.expiresAtBlock) add(entity, "extended", "Lifetime Extension");
      if (JSON.stringify(entity.attrs) !== JSON.stringify(old.attrs)) add(entity, "patched", "Attributes updated");
    }
  }
  if (sameQuery) for (const entity of previous) {
    if (!after.has(entity.key) && entity.expiresAtBlock <= run.block) {
      add(entity, "expired", `expired at block #${entity.expiresAtBlock}`);
      events[events.length - 1]!.block = entity.expiresAtBlock;
    }
  }
  return events;
}

/** Mock adapters may mutate their entities; keep a detached previous query for diffing. */
export function snapshotEntities(entities: LiveEntity[]): LiveEntity[] {
  return entities.map((entity) => ({ ...entity, attrs: { ...entity.attrs }, raw: entity.raw.map((attr) => ({ ...attr })) }));
}

/**
 * Dots this screen has seen that are past their expiration and gone from the query. App-side
 * memory: the DB-Chain no longer has them, so the map draws them grey and never selects them.
 * `seen` keeps the latest copy of every dot, so an extension seen in time keeps it alive. A dot with
 * no expiration is never past its deadline (no block reaches 2**64 - 1), so it is never remembered.
 */
export function rememberExpired(seen: Map<string, LiveEntity>, run: QueryRun): LiveEntity[] {
  const live = new Set(run.entities.map((entity) => entity.key));
  for (const entity of run.entities) if (entity.attrs.kind === "dot") seen.set(entity.key, entity);
  return [...seen.values()].filter((entity) => !live.has(entity.key) && entity.expiresAtBlock <= run.block);
}
