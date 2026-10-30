// How UI values map to on-chain attribute values. Contract owned by the orchestrator.
//
// Coordinates: SDK 1.0 has a signed `i32` column type with equality and range indexing, so
// latitude and longitude are stored as i32 micro-degrees (degrees x 1e6). That keeps the L3
// viewport filter a plain range query.

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

/** Display form of an entity key: `0x3f2a…a1c9`. */
export function shortKey(key: string, head = 4, tail = 4): string {
  if (key.length <= 2 + head + tail) return key;
  return `${key.slice(0, 2 + head)}…${key.slice(-tail)}`;
}

/** The seven dot colors a phone can pick: Arkiv, Solana and Ethereum tones, bright enough for the
 * night globe (Arkiv Blue #181ea9 is too dark there, so Arkiv is Orange and Sand). The writer
 * accepts only these. */
export const DOT_PALETTE = [
  "#fe7446", // Arkiv Orange
  "#f6f4ef", // Arkiv Sand
  "#14f195", // Solana green
  "#9945ff", // Solana purple
  "#dc1fff", // Solana magenta
  "#627eea", // Ethereum blue
  "#00c2ff", // cyan
] as const;
export type DotColor = (typeof DOT_PALETTE)[number];

export const DOT_COLOR_NAMES: Record<DotColor, string> = {
  "#fe7446": "Orange",
  "#f6f4ef": "Sand",
  "#14f195": "Green",
  "#9945ff": "Purple",
  "#dc1fff": "Magenta",
  "#627eea": "Ether blue",
  "#00c2ff": "Cyan",
};
