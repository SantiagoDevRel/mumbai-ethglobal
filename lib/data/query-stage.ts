import type { ChainFilters, QueryRun } from "../../shared/types.ts";

interface StageReader { query(filters: ChainFilters): Promise<QueryRun> }

/** Seed businesses have no session. Keep the audience session scoped and disclose the merge. */
export async function queryStage(adapter: StageReader, filters: ChainFilters): Promise<QueryRun> {
  if (!filters.session || !filters.kinds.includes("business")) return adapter.query(filters);
  const started = performance.now();
  const [audience, businesses] = await Promise.all([
    adapter.query(filters),
    adapter.query({ ...filters, kinds: ["business"], session: undefined }),
  ]);
  if (audience.block !== businesses.block) throw new Error("The DB-Chain advanced between queries. Waiting for a consistent snapshot.");
  const seeded = businesses.entities.filter((entity) => entity.attrs.kind === "business" && !entity.attrs.session);
  const unique = new Map([...audience.entities, ...seeded].map((entity) => [entity.key, entity]));
  return {
    entities: [...unique.values()], block: audience.block, rows: audience.rows + businesses.rows,
    pages: audience.pages + businesses.pages, latencyMs: performance.now() - started, ranAt: Date.now(),
    description: { code: `// Audience session\n${audience.description.code}\n\n// Seed businesses\n${businesses.description.code}`,
      query: `Audience session:\n${audience.description.query}\n\nSeed businesses:\n${businesses.description.query}`,
      appSide: ["Combine the session query with session-free seed businesses; exclude businesses from other sessions; deduplicate by entity key"] },
  };
}
