"use client";

// What /slides shows during a live scene: the scene's name, what is happening on the map in plain
// words (it follows the step), and the mascot. Every detail itself (the dots, the query, the
// entity's fields) lives on the map; this half of the screen only explains what to look at.

import { MotionConfig, AnimatePresence, motion } from "motion/react";
import type { SceneDef, SceneId } from "../../../shared/scenes";
import { Mascot, type MascotPose } from "../Mascot";
import { EASE, Logo, PANEL_EASE, Rise, T } from "../ui";

/** `cumulative`: each step adds a line, so the newest (last) line is the bold one. */
type Explainer = { pose: MascotPose; lines: string[]; steps?: string[][]; cumulative?: boolean };

/** Per live scene: lines shown on entry, and optionally different lines for each → step. */
const EXPLAIN: Partial<Record<SceneId, Explainer>> = {
  L1: {
    pose: "laptop",
    lines: ["Your phone sent one transaction.", "The DB-Chain stored it as an entity.", "Now it's a dot on the map."],
  },
  L2: {
    pose: "hourglass",
    lines: ["Every entity has an expiration.", "When its time runs out, the DB-Chain deletes it.", "No cleanup script."],
    steps: [
      ["Every entity has an expiration.", "When its time runs out, the DB-Chain deletes it.", "No cleanup script."],
      ["Anyone can give it more time.", "The ones nobody extended are gone for good."],
    ],
  },
  L3: {
    pose: "magnifier",
    cumulative: true,
    lines: ["The map is one query.", "Each → adds one filter."],
    steps: [
      ["The map is one query:", "every entity in this session."],
      ["+ color is orange"],
      ["+ color is orange", "+ country is India"],
      ["+ color is orange", "+ country is India", "+ inside this map view"],
      ["+ color is orange", "+ country is India", "+ inside this map view", "+ owner is Santiago's wallet"],
    ],
  },
  L4: {
    pose: "stand",
    lines: ["Click a dot: everything Arkiv knows about it."],
    steps: [
      ["Click a dot: everything Arkiv knows about it.", "Your attributes: name, color, country."],
      ["$key", "Its address. It never changes."],
      ["$creator", "Who wrote it. It never changes."],
      ["$owner", "Who controls it. It can change hands."],
      ["$expiresAt", "When it disappears. It can be extended."],
    ],
  },
  L5: {
    pose: "laptop",
    lines: ["Same entity, new attributes:", "a category, a rating and opening hours."],
    steps: [
      ["Same entity, new attributes:", "a category, a rating and opening hours."],
      ["Now filter like Google Maps:", "cafe · 4.5 stars or more · open now."],
      ["Each review is its own entity,", "pointing to its business."],
    ],
  },
  L6: {
    pose: "key",
    lines: ["One wallet owns every business's data."],
    steps: [["One wallet owns every business's data.", "That's every platform today."], ["Each business owns its own data."]],
  },
};

export function LiveCard({ scene, step }: { scene: SceneDef; step: number }) {
  const explainer = EXPLAIN[scene.id];
  const lines = explainer?.steps?.[step] ?? explainer?.lines ?? [];
  const bold = explainer?.cumulative && step > 0 ? lines.length - 1 : 0;
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <div className="absolute inset-0 bg-[rgba(8,9,31,0.9)]" />
        <Logo height={28} className="absolute left-[96px] top-[72px]" />
        <div className="absolute left-[96px] top-[250px] flex w-[1100px] flex-col gap-8">
          <Rise delay={0.05}>
            <p className="text-[30px] font-semibold tracking-[0.08em] text-[var(--arkiv-orange)]">ON THE MAP →</p>
          </Rise>
          <Rise delay={0.15}>
            <h1 className="text-[112px] font-bold leading-[1.02] tracking-[-0.02em]">{scene.title}</h1>
          </Rise>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="flex flex-col gap-4"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PANEL_EASE, delay: 0.1 } }}
              exit={{ opacity: 0, y: 14, transition: { duration: 0.16, ease: PANEL_EASE } }}
            >
              {lines.map((line, i) => (
                <p key={line} className={`leading-[1.2] ${i === bold ? "text-[52px] font-semibold" : "text-[46px]"}`} style={i === bold ? undefined : { color: T.t84 }}>
                  {line}
                </p>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        {explainer ? (
          <motion.div className="absolute left-[1300px] top-[300px]" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }}>
            <Mascot pose={explainer.pose} height={620} />
          </motion.div>
        ) : null}
      </div>
    </MotionConfig>
  );
}
