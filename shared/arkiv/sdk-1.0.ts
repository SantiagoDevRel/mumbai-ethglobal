import { defineSchema, ExpirationTime, i32, key as entityKey, str, u64, type Attributes, type CreateEntityValues, type PatchEntityValues } from "@arkiv-network/sdk";
import { asc, eq, gt, gte, lte, or, startsWith, type Expression } from "@arkiv-network/sdk/query";
import type { AdapterOptions, ArkivAdapter, BusinessCreate, DotCreate, PatchFields, ReviewCreate } from "./adapter.ts";
import { NOTHING_TO_EXTEND, WriteNotSentError } from "./adapter.ts";
import { createSdkClients } from "./clients-1.0.ts";
import { decodeCoord, decodeRating, encodeCoord, encodeRating } from "../encoding.ts";
import { countryName } from "../geo/country-name.ts";
import { APP_ID, hasNoExpiry, LONGEST_LIFETIME_BLOCKS, type BlockInfo, type ChainFilters, type EntityAttrs, type Hex, type LiveEntity, type QueryDescription, type WriteResult } from "../types.ts";

export const LIVE_SELECTION = { $key: true, $owner: true, $creator: true, $createdAt: true, $updatedAt: true, $expiresAt: true, $attributes: true } as const;

/** One query page: the most an `arkiv_query` returns. */
const PAGE = 100;

// The workshop's two entity shapes. Every column a query filters on is indexed: Arkiv filters only on
// indexed columns. The schemas are unnamed, so they add no tag and the queries filter on `app` and
// `kind` alone. A dot and a business share PLACE: "Make it a business" patches a dot in place.
export const PLACE = defineSchema({
  app: str().indexed(),
  kind: str().indexed(),
  name: str().indexed(),
  lat: i32().indexed(),
  lng: i32().indexed(),
  session: str().indexed().optional(),
  color: str().indexed().optional(),
  country: str().indexed().optional(),
  category: str().indexed().optional(),
  rating: i32().indexed().optional(),
  opens: i32().optional(),
  closes: i32().optional(),
  city: str().optional(),
  photo: str().optional(),
  // Seeded businesses only (scripts/seed-rabdi.mjs): which seed row an entity is, to skip it on a rerun.
  seed_id: str().indexed().optional(),
});
export const REVIEW = defineSchema({
  app: str().indexed(),
  kind: str().indexed(),
  business: entityKey().indexed(),
  stars: i32(),
  text: str(),
  seed_id: str().indexed().optional(),
});

function isUserRejection(error: unknown): boolean {
  let cause = error;
  for (let depth = 0; depth < 12 && cause && typeof cause === "object"; depth++) {
    if ("code" in cause && cause.code === 4001) return true;
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return false;
}

/** UI values as column values: coordinates in millionths, ratings in tenths, keys as keys. */
export function encodedFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(fields)) {
    // How long an entity lives is the create's `expiration`, never an attribute.
    if (value === undefined || name === "lifetimeSec" || name === "noExpiry") continue;
    if (name === "photo" && (typeof value !== "string" || !/^(?:0x)?[a-f0-9]{64}$/i.test(value))) throw new Error("Photo must be a plain Swarm reference.");
    if (name === "lat" || name === "lng") result[name] = encodeCoord(value as number);
    else if (name === "rating") result[name] = encodeRating(value as number);
    // A review's business is a key column: a plain string is refused (SchemaMismatchError).
    else if (name === "business" && typeof value === "string") result[name] = entityKey(value as Hex);
    else if (typeof value === "number" || typeof value === "string") result[name] = value;
    else throw new Error(`Invalid attribute ${name}.`);
  }
  return result;
}

/** A lifetime in whole blocks of the SDK's 2 s, rounded up, so any number of seconds is accepted. */
/** Gas for one write of `operations` entity operations. SDK 1.0's default estimate runs short on
 * Rabdi: 3 of 10 default-signed writes reverted at exactly their gas limit (migration lane W,
 * October 31), and explicit parameters passed 10/10 in Rabby and MetaMask and 20/20 with a local
 * key. Measured October 31: one create used 190,179 gas, ten used 1,500,092; this leaves well over 2×
 * headroom and stays far under the 30,000,000 block gas limit for a 20-entity batch. */
export function writeGas(operations: number): bigint {
  return 1_000_000n + 400_000n * BigInt(Math.max(0, operations - 1));
}

/** Explicit parameters for every write: the nonce at `latest` (Rabdi serves state at the chain head
 * only), the current gas price and writeGas. */
export async function writeParams(
  reader: Pick<ReturnType<typeof createSdkClients>["reader"], "getTransactionCount" | "getGasPrice">,
  address: Hex, operations: number, nonce?: number,
): Promise<{ nonce: number; gas: bigint; gasPrice: bigint }> {
  const [latest, gasPrice] = await Promise.all([nonce ?? reader.getTransactionCount({ address, blockTag: "latest" }), reader.getGasPrice()]);
  return { nonce: latest, gas: writeGas(operations), gasPrice };
}

export function lifetime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("Invalid lifetime.");
  return ExpirationTime.fromBlocks(Math.ceil(seconds / 2));
}

/** The longest lifetime Rabdi accepts (six months; a deadline at 2**64 - 1 reverts there). */
export const LONGEST_EXPIRATION = ExpirationTime.fromBlocks(Number(LONGEST_LIFETIME_BLOCKS));

/** On-screen text (L7) of `extend` below, for `addSeconds`. Change the two together. */
export function describeExtend(addSeconds: number): { code: string } {
  // Whole minutes read as minutes on screen (20 * 60_000); the value is the same addSeconds * 1000.
  const ms = addSeconds % 60 === 0 ? `${addSeconds / 60} * 60_000` : `${addSeconds * 1000}`;
  return { code: [
    `const extraBlocks = BigInt(Math.ceil(${ms} / blockTimeMs))`,
    `const entities = await Promise.all(`,
    `  keys.map((key) => reader.getEntity(key)))`,
    `// Already at the longest lifetime (6 months): nothing to extend`,
    `const expiring = entities.filter((entity) => entity.$expiresAt < LONGEST)`,
    `await writer.executeBatch({ extensions: expiring.map((entity) => ({`,
    `  entityKey: entity.$key,`,
    `  expiration: ExpirationTime.atBlock(entity.$expiresAt + extraBlocks),`,
    `})) })`,
  ].join("\n") };
}

/** The extensions `extend` sends: each deadline `extraBlocks` later. An entity with the longest
 * lifetime is skipped: it already sits at Rabdi's maximum, so `atBlock(expiresAt + n)` would revert
 * (ExpiryBeyondMaxLifetime). When that leaves nothing, nothing is signed or sent. */
export function extensionsFor(entities: readonly { key: Hex; expiresAt: bigint }[], extraBlocks: bigint) {
  const extensions = entities.filter(entity => !hasNoExpiry(entity.expiresAt))
    .map(entity => ({ entityKey: entity.key, expiration: ExpirationTime.atBlock(entity.expiresAt + extraBlocks) }));
  if (!extensions.length) throw new WriteNotSentError(NOTHING_TO_EXTEND);
  return extensions;
}

/** The longest choice writes LONGEST_EXPIRATION, six months on Rabdi.
 * The country is stored by its full name ("india"), not the code the writer placed it with. */
export function dotToCreate(dot: DotCreate) {
  const fields = encodedFields(dot as unknown as Record<string, unknown>);
  return {
    schema: PLACE,
    values: { ...fields, app: APP_ID, kind: "dot", country: countryName(dot.country) } as unknown as CreateEntityValues<typeof PLACE>,
    flags: { permissionlessExtension: true },
    expiration: dot.noExpiry ? LONGEST_EXPIRATION : lifetime(dot.lifetimeSec),
  };
}

type EntityRow = { $key?: Hex; $owner?: Hex; $creator?: Hex; $createdAt?: bigint; $updatedAt?: bigint; $expiresAt?: bigint; $attributes?: Attributes };

export function decodeLiveEntity<T extends EntityAttrs = EntityAttrs>(entity: EntityRow): LiveEntity<T> {
  if (!entity.$key || !entity.$owner || !entity.$creator || entity.$createdAt === undefined || entity.$expiresAt === undefined || !entity.$attributes) throw new Error("Incomplete entity projection.");
  const attrs: Record<string, unknown> = {};
  const raw = Object.entries(entity.$attributes).map(([name, value]: [string, Attributes[string]]) => {
    attrs[name] = name === "lat" || name === "lng" ? decodeCoord(Number(value.value))
      : name === "rating" ? decodeRating(Number(value.value)) : value.value;
    return { name, type: value.type, stored: String(value.value) };
  });
  if (attrs.app !== APP_ID || !["dot", "business", "review"].includes(String(attrs.kind))) throw new Error("Entity is outside the workshop model.");
  delete attrs.app;
  return { key: entity.$key, owner: entity.$owner, creator: entity.$creator, createdAtBlock: entity.$createdAt,
    updatedAtBlock: entity.$updatedAt, expiresAtBlock: entity.$expiresAt, attrs: attrs as unknown as T, raw };
}

/** Live SDK implementation shared by Node and the browser. */
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

  // The filters, as expressions and as the text the Code panel shows.
  function build(filters: ChainFilters) {
    const expressions: Expression[] = [eq("app", APP_ID)];
    const code = ["reader.select({ $key: true, $owner: true, $creator: true, $createdAt: true, $updatedAt: true, $expiresAt: true, $attributes: true })",
      `  .createdBy(${JSON.stringify(options.creator)})`, `  .where(eq("app", ${JSON.stringify(APP_ID)}))`];
    function where(expression: (typeof expressions)[number], text: string) {
      expressions.push(expression);
      code.push(`  .where(${text})`);
    }
    if (filters.kinds.length) {
      const kinds = filters.kinds.map(kind => eq("kind", kind));
      const texts = filters.kinds.map(kind => `eq("kind", ${JSON.stringify(kind)})`);
      where(kinds.length === 1 ? kinds[0]! : or(kinds), texts.length === 1 ? texts[0]! : `or(${texts.join(", ")})`);
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
    if (filters.owner) code.push(`  .ownedBy(${JSON.stringify(filters.owner)})`);
    code.push('  .orderBy(asc("$key"))', `  .limit(${PAGE})`, "  .fetch();", '// Next page: the same query with gt("$key", key(lastKey)).');
    // Every page is the same query, ordered by $key, continuing after the last key read.
    const page = (after?: Hex) => {
      const builder = reader.select(LIVE_SELECTION).createdBy(options.creator).where(...expressions).orderBy(asc("$key")).limit(PAGE);
      if (filters.owner) builder.ownedBy(filters.owner);
      if (after) builder.where(gt("$key", entityKey(after)));
      return builder;
    };
    return { page, description: { code: `const page = await ${code.join("\n")}`, query: page().toString(), appSide: [] } satisfies QueryDescription };
  }

  function requireWriter() {
    if (!writer) throw new Error("A wallet is required to write Arkiv entities.");
    return writer;
  }
  /** The explicit nonce, gas and gas price every write sends (writeParams). */
  function params(operations: number) {
    const address = requireWriter().account?.address;
    if (!address) throw new Error("The wallet has no account.");
    return writeParams(reader, address, operations);
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
      schema: (kind === "review" ? REVIEW : PLACE) as typeof PLACE,
      values: { ...encodedFields(item as unknown as Record<string, unknown>), app: APP_ID, kind } as unknown as CreateEntityValues<typeof PLACE>,
      flags: { permissionlessExtension: true }, expiration: lifetime(item.lifetimeSec),
    })) }, await params(items.length));
    return finish(result.txHash, result.createdEntities);
  });

  return {
    profile: options.profile, creator: options.creator, getBlock,
    describe: filters => build(filters).description,
    async query<T extends EntityAttrs = EntityAttrs>(filters: ChainFilters) {
      const started = performance.now();
      await checkNetwork();
      if (filters.expiringWithinSec !== undefined) await getBlock();
      const { page, description } = build(filters);
      const entities: LiveEntity<T>[] = [];
      let block = 0n;
      let pages = 0;
      let after: Hex | undefined;
      for (;;) {
        const result = await page(after).fetch();
        pages++;
        if (result.blockNumber > block) block = result.blockNumber;
        entities.push(...result.entities.map(entity => decodeLiveEntity<T>(entity as EntityRow)));
        if (result.entities.length < PAGE) break;
        after = (result.entities.at(-1) as EntityRow).$key;
      }
      return { entities, description, block, rows: entities.length, pages, latencyMs: performance.now() - started, ranAt: Date.now() };
    },
    createDots: dots => serializeWrite(async () => {
      if (!dots.length) throw new Error("No entities to create.");
      const result = await requireWriter().executeBatch({ creates: dots.map(dotToCreate) }, await params(dots.length));
      return finish(result.txHash, result.createdEntities);
    }),
    createBusinesses: items => create("business", items),
    createReviews: items => create("review", items),
    extend: (keys, addSeconds) => serializeWrite(async () => {
      if (!keys.length || !Number.isFinite(addSeconds) || addSeconds <= 0 || new Set(keys).size !== keys.length) throw new Error("Invalid Lifetime Extension.");
      const block = await getBlock();
      const extraBlocks = BigInt(Math.ceil(addSeconds * 1000 / block.blockTimeMs));
      const current = await Promise.all(keys.map(async key => ({ key, expiresAt: (await reader.getEntity(key)).$expiresAt })));
      const extensions = extensionsFor(current, extraBlocks);
      const result = await requireWriter().executeBatch({ extensions }, await params(extensions.length));
      return finish(result.txHash, extensions.map(extension => extension.entityKey));
    }),
    patch: (key: Hex, fields: PatchFields, _current: EntityAttrs) => serializeWrite(async () => {
      const result = await requireWriter().patchEntity(PLACE, key, { set: encodedFields(fields as Record<string, unknown>) as unknown as PatchEntityValues<typeof PLACE> }, await params(1));
      return finish(result.txHash, [key]);
    }),
    changeOwner: (key, newOwner) => serializeWrite(async () => {
      const result = await requireWriter().changeOwnership({ entityKey: key, newOwner }, await params(1));
      return finish(result.txHash, [key]);
    }),
    deleteEntity: key => serializeWrite(async () => {
      const result = await requireWriter().deleteEntity({ entityKey: key }, await params(1));
      return finish(result.txHash, [key]);
    }),
  };
}
