// The close's geometry and timing (./bricks.ts): the THANK YOU bricks, the voxels read from the art,
// who flies where and when, and where every cube is on every frame.
import assert from "node:assert/strict";
import test from "node:test";
import type { Model, Voxel } from "./bricks.ts";
import {
  artGrid,
  BAND,
  BEATS,
  BIG,
  BIG_TOP,
  BRICKS,
  BUBBLE,
  buildModel,
  classify,
  cubeAt,
  GLYPHS,
  MESSAGE,
  PHASE,
  phaseAt,
  POP,
  poseLeft,
  SMALL,
  SMALL_TOP,
  TEXT,
  TEXT_BOX,
  TIME,
  voxelize,
} from "./bricks.ts";

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

test("THANK YOU is 118 bricks in a 49 x 7 grid, inside its box", () => {
  assert.equal(BRICKS.length, 118);
  assert.equal(new Set(BRICKS.map((brick) => brick.letter)).size, MESSAGE.replace(" ", "").length);
  const cols = BRICKS.map((brick) => brick.col);
  const rows = BRICKS.map((brick) => brick.row);
  assert.deepEqual([Math.min(...cols), Math.max(...cols), Math.min(...rows), Math.max(...rows)], [0, 48, 0, 6]);
  assert.equal(new Set(BRICKS.map((brick) => `${brick.col}:${brick.row}`)).size, BRICKS.length, "One brick per cell.");
  for (const brick of BRICKS) {
    assert.ok(brick.x - TEXT.cell / 2 >= TEXT_BOX.left && brick.x + TEXT.cell / 2 <= TEXT_BOX.left + TEXT_BOX.width);
    assert.ok(brick.y - TEXT.cell / 2 >= TEXT_BOX.top && brick.y + TEXT.cell / 2 <= TEXT_BOX.top + TEXT_BOX.height);
  }
  for (const glyph of Object.values(GLYPHS)) {
    assert.equal(glyph.length, 7);
    for (const row of glyph) assert.match(row, /^[#.]{5}$/);
  }
});

test("the bricks land letter by letter, each from its bottom row up", () => {
  for (let i = 1; i < BRICKS.length; i++) {
    const a = BRICKS[i - 1]!;
    const b = BRICKS[i]!;
    assert.ok(b.letter > a.letter || (b.letter === a.letter && (b.row < a.row || (b.row === a.row && b.col > a.col))), `brick ${i}`);
  }
});

test("about a third of the bricks are orange, never two side by side", () => {
  const orange = BRICKS.filter((brick) => brick.tone === "orange");
  assert.equal(orange.length, Math.round(BRICKS.length * 0.3));
  const cells = new Set(orange.map((brick) => `${brick.col}:${brick.row}`));
  for (const brick of orange) for (const [dx, dy] of NEIGHBORS) assert.ok(!cells.has(`${brick.col + dx}:${brick.row + dy}`));
});

test("every piece keeps its own place on the stage", () => {
  for (const { pose } of BEATS) {
    const { width } = artGrid(pose, BIG.height, BIG.cell);
    assert.ok(poseLeft(pose) > BUBBLE.right, `${pose} starts right of the bubble`);
    assert.ok(poseLeft(pose) + width <= 1920 - 32, `${pose} ends inside the stage`);
  }
  assert.ok(TEXT_BOX.left + TEXT_BOX.width < SMALL.left, "The small mascot stands beside YOU.");
  assert.equal(SMALL_TOP + SMALL.height, TEXT_BOX.top + TEXT_BOX.height, "Same baseline as the bricks.");
  assert.ok(BIG_TOP > BAND.top && SMALL_TOP > BAND.top && TEXT_BOX.top + TEXT_BOX.height < BAND.top + BAND.height);
  assert.deepEqual(artGrid("hourglass", BIG.height, BIG.cell), { width: 250, cols: 18, rows: 31 });
  assert.deepEqual(artGrid("wave", SMALL.height, SMALL.cell), { width: 196, cols: 18, rows: 22 });
});

test("the phases follow the beats; the deck walk's capture (about 1 s in) shows the first word", () => {
  const times = [0, 0.9, 1.2, 1.49, 1.5, 3, 4.5, 5.99, TIME.break, TIME.waveIn, TIME.end, 99];
  assert.deepEqual(times.map(phaseAt), [0, 0, 0, 0, 1, 2, 3, 3, PHASE.build, PHASE.wave, PHASE.done, PHASE.done]);
  assert.ok(Math.abs(TIME.end - (TIME.waveIn + TIME.fade + TIME.wave)) < 1e-9, "The wave ends with the scene.");
});

/** A (cols x 4) by (rows x 4) RGBA image; `paint` gives each pixel from its cell and sample. */
function image(cols: number, rows: number, paint: (col: number, row: number, sx: number, sy: number) => [number, number, number, number]) {
  const width = cols * 4;
  const data = new Uint8ClampedArray(width * rows * 4 * 4);
  for (let y = 0; y < rows * 4; y++) {
    for (let x = 0; x < width; x++) data.set(paint(Math.floor(x / 4), Math.floor(y / 4), x % 4, y % 4), (y * width + x) * 4);
  }
  return data;
}

test("voxelize keeps opaque cells with their tone and average color", () => {
  const data = image(3, 1, (col, _row, sx, sy) => {
    if (col === 0) return [250, 100, 40, 255];
    // Half covered: not a cube.
    if (col === 1) return sy < 2 ? [20, 20, 20, 255] : [0, 0, 0, 0];
    // 7 ink pixels beat 9 cream ones (7 x 1.6 > 9): eyes survive.
    return sx + sy * 4 < 7 ? [20, 20, 22, 255] : [230, 220, 200, 255];
  });
  assert.deepEqual(voxelize(data, 3, 1, 10, 100, 200), [
    { x: 105, y: 205, size: 10, tone: "orange", color: [250, 100, 40] },
    { x: 125, y: 205, size: 10, tone: "ink", color: [20, 20, 22] },
  ]);
  assert.deepEqual([classify(24, 24, 26), classify(243, 98, 44), classify(232, 218, 205), classify(212, 175, 55)], ["ink", "orange", "cream", "cream"]);
});

/** A rough mascot: cream cubes with orange speckles (one cell in `every`), two ink eyes, orange feet. */
function mascot(left: number, top: number, cell: number, cols: number, rows: number, every: number): Voxel[] {
  const voxels: Voxel[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tone = row === 2 && (col === 2 || col === cols - 3) ? "ink" : row === rows - 1 || (row * 7 + col * 3) % every === 0 ? "orange" : "cream";
      const color = tone === "orange" ? ([243, 98, 44] as const) : tone === "ink" ? ([24, 24, 26] as const) : ([232, 218, 205] as const);
      voxels.push({ x: left + col * cell + cell / 2, y: top + row * cell + cell / 2, size: cell, tone, color });
    }
  }
  return voxels;
}
// 540 cubes (about 120 orange, 2 ink) for 118 bricks and a 336-cube small mascot (about 45 orange, 2 ink).
const SOURCES = mascot(poseLeft("hourglass"), BIG_TOP, BIG.cell, 18, 30, 5);
const SMALL_CUBES = mascot(SMALL.left, SMALL_TOP, SMALL.cell, 16, 21, 11);

function roles(model: Model) {
  return {
    text: model.cubes.filter((cube) => cube.role === "text"),
    blok: model.cubes.filter((cube) => cube.role === "blok"),
    spare: model.cubes.filter((cube) => cube.role === "spare"),
  };
}

test("every cube has at most one place, and the colors match", () => {
  const model = buildModel(SOURCES, SMALL_CUBES);
  const { text, blok, spare } = roles(model);
  assert.equal(text.length, BRICKS.length);
  assert.equal(blok.length, SMALL_CUBES.length);
  assert.equal(model.popped, 0);
  assert.equal(spare.length, SOURCES.length - BRICKS.length - SMALL_CUBES.length);
  const used = model.cubes.flatMap((cube) => (cube.from ? [cube.from] : []));
  assert.equal(new Set(used).size, used.length, "No cube is used twice.");
  assert.equal(used.length, SOURCES.length);
  for (const cube of blok) assert.deepEqual(cube.from?.color, cube.to?.color, "The small mascot keeps its colors.");
  for (const cube of text) if (cube.to?.brick === "orange") assert.equal(cube.from?.tone, "orange");
  assert.deepEqual(buildModel(SOURCES, SMALL_CUBES), model, "Same input, same show.");
});

test("the schedule: words, then bricks in order, then the small mascot, then its wave", () => {
  const { text, blok, spare } = roles(buildModel(SOURCES, SMALL_CUBES));
  text.forEach((cube, i) => {
    assert.ok(cube.launch >= TIME.launch - 1e-9 && cube.launch < cube.land);
    if (i) assert.ok(cube.land > text[i - 1]!.land);
    assert.ok(cube.land >= TIME.textLand && cube.land <= TIME.textLand + TIME.textSpan + TIME.wordPause + 1e-9);
  });
  const lastText = text.at(-1)!.land;
  for (const cube of blok) {
    assert.ok(cube.launch > TIME.launch && cube.land >= TIME.blokLand && cube.land > lastText);
    assert.ok(cube.land + POP <= TIME.waveIn + 1e-9);
  }
  for (const cube of spare) assert.ok(cube.launch > TIME.launch && cube.land < TIME.blokLand);
});

test("too few cubes: the missing bricks pop in; none at all: everything pops in", () => {
  const few = buildModel(SOURCES.slice(0, 50), SMALL_CUBES);
  assert.equal(few.spares, 0);
  assert.equal(few.popped, BRICKS.length + SMALL_CUBES.length - 50);
  const none = buildModel([], []);
  assert.equal(none.cubes.length, BRICKS.length);
  assert.equal(none.popped, BRICKS.length);
  for (const cube of none.cubes) assert.equal(cube.launch, cube.land);
});

test("every frame: nothing before the break, inside the band, home before launch, on target after landing", () => {
  const model = buildModel(SOURCES, SMALL_CUBES);
  const steps = Math.ceil((TIME.end + 0.5) * 60);
  for (let s = 0; s <= steps; s++) {
    const t = s / 60;
    for (const cube of model.cubes) {
      const frame = cubeAt(cube, t);
      if (t < TIME.break) {
        assert.equal(frame, null);
        continue;
      }
      if (!frame) continue;
      for (const value of [frame.x, frame.y, frame.size, frame.angle, frame.alpha, frame.scale, frame.brickMix]) assert.ok(Number.isFinite(value), `${cube.role} at ${t}`);
      const reach = frame.size * frame.scale * Math.SQRT1_2;
      assert.ok(frame.y - reach >= BAND.top && frame.y + reach <= BAND.top + BAND.height, `${cube.role} at ${t}: y ${frame.y}`);
      assert.ok(frame.x - reach >= 0 && frame.x + reach <= 1920, `${cube.role} at ${t}: x ${frame.x}`);
      assert.ok(frame.alpha >= 0 && frame.alpha <= 1);
      if (cube.from && t < cube.launch) assert.ok(Math.abs(frame.x - cube.from.x) <= 2.5 && Math.abs(frame.y - cube.from.y) <= 2.5);
      if (cube.to && t >= cube.land + POP + 1e-6) {
        assert.deepEqual([frame.x, frame.y, frame.angle], [cube.to.x, cube.to.y, 0]);
        assert.ok(Math.abs(frame.scale - 1) < 1e-9);
      }
    }
  }
  // The last frame is the bricks alone.
  const last = model.cubes.map((cube) => cubeAt(cube, TIME.end)).filter((frame) => frame !== null);
  assert.deepEqual(last.map((frame) => [frame.x, frame.y, frame.brick]), BRICKS.map((brick) => [brick.x, brick.y, brick.tone]));
});
