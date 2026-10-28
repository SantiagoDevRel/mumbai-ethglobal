"use client";

// AG · The agenda, right after the room has written its entities. One row per part of the talk,
// read from SECTIONS and SCENES (shared/scenes.ts), so a new scene only needs its `section`. Parts
// already behind the presenter are marked done; the next one is lit.

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useScene } from "../../../lib/stage/store";
import { SCENES, SECTIONS } from "../../../shared/scenes";
import { Mascot } from "../Mascot";
import { EASE, Slide, T } from "../ui";

export function AG(_props: SceneContentProps) {
  const { index } = useScene();
  const done = (id: string) => SCENES.every((scene, i) => scene.section !== id || i < index);
  const next = SECTIONS.find((section) => !done(section.id))?.id;
  return (
    <Slide headline="Where we're going" wash={0.9}>
      <ol className="absolute left-[96px] top-[300px] flex w-[1180px] flex-col gap-5">
        {SECTIONS.map((section, i) => {
          const finished = done(section.id);
          const lit = section.id === next;
          return (
            <motion.li
              key={section.id}
              className="flex h-[150px] items-center gap-8 rounded-[20px] border px-8"
              style={{ borderColor: lit ? "var(--arkiv-orange)" : T.t14, background: lit ? "rgba(254,116,70,0.12)" : "rgba(17,17,17,0.72)" }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: EASE }}
            >
              <span
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full text-[34px] font-semibold"
                style={{ background: finished ? "var(--arkiv-orange)" : "transparent", border: finished ? "none" : `2px solid ${lit ? "var(--arkiv-orange)" : T.t28}`, color: finished ? "#111111" : lit ? "var(--arkiv-orange)" : T.t64 }}
              >
                {finished ? <span role="img" aria-label="Done"><Check size={40} strokeWidth={3} aria-hidden /></span> : i + 1}
              </span>
              <span className="flex flex-col gap-2">
                <span className="text-[46px] font-semibold leading-[1.05]" style={{ color: finished ? T.t64 : "var(--arkiv-sand)" }}>{section.title}</span>
                <span className="text-[28px] leading-[1.25]" style={{ color: finished ? T.t42 : T.t64 }}>{section.line}</span>
              </span>
            </motion.li>
          );
        })}
      </ol>
      <motion.div className="absolute left-[1360px] top-[330px]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5, ease: EASE }}>
        <Mascot pose="laptop" height={600} />
      </motion.div>
    </Slide>
  );
}
