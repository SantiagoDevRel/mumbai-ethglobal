"use client";

// W2 · The meme (Santiago, October 29): the distracted-boyfriend format with Arkiv's block robots
// (public/deck/memes/arkiv-meme-distracted.webp, 1536 x 1024), as big as fits under the outline bar
// on a dark full-bleed wash. The labels sit right above each character, like the classic: "Web3
// data" over the blue-and-orange robot walking by, "Your web2 database" over the grey one holding its
// hand; the one turning to look has no label (Santiago, October 30: it is the audience). No other
// copy. Two steps (Santiago, October 30):
//   0  the meme;
//   1  → the same three robots in the same street (public/deck/memes/arkiv-meme-hug.webp, 1536 x
//      1024): the one in the middle hugs both others and all three smile. The picture crossfades,
//      each label glides to its robot's new spot, and the middle robot gets its name, ARKIV, in Arkiv
//      Orange. No caption: the presenter asks "What if you could keep the best of both?" and W3
//      answers.
// Both pictures are original illustrations made for this deck, in one set with its other memes,
// generated from the same references with no third-party assets.

import { motion, MotionConfig } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, FootLogo, REVEAL_TIME, Reveal, Rise } from "../ui";

const MEME = "/deck/memes/arkiv-meme-distracted.webp";
const HUG = "/deck/memes/arkiv-meme-hug.webp";

/** The art's own pixels (both pictures), and its box on the stage (1350 x 900, centered, 32 px under
 * the outline bar and clear of the logo at the bottom center). */
const ART = { width: 1536, height: 1024 };
const BOX = { left: 285, top: 88, width: 1350, height: 900 };

/** Each label in the art's pixels, on each picture: centered over its character, the last line's
 * baseline just above its head. In the hug the heads sit close together and higher up, so the labels
 * move up and to the outer side of their heads, so ARKIV fits between them with room on both sides. */
const LABELS: { lines: string[]; meme: { x: number; y: number }; hug: { x: number; y: number } }[] = [
  { lines: ["Web3 data"], meme: { x: 292, y: 148 }, hug: { x: 330, y: 150 } },
  { lines: ["Your web2", "database"], meme: { x: 1310, y: 220 }, hug: { x: 1300, y: 190 } },
];
/** The middle robot's name, only on the hug: it fades in where the others make room for it. */
const ARKIV = { text: "ARKIV", x: 800, y: 128 };
const SIZE = 78;
const LEADING = 80;

export function W2({ step }: SceneContentProps) {
  const hug = step >= 1;
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        {/* Past the stage's edges, so the bands outside 16:9 stay dark too. */}
        <div className="absolute -inset-[2400px] bg-[rgba(8,9,31,0.92)]" />
        <FootLogo />
        <Rise className="absolute" style={{ left: BOX.left, top: BOX.top, width: BOX.width, height: BOX.height }}>
          <div
            className="relative overflow-hidden rounded-[24px] shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-[rgba(246,244,239,0.14)]"
            style={{ width: BOX.width, height: BOX.height }}
          >
            <div className="absolute inset-0" aria-hidden={hug}>
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed art at its own aspect */}
              <img
                src={MEME}
                alt="Three block robots on a city street. The white and orange one walks hand in hand with a grey robot but turns to look at a blue and orange robot walking past."
                width={BOX.width}
                height={BOX.height}
                draggable={false}
                className="block"
                style={{ width: BOX.width, height: BOX.height }}
              />
            </div>
            {/* The hug fades in over the meme on the →, with no rise: the street stays put. */}
            <Reveal step={step} at={1} y={0} className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed art at its own aspect */}
              <img
                src={HUG}
                alt="The same three block robots on the street, now together: the white and orange one in the middle hugs the blue and orange robot and the grey robot, and all three smile."
                width={BOX.width}
                height={BOX.height}
                draggable={false}
                className="block"
                style={{ width: BOX.width, height: BOX.height }}
              />
            </Reveal>
          </div>
          {/* Each label glides from its spot on the meme to its spot on the hug (a shift in art pixels). */}
          <svg className="pointer-events-none absolute left-0 top-0" width={BOX.width} height={BOX.height} viewBox={`0 0 ${ART.width} ${ART.height}`}>
            {LABELS.map((label) => (
              <motion.g
                key={label.lines.join(" ")}
                data-label={label.lines.join(" ")}
                initial={false}
                animate={hug ? { x: label.hug.x - label.meme.x, y: label.hug.y - label.meme.y } : { x: 0, y: 0 }}
                transition={{ duration: REVEAL_TIME, ease: EASE }}
              >
                <text
                  x={label.meme.x}
                  y={label.meme.y - (label.lines.length - 1) * LEADING}
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
                    <tspan key={line} x={label.meme.x} dy={i === 0 ? 0 : LEADING}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </motion.g>
            ))}
            {hug && (
              <motion.g data-label={ARKIV.text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: REVEAL_TIME, ease: EASE }}>
                <text
                  x={ARKIV.x}
                  y={ARKIV.y}
                  textAnchor="middle"
                  fontSize={SIZE}
                  fontWeight={700}
                  fill="#FE7446"
                  stroke="#111111"
                  strokeWidth={14}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                >
                  {ARKIV.text}
                </text>
              </motion.g>
            )}
          </svg>
        </Rise>
      </div>
    </MotionConfig>
  );
}

export const W2_NOTES: string[] = [
  "That's most of us: hand in hand with our web2 database, and we can't stop looking at web3 data.",
  "What if you could keep the best of both? That's Arkiv, in the middle, hugging both.",
];
