import { i32, key as entityKey, u64, type AttributeInputs } from "@arkiv-network/sdk/attr";
import { ExpirationTime } from "@arkiv-network/sdk/utils";
import { eq, gte, lte, or, startsWith } from "@arkiv-network/sdk/query";
import type { Entity } from "@arkiv-network/sdk/types";
import type { AdapterOptions, ArkivAdapter, BusinessCreate, DotCreate, PatchFields, ReviewCreate } from "./adapter.ts";
import { NOTHING_TO_EXTEND, WriteNotSentError } from "./adapter.ts";
import { createSdkClients } from "./clients-0.8.ts";
import { decodeCoord, decodeRating, encodeCoord, encodeRating } from "../encoding.ts";
import { countryName } from "../geo/country-name.ts";
import { APP_ID, hasNoExpiry, type BlockInfo, type ChainFilters, type EntityAttrs, type Hex, type LiveEntity, type QueryDescription, type WriteResult } from "../types.ts";

export const LIVE_SELECTION = { key: true, owner: true, creator: true, createdAt: true, updatedAt: true, expiresAt: true, attributes: true } as const;

function isUserRejection(error: unknown): boolean {
  let cause = error;
  for (let depth = 0; depth < 12 && cause && typeof cause === "object"; depth++) {
    if ("code" in cause && cause.code === 4001) return true;
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return false;
}

export function encodedFields(fields: Record<string, unknown>): AttributeInputs {
  const result: Record<string, AttributeInputs[string]> = {};
  for (const [name, value] of Object.entries(fields)) {
    // How long an entity lives is the create's `expires`, never an attribute.
    if (value === undefined || name === "lifetimeSec" || name === "noExpiry") continue;
    if (name === "photo" && (typeof value !== "string" || !/^(?:0x)?[a-f0-9]{64}$/i.test(value))) throw new Error("Photo must be a plain Swarm reference.");
    if (name === "lat" || name === "lng") result[name] = i32(encodeCoord(value as number));
    else if (name === "rating") result[name] = i32(encodeRating(value as number));
    else if (name === "business") result[name] = entityKey(value as Hex);
    else if (typeof value === "number") result[name] = i32(value);
    else if (typeof value === "string") result[name] = value;
    else throw new Error(`Invalid attribute ${name}.`);
  }
  return result;
}

/** On-screen text (L7) of `extend` below, for `addSeconds`. Change the two together. */
export function describeExtend(addSeconds: number): { code: string } {
  // Whole minutes read as minutes on screen (20 * 60_000); the value is the same addSeconds * 1000.
  const ms = addSeconds % 60 === 0 ? `${addSeconds / 60} * 60_000` : `${addSeconds * 1000}`;
  return { code: [
    `const extraBlocks = BigInt(Math.ceil(${ms} / blockTimeMs))`,
    `const entities = await Promise.all(`,
    `  keys.map((key) => reader.getEntity(key)))`,
    `// No expiration ($expiresAt = 2n ** 64n - 1n): nothing to extend`,
    `const expiring = entities.filter((entity) => entity.expiresAt !== 2n ** 64n - 1n)`,
    `await writer.executeBatch({ extensions: expiring.map((entity) => ({`,
    `  entityKey: entity.key,`,
    `  expires: ExpirationTime.atBlock(entity.expiresAt + extraBlocks),`,
    `})) })`,
  ].join("\n") };
}

/** The extensions `extend` sends: each deadline `extraBlocks` later. An entity with no expiration is
 * skipped: it already sits at NO_EXPIRY_BLOCK, the largest block a u64 holds, so `atBlock(expiresAt + n)`
 * would not fit (the SDK refuses it at send). When that leaves nothing, nothing is signed or sent. */
export function extensionsFor(entities: readonly { key: Hex; expiresAt: bigint }[], extraBlocks: bigint) {
  const extensions = entities.filter(entity => !hasNoExpiry(entity.expiresAt))
    .map(entity => ({ entityKey: entity.key, expires: ExpirationTime.atBlock(entity.expiresAt + extraBlocks) }));
  if (!extensions.length) throw new WriteNotSentError(NOTHING_TO_EXTEND);
  return extensions;
}

/** "No expiration" is `ExpirationTime.permanent()`: `$expiresAt` becomes NO_EXPIRY_BLOCK, 2**64 - 1.
 * The country is stored by its full name ("india"), not the code the writer placed it with. */
export function dotToCreate(dot: DotCreate) {
  return {
    attributes: { app: APP_ID, kind: "dot", ...encodedFields(dot as unknown as Record<string, unknown>), country: countryName(dot.country) },
    payload: new Uint8Array(), contentType: "application/octet-stream",
    flags: { permissionlessExtension: true },
    expires: dot.noExpiry ? ExpirationTime.permanent() : ExpirationTime.fromSeconds(dot.lifetimeSec),
  };
}

export function decodeLiveEntity<T extends EntityAttrs = EntityAttrs>(entity: Pick<Entity, "key" | "owner" | "creator" | "createdAt" | "updatedAt" | "expiresAt" | "attributes">): LiveEntity<T> {
  if (!entity.key || !entity.owner || !entity.creator || entity.createdAt === undefined || entity.expiresAt === undefined || !entity.attributes) throw new Error("Incomplete entity projection.");
  const attrs: Record<string, unknown> = {};
  const raw = Object.entries(entity.attributes).map(([name, value]) => {
    attrs[name] = name === "lat" || name === "lng" ? decodeCoord(Number(value.value))
      : name === "rating" ? decodeRating(Number(value.value)) : value.value;
    return { name, type: value.type, stored: String(value.value) };
  });
  if (attrs.app !== APP_ID || !["dot", "business", "review"].includes(String(attrs.kind))) throw new Error("Entity is outside the workshop model.");
  delete attrs.app;
  return { key: entity.key, owner: entity.owner, creator: entity.creator, createdAtBlock: entity.createdAt,
    updatedAtBlock: entity.updatedAt, expiresAtBlock: entity.expiresAt, attrs: attrs as unknown as T, raw };
}

/** Live SDK implementation shared by workerd, Node and the browser. */
export function createArkivAdapter(options: AdapterOptions): ArkivAdapter {
  const { reader, writer, checkNetwork } = createSdkClients(options);
  let head: BlockInfo | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  let uncertain = false;

  async function getBlock(): Promise<BlockInfo> {
    await checkNetwork();
    const [block, timing] = await Promise.all([reader.getBlock(), reader.getBlockTiming()]);
    if (!Number.isFinite(timing.blockDuration) || timing.blockDuration <= 0) throw new Error("Block timing unavailable.");
    head = { number: block.number, timestampMs: Number(block.timestamp) * 1000, blockTimeMs: timing.blockDuration * 1000 };
    return head;
  }

  function build(filters: ChainFilters) {
    const builder = reader.select(LIVE_SELECTION).createdBy(options.creator).where(eq("app", APP_ID));
    const code = ["reader.select({ key: true, owner: true, creator: true, createdAt: true, updatedAt: true, expiresAt: true, attributes: true })",
      `  .createdBy(${JSON.stringify(options.creator)})`, `  .where(eq("app", ${JSON.stringify(APP_ID)}))`];
    function where(expression: Parameters<typeof builder.where>[0], text: string) {
      builder.where(expression);
      code.push(`  .where(${text})`);
    }
    if (filters.kinds.length) {
      const expressions = filters.kinds.map(kind => eq("kind", kind));
      const texts = filters.kinds.map(kind => `eq("kind", ${JSON.stringify(kind)})`);
      where(expressions.length === 1 ? expressions[0]! : or(expressions), texts.length === 1 ? texts[0]! : `or(${texts.join(", ")})`);
    } else {
      where(eq("kind", "__none__"), 'eq("kind", "__none__")');
    }
    for (const name of ["session", "color", "country", "category"] as const) {
      if (filters[name] === undefined) continue;
      // A country filter holds the app's code; entities store the country's name.
      const value = name === "country" ? countryName(filters[name]!) : filters[name]!;
      where(eq(name, value), `eq(${JSON.stringify(name)}, ${JSON.stringify(value)})`);
    }
    if (filters.namePrefix) where(startsWith("name", filters.namePrefix), `startsWith("name", ${JSON.stringify(filters.namePrefix)})`);
    if (filters.owner) { builder.ownedBy(filters.owner); code.push(`  .ownedBy(${JSON.stringify(filters.owner)})`); }
    if (filters.business) where(eq("business", entityKey(filters.business)), `eq("business", key(${JSON.stringify(filters.business)}))`);
    if (filters.minRating !== undefined) where(gte("rating", i32(encodeRating(filters.minRating))), `gte("rating", i32(${encodeRating(filters.minRating)}))`);
    if (filters.viewport) {
      const { minLat, maxLat, minLng, maxLng } = filters.viewport;
      where(gte("lat", i32(encodeCoord(minLat))), `gte("lat", i32(${encodeCoord(minLat)}))`);
      where(lte("lat", i32(encodeCoord(maxLat))), `lte("lat", i32(${encodeCoord(maxLat)}))`);
      // A viewport crossing the antimeridian is two longitude ranges.
      const low = gte("lng", i32(encodeCoord(minLng)));
      const high = lte("lng", i32(encodeCoord(maxLng)));
      if (minLng > maxLng) where(or(low, high), `or(gte("lng", i32(${encodeCoord(minLng)})), lte("lng", i32(${encodeCoord(maxLng)})))`);
      else {
        where(low, `gte("lng", i32(${encodeCoord(minLng)}))`);
        where(high, `lte("lng", i32(${encodeCoord(maxLng)}))`);
      }
    }
    if (filters.expiringWithinSec !== undefined) {
      if (!head) throw new Error("Read the current block before describing an expiry filter.");
      const deadline = head.number + BigInt(Math.ceil(filters.expiringWithinSec * 1000 / head.blockTimeMs));
      where(lte("$expiresAt", u64(deadline)), `lte("$expiresAt", u64(${deadline}n))`);
    }
    builder.limit(200);
    code.push("  .limit(200)", "  .fetch();", "// Collect every page: page = await page.next().");
    return { builder, description: { code: `let page = await ${code.join("\n")}`, query: builder.toString(), appSide: [] } satisfies QueryDescription };
  }

  function requireWriter() {
    if (!writer) throw new Error("A wallet is required to write Arkiv entities.");
    return writer;
  }
  function serializeWrite(work: () => Promise<WriteResult>): Promise<WriteResult> {
    const next = writes.then(async () => {
      if (uncertain) throw new Error("Previous write needs reconciliation before another write.");
      await checkNetwork();
      try { return await work(); }
      catch (error) {
        // Refused before signing: nothing reached the chain, so nothing needs reconciling.
        if (error instanceof WriteNotSentError) throw error;
        uncertain = !isUserRejection(error);
        // A canonical revert proves the operations did not apply. A new explicit
        // action may proceed; an uncertain or successful-but-undecoded write may not.
        if (uncertain && error && typeof error === "object" && "txHash" in error && typeof error.txHash === "string") {
          try { uncertain = (await reader.getTransactionReceipt({ hash: error.txHash as Hex })).status !== "reverted"; }
          catch { /* Preserve the uncertainty barrier. */ }
        }
        throw error;
      }
    });
    writes = next.catch(() => undefined);
    return next;
  }
  async function finish(txHash: Hex, keys: Hex[]): Promise<WriteResult> {
    const receipt = await reader.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") throw new Error("Transaction reverted.");
    return { txHash, block: receipt.blockNumber, keys };
  }
  const create = (kind: "business" | "review", items: (BusinessCreate | ReviewCreate)[]) => serializeWrite(async () => {
    if (!items.length) throw new Error("No entities to create.");
    const result = await requireWriter().executeBatch({ creates: items.map(item => ({
      attributes: { app: APP_ID, kind, ...encodedFields(item as unknown as Record<string, unknown>) },
      payload: new Uint8Array(), contentType: "application/octet-stream",
      flags: { permissionlessExtension: true }, expires: ExpirationTime.fromSeconds(item.lifetimeSec),
    })) });
    return finish(result.txHash, result.createdEntities);
  });

  return {
    profile: options.profile, creator: options.creator, getBlock,
    describe: filters => build(filters).description,
    async query<T extends EntityAttrs = EntityAttrs>(filters: ChainFilters) {
      const started = performance.now();
      await checkNetwork();
      if (filters.expiringWithinSec !== undefined) await getBlock();
      const { builder, description } = build(filters);
      let page = await builder.fetch();
      const block = page.blockNumber;
      const entities: LiveEntity<T>[] = [];
      let pages = 0;
      for (;;) {
        if (page.blockNumber !== block) throw new Error("Query snapshot changed between pages.");
        pages++;
        entities.push(...page.entities.map(entity => decodeLiveEntity<T>(entity)));
        if (!page.hasNextPage()) break;
        page = await page.next();
      }
      return { entities, description, block, rows: entities.length, pages, latencyMs: performance.now() - started, ranAt: Date.now() };
    },
    createDots: dots => serializeWrite(async () => {
      if (!dots.length) throw new Error("No entities to create.");
      const result = await requireWriter().executeBatch({ creates: dots.map(dotToCreate) });
      return finish(result.txHash, result.createdEntities);
    }),
    createBusinesses: items => create("business", items),
    createReviews: items => create("review", items),
    extend: (keys, addSeconds) => serializeWrite(async () => {
      if (!keys.length || !Number.isFinite(addSeconds) || addSeconds <= 0 || new Set(keys).size !== keys.length) throw new Error("Invalid Lifetime Extension.");
      const block = await getBlock();
      const extraBlocks = BigInt(Math.ceil(addSeconds * 1000 / block.blockTimeMs));
      const extensions = extensionsFor(await Promise.all(keys.map(key => reader.getEntity(key))), extraBlocks);
      const result = await requireWriter().executeBatch({ extensions });
      return finish(result.txHash, extensions.map(extension => extension.entityKey));
    }),
    patch: (key: Hex, fields: PatchFields, _current: EntityAttrs) => serializeWrite(async () => {
      const result = await requireWriter().patchEntity({ entityKey: key, set: encodedFields(fields as Record<string, unknown>) });
      return finish(result.txHash, [key]);
    }),
    changeOwner: (key, newOwner) => serializeWrite(async () => {
      const result = await requireWriter().changeOwnership({ entityKey: key, newOwner });
      return finish(result.txHash, [key]);
    }),
    deleteEntity: key => serializeWrite(async () => {
      const result = await requireWriter().deleteEntity({ entityKey: key });
      return finish(result.txHash, [key]);
    }),
  };
}
