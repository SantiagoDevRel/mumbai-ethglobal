"use client";

// AG · The agenda, right after the room has written its entities. One row per part of the talk,
// read from SECTIONS and SCENES (shared/scenes.ts), so a new scene only needs its `section`. Parts
// already behind the presenter are marked done; the next one is lit. One row per →: step 0 shows
// the headline, the mascot and the first part; each → adds the next part. Nothing moves on its own.

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useScene } from "../../../lib/stage/store";
import { SCENES, SECTIONS } from "../../../shared/scenes";
import { Mascot } from "../Mascot";
import { EASE, Rise, Slide, T } from "../ui";

export function AG({ step }: SceneContentProps) {
  const { index } = useScene();
  const done = (id: string) => SCENES.every((scene, i) => scene.section !== id || i < index);
  const next = SECTIONS.find((section) => !done(section.id))?.id;
  return (
    <Slide headline="Where we're going" wash={0.9}>
      <ol className="absolute left-[96px] top-[280px] flex w-[1180px] flex-col gap-4">
        {SECTIONS.map((section, i) => {
          const finished = done(section.id);
          const lit = section.id === next;
          const shown = step >= i;
          return (
            <motion.li
              key={section.id}
              className="flex h-[128px] items-center gap-8 rounded-[20px] border px-8"
              style={{ borderColor: lit ? "var(--arkiv-orange)" : T.t14, background: lit ? "rgba(254,116,70,0.12)" : "rgba(17,17,17,0.72)" }}
              initial={{ opacity: 0, y: 24 }}
              animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.5, ease: EASE }}
              aria-hidden={!shown}
            >
              <span
                className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full text-[34px] font-semibold"
                style={{ background: finished ? "var(--arkiv-orange)" : "transparent", border: finished ? "none" : `2px solid ${lit ? "var(--arkiv-orange)" : T.t28}`, color: finished ? "#111111" : lit ? "var(--arkiv-orange)" : T.t64 }}
              >
                {finished ? <span role="img" aria-label="Done"><Check size={40} strokeWidth={3} aria-hidden /></span> : i + 1}
              </span>
              <span className="flex flex-col gap-2">
                <span className="text-[42px] font-semibold leading-[1.05]" style={{ color: finished ? T.t64 : "var(--arkiv-sand)" }}>{section.title}</span>
                <span className="text-[26px] leading-[1.25]" style={{ color: finished ? T.t42 : T.t64 }}>{section.line}</span>
              </span>
            </motion.li>
          );
        })}
      </ol>
      <Rise delay={0.05} className="absolute left-[1360px] top-[330px]">
        <Mascot pose="laptop" height={600} />
      </Rise>
    </Slide>
  );
}
