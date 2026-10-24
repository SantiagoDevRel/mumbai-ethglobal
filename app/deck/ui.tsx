"use client";

// Building blocks shared by every scene. Everything is drawn in stage pixels (1920x1080).
// Slides sit on translucent dark panels so the globe keeps showing behind them.

import { motion, MotionConfig, type Transition } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

export const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

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

/**
 * The slide shell: a dark translucent wash over the globe, a headline (8 words or fewer) and at
 * most one line under it. The bottom-right corner stays free for the corner QR.
 */
export function Slide({
  headline,
  under,
  kicker,
  children,
  wash = 0.72,
}: {
  headline: ReactNode;
  under?: ReactNode;
  kicker?: string;
  children?: ReactNode;
  /** Opacity of the dark wash over the globe (0 = globe fully visible). */
  wash?: number;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--stage-fg)]">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, rgba(24,30,169,${wash * 0.35}) 0%, rgba(7,8,31,${wash}) 55%, rgba(7,8,31,${Math.min(1, wash + 0.12)}) 100%)`,
          }}
        />
        <div className="absolute left-[120px] right-[120px] top-[96px]">
          {kicker ? (
            <Rise>
              <p className="mb-5 font-mono text-[26px] uppercase tracking-[0.18em] text-[var(--arkiv-orange)]">{kicker}</p>
            </Rise>
          ) : null}
          <Rise delay={0.05}>
            <h1 className="max-w-[1680px] text-[80px] font-semibold leading-[1.04] tracking-[-0.02em]">{headline}</h1>
          </Rise>
          {under ? (
            <Rise delay={0.15}>
              <p className="mt-6 max-w-[1400px] text-[38px] leading-snug text-[var(--stage-muted)]">{under}</p>
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
      <div className="relative h-full w-full text-[var(--stage-fg)]">{children}</div>
    </MotionConfig>
  );
}

/** Caption for live scenes: top-left, clear of the event log (right) and query panel (bottom). */
export function Caption({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="absolute left-[64px] top-[56px] max-w-[1100px]">
      <Rise>
        <div className="inline-block rounded-[20px] border border-[var(--panel-border)] bg-[rgba(7,8,31,0.72)] px-9 py-6 backdrop-blur-md">
          <p className="text-[56px] font-semibold leading-tight tracking-[-0.01em]">{children}</p>
          {sub ? <p className="mt-2 text-[28px] leading-snug text-[var(--stage-muted)]">{sub}</p> : null}
        </div>
      </Rise>
    </div>
  );
}

/** A translucent card on the stage. */
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
    <div
      className={`rounded-[28px] border backdrop-blur-md ${accent ? "border-[var(--arkiv-orange)]" : "border-[var(--panel-border)]"} ${className}`}
      style={{ background: "rgba(17,17,17,0.72)", ...style }}
    >
      {children}
    </div>
  );
}

export function Chip({ children, tone = "orange" }: { children: ReactNode; tone?: "orange" | "blue" | "sand" }) {
  const styles =
    tone === "orange"
      ? "border-[var(--arkiv-orange)] text-[var(--arkiv-orange)]"
      : tone === "blue"
        ? "border-[var(--arkiv-blue)] text-[var(--arkiv-sand)] bg-[rgba(24,30,169,0.75)]"
        : "border-[var(--panel-border)] text-[var(--stage-fg)]";
  return <span className={`inline-flex items-center gap-3 rounded-full border-2 px-7 py-3 text-[32px] font-medium ${styles}`}>{children}</span>;
}

/** Mono label used for Arkiv fields (`$key`, `$owner`, ...). */
export function Field({ children, tone = "orange" }: { children: ReactNode; tone?: "orange" | "sand" }) {
  return (
    <span className={`font-mono ${tone === "orange" ? "text-[var(--arkiv-orange)]" : "text-[var(--stage-fg)]"}`}>{children}</span>
  );
}
