"use client";

// S6 · That's the whole talk. Four tiles that light up one per step.

import { Hourglass, KeyRound, PenLine, Search, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, Reveal, Slide } from "../ui";

const TILES: { label: string; icon: LucideIcon }[] = [
  { label: "Write it", icon: PenLine },
  { label: "Query it", icon: Search },
  { label: "Own it", icon: KeyRound },
  { label: "Expire it", icon: Hourglass },
];

export function S6({ step }: SceneContentProps) {
  return (
    <Slide headline="That's the whole talk">
      <div className="absolute left-[120px] top-[330px] grid w-[1500px] grid-cols-4 gap-8">
        {TILES.map(({ label, icon: Icon }, i) => {
          const lit = step >= i;
          return (
            <motion.div
              key={label}
              initial={false}
              animate={{
                opacity: lit ? 1 : 0.28,
                scale: lit ? 1 : 0.96,
                borderColor: lit ? "#fe7446" : "rgba(246,244,239,0.14)",
                backgroundColor: lit ? "rgba(254,116,70,0.16)" : "rgba(17,17,17,0.6)",
              }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex h-[380px] flex-col items-center justify-center gap-8 rounded-[32px] border-[3px]"
            >
              <motion.div
                initial={false}
                animate={{ rotate: lit ? [0, -8, 8, 0] : 0, color: lit ? "#fe7446" : "#a9a7b8" }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <Icon size={120} strokeWidth={1.6} />
              </motion.div>
              <p className="text-[56px] font-semibold">{label}</p>
            </motion.div>
          );
        })}
      </div>
      <Reveal step={step} at={3} className="absolute left-[120px] top-[790px]">
        <p className="text-[44px] font-medium">Let&apos;s do all four. Live. With you.</p>
      </Reveal>
    </Slide>
  );
}
