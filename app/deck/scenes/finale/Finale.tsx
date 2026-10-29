"use client";

// L9, the close (Santiago, October 29): the mascot says the four verbs, one pose each, then comes apart
// into cubes that stack into THANK YOU in bricks, and a small copy of it waves beside them while the
// globe keeps its live dots behind. The START BUILDING links are real links on a card that takes the
// pointer, so the globe under it no longer drags from there. Plays once per entry (a click on the
// bricks plays it again); with reduced motion, and in the /outline previews, the last frame shows at
// once. Geometry and timing live in ./bricks.ts, where the node tests check them.

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { usePrefersReducedMotion } from "../../../../components/stage/StageFrame";
import { Mascot } from "../../Mascot";
import { MASCOT_ART } from "../../mascot-art";
import { GLASS, OverlayShell, PANEL_EASE, Rise, T } from "../../ui";
import {
  artGrid,
  BAND,
  BEATS,
  BIG,
  BIG_TOP,
  BRICK_COLOR,
  BRICKS,
  BUBBLE,
  buildModel,
  cubeAt,
  LAYER,
  PHASE,
  PHASE_NAMES,
  phaseAt,
  poseLeft,
  SAMPLES,
  SMALL,
  SMALL_TOP,
  STAGE_W,
  TEXT,
  TEXT_BOX,
  TIME,
  voxelize,
  type BrickTone,
  type Frame,
  type Model,
  type RGB,
} from "./bricks";

const LINKS = [
  { name: "Docs", where: "docs.arkiv.network", href: "https://docs.arkiv.network" },
  { name: "Hub", where: "hub.arkiv.network", href: "https://hub.arkiv.network" },
  { name: "MCP", where: "mcp.arkiv.network", href: "https://mcp.arkiv.network" },
  { name: "Prizes", where: "ethglobal.com/events/mumbai/prizes/arkiv", href: "https://ethglobal.com/events/mumbai/prizes/arkiv" },
] as const;

export function L9(_props: SceneContentProps) {
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [run, setRun] = useState(0);
  const [livePhase, setLivePhase] = useState(0);
  const phase = reduced ? PHASE.done : livePhase;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // The /outline previews and reduced motion get the last frame, drawn once (and on resize).
    const still = reduced || canvas.closest("[data-preview]") !== null;
    const paint = painter(ctx);
    let look = lookFor(canvas, null);
    let t = still ? TIME.end : 0;
    let model: Model | null = null;
    // The stage rescales when React re-renders after the resize, so the canvas is measured two
    // frames later, once the new scale is on screen (going full screen on L9 keeps the bricks sharp).
    let settle = 0;
    const onResize = () => {
      cancelAnimationFrame(settle);
      settle = requestAnimationFrame(() => {
        settle = requestAnimationFrame(() => {
          look = lookFor(canvas, look);
          paint(look, model, t, true);
        });
      });
    };
    window.addEventListener("resize", onResize);
    let frame = 0;
    if (still) paint(look, model, t, true);
    else {
      sample();
      let last = performance.now();
      let shown = 0;
      const tick = (now: number) => {
        // Capped steps: a hidden tab pauses the show instead of skipping it, and a slow machine (down
        // to 4 frames a second) still plays it in real time.
        t += Math.min(0.25, Math.max(0, now - last) / 1000);
        last = now;
        // The cubes are fixed when the mascot breaks: read from the art, or none if it never loaded.
        if (!model && t >= TIME.break) model = sampled ?? buildModel([], []);
        const next = phaseAt(t);
        if (next !== shown) {
          shown = next;
          setLivePhase(next);
        }
        paint(look, model, t, false);
        if (t < TIME.end) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settle);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced, run]);

  const replay = () => {
    setLivePhase(0);
    setRun((count) => count + 1);
  };

  return (
    <OverlayShell>
      <div className="pointer-events-none absolute inset-0" data-finale={PHASE_NAMES[phase]}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Thank you"
          className="pointer-events-none absolute left-0"
          style={{ top: BAND.top, width: STAGE_W, height: BAND.height }}
        />
        <Performer phase={phase} />
        <Waver phase={phase} reduced={reduced} />
        <Bubble phase={phase} />
        {phase === PHASE.done && !reduced ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Replay"
            onMouseDown={(event) => event.preventDefault()}
            onClick={replay}
            className="pointer-events-auto absolute cursor-pointer [[data-preview]_&]:hidden"
            style={{ left: TEXT_BOX.left, top: TEXT_BOX.top, width: TEXT_BOX.width, height: TEXT_BOX.height }}
          />
        ) : null}
        <StartBuilding />
      </div>
    </OverlayShell>
  );
}

/** One pose per word, its head on the same spot: the first rises in, the next ones drop in with a hop. */
function Performer({ phase }: { phase: number }) {
  const beat = BEATS[phase];
  return (
    <AnimatePresence>
      {beat ? (
        <motion.div
          key={beat.pose}
          className="pointer-events-none absolute [[data-preview]_&]:hidden"
          style={{ left: poseLeft(beat.pose), top: BIG_TOP }}
          initial={{ opacity: 0, y: phase === 0 ? 32 : -30 }}
          animate={{ opacity: 1, y: 0 }}
          // The last pose fades while its cubes appear on the canvas.
          exit={{ opacity: 0, transition: { duration: beat.pose === "hourglass" ? 0.2 : 0.07 } }}
          transition={{ opacity: { duration: 0.1 }, y: { type: "spring", stiffness: 520, damping: 20 } }}
        >
          <Mascot pose={beat.pose} height={BIG.height} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** The word, in a speech bubble whose tail points at the mascot. */
function Bubble({ phase }: { phase: number }) {
  const word = BEATS[phase]?.word;
  return (
    <AnimatePresence mode="wait">
      {word ? (
        <motion.div
          key={word}
          className="pointer-events-none absolute [[data-preview]_&]:hidden"
          style={{ right: STAGE_W - BUBBLE.right, top: BUBBLE.top, transformOrigin: "100% 20%", filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.5))" }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1, transition: { opacity: { duration: 0.12 }, scale: { type: "spring", stiffness: 560, damping: 22 } } }}
          exit={{ opacity: 0, scale: 0.86, transition: { duration: 0.12, ease: PANEL_EASE } }}
        >
          <div className="relative flex items-center rounded-[28px] bg-[var(--arkiv-sand)] px-10" style={{ height: BUBBLE.height }}>
            <p className="whitespace-nowrap text-[68px] font-bold leading-none tracking-[-0.02em] text-[var(--arkiv-ink)]">{word}</p>
            <svg aria-hidden className="absolute -right-16 -top-4" width={72} height={96} viewBox="0 0 72 96">
              <path d="M0 52 L8 52 C30 48 52 32 68 4 C60 40 40 76 8 92 L0 92 Z" fill="var(--arkiv-sand)" />
            </svg>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** The small mascot's picture: it fades in over its cubes, waves once and stays. */
function Waver({ phase, reduced }: { phase: number; reduced: boolean }) {
  const shown = phase >= PHASE.wave;
  const waving = phase === PHASE.wave && !reduced;
  return (
    <motion.div
      aria-hidden={!shown}
      className="pointer-events-none absolute [[data-preview]_&]:!opacity-100"
      style={{ left: SMALL.left, top: SMALL_TOP, transformOrigin: "50% 100%" }}
      initial={false}
      animate={waving ? { opacity: 1, rotate: [0, -7, 6, -7, 5, 0], y: [0, -14, 0, -6, 0, 0] } : { opacity: shown ? 1 : 0, rotate: 0, y: 0 }}
      transition={
        waving
          ? { opacity: { duration: TIME.fade }, rotate: { duration: TIME.wave, delay: TIME.fade, ease: "easeInOut" }, y: { duration: TIME.wave, delay: TIME.fade, ease: "easeOut" } }
          : { duration: 0 }
      }
    >
      <Mascot pose="wave" height={SMALL.height} />
    </motion.div>
  );
}

/** Real links on a card that takes the pointer: no globe drag under it, text selectable, a new tab each. */
function StartBuilding() {
  return (
    <Rise className={`${GLASS} pointer-events-auto absolute left-[1464px] top-[80px] flex w-[424px] cursor-auto select-text flex-col gap-2 p-4`}>
      <p className="px-4 pt-2 text-[20px] font-bold leading-none tracking-[0.1em]" style={{ color: T.t64 }}>
        START BUILDING
      </p>
      {LINKS.map(({ name, where, href }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noreferrer"
          draggable={false}
          onClick={keepSelection}
          className="group flex cursor-pointer items-center gap-3 rounded-[12px] px-4 py-1.5 transition-colors duration-150 hover:bg-[rgba(246,244,239,0.08)] focus-visible:bg-[rgba(246,244,239,0.08)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[28px] font-semibold leading-[1.2]">{name}</span>
            {/* A long address breaks after a slash; <wbr> keeps copied text clean. */}
            <span className="font-mono text-[24px] leading-[1.3] text-[var(--arkiv-orange)] decoration-[1.5px] underline-offset-[5px] group-hover:underline">
              {where.split("/").flatMap((part, i) => (i ? ["/", <wbr key={i} />, part] : [part]))}
            </span>
          </span>
          <ArrowUpRight
            aria-hidden
            size={28}
            strokeWidth={2.25}
            className="shrink-0 text-[rgba(246,244,239,0.42)] transition-[color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--arkiv-orange)] group-focus-visible:text-[var(--arkiv-orange)]"
          />
        </a>
      ))}
    </Rise>
  );
}

/** A drag that selects part of a link's text keeps the selection instead of opening the link. */
function keepSelection(event: MouseEvent<HTMLAnchorElement>) {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && event.currentTarget.contains(selection.anchorNode)) event.preventDefault();
}

// The cubes, read from the art once per page.

let sampled: Model | null = null;
let sampling: Promise<void> | null = null;

function sample(): void {
  sampling ??= Promise.all([pixels("hourglass", BIG.height, BIG.cell), pixels("wave", SMALL.height, SMALL.cell)])
    .then(([big, small]) => {
      sampled = buildModel(
        voxelize(big.data, big.cols, big.rows, BIG.cell, poseLeft("hourglass"), BIG_TOP),
        voxelize(small.data, small.cols, small.rows, SMALL.cell, SMALL.left, SMALL_TOP),
      );
    })
    .catch(() => {
      // Without the art the bricks pop in where they land, and the waving picture still comes last.
    });
}

/** The pose drawn `height` px tall at SAMPLES x SAMPLES pixels per cell, read back as RGBA. */
async function pixels(pose: "hourglass" | "wave", height: number, cell: number) {
  const { width, cols, rows } = artGrid(pose, height, cell);
  const image = new Image();
  image.src = `/deck/mascot/${MASCOT_ART[pose].file}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = cols * SAMPLES;
  canvas.height = rows * SAMPLES;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No 2D canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, (width * SAMPLES) / cell, (height * SAMPLES) / cell);
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, cols, rows };
}

// Drawing.

type Look = { ratio: number; bricks: Record<BrickTone, HTMLCanvasElement> };

/** Canvas pixels per stage pixel (the stage's scale on screen x the device pixel ratio, at most 2), and
 * brick sprites drawn at that ratio, so the bricks stay sharp at any size. */
function lookFor(canvas: HTMLCanvasElement, old: Look | null): Look {
  const box = canvas.getBoundingClientRect();
  const ratio = Math.round(Math.min(2, Math.max(0.2, (box.width / STAGE_W) * (window.devicePixelRatio || 1))) * 100) / 100;
  if (old && old.ratio === ratio) return old;
  canvas.width = Math.round(STAGE_W * ratio);
  canvas.height = Math.round(BAND.height * ratio);
  return { ratio, bricks: { sand: brickSprite("sand", ratio), orange: brickSprite("orange", ratio) } };
}

/** Paints the frame at `t`. Before the break the canvas stays empty, cleared only once. */
function painter(ctx: CanvasRenderingContext2D) {
  let dirty = true;
  return (look: Look, model: Model | null, t: number, force: boolean) => {
    if (t < TIME.break && !dirty && !force) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    dirty = t >= TIME.break;
    if (t >= TIME.end) {
      for (const brick of BRICKS) drawFrame(ctx, look, { x: brick.x, y: brick.y, size: TEXT.cell, angle: 0, color: BRICK_COLOR[brick.tone], brick: brick.tone, brickMix: 1, alpha: 1, scale: 1, layer: LAYER.bricks });
    } else if (model && t >= TIME.break) {
      const frames = model.cubes.map((cube) => cubeAt(cube, t));
      for (let layer = LAYER.bricks; layer <= LAYER.air; layer++) {
        for (const frame of frames) if (frame && frame.layer === layer) drawFrame(ctx, look, frame);
      }
    }
    ctx.globalAlpha = 1;
  };
}

function drawFrame(ctx: CanvasRenderingContext2D, look: Look, frame: Frame) {
  if (frame.alpha <= 0 || frame.scale <= 0) return;
  const k = look.ratio * frame.scale;
  const cos = Math.cos(frame.angle) * k;
  const sin = Math.sin(frame.angle) * k;
  ctx.setTransform(cos, sin, -sin, cos, frame.x * look.ratio, (frame.y - BAND.top) * look.ratio);
  if (frame.brickMix < 1) {
    ctx.globalAlpha = frame.alpha;
    drawCube(ctx, frame.size, frame.color);
  }
  if (frame.brick && frame.brickMix > 0) {
    ctx.globalAlpha = frame.alpha * frame.brickMix;
    const half = (frame.size / TEXT.cell) * (TEXT.cell / 2 + PAD);
    ctx.drawImage(look.bricks[frame.brick], -half, -half, 2 * half, 2 * half);
  }
}

/** A voxel: its color, a lighter middle and a rim, the same on all four sides (a quarter turn looks the same). */
function drawCube(ctx: CanvasRenderingContext2D, size: number, color: RGB) {
  const h = size / 2;
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  ctx.fillRect(-h + 0.5, -h + 0.5, size - 1, size - 1);
  const inset = size * 0.24;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(-h + inset, -h + inset, size - 2 * inset, size - 2 * inset);
  // Dark cubes (the eyes) get a light rim, so they still read over the night side of the globe.
  ctx.strokeStyle = Math.max(color[0], color[1], color[2]) < 90 ? "rgba(246,244,239,0.3)" : "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(-h + 1, -h + 1, size - 2, size - 2);
}

/** Room for a brick's shadow around its cell, in stage pixels. */
const PAD = 4;
const BRICK_LOOK: Record<BrickTone, { face: string; light: string; shade: string }> = {
  sand: { face: "#f6f4ef", light: "#ffffff", shade: "#cfc7b6" },
  orange: { face: "#fe7446", light: "#ffa483", shade: "#c8512b" },
};

/** One building brick seen from above: a soft shadow, the face with a light top edge and a darker
 * bottom edge, and a stud. */
function brickSprite(tone: BrickTone, ratio: number): HTMLCanvasElement {
  const full = TEXT.cell + 2 * PAD;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = Math.max(1, Math.ceil(full * ratio));
  const ctx = sprite.getContext("2d");
  if (!ctx) return sprite;
  ctx.scale(sprite.width / full, sprite.height / full);
  const { face, light, shade } = BRICK_LOOK[tone];
  const c = TEXT.cell;
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  roundedRect(ctx, PAD + 1, PAD + 3, c - 2, c - 1, 4);
  ctx.fill();
  roundedRect(ctx, PAD + 1, PAD + 1, c - 2, c - 2, 3.5);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.fillRect(PAD, PAD + c - 5, c, 5);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = light;
  ctx.fillRect(PAD, PAD, c, 2.5);
  ctx.restore();
  const cx = PAD + c / 2;
  const cy = PAD + c / 2 - 1.5;
  const r = c * 0.27;
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(cx, cy + 1.8, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = light;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.6, Math.PI * 1.08, Math.PI * 1.72);
  ctx.stroke();
  return sprite;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
