"use client";

// Small helpers shared by the data-model slides (D1-D8). Nothing here moves on its own: every
// transition starts when the presenter's step changes, and runs once.

import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { EASE } from "../../ui";

/** Fades and rises in while `on`, fades out otherwise. `delay` applies only on the way in. */
export function Show({
  on,
  delay = 0,
  y = 14,
  dim = 0,
  className,
  style,
  children,
}: {
  on: boolean;
  delay?: number;
  y?: number;
  /** Opacity while off (0 hides it; 0.1-0.2 keeps a ghost in place). */
  dim?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={false}
      animate={{ opacity: on ? 1 : dim, y: on ? 0 : y }}
      transition={{ duration: 0.45, ease: EASE, delay: on ? delay : 0 }}
      aria-hidden={!on && dim === 0}
    >
      {children}
    </motion.div>
  );
}

/** The space color of the design canvas, used for cut-outs that sit over lines. */
export const SPACE = "#08091F";
/** A darker orange the canvas uses for errors and broken links. */
export const ALERT = "#C9572F";

/** Shared headline sub-line color of the canvas (Sand at 72 %). */
export const SUB = "rgba(246,244,239,0.72)";

/** Sand table shadow of the canvas. */
export const CARD_SHADOW = "0 28px 72px rgba(0,0,0,0.55)";
