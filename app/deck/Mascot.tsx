"use client";

// The Arkiv mascot, in one place. The real mascot is still awaiting brand review, so for now this
// draws a placeholder voxel character in the approved palette with the official [ A ] mark on its
// chest. To swap in the approved art later, change only this file (keep the props).
// Never print the mascot's internal codename on screen or in alt text.

import { motion } from "motion/react";
import type { CSSProperties } from "react";

export type MascotPose = "stand" | "wave";
export type MascotMood = "smile" | "serious";

const SAND = "#F6F4EF";
const STONE = "#E9E6DE";
const ORANGE = "#FE7446";
const INK = "#111111";
const BLUE = "#181EA9";
const SHADE = "rgba(17,17,17,0.16)";

/** One solid block with a shaded right and bottom face, so each part reads as a cube. */
function Block({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} />
      <rect x={x + w - 0.7} y={y} width={0.7} height={h} fill={SHADE} />
      <rect x={x} y={y + h - 0.7} width={w - 0.7} height={0.7} fill={SHADE} />
    </g>
  );
}

/** Small Orange voxels sprinkled on the Sand blocks. */
function Voxels({ cells }: { cells: [number, number][] }) {
  return (
    <g fill={ORANGE}>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1.4} height={1.4} />
      ))}
    </g>
  );
}

function Face({ mood }: { mood: MascotMood }) {
  return (
    <g>
      <rect x={10} y={6} width={3.4} height={3.4} fill={INK} />
      <rect x={16.6} y={6} width={3.4} height={3.4} fill={INK} />
      <rect x={11.9} y={6.6} width={1} height={1} fill={SAND} />
      <rect x={18.5} y={6.6} width={1} height={1} fill={SAND} />
      {mood === "smile" ? (
        <g fill={ORANGE}>
          <rect x={11.5} y={10.6} width={1.2} height={1.2} />
          <rect x={12.7} y={11.8} width={4.6} height={1.2} />
          <rect x={17.3} y={10.6} width={1.2} height={1.2} />
        </g>
      ) : (
        <rect x={12} y={11.8} width={6} height={1.1} fill={ORANGE} />
      )}
    </g>
  );
}

/**
 * Placeholder mascot. `height` in px; the aspect is fixed at 3:4 and the boots touch the bottom
 * edge. `waving` animates the raised arm (pose `wave` only); motion respects reduced motion
 * through the parent MotionConfig.
 */
export function Mascot({
  pose = "stand",
  mood = "smile",
  height,
  waving = true,
  className,
  style,
}: {
  pose?: MascotPose;
  mood?: MascotMood;
  height: number;
  waving?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const width = Math.round((height * 3) / 4);
  return (
    <svg
      role="img"
      aria-label="Arkiv mascot"
      width={width}
      height={height}
      viewBox="0 0 30 40"
      className={className}
      style={style}
      shapeRendering="crispEdges"
    >
      <g style={{ filter: "drop-shadow(0 0 0.4px rgba(246,244,239,0.85))" }}>
        {/* head with three nubs on top */}
        <Block x={9} y={0.5} w={2.4} h={2} fill={SAND} />
        <Block x={13.8} y={0.5} w={2.4} h={2} fill={SAND} />
        <Block x={18.6} y={0.5} w={2.4} h={2} fill={SAND} />
        <Block x={7} y={2} w={16} h={13} fill={SAND} />
        <Voxels cells={[[7, 3], [20.9, 2.6], [7.6, 12.6], [20.4, 12]]} />
        <Face mood={mood} />
        {/* neck */}
        <Block x={13} y={15} w={4} h={1.2} fill={STONE} />
        {/* body with the official [ A ] mark */}
        <Block x={9} y={16} w={12} h={11} fill={SAND} />
        <Voxels cells={[[9.4, 16.4], [18.6, 24.6]]} />
        <rect x={10.6} y={18} width={8.8} height={5} rx={0.4} fill={INK} />
        <image href="/brand/a-orange.svg" x={11.2} y={18.5} width={7.6} height={4} preserveAspectRatio="xMidYMid meet" />
        {/* left arm (viewer's left), always down */}
        <Block x={5} y={17} w={4} h={9} fill={SAND} />
        {/* right arm (viewer's right) */}
        {pose === "stand" ? (
          <Block x={21} y={17} w={4} h={9} fill={SAND} />
        ) : (
          <motion.g
            style={{ transformOrigin: "22px 18px", transformBox: "view-box" }}
            animate={waving ? { rotate: [0, -12, 6, -12, 0] } : undefined}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
          >
            <Block x={21} y={16.5} w={3} h={3.5} fill={SAND} />
            <Block x={23} y={8.5} w={4} h={11.5} fill={SAND} />
            <Block x={22.5} y={4.5} w={5} h={4.5} fill={STONE} />
          </motion.g>
        )}
        {/* legs */}
        <Block x={11} y={27} w={3.2} h={7} fill={STONE} />
        <Block x={15.8} y={27} w={3.2} h={7} fill={STONE} />
        {/* boots: Blue with an Orange sole, outlined in Stone so they read on Ink */}
        <rect x={9.8} y={34} width={4.8} height={4} fill={BLUE} stroke={STONE} strokeWidth={0.25} />
        <rect x={15.4} y={34} width={4.8} height={4} fill={BLUE} stroke={STONE} strokeWidth={0.25} />
        <rect x={9.8} y={38} width={4.8} height={2} fill={ORANGE} />
        <rect x={15.4} y={38} width={4.8} height={2} fill={ORANGE} />
      </g>
    </svg>
  );
}
