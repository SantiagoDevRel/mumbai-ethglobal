"use client";

// IX · The index, right after the title: the talk's four parts, one row each, read from SECTIONS
// (shared/scenes.ts) so the outline bar across the top and this list never disagree. One part is lit
// per → (Santiago, October 29): its number and title turn orange and the other rows dim. "Build your
// entity", the part where the room scans, keeps a phone as its marker; it is orange only while lit.
// → steps: 0 part 1 lit, 1 part 2, 2 part 3, 3 part 4.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { SECTIONS } from "../../../shared/scenes";
import { Mascot } from "../Mascot";
import { EASE, REVEAL_TIME, Rise, Slide, T } from "../ui";
import { PhoneIcon } from "./PhoneIcon";

// Literal colors: Motion interpolates these, not CSS variables.
const ORANGE = "#FE7446";
const SAND = "#F6F4EF";
/** Opacity of the rows that aren't lit. */
const DIM = 0.34;
const CHANGE = { duration: REVEAL_TIME, ease: EASE };

export function IX({ step }: SceneContentProps) {
  const lit = Math.min(Math.max(step, 0), SECTIONS.length - 1);
  return (
    <Slide headline="What we'll do" wash={0.9}>
      <Rise className="absolute left-[96px] top-[340px] w-[1180px]">
        <ol className="flex flex-col gap-4">
          {SECTIONS.map((section, i) => {
            const on = i === lit;
            return (
              <motion.li
                key={section.id}
                className="flex h-[132px] items-center gap-8 rounded-[20px] border px-8"
                initial={false}
                animate={{
                  opacity: on ? 1 : DIM,
                  borderColor: on ? ORANGE : T.t14,
                  backgroundColor: on ? "rgba(254,116,70,0.12)" : "rgba(17,17,17,0.72)",
                }}
                transition={CHANGE}
              >
                <motion.span
                  className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border-2 text-[34px] font-semibold"
                  initial={false}
                  animate={{ borderColor: on ? ORANGE : T.t28, color: on ? ORANGE : T.t84 }}
                  transition={CHANGE}
                >
                  {i + 1}
                </motion.span>
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <motion.span className="text-[42px] font-semibold leading-[1.05]" initial={false} animate={{ color: on ? ORANGE : SAND }} transition={CHANGE}>
                    {section.title}
                  </motion.span>
                  <span className="text-[26px] leading-[1.25]" style={{ color: on ? T.t84 : T.t64 }}>
                    {section.line}
                  </span>
                </span>
                {section.id === "build" ? <PhoneIcon height={104} className="shrink-0" label="Phones out" /> : null}
              </motion.li>
            );
          })}
        </ol>
      </Rise>
      <Rise className="absolute left-[1380px] top-[360px]">
        <Mascot pose="laptop" height={560} />
      </Rise>
    </Slide>
  );
}
