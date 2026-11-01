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

/** The seven dot colors a phone can pick (Santiago, November 1). The entity stores the plain name
 * ("orange"), never a hex code, which on screen reads like ciphertext. The writer accepts only these. */
export const DOT_PALETTE = ["yellow", "blue", "red", "orange", "white", "green", "black"] as const;
export type DotColor = (typeof DOT_PALETTE)[number];

/** How each color is drawn. Orange is Arkiv Orange; black is Arkiv Ink, outlined wherever it sits on
 * the dark stage. */
export const DOT_HEX: Record<DotColor, string> = {
  yellow: "#ffd23f",
  blue: "#3b82f6",
  red: "#ef4444",
  orange: "#fe7446",
  white: "#ffffff",
  green: "#22c55e",
  black: "#111111",
};

export const DOT_COLOR_NAMES: Record<DotColor, string> = {
  yellow: "Yellow",
  blue: "Blue",
  red: "Red",
  orange: "Orange",
  white: "White",
  green: "Green",
  black: "Black",
};

/** The fill for a dot's stored color. Entities written before November 1 stored a hex code: draw it as is. */
export function dotHex(color: string | undefined): string {
  if (color && Object.hasOwn(DOT_HEX, color)) return DOT_HEX[color as DotColor];
  return color?.startsWith("#") ? color : DOT_HEX.orange;
}
