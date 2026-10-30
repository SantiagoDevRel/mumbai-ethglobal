"use client";

// What /slides shows during a live scene: the scene's name, what is happening on the map in plain
// words, and the mascot. Every detail itself (the dots, the query, the entity's fields) lives on the
// map; this half of the screen only explains what to look at. The lines describe how it works, never
// that something already happened: /slides can't see the chain. October 29: L3 has no scripted
// filters (the presenter filters by hand) and the Own it (L6) and Expire it (L2) scenes are gone.

import { MotionConfig, AnimatePresence, motion } from "motion/react";
import type { SceneDef, SceneId } from "../../../shared/scenes";
import { Mascot, type MascotPose } from "../Mascot";
import { EASE, FootLogo, PANEL_EASE, REVEAL_TIME, Rise, T } from "../ui";

/** The first line is the bold one. */
type Explainer = { pose: MascotPose; lines: string[] };

/** Per live scene (each has one step): the lines shown on entry. */
const EXPLAIN: Partial<Record<SceneId, Explainer>> = {
  L1: {
    pose: "laptop",
    lines: ["Your phone sends one request.", "Our wallet writes it to the DB-Chain as an entity.", "Each entity is a dot on the map."],
  },
  L3: {
    pose: "magnifier",
    lines: ["The map is one query.", "Filter it live: name, country or color.", "Pick a country: the camera flies there."],
  },
};

export function LiveCard({ scene, step }: { scene: SceneDef; step: number }) {
  const explainer = EXPLAIN[scene.id];
  const lines = explainer?.lines ?? [];
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <div className="absolute inset-0 bg-[rgba(8,9,31,0.9)]" />
        <FootLogo />
        <div className="absolute left-[96px] top-[250px] flex w-[1100px] flex-col gap-8">
          <Rise>
            <p className="text-[30px] font-semibold tracking-[0.08em] text-[var(--arkiv-orange)]">ON THE MAP →</p>
          </Rise>
          <Rise>
            <h1 className="text-[112px] font-bold leading-[1.02] tracking-[-0.02em]">{scene.title}</h1>
          </Rise>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="flex flex-col gap-4"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PANEL_EASE } }}
              exit={{ opacity: 0, y: 14, transition: { duration: 0.16, ease: PANEL_EASE } }}
            >
              {lines.map((line, i) => (
                <p key={line} className={`leading-[1.2] ${i === 0 ? "text-[52px] font-semibold" : "text-[46px]"}`} style={i === 0 ? undefined : { color: T.t84 }}>
                  {line}
                </p>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        {explainer ? (
          <motion.div className="absolute left-[1300px] top-[300px]" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: REVEAL_TIME, ease: EASE }}>
            <Mascot pose={explainer.pose} height={620} />
          </motion.div>
        ) : null}
      </div>
    </MotionConfig>
  );
}
