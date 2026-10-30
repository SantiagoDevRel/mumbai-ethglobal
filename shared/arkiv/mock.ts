// In-memory adapter so the UI can be built before the chain is wired. It simulates blocks,
// Entity Expiration (and entities with no expiration), Lifetime Extension, transfers and deletes.
// Never shown as live: the stage labels mock data.

import type { ArkivAdapter, BusinessCreate, DotCreate, PatchFields, ReviewCreate } from "./adapter";
import { NOTHING_TO_EXTEND, WriteNotSentError } from "./adapter";
import { getProfile, WRITER_ADDRESS } from "./profiles";
import type {
  BlockInfo,
  ChainFilters,
  EntityAttrs,
  Hex,
  LiveEntity,
  QueryDescription,
  QueryRun,
  RawAttribute,
  WriteResult,
} from "../types";
import { APP_ID, DOT_CATEGORIES, hasNoExpiry, LIFETIME_MAX_SEC, LIFETIME_MIN_SEC, LIFETIME_STEP_SEC, NO_EXPIRY_BLOCK } from "../types";
import { DOT_PALETTE, encodeCoord, encodeRating } from "../encoding";
import { countryName } from "../geo/country-name";

export interface MockOptions {
  blockTimeMs?: number;
  /** Spawn a random dot every N ms (0 = off). */
  autoSpawnMs?: number;
}

function randomHex(bytes: number): Hex {
  let s = "0x";
  for (let i = 0; i < bytes; i++) s += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  return s as Hex;
}

function rawOf(attrs: EntityAttrs): RawAttribute[] {
  const out: RawAttribute[] = [{ name: "app", type: "str", stored: APP_ID }];
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    if (name === "lat" || name === "lng") out.push({ name, type: "i32", stored: String(encodeCoord(value as number)) });
    else if (name === "rating") out.push({ name, type: "i32", stored: String(encodeRating(value as number)) });
    else if (typeof value === "number") out.push({ name, type: "i32", stored: String(value) });
    else if (name === "business") out.push({ name, type: "key", stored: String(value) });
    else out.push({ name, type: "str", stored: String(value) });
  }
  return out;
}

/** Describes a read the way the SDK 0.8 adapter does: the builder calls, and the query text in the
 * SDK's own form (`name = str('…')` joined by AND), so mock and live projections read the same. */
export function describeFilters(filters: ChainFilters, creator: Hex): QueryDescription {
  const where: string[] = [`eq("app", "${APP_ID}")`];
  const q: string[] = [`app = str('${APP_ID}')`];
  if (filters.kinds.length === 1) {
    where.push(`eq("kind", "${filters.kinds[0]}")`);
    q.push(`kind = str('${filters.kinds[0]}')`);
  }
  if (filters.session) { where.push(`eq("session", "${filters.session}")`); q.push(`session = str('${filters.session}')`); }
  if (filters.color) { where.push(`eq("color", "${filters.color}")`); q.push(`color = str('${filters.color}')`); }
  // The filter holds the app's code; entities store the country's name ("india").
  if (filters.country) { const country = countryName(filters.country); where.push(`eq("country", "${country}")`); q.push(`country = str('${country}')`); }
  if (filters.category) { where.push(`eq("category", "${filters.category}")`); q.push(`category = str('${filters.category}')`); }
  if (filters.namePrefix) { where.push(`startsWith("name", ${JSON.stringify(filters.namePrefix)})`); q.push(`name STARTSWITH str(${JSON.stringify(filters.namePrefix)})`); }
  if (filters.business) { where.push(`eq("business", key("${filters.business}"))`); q.push(`business = key(${filters.business})`); }
  if (filters.minRating !== undefined) { where.push(`gte("rating", ${encodeRating(filters.minRating)})`); q.push(`rating >= i32(${encodeRating(filters.minRating)})`); }
  if (filters.viewport) {
    const v = filters.viewport;
    where.push(
      `gte("lat", ${encodeCoord(v.minLat)})`, `lte("lat", ${encodeCoord(v.maxLat)})`,
      `gte("lng", ${encodeCoord(v.minLng)})`, `lte("lng", ${encodeCoord(v.maxLng)})`,
    );
    q.push(`lat >= i32(${encodeCoord(v.minLat)})`, `lat <= i32(${encodeCoord(v.maxLat)})`, `lng >= i32(${encodeCoord(v.minLng)})`, `lng <= i32(${encodeCoord(v.maxLng)})`);
  }
  const owner = filters.owner ? `\n  .ownedBy("${filters.owner}")` : "";
  if (filters.owner) q.push(`$owner = addr(${filters.owner})`);
  q.push(`$creator = addr(${creator})`);
  const code = `const result = await client\n  .select()\n  .where(\n    ${where.join(",\n    ")},\n  )${owner}\n  .createdBy("${creator}")\n  .fetch()`;
  return { code, query: q.join(" AND "), appSide: [] };
}

export function createMockAdapter(opts: MockOptions = {}): ArkivAdapter & {
  spawnRandom(): void;
  stop(): void;
} {
  const profile = getProfile("tiramisu");
  const blockTimeMs = opts.blockTimeMs ?? 2000;
  const genesis = Date.now();
  const store = new Map<Hex, LiveEntity>();
  const currentBlock = () => BigInt(1_000_000 + Math.floor((Date.now() - genesis) / blockTimeMs));
  const blocksFor = (sec: number) => BigInt(Math.ceil((sec * 1000) / blockTimeMs));

  const write = (items: { attrs: EntityAttrs; lifetimeSec: number; noExpiry?: boolean }[]): WriteResult => {
    const block = currentBlock();
    const keys = items.map(({ attrs: given, lifetimeSec, noExpiry }) => {
      const key = randomHex(32);
      // Like dotToCreate: a dot stores its country by name ("in" → "india").
      const attrs = given.kind === "dot" ? { ...given, country: countryName(given.country) } : given;
      store.set(key, {
        key,
        owner: WRITER_ADDRESS,
        creator: WRITER_ADDRESS,
        createdAtBlock: block,
        // No expiration is ExpirationTime.permanent(): the largest block a u64 holds.
        expiresAtBlock: noExpiry ? NO_EXPIRY_BLOCK : block + blocksFor(lifetimeSec),
        attrs,
        raw: rawOf(attrs),
      });
      return key;
    });
    return { txHash: randomHex(32), block, keys };
  };

  const matches = (e: LiveEntity, f: ChainFilters): boolean => {
    const a = e.attrs as unknown as Record<string, unknown>;
    if (!f.kinds.includes(e.attrs.kind)) return false;
    if (f.session && a.session !== f.session) return false;
    if (f.namePrefix && !String(a.name ?? "").startsWith(f.namePrefix)) return false;
    if (f.color && a.color !== f.color) return false;
    if (f.country && a.country !== countryName(f.country)) return false;
    if (f.owner && e.owner.toLowerCase() !== f.owner.toLowerCase()) return false;
    if (f.category && a.category !== f.category) return false;
    if (f.minRating !== undefined && (a.rating as number) < f.minRating) return false;
    if (f.business && a.business !== f.business) return false;
    if (f.viewport) {
      const lat = a.lat as number, lng = a.lng as number;
      if (lat < f.viewport.minLat || lat > f.viewport.maxLat || lng < f.viewport.minLng || lng > f.viewport.maxLng) return false;
    }
    if (f.expiringWithinSec !== undefined && e.expiresAtBlock - currentBlock() > blocksFor(f.expiringWithinSec)) return false;
    return true;
  };

  // Lower case, like everything the writer stores (Santiago, October 29).
  const names = ["priya", "arjun", "ananya", "rohan", "meera", "kabir", "sara", "diego", "lena", "yuki", "omar", "ada"];
  const spots: [string, number, number][] = [
    ["in", 19.07, 72.88], ["in", 28.61, 77.21], ["in", 12.97, 77.59], ["in", 22.57, 88.36], ["in", 26.91, 75.79],
    ["co", 6.24, -75.58], ["de", 52.52, 13.4], ["us", 37.77, -122.42], ["br", -23.55, -46.63], ["jp", 35.68, 139.69],
  ];
  const spawnRandom = () => {
    const [country, lat, lng] = spots[Math.floor(Math.random() * spots.length)]!;
    write([{
      attrs: {
        kind: "dot",
        session: "MOCK",
        name: names[Math.floor(Math.random() * names.length)]!,
        color: DOT_PALETTE[Math.floor(Math.random() * DOT_PALETTE.length)]!,
        country,
        category: DOT_CATEGORIES[Math.floor(Math.random() * DOT_CATEGORIES.length)]!,
        lat: lat + (Math.random() - 0.5) * 3,
        lng: lng + (Math.random() - 0.5) * 3,
      },
      lifetimeSec: LIFETIME_MIN_SEC + LIFETIME_STEP_SEC * Math.floor(Math.random() * ((LIFETIME_MAX_SEC - LIFETIME_MIN_SEC) / LIFETIME_STEP_SEC + 1)),
    }]);
  };
  // Two phones that chose "No expiration" ($expiresAt = NO_EXPIRY_BLOCK), so mock mode shows from
  // the start how the stage draws an entity that never expires.
  write([
    { attrs: { kind: "dot", session: "MOCK", name: "ada", color: "#14f195", country: "in", category: "cafe", lat: 19.12, lng: 72.85 }, lifetimeSec: LIFETIME_MAX_SEC, noExpiry: true },
    { attrs: { kind: "dot", session: "MOCK", name: "omar", color: "#00c2ff", country: "co", category: "bookstore", lat: 4.71, lng: -74.07 }, lifetimeSec: LIFETIME_MAX_SEC, noExpiry: true },
  ]);
  const timer = opts.autoSpawnMs ? setInterval(spawnRandom, opts.autoSpawnMs) : null;

  return {
    profile,
    creator: WRITER_ADDRESS,
    async getBlock(): Promise<BlockInfo> {
      return { number: currentBlock(), timestampMs: Date.now(), blockTimeMs };
    },
    async query<T extends EntityAttrs>(filters: ChainFilters): Promise<QueryRun<T>> {
      const started = performance.now();
      const block = currentBlock();
      for (const [k, e] of store) if (e.expiresAtBlock <= block) store.delete(k);
      const entities = [...store.values()].filter((e) => matches(e, filters)) as LiveEntity<T>[];
      return {
        entities,
        description: describeFilters(filters, WRITER_ADDRESS),
        block,
        rows: entities.length,
        pages: 1,
        latencyMs: Math.round(performance.now() - started + 40),
        ranAt: Date.now(),
      };
    },
    describe: (filters) => describeFilters(filters, WRITER_ADDRESS),
    async createDots(dots: DotCreate[]) {
      // As in the SDK adapter, `lifetimeSec` and `noExpiry` set the deadline and are not attributes.
      return write(dots.map(({ lifetimeSec, noExpiry, ...d }) => ({ attrs: { kind: "dot", ...d }, lifetimeSec, noExpiry })));
    },
    async createBusinesses(items: BusinessCreate[]) {
      return write(items.map(({ lifetimeSec, ...b }) => ({ attrs: { kind: "business", ...b }, lifetimeSec })));
    },
    async createReviews(items: ReviewCreate[]) {
      return write(items.map(({ lifetimeSec, ...r }) => ({ attrs: { kind: "review", ...r }, lifetimeSec })));
    },
    async extend(keys: Hex[], addSeconds: number) {
      // Same rule as the SDK adapter: an entity with no expiration has nothing to extend.
      const known = keys.flatMap((k) => store.get(k) ?? []);
      const expiring = known.filter((e) => !hasNoExpiry(e.expiresAtBlock));
      if (known.length && !expiring.length) throw new WriteNotSentError(NOTHING_TO_EXTEND);
      for (const e of expiring) e.expiresAtBlock += blocksFor(addSeconds);
      return { txHash: randomHex(32), block: currentBlock(), keys: expiring.map((e) => e.key) };
    },
    async patch(key: Hex, fields: PatchFields, current: EntityAttrs) {
      const e = store.get(key);
      if (e) {
        e.attrs = { ...current, ...fields } as EntityAttrs;
        e.raw = rawOf(e.attrs);
        e.updatedAtBlock = currentBlock();
      }
      return { txHash: randomHex(32), block: currentBlock(), keys: [key] };
    },
    async changeOwner(key: Hex, newOwner: Hex) {
      const e = store.get(key);
      if (e) e.owner = newOwner;
      return { txHash: randomHex(32), block: currentBlock(), keys: [key] };
    },
    async deleteEntity(key: Hex) {
      // As on the DB-Chain, only a live entity's owner can delete it; the next query no longer has it.
      const e = store.get(key);
      if (!e || e.expiresAtBlock <= currentBlock()) throw new WriteNotSentError("No live entity has that key.");
      if (e.owner.toLowerCase() !== WRITER_ADDRESS.toLowerCase()) throw new WriteNotSentError("Only its owner can delete it.");
      store.delete(key);
      return { txHash: randomHex(32), block: currentBlock(), keys: [key] };
    },
    spawnRandom,
    stop() {
      if (timer) clearInterval(timer);
    },
  };
}
