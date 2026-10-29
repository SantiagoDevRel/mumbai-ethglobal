// Geometry and timing of the close (L9, ./Finale.tsx), free of the DOM so the node tests cover it:
// where the mascot performs, the THANK YOU bricks, which cube flies where and when, and where every
// cube is at a given moment. Stage pixels (1920 x 1080); times in seconds from the scene's entry.

import { MASCOT_ART } from "../../mascot-art.ts";

export type RGB = readonly [number, number, number];
export type Tone = "cream" | "orange" | "ink";
/** One cube of a voxelized pose: its center, size and color. */
export type Voxel = { x: number; y: number; size: number; tone: Tone; color: RGB };
export type BrickTone = "sand" | "orange";

// Numbers.

/** mulberry32: a small seeded generator, so every run (and every screenshot) is the same. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const k = clamp01((x - edge0) / (edge1 - edge0));
  return k * k * (3 - 2 * k);
}
export const easeInOutQuad = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
/** Overshoots a little, then settles: a brick that pops into place. */
export const easeOutBack = (p: number) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;
export function bezier(a: number, b: number, c: number, d: number, k: number): number {
  const u = 1 - k;
  return u * u * u * a + 3 * u * u * k * b + 3 * u * k * k * c + k * k * k * d;
}
export function mixColor(a: RGB, b: RGB, k: number): RGB {
  return [Math.round(lerp(a[0], b[0], k)), Math.round(lerp(a[1], b[1], k)), Math.round(lerp(a[2], b[2], k))];
}

// The stage.

export const STAGE_W = 1920;
/** The canvas covers this horizontal band of the stage; every cube's path stays inside it. */
export const BAND = { top: 280, height: 800 } as const;

/** One word per beat, each said with its own pose. */
export const BEATS = [
  { word: "Write it.", pose: "laptop" },
  { word: "Query it.", pose: "magnifier" },
  { word: "Own it.", pose: "key" },
  { word: "Expire it.", pose: "hourglass" },
] as const;
export type BeatPose = (typeof BEATS)[number]["pose"];

/** Width and voxel grid of a pose drawn `height` px tall (the same rounding as <Mascot>). */
export function artGrid(pose: keyof typeof MASCOT_ART, height: number, cell: number) {
  const art = MASCOT_ART[pose];
  const width = Math.round((height * art.width) / art.height);
  return { width, cols: Math.ceil(width / cell), rows: Math.ceil(height / cell) };
}

/** The performing mascot: 424 px tall, feet on y 1012, its head centered on x 1640 in every pose,
 * below the links card (which ends near y 540) and clear of the bubble. It comes apart in 14 px cubes. */
export const BIG = { height: 424, ground: 1012, headX: 1640, cell: 14 } as const;
export const BIG_TOP = BIG.ground - BIG.height;
/** Each pose's head center at 424 px tall, measured on the art (public/deck/mascot/). */
const HEAD: Record<BeatPose, number> = { laptop: 147, magnifier: 180, key: 246, hourglass: 127 };
export const poseLeft = (pose: BeatPose) => BIG.headX - HEAD[pose];

/** The speech bubble ends at x 1380, left of the key (from x 1399) and the magnifier (from x 1464),
 * and starts below the key's lowest point (y 803). */
export const BUBBLE = { right: 1380, top: 828, height: 128 } as const;

/** THANK YOU: 5 x 7 bricks of 28 px from (96, 812), 49 cells wide (x 96-1468, y 812-1008). */
export const TEXT = { left: 96, top: 812, cell: 28 } as const;
/** The small waving mascot the cubes rebuild beside YOU, on the bricks' baseline, in 11 px cubes. */
export const SMALL = { left: 1496, ground: 1008, height: 236, cell: 11 } as const;
export const SMALL_TOP = SMALL.ground - SMALL.height;

// Timing.

export const TIME = {
  /** Each word holds this long. */
  beat: 1.5,
  /** The last pose turns into cubes. */
  break: 6,
  /** The first cube leaves. */
  launch: 6.35,
  /** The first brick lands; the last one lands `textSpan` (plus the pause between the words) later. */
  textLand: 7.3,
  textSpan: 1.7,
  wordPause: 0.15,
  /** The small mascot builds up from its feet in `blokSpan`. */
  blokLand: 9.25,
  blokSpan: 1.1,
  /** Its picture fades in over its cubes, then it waves; the scene holds its last frame from `end`. */
  waveIn: 10.6,
  fade: 0.3,
  wave: 1.2,
  end: 12.1,
} as const;
/** Seconds in the air, picked per cube in these ranges. */
const TEXT_FLIGHT = [0.75, 0.95] as const;
const BLOK_FLIGHT = [0.6, 0.8] as const;
/** A landing bounce, a spare cube's expiry, and the window in which the spares expire. */
export const POP = 0.18;
const EXPIRE = 0.3;
const SPARE_WINDOW = [0.2, 1.6] as const;

/** 0-3: the four words; then the cubes fly (4), the small mascot waves (5), the last frame holds (6). */
export const PHASE = { build: 4, wave: 5, done: 6 } as const;
export const PHASE_NAMES = ["write", "query", "own", "expire", "build", "wave", "done"] as const;
export function phaseAt(t: number): number {
  if (t >= TIME.end) return PHASE.done;
  if (t >= TIME.waveIn) return PHASE.wave;
  if (t >= TIME.break) return PHASE.build;
  return Math.max(0, Math.min(3, Math.floor(t / TIME.beat)));
}

// The bricks.

/** A 5 x 7 pixel font, just the letters of the message. */
export const GLYPHS: Record<string, readonly string[]> = {
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
};
export const MESSAGE = "THANK YOU";
/** Columns between the two words (one between letters). */
const WORD_GAP = 3;
/** About a third of the bricks are orange, never two side by side: the mascot's own speckles. */
export const ORANGE_SHARE = 0.3;
const SPECKLE_SEED = 29;

export type Brick = { x: number; y: number; col: number; row: number; letter: number; word: number; tone: BrickTone };
export const BRICK_COLOR: Record<BrickTone, RGB> = { sand: [246, 244, 239], orange: [254, 116, 70] };

/** The bricks in the order they land: letter by letter, each from its bottom row up, left to right. */
function layoutBricks(): Omit<Brick, "tone">[] {
  const bricks: Omit<Brick, "tone">[] = [];
  let col = 0;
  let letter = 0;
  let word = 0;
  for (const char of MESSAGE) {
    if (char === " ") {
      col += WORD_GAP - 1;
      word++;
      continue;
    }
    const glyph = GLYPHS[char];
    if (!glyph) throw new Error(`No glyph for ${char}`);
    for (let row = glyph.length - 1; row >= 0; row--) {
      for (let x = 0; x < 5; x++) {
        if (glyph[row]?.[x] !== "#") continue;
        const c = col + x;
        bricks.push({ x: TEXT.left + c * TEXT.cell + TEXT.cell / 2, y: TEXT.top + row * TEXT.cell + TEXT.cell / 2, col: c, row, letter, word });
      }
    }
    col += 6;
    letter++;
  }
  return bricks;
}

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Picks `count` bricks with no two side by side, in a seeded order. */
function speckle(bricks: Omit<Brick, "tone">[], count: number, seed: number): Set<number> {
  const rand = seeded(seed);
  const order = bricks.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const cells = new Set<string>();
  const chosen = new Set<number>();
  for (const i of order) {
    if (chosen.size >= count) break;
    const { col, row } = bricks[i]!;
    if (NEIGHBORS.some(([dx, dy]) => cells.has(`${col + dx}:${row + dy}`))) continue;
    cells.add(`${col}:${row}`);
    chosen.add(i);
  }
  return chosen;
}

export function textBricks(): Brick[] {
  const bricks = layoutBricks();
  const orange = speckle(bricks, Math.round(bricks.length * ORANGE_SHARE), SPECKLE_SEED);
  return bricks.map((brick, i) => ({ ...brick, tone: orange.has(i) ? "orange" : "sand" }));
}
export const BRICKS: readonly Brick[] = textBricks();
/** Where a click replays the scene: the bricks' box. */
export const TEXT_BOX = { left: TEXT.left, top: TEXT.top, width: 49 * TEXT.cell, height: 7 * TEXT.cell } as const;

// Voxels from the art.

/** Samples per cell side: a pose is drawn at 4 x 4 pixels per cell before it is read back. */
export const SAMPLES = 4;
export function classify(r: number, g: number, b: number): Tone {
  if (Math.max(r, g, b) < 90) return "ink";
  if (r > 150 && r - b > 90 && r - g > 50) return "orange";
  return "cream";
}
/** Orange and ink win a cell from cream at 1.6 votes each, so the eyes and speckles survive. */
const WEIGHT: Record<Tone, number> = { cream: 1, orange: 1.6, ink: 1.6 };
const TONES = ["cream", "orange", "ink"] as const;

/**
 * Cubes of a pose from its pixels: `data` is RGBA, (cols x SAMPLES) wide and (rows x SAMPLES) tall, the
 * art drawn at its own proportion from the top left. A cell becomes a cube when it is mostly opaque; it
 * takes the tone most of its pixels have and their average color, so the cubes keep the art's shading.
 */
export function voxelize(data: ArrayLike<number>, cols: number, rows: number, cell: number, left: number, top: number): Voxel[] {
  const width = cols * SAMPLES;
  const voxels: Voxel[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let alpha = 0;
      // Per tone: red, green and blue sums, and how many pixels.
      const sums: Record<Tone, [number, number, number, number]> = { cream: [0, 0, 0, 0], orange: [0, 0, 0, 0], ink: [0, 0, 0, 0] };
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const i = ((row * SAMPLES + sy) * width + col * SAMPLES + sx) * 4;
          const r = data[i] ?? 0, g = data[i + 1] ?? 0, b = data[i + 2] ?? 0, a = data[i + 3] ?? 0;
          alpha += a;
          if (a <= 128) continue;
          const sum = sums[classify(r, g, b)];
          sum[0] += r;
          sum[1] += g;
          sum[2] += b;
          sum[3] += 1;
        }
      }
      if (alpha / (SAMPLES * SAMPLES) <= 128) continue;
      let tone: Tone = "cream";
      let score = -1;
      for (const candidate of TONES) {
        const votes = sums[candidate][3] * WEIGHT[candidate];
        if (votes > score) {
          score = votes;
          tone = candidate;
        }
      }
      const [r, g, b, n] = sums[tone];
      if (!n) continue;
      voxels.push({ x: left + col * cell + cell / 2, y: top + row * cell + cell / 2, size: cell, tone, color: [Math.round(r / n), Math.round(g / n), Math.round(b / n)] });
    }
  }
  return voxels;
}

// Who flies where.

export type Target = { x: number; y: number; size: number; color: RGB; brick: BrickTone | null };
export type Cube = {
  /** A text brick, a cube of the small mascot, or a spare cube that expires where it stands. */
  role: "text" | "blok" | "spare";
  /** Its place in the big mascot; null for a brick that pops in without a cube (too few cubes). */
  from: Voxel | null;
  /** Null for a spare. */
  to: Target | null;
  /** When it leaves (a spare: when it starts to expire). */
  launch: number;
  /** When it lands (a spare: when it is gone). */
  land: number;
  /** The two middle points of its path: it rises from the mascot and drops onto its place. */
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  /** Quarter turns it unwinds on the way (radians); a cube looks the same at every quarter turn. */
  spin: number;
  /** Phase of its tremble just before the cubes leave. */
  shake: number;
};
export type Model = { cubes: Cube[]; spares: number; popped: number };

const RARITY: Record<Tone, number> = { ink: 0, orange: 1, cream: 2 };

/** Maps a voxel to (0-1, 0-1) inside its pose's box, to match parts of two poses of different sizes. */
function normalizer(list: readonly Voxel[]): (voxel: Voxel) => readonly [number, number] {
  if (!list.length) return () => [0, 0];
  const xs = list.map((voxel) => voxel.x);
  const ys = list.map((voxel) => voxel.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX || 1;
  const h = Math.max(...ys) - minY || 1;
  return (voxel) => [(voxel.x - minX) / w, (voxel.y - minY) / h];
}

function fly(role: "text" | "blok", from: Voxel | null, to: Target, land: number, rand: () => number): Cube {
  const text = role === "text";
  const [f0, f1] = text ? TEXT_FLIGHT : BLOK_FLIGHT;
  const flight = lerp(f0, f1, rand());
  const lift1 = text ? lerp(120, 220, rand()) : lerp(60, 130, rand());
  const lift2 = text ? lerp(140, 220, rand()) : lerp(50, 110, rand());
  const turns = text ? (rand() < 0.5 ? 1 : 2) : rand() < 0.5 ? 0 : 1;
  const spin = (rand() < 0.5 ? -1 : 1) * turns * (Math.PI / 2);
  const shake = rand() * Math.PI * 2;
  const sx = from?.x ?? to.x;
  const sy = from?.y ?? to.y;
  const floor = BAND.top + 24;
  return {
    role,
    from,
    to,
    launch: from ? land - flight : land,
    land,
    c1x: sx + (to.x - sx) * 0.2,
    c1y: Math.max(floor, Math.min(sy, to.y) - lift1),
    c2x: to.x + (sx - to.x) * 0.05,
    c2y: Math.max(floor, to.y - lift2),
    spin,
    shake,
  };
}

/**
 * Pairs the big mascot's cubes (`sources`) with the THANK YOU bricks and the small mascot's cubes
 * (`blok`), and schedules every flight. The small mascot first takes, for each of its cubes, the
 * nearest cube of the same tone in the big one (eyes to eyes, feet to feet); the bricks take the rest in
 * a top-down sweep (orange cubes for the orange bricks); what is left expires in the same sweep.
 * Works with any counts: a target without a cube pops in where it lands.
 */
export function buildModel(sources: readonly Voxel[], blok: readonly Voxel[], seed = 1105): Model {
  const rand = seeded(seed);
  const priority = sources.map((source) => source.y + (rand() - 0.5) * 5 * BIG.cell);
  const taken = sources.map(() => false);

  const big = normalizer(sources);
  const small = normalizer(blok);
  const blokFrom: (number | null)[] = blok.map(() => null);
  const order = blok.map((_, i) => i).sort((a, b) => RARITY[blok[a]!.tone] - RARITY[blok[b]!.tone] || a - b);
  for (const ti of order) {
    const target = blok[ti]!;
    const [tu, tv] = small(target);
    let best = -1;
    let bestScore = Infinity;
    sources.forEach((source, si) => {
      if (taken[si]) return;
      const [su, sv] = big(source);
      const score = (su - tu) ** 2 + (sv - tv) ** 2 + (source.tone === target.tone ? 0 : 4);
      if (score < bestScore) {
        bestScore = score;
        best = si;
      }
    });
    if (best >= 0) {
      taken[best] = true;
      blokFrom[ti] = best;
    }
  }

  const queues: Record<Tone, number[]> = { cream: [], orange: [], ink: [] };
  sources
    .map((_, i) => i)
    .filter((i) => !taken[i])
    .sort((a, b) => priority[a]! - priority[b]! || a - b)
    .forEach((i) => queues[sources[i]!.tone].push(i));
  const take = (...tones: Tone[]): number | null => {
    for (const tone of tones) {
      const i = queues[tone].shift();
      if (i !== undefined) return i;
    }
    return null;
  };

  const cubes: Cube[] = [];
  let popped = 0;
  BRICKS.forEach((brick, i) => {
    const si = brick.tone === "orange" ? take("orange", "cream", "ink") : take("cream", "ink", "orange");
    const land = TIME.textLand + (i / Math.max(1, BRICKS.length - 1)) * TIME.textSpan + (brick.word > 0 ? TIME.wordPause : 0);
    const to: Target = { x: brick.x, y: brick.y, size: TEXT.cell, color: BRICK_COLOR[brick.tone], brick: brick.tone };
    cubes.push(fly("text", si === null ? null : sources[si]!, to, land, rand));
    if (si === null) popped++;
  });

  const rise = blok.map((voxel, i) => ({ i, key: -voxel.y + (rand() - 0.5) * 1.2 * SMALL.cell })).sort((a, b) => a.key - b.key || a.i - b.i);
  rise.forEach(({ i }, k) => {
    const voxel = blok[i]!;
    const si = blokFrom[i] ?? null;
    const land = TIME.blokLand + (k / Math.max(1, rise.length - 1)) * TIME.blokSpan;
    cubes.push(fly("blok", si === null ? null : sources[si]!, { x: voxel.x, y: voxel.y, size: voxel.size, color: voxel.color, brick: null }, land, rand));
    if (si === null) popped++;
  });

  const spares = [...queues.cream, ...queues.orange, ...queues.ink].sort((a, b) => priority[a]! - priority[b]! || a - b);
  spares.forEach((si, k) => {
    const at = TIME.launch + lerp(SPARE_WINDOW[0], SPARE_WINDOW[1], k / Math.max(1, spares.length - 1));
    cubes.push({ role: "spare", from: sources[si]!, to: null, launch: at, land: at + EXPIRE, c1x: 0, c1y: 0, c2x: 0, c2y: 0, spin: 0, shake: rand() * Math.PI * 2 });
  });
  return { cubes, spares: spares.length, popped };
}

// Where a cube is.

/** Draw order: landed bricks, cubes still in the big mascot, the small mascot, cubes in the air. */
export const LAYER = { bricks: 0, home: 1, blok: 2, air: 3 } as const;
export type Frame = {
  x: number;
  y: number;
  size: number;
  angle: number;
  color: RGB;
  /** The brick it becomes (null for a plain cube) and how far it has turned into it (0-1). */
  brick: BrickTone | null;
  brickMix: number;
  alpha: number;
  scale: number;
  layer: number;
};

/** A cube at time `t`, or null when it is not drawn (before the break, after it expired). */
export function cubeAt(cube: Cube, t: number): Frame | null {
  if (t < TIME.break) return null;
  const { from, to } = cube;
  let alpha = 1;
  // The small mascot's cubes give way to its picture.
  if (cube.role === "blok" && t > TIME.waveIn) {
    if (t >= TIME.waveIn + TIME.fade) return null;
    alpha = 1 - (t - TIME.waveIn) / TIME.fade;
  }
  const layer = cube.role === "text" ? LAYER.bricks : LAYER.blok;
  if (!from) {
    if (!to || t < cube.land) return null;
    const q = clamp01((t - cube.land) / POP);
    return { x: to.x, y: to.y, size: to.size, angle: 0, color: to.color, brick: to.brick, brickMix: 1, alpha, scale: easeOutBack(q), layer };
  }
  if (t < cube.launch) {
    // Still in the big mascot: it appears over the picture, trembles, and waits for its turn.
    const amp = t < TIME.launch ? 2.5 * Math.sin(Math.PI * clamp01((t - TIME.break) / (TIME.launch - TIME.break))) : 0;
    return {
      x: from.x + amp * Math.sin(t * 70 + cube.shake),
      y: from.y + amp * Math.cos(t * 63 + cube.shake),
      size: from.size,
      angle: 0,
      color: from.color,
      brick: null,
      brickMix: 0,
      alpha: smoothstep(TIME.break, TIME.break + 0.2, t),
      scale: 1,
      layer: LAYER.home,
    };
  }
  if (!to) {
    // A spare cube expires where it stands: it shrinks, fades and drifts up.
    const q = clamp01((t - cube.launch) / (cube.land - cube.launch));
    if (q >= 1) return null;
    return { x: from.x, y: from.y - 14 * q, size: from.size, angle: 0, color: from.color, brick: null, brickMix: 0, alpha: 1 - q, scale: 1 - q, layer: LAYER.home };
  }
  if (t < cube.land) {
    const p = (t - cube.launch) / (cube.land - cube.launch);
    const e = easeInOutQuad(p);
    return {
      x: bezier(from.x, cube.c1x, cube.c2x, to.x, e),
      y: bezier(from.y, cube.c1y, cube.c2y, to.y, e),
      size: lerp(from.size, to.size, e),
      angle: cube.spin * (1 - e),
      color: mixColor(from.color, to.color, smoothstep(0.1, 0.85, p)),
      brick: to.brick,
      brickMix: to.brick ? smoothstep(0.55, 0.95, p) : 0,
      alpha,
      scale: 1,
      layer: LAYER.air,
    };
  }
  const q = clamp01((t - cube.land) / POP);
  const bounce = (cube.role === "text" ? 0.16 : 0.1) * Math.sin(Math.PI * q);
  return { x: to.x, y: to.y, size: to.size, angle: 0, color: to.color, brick: to.brick, brickMix: to.brick ? 1 : 0, alpha, scale: 1 + bounce, layer };
}
