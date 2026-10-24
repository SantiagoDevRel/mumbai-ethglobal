// Deterministic placement of a participant's dot inside a country. No dependencies:
// runs in the Cloudflare Worker (which stores the result) and in the browser.
// Data: shared/geo/countries.json (see README.md in this folder).

export type LngLat = [lng: number, lat: number];

export type CountryShape = {
  iso2: string;
  name: string;
  /** An interior point of the polygon, [lng, lat]. */
  centroid: LngLat;
  /** [minLng, minLat, maxLng, maxLat] of the polygon. */
  bbox: [number, number, number, number];
  /** Outer ring of the country's largest polygon, open (last point != first). */
  polygon: LngLat[];
};

export type PlacedPoint = { lat: number; lng: number };

const MAX_TRIES = 200;
/** Points closer to the border than this fraction of the larger bbox side are rejected. */
const EDGE_MARGIN = 0.003;
const FALLBACK_JITTER_DEG = 0.05;

/** Seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit FNV-1a hash of the string's UTF-16 code units. */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Ray casting. Points exactly on an edge may go either way. */
export function pointInPolygon([x, y]: LngLat, polygon: readonly LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToEdges([x, y]: LngLat, polygon: readonly LngLat[]): number {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[j]!;
    const [bx, by] = polygon[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    if (d < best) best = d;
  }
  return best;
}

const round5 = (v: number) => Math.round(v * 1e5) / 1e5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A random point inside the country, deterministic for the same seed (use the dot's
 * stable ID or the request ID). Rejection-samples the bbox against the polygon and keeps
 * a small margin from the border; falls back to the centroid plus up to ±0.05° of jitter
 * (clamped to the bbox) when the polygon is degenerate or sampling fails.
 */
export function placeInCountry(country: CountryShape, seed: string): PlacedPoint {
  const rand = mulberry32(seedFromString(`${country.iso2}:${seed}`));
  const [minLng, minLat, maxLng, maxLat] = country.bbox;
  const w = maxLng - minLng;
  const h = maxLat - minLat;
  const { polygon } = country;

  if (polygon.length >= 3 && w > 0 && h > 0) {
    const margin = EDGE_MARGIN * Math.max(w, h);
    let firstInside: LngLat | null = null;
    for (let i = 0; i < MAX_TRIES; i++) {
      const p: LngLat = [minLng + rand() * w, minLat + rand() * h];
      if (!pointInPolygon(p, polygon)) continue;
      if (distanceToEdges(p, polygon) >= margin) return { lng: round5(p[0]), lat: round5(p[1]) };
      firstInside ??= p;
    }
    if (firstInside) return { lng: round5(firstInside[0]), lat: round5(firstInside[1]) };
  }

  const [cLng, cLat] = country.centroid;
  const lng = clamp(cLng + (rand() * 2 - 1) * FALLBACK_JITTER_DEG, minLng, maxLng);
  const lat = clamp(cLat + (rand() * 2 - 1) * FALLBACK_JITTER_DEG, minLat, maxLat);
  return { lng: round5(lng), lat: round5(lat) };
}

export function countryByIso2<T extends { iso2: string }>(list: readonly T[], iso2: string): T | undefined {
  const code = iso2.trim().toUpperCase();
  return list.find((c) => c.iso2 === code);
}
