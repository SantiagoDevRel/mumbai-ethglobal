"use client";

// Building blocks shared by every scene. Everything is drawn in stage pixels (1920x1080), on the
// numbers of the design handoff (design/HANDOFF.md): logo at (96, 72), headline at top 160, the
// corner QR card top-right (x 1464-1888, y 32-204), captions as one-line pills at top 36.

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

/** The `.panel` glass of the handoff, as Tailwind classes. */
export const PANEL =
  "rounded-[16px] border border-[rgba(246,244,239,0.12)] bg-[rgba(17,17,17,0.78)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-[16px]";

/** Fade-and-rise entrance. Respects reduced motion through the MotionConfig in `Slide`. */
export function Rise({
  children,
  delay = 0,
  y = 24,
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
      transition={{ duration: 0.6, delay, ease: EASE }}
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
  y = 24,
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
      transition={{ duration: 0.55, ease: EASE }}
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

/**
 * The slide shell: the space color over the globe (the globe shows through at 1 - `wash`), the
 * logo, a headline (8 words or fewer, 2 lines max) and at most one line under it. The headline
 * stops at x 1432 so the corner QR card stays clear.
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
        <div className="absolute inset-0" style={{ background: `rgba(8,9,31,${wash})` }} />
        <Logo height={28} className="absolute left-[96px] top-[72px]" />
        <div className="absolute left-[96px] top-[160px] w-[1336px]">
          <Rise delay={0.05}>
            <h1 className="font-semibold leading-[1.05] tracking-[-0.015em]" style={{ fontSize: size }}>
              {headline}
            </h1>
          </Rise>
          {under ? (
            <Rise delay={0.15}>
              <p className="mt-4 text-[32px] leading-[1.35]" style={{ color: T.t64 }}>
                {under}
              </p>
            </Rise>
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

/**
 * Caption pill for live scenes (handoff 4): one line, 32/600, at (432, 36); at (352, 36) when the
 * right column holds a wide panel (`wide`).
 */
export function Caption({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="absolute top-[36px]" style={{ left: wide ? 352 : 432 }}>
      <div className={`${PANEL} flex h-[64px] items-center whitespace-nowrap rounded-[999px] px-[28px]`}>
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
