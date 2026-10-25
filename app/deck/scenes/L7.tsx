"use client";

// L7 · Everything you just did. A plain-words recap of the four ideas, one row each with the
// mascot pose from "That's the whole talk". No code on this slide.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Mascot, type MascotPose } from "../Mascot";
import { EASE, Slide, T } from "../ui";

const ROWS: { title: string; line: string; pose: MascotPose }[] = [
  { title: "Write it", line: "Your phone wrote an entity: one transaction.", pose: "laptop" },
  { title: "Query it", line: "The map was one query, filtered like a database.", pose: "magnifier" },
  { title: "Own it", line: "Owners are wallets, and ownership can change hands.", pose: "key" },
  { title: "Expire it", line: "Every entity disappears on time, unless someone extends it.", pose: "hourglass" },
];

export function L7(_props: SceneContentProps) {
  return (
    <Slide headline="Everything you just did" wash={0.86}>
      <div className="absolute left-[96px] top-[300px] grid w-[1728px] grid-cols-2 gap-6">
        {ROWS.map(({ title, line, pose }, i) => (
          <motion.div
            key={title}
            className="flex h-[330px] items-center gap-8 overflow-hidden rounded-[20px] border border-[rgba(246,244,239,0.12)] bg-[rgba(17,17,17,0.78)] pl-4 pr-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.12, ease: EASE }}
          >
            <div className="flex w-[280px] shrink-0 justify-center">
              <Mascot pose={pose} height={300} />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[52px] font-semibold text-[var(--arkiv-orange)]">{title}</p>
              <p className="text-[34px] leading-[1.25]" style={{ color: T.t84 }}>
                {line}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </Slide>
  );
}
