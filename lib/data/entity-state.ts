import type { BlockInfo, LiveEntity, QueryRun, StageEvent } from "../../shared/types.ts";

/** Interpolation is visual only. The query remains the authority for disappearance. */
export function remainingSeconds(entity: LiveEntity, block: BlockInfo | null, now: number): number {
  if (!block || block.blockTimeMs <= 0) return 0;
  const elapsed = Math.max(0, Math.min(now - block.timestampMs, block.blockTimeMs));
  return Math.max(0, (Number(entity.expiresAtBlock - block.number) * block.blockTimeMs - elapsed) / 1000);
}

export function diffEntities(previous: LiveEntity[], run: QueryRun, sameQuery: boolean): StageEvent[] {
  const before = new Map(previous.map((entity) => [entity.key, entity]));
  const after = new Set(run.entities.map((entity) => entity.key));
  const events: StageEvent[] = [];
  function add(entity: LiveEntity, type: StageEvent["type"], detail: string) {
    events.push({ id: `${run.block}:${entity.key}:${type}`, type, key: entity.key,
      name: "name" in entity.attrs ? entity.attrs.name : "Review", detail, block: run.block, at: run.ranAt });
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
