"use client";

// The Arkiv mascot, in one place. Renders the delivered art from public/deck/mascot/ as is: no
// stretching, recolouring, shadows or rotation. The art is a proposal pending brand review and is
// not covered by the repo's MIT license.
// Never print the mascot's name on screen or in alt text.

import type { CSSProperties } from "react";

export type MascotPose = "wave" | "stand" | "nope" | "point";

/** Delivered pose and expression per scene pose. */
const ART: Record<MascotPose, "stand-smile" | "stand-serious" | "wave-smile"> = {
  stand: "stand-smile",
  wave: "wave-smile",
  nope: "stand-serious",
  point: "wave-smile",
};

/** Intrinsic width / height. The digital SVGs share one 750 x 1000 canvas; the 3D renders don't. */
const DIGITAL_ASPECT = 750 / 1000;
const RENDER_ASPECT = { stand: 591 / 1024, wave: 728 / 1024 } as const;

/**
 * Mascot `9 * unit` px tall (smallest unit 8), width from the art's own aspect. `variant="3d"` is
 * the front 3D render for hero moments; the default is the digital SVG, Sand-outlined for dark
 * backgrounds or Ink-outlined for light ones (`on`). `still` is kept for callers: the art never moves.
 */
export function Mascot({
  pose = "stand",
  unit = 20,
  on = "dark",
  variant = "digital",
  className,
  style,
}: {
  pose?: MascotPose;
  unit?: number;
  on?: "dark" | "light";
  variant?: "digital" | "3d";
  still?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const art = ART[pose];
  const height = 9 * Math.max(8, unit);
  const render = variant === "3d";
  const aspect = render ? RENDER_ASPECT[art.startsWith("wave") ? "wave" : "stand"] : DIGITAL_ASPECT;
  const src = render
    ? `/deck/mascot/arkiv-mascot-3d-front-${art}-1024.png`
    : `/deck/mascot/arkiv-mascot-digital-${art}-${on === "dark" ? "oscuro" : "claro"}.svg`;
  const width = Math.round(height * aspect);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed brand art at its own aspect
    <img
      src={src}
      alt="Arkiv mascot"
      width={width}
      height={height}
      draggable={false}
      className={className}
      style={{ display: "block", flex: "none", width, height, ...style }}
    />
  );
}
