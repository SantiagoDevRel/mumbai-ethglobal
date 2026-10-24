"use client";

// The Arkiv mascot placeholder, in one place (design handoff section 10). A voxel figure on a 9x9
// grid: an Ink head with the official orange [ A ] mark as its face, a Sand body with two Orange
// accents, Stone arms and legs, Ink boots. The intended art is pending brand review; to swap it in
// later, change only this file and keep the props (poses map one to one).
// Never print the mascot's name on screen or in alt text.

import { motion } from "motion/react";
import type { CSSProperties } from "react";

export type MascotPose = "wave" | "stand" | "nope" | "point";

const INK = "#111111";
const SAND = "#F6F4EF";
const STONE = "#E9E6DE";
const ORANGE = "#FE7446";

type Cell = [x: number, y: number, fill: string];

/** Head, body, left arm, legs and boots: the cells every pose shares. */
const BASE: Cell[] = (() => {
  const cells: Cell[] = [];
  for (let y = 0; y < 4; y++) for (let x = 2; x < 6; x++) cells.push([x, y, INK]);
  for (let y = 4; y < 7; y++) {
    for (let x = 2; x < 6; x++) cells.push([x, y, (x === 3 && y === 5) || (x === 5 && y === 4) ? ORANGE : SAND]);
  }
  cells.push([1, 4, STONE], [1, 5, STONE], [1, 6, SAND]);
  cells.push([2, 7, STONE], [5, 7, STONE], [2, 8, INK], [5, 8, INK]);
  return cells;
})();

/** The right arm (viewer's right) per pose. */
const ARMS: Record<MascotPose, Cell[]> = {
  wave: [[6, 4, STONE], [7, 3, STONE], [7, 2, STONE], [7, 1, ORANGE]],
  stand: [[6, 4, STONE], [6, 5, STONE], [6, 6, SAND]],
  nope: [[6, 4, STONE], [6, 3, STONE], [6, 2, ORANGE], [7, 2, ORANGE]],
  point: [[6, 4, STONE], [7, 4, STONE], [8, 4, ORANGE]],
};

/** [ A ] mark aspect (public/brand/a-orange.svg is 388 x 218). */
const MARK_ASPECT = 218 / 388;

function cubeStyle([x, y, fill]: Cell, unit: number, joint: string): CSSProperties {
  const bevel = Math.round(unit / 10);
  const ink = fill === INK;
  return {
    position: "absolute",
    left: x * unit,
    top: y * unit,
    width: unit,
    height: unit,
    boxSizing: "border-box",
    borderRadius: 2,
    background: fill,
    border: `${Math.max(1, Math.round(unit / 20))}px solid ${ink ? "rgba(246,244,239,0.22)" : "rgba(17,17,17,0.22)"}`,
    boxShadow:
      `inset ${bevel}px ${bevel}px 0 rgba(255,255,255,${ink ? 0.08 : 0.4}),` +
      `inset -${bevel}px -${bevel}px 0 rgba(17,17,17,${ink ? 0.5 : 0.14}),` +
      `0 0 0 ${Math.max(1, Math.round(unit / 16))}px ${joint}`,
  };
}

/**
 * Placeholder mascot, `9 * unit` px square (smallest unit 8). `on` picks the joint outline: Sand on
 * dark backgrounds, Ink on light ones. In the `wave` pose the raised arm swings unless `still`;
 * motion respects reduced motion through the parent MotionConfig.
 */
export function Mascot({
  pose = "stand",
  unit = 20,
  on = "dark",
  still = false,
  className,
  style,
}: {
  pose?: MascotPose;
  unit?: number;
  on?: "dark" | "light";
  still?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const u = Math.max(8, unit);
  const joint = on === "dark" ? SAND : INK;
  const markW = 3.2 * u;
  const arm = ARMS[pose];
  return (
    <div
      role="img"
      aria-label={`Arkiv mascot placeholder, ${pose}`}
      className={className}
      style={{ position: "relative", width: 9 * u, height: 9 * u, flex: "none", ...style }}
    >
      {BASE.map((c) => (
        <div key={`${c[0]}-${c[1]}`} style={cubeStyle(c, u, joint)} />
      ))}
      {pose === "wave" && !still ? (
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: `${6.5 * u}px ${4.5 * u}px` }}
          animate={{ rotate: [0, -10, 4, -10, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
        >
          {arm.map((c) => (
            <div key={`${c[0]}-${c[1]}`} style={cubeStyle(c, u, joint)} />
          ))}
        </motion.div>
      ) : (
        arm.map((c) => <div key={`${c[0]}-${c[1]}`} style={cubeStyle(c, u, joint)} />)
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed brand SVG inside a sized box */}
      <img
        src="/brand/a-orange.svg"
        alt=""
        aria-hidden
        width={markW}
        height={markW * MARK_ASPECT}
        style={{ position: "absolute", left: 2 * u + (4 * u - markW) / 2, top: 1.15 * u, width: markW, height: markW * MARK_ASPECT }}
      />
    </div>
  );
}
