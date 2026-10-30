"use client";

// Building blocks shared by every scene. Everything is drawn in stage pixels (1920x1080), on the
// numbers of the design handoff (design/HANDOFF.md): headline at top 160, the corner QR card
// top-right (x 1464-1888, y 56-272), captions as one-line pills at top 60. The logo sits at the
// bottom center of every slide (`FootLogo`). The outline bar (components/stage/OutlineBar.tsx) takes
// the top 56 px of every scene but the title.

import Image from "next/image";
import { motion, MotionConfig, type Transition } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

export const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];
/** Panel in/out (handoff 7): 240 ms in, 160 ms out. */
export const PANEL_EASE: Transition["ease"] = [0.2, 0.8, 0.2, 1];

/** Sand-on-dark text steps (handoff 1). */
export const T = {
  t84: "rgba(246,244,239,0.84)",
  t64: "rgba(246,244,239,0.64)",
  t56: "rgba(246,244,239,0.56)",
  t50: "rgba(246,244,239,0.50)",
  t42: "rgba(246,244,239,0.42)",
  t28: "rgba(246,244,239,0.28)",
  t14: "rgba(246,244,239,0.14)",
  t08: "rgba(246,244,239,0.08)",
} as const;

/** The `.panel` card of the handoff, as Tailwind classes. Slides draw it without a backdrop blur: the
 * wash under it is already dark, and a blur over the globe made every slide change and reveal
 * redraw the blur on each frame (October 28: transitions lagged on /map). */
export const PANEL =
  "rounded-[16px] border border-[rgba(246,244,239,0.12)] bg-[rgba(17,17,17,0.78)] shadow-[0_12px_40px_rgba(0,0,0,0.45)]";

/** The same card over the live map (captions, L9's links), where the blur keeps text readable. */
export const GLASS = `${PANEL} backdrop-blur-[16px]`;

/** How long a reveal takes to land on its → (seconds). The slide change itself is StageFrame's. */
export const REVEAL_TIME = 0.3;

/** How far a slide's backdrop reaches past the 1920x1080 box on each side, in stage pixels. A slide
 * fits the window ("contain"), so a window wider or taller than 16:9 has bands beside or above the
 * box; the backdrop fills them (windows from about 1:3 to 6:1) and StageBox's window-sized wrapper
 * clips the rest. Santiago, October 29: the globe showed in a band beside a slide. */
export const BLEED = 2400;

/** A slide's backdrop over the whole window: `background` covers the box and the bands around it.
 * A gradient's stops run across the whole backdrop, so the box's x 0 is at `BLEED` px. */
export function Wash({ background }: { background: string }) {
  return <div aria-hidden="true" className="absolute" style={{ inset: -BLEED, background }} />;
}

/** Fade-and-rise entrance. Respects reduced motion through the MotionConfig in `Slide`. Scenes in the
 * talk enter all at once on the arrow, so they pass no `delay` (only cut scenes still do). Short, so
 * it lands with the slide instead of after it. */
export function Rise({
  children,
  delay = 0,
  y = 12,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: REVEAL_TIME, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Shows children once `step` reaches `at`, with an entrance; keeps layout space otherwise. */
export function Reveal({
  step,
  at,
  children,
  className,
  style,
  y = 12,
}: {
  step: number;
  at: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  y?: number;
}) {
  const shown = step >= at;
  return (
    <motion.div
      className={className}
      style={style}
      initial={false}
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : y }}
      transition={{ duration: REVEAL_TIME, ease: EASE }}
      aria-hidden={!shown}
    >
      {children}
    </motion.div>
  );
}

/** The official white wordmark (public/brand/arkiv-white.svg, 1389 x 320) at a given height. */
export function Logo({ height, className, style }: { height: number; className?: string; style?: CSSProperties }) {
  return (
    <Image
      src="/brand/arkiv-white.svg"
      alt="Arkiv"
      width={Math.round((height * 1389) / 320)}
      height={height}
      priority
      className={className}
      style={style}
    />
  );
}

/** Where every slide draws the logo: bottom center (Santiago, October 30: at the top left it got in
 * the way of the text). A slide keeps its text and pictures out of this box grown by 16 px on each
 * side; tests/deck-walk.mjs checks that on every scene and step. */
export const FOOT_LOGO = { height: 28, width: Math.round((28 * 1389) / 320), top: 1028 } as const;

export function FootLogo() {
  return (
    <div
      data-foot-logo=""
      className="absolute"
      style={{ left: (1920 - FOOT_LOGO.width) / 2, top: FOOT_LOGO.top, width: FOOT_LOGO.width, height: FOOT_LOGO.height }}
    >
      <Logo height={FOOT_LOGO.height} className="block" />
    </div>
  );
}

/**
 * The slide shell: the space color over the globe, across the whole window (`Wash`; the globe shows
 * through at 1 - `wash`), a headline (8 words or fewer, 2 lines max), at most one line under it and
 * the logo at the bottom center. The headline stops at x 1432 so the corner QR card stays clear. The
 * headline doesn't rise on its own: it comes in with the slide's fade, so two slides' headlines never
 * show offset during a change.
 */
export function Slide({
  headline,
  under,
  children,
  wash = 0.74,
  size = 80,
}: {
  headline: ReactNode;
  under?: ReactNode;
  children?: ReactNode;
  /** Opacity of the space wash over the globe (handoff 5: globe at 18-35 % on content slides). */
  wash?: number;
  /** Headline size, 72-80. */
  size?: 72 | 80;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <Wash background={`rgba(8,9,31,${wash})`} />
        <FootLogo />
        <div className="absolute left-[96px] top-[160px] w-[1336px]">
          <h1 className="font-semibold leading-[1.05] tracking-[-0.015em]" style={{ fontSize: size }}>
            {headline}
          </h1>
          {under ? (
            <p className="mt-4 text-[32px] leading-[1.35]" style={{ color: T.t64 }}>
              {under}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </MotionConfig>
  );
}

/** Overlay shell for live scenes: no wash, the map is the stage. */
export function OverlayShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">{children}</div>
    </MotionConfig>
  );
}

/** A code well inside a glass card (L1's Write it and Query it popups, ./scenes/live.tsx). */
export const WELL = "rounded-[12px] border border-[rgba(246,244,239,0.1)] bg-[rgba(8,9,31,0.6)]";

/** The Orange keyboard-focus ring of a button on the stage. */
export const FOCUS =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[var(--arkiv-orange)]";

/**
 * Caption pill for live scenes (handoff 4): one line, 32/600, at (432, 60); at (352, 60) when the
 * right column holds a wide panel (`wide`). Below the outline bar.
 */
export function Caption({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="absolute top-[60px]" style={{ left: wide ? 352 : 432 }}>
      <div className={`${GLASS} flex h-[64px] items-center whitespace-nowrap rounded-[999px] px-[28px]`}>
        <p className="text-[32px] font-semibold">{children}</p>
      </div>
    </div>
  );
}

/** A glass card on the stage. `accent` outlines it in Orange (new, live or actionable). */
export function Panel({
  children,
  className = "",
  style,
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  accent?: boolean;
}) {
  return (
    <div className={`${PANEL} ${accent ? "!border-[var(--arkiv-orange)]" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Chip({ children, tone = "orange" }: { children: ReactNode; tone?: "orange" | "blue" | "sand" }) {
  const styles =
    tone === "orange"
      ? "border-[var(--arkiv-orange)] text-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.78)]"
      : tone === "blue"
        ? "border-[var(--arkiv-blue)] text-[var(--arkiv-sand)] bg-[var(--arkiv-blue)]"
        : "border-[rgba(246,244,239,0.28)] text-[var(--arkiv-sand)] bg-[rgba(17,17,17,0.78)]";
  return <span className={`inline-flex items-center gap-3 rounded-full border-[1.5px] px-6 py-2.5 text-[26px] font-semibold ${styles}`}>{children}</span>;
}

/** The `app-side` chip: 1.5 px dashed, radius 8, 15/600 (handoff 4). `label` reuses it, e.g. "not run today". */
export function AppSide({ className = "", label = "app-side" }: { className?: string; label?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[8px] border-[1.5px] border-dashed px-2 py-0.5 text-[15px] font-semibold ${className}`}
      style={{ borderColor: T.t50, color: T.t84 }}
    >
      {label}
    </span>
  );
}
