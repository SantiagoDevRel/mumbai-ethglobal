// How UI values map to on-chain attribute values. Contract owned by the orchestrator.
//
// Coordinates: SDK 0.8.x has a signed `i32` attribute type with equality and range indexing,
// so latitude and longitude are stored as i32 micro-degrees (degrees x 1e6). That keeps the L3
// viewport filter a plain range query. To be re-verified against the installed typings and the
// live chain in phase 0 (negative values in a range predicate).

export const COORD_SCALE = 1_000_000;

export function encodeCoord(deg: number): number {
  return Math.round(deg * COORD_SCALE);
}

export function decodeCoord(stored: number): number {
  return stored / COORD_SCALE;
}

/** Rating 0-5 with one decimal, stored as tenths (i32). */
export function encodeRating(rating: number): number {
  return Math.round(rating * 10);
}

export function decodeRating(stored: number): number {
  return stored / 10;
}

/** `#rrggbb`, lower case, as stored in the `color` attribute. */
export function normalizeColor(input: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(input.trim());
  return m ? `#${m[1]!.toLowerCase()}` : null;
}

/** Display form of an entity key: `0x3f2a…a1c9`. */
export function shortKey(key: string, head = 4, tail = 4): string {
  if (key.length <= 2 + head + tail) return key;
  return `${key.slice(0, 2 + head)}…${key.slice(-tail)}`;
}

/** Twelve bright preset dot colors (participants' data, no brand review needed). */
export const DOT_PALETTE = [
  "#fe7446",
  "#ffd23f",
  "#3ddc97",
  "#2ec4f1",
  "#6c8cff",
  "#b07cff",
  "#ff5fa2",
  "#ff4d4d",
  "#a3e635",
  "#00e5c7",
  "#ffffff",
  "#f6a6ff",
] as const;
