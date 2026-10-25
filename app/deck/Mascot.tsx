"use client";

// The Arkiv mascot, in one place: 3D voxel renders in public/deck/mascot/ (made with ChatGPT image
// generation from the team's reference art, cut out on a transparent background). Rendered as
// is: no stretching, recolouring or extra shadows. The art is a proposal pending brand review and
// is not covered by the repo's MIT license. Never print the mascot's name on screen or in alt text.

import type { CSSProperties } from "react";
import { MASCOT_ART } from "./mascot-art";

export type MascotPose = keyof typeof MASCOT_ART;

const ALT: Record<MascotPose, string> = {
  stand: "Arkiv mascot",
  wave: "Arkiv mascot waving",
  thumbsUp: "Arkiv mascot, thumbs up",
  thumbsDown: "Arkiv mascot, thumbs down",
  key: "Arkiv mascot holding a key",
  laptop: "Arkiv mascot typing on a laptop",
  magnifier: "Arkiv mascot with a magnifying glass",
  hourglass: "Arkiv mascot holding an hourglass",
};

/** The mascot `height` px tall, width from the art's own aspect. */
export function Mascot({ pose = "stand", height = 180, className, style }: { pose?: MascotPose; height?: number; className?: string; style?: CSSProperties }) {
  const art = MASCOT_ART[pose];
  const width = Math.round((height * art.width) / art.height);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed brand art at its own aspect
    <img
      src={`/deck/mascot/${art.file}`}
      alt={ALT[pose]}
      width={width}
      height={height}
      draggable={false}
      className={className}
      style={{ display: "block", flex: "none", width, height, ...style }}
    />
  );
}
