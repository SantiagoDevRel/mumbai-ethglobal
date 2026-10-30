"use client";

// W2 · The meme (Santiago, October 29): the distracted-boyfriend format with Arkiv's block robots
// (public/deck/memes/arkiv-meme-distracted.webp, 1536 x 1024), as big as fits under the outline bar
// on a dark full-bleed wash. The labels sit right above each character, like the classic: "Web3
// data" over the blue-and-orange robot walking by, "You" over the one turning to look, "Your web2
// database" over the grey one holding its hand. No other copy. One step.

import { MotionConfig } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { FootLogo, Rise } from "../ui";

/** The art's own pixels, and its box on the stage (1350 x 900, centered, 32 px under the outline bar
 * and clear of the logo at the bottom center). */
const ART = { width: 1536, height: 1024 };
const BOX = { left: 285, top: 88, width: 1350, height: 900 };

/** Each label in the art's pixels: centered over the character, the last line's baseline just above its head. */
const LABELS: { lines: string[]; x: number; y: number }[] = [
  { lines: ["Web3 data"], x: 292, y: 148 },
  { lines: ["You"], x: 852, y: 172 },
  { lines: ["Your web2", "database"], x: 1310, y: 220 },
];
const SIZE = 78;
const LEADING = 80;

export function W2(_props: SceneContentProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        {/* Past the stage's edges, so the bands outside 16:9 stay dark too. */}
        <div className="absolute -inset-[2400px] bg-[rgba(8,9,31,0.92)]" />
        <FootLogo />
        <Rise className="absolute" style={{ left: BOX.left, top: BOX.top, width: BOX.width, height: BOX.height }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed art at its own aspect */}
          <img
            src="/deck/memes/arkiv-meme-distracted.webp"
            alt="Three block robots on a city street. The white and orange one walks hand in hand with a grey robot but turns to look at a blue and orange robot walking past."
            width={BOX.width}
            height={BOX.height}
            draggable={false}
            className="block rounded-[24px] shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-[rgba(246,244,239,0.14)]"
            style={{ width: BOX.width, height: BOX.height }}
          />
          <svg className="pointer-events-none absolute left-0 top-0" width={BOX.width} height={BOX.height} viewBox={`0 0 ${ART.width} ${ART.height}`}>
            {LABELS.map((label) => (
              <text
                key={label.lines.join(" ")}
                x={label.x}
                y={label.y - (label.lines.length - 1) * LEADING}
                textAnchor="middle"
                fontSize={SIZE}
                fontWeight={700}
                fill="#F6F4EF"
                stroke="#111111"
                strokeWidth={14}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {label.lines.map((line, i) => (
                  <tspan key={line} x={label.x} dy={i === 0 ? 0 : LEADING}>
                    {line}
                  </tspan>
                ))}
              </text>
            ))}
          </svg>
        </Rise>
      </div>
    </MotionConfig>
  );
}

export const W2_NOTES: string[] = [
  "That's most of us: hand in hand with our web2 database, and we can't stop looking at web3 data. So what does web3 data actually give you?",
];
