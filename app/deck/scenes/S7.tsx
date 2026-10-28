"use client";

// S7 · Your entity: the room scans (handoff boards "S7 · Doors open (QR)" and "S7 · write!"). The app
// draws the big QR in the left column; this slide adds the form line under it (step 0) and, on →, the
// form read as an entity on the right (step 1): the fields are attributes and the lifetime is its
// Entity Expiration. Nothing here moves on a timer. D (`state.countdownAt`) shows one still frame,
// "write!", over the map column so the room taps together; a second D, or the next scene, clears it.

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { LIFETIME_MAX_SEC, LIFETIME_MIN_SEC } from "../../../shared/types";
import { Logo, Reveal, Rise, T } from "../ui";

/** What a phone sends, read as an entity: the values are an example. */
const ATTRIBUTES: [name: string, value: string][] = [
  ["name", '"Priya"'],
  ["color", '"#fe7446"'],
  ["country", '"IN"'],
];

/** The form, read as an entity: three attributes and a lifetime. */
function EntityCard() {
  return (
    <div className="flex w-[560px] flex-col gap-5 rounded-[20px] border-[3px] border-[var(--arkiv-sand)] bg-[var(--arkiv-ink)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
      <p className="font-mono text-[20px] tracking-[0.12em]" style={{ color: T.t64 }}>YOUR FORM = ONE ENTITY</p>
      <p className="text-[48px] font-bold leading-[1.05]">Your entity</p>
      <div className="flex flex-col overflow-hidden rounded-[12px] border border-[rgba(246,244,239,0.14)]">
        <div className="grid grid-cols-[150px_1fr] bg-[rgba(246,244,239,0.08)] px-5 py-2 font-mono text-[18px]" style={{ color: T.t64 }}>
          <span>attribute</span><span>value</span>
        </div>
        {ATTRIBUTES.map(([name, value]) => (
          <div key={name} className="grid grid-cols-[150px_1fr] border-t border-[rgba(246,244,239,0.08)] px-5 py-3 font-mono text-[26px]">
            <span>{name}</span><span>{value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 rounded-[12px] border-[2px] border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.12)] px-5 py-4">
        <span className="text-[22px] font-semibold" style={{ color: T.t84 }}>Entity Expiration</span>
        <span className="text-[30px] font-semibold text-[var(--arkiv-orange)]">in {LIFETIME_MIN_SEC / 60} to {LIFETIME_MAX_SEC / 60} min</span>
      </div>
    </div>
  );
}

/** The still "write!" frame D shows over the map column. */
function WriteFrame() {
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <div className="absolute inset-0 bg-[rgba(8,9,31,0.55)]" />
      <Logo height={24} className="absolute left-[32px] top-[64px]" />
      <div className="absolute left-0 top-0 flex h-[1080px] w-[1464px] flex-col items-center justify-center gap-8">
        <p className="text-[220px] font-bold leading-none tracking-[-0.04em] text-[var(--arkiv-orange)]">write!</p>
        <p className="text-[44px] font-semibold">Everyone: tap Write my entity.</p>
      </div>
    </motion.div>
  );
}

export function S7({ step }: SceneContentProps) {
  const writing = useStage((s) => s.countdownAt !== null);
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <div className="absolute inset-0 bg-[rgba(8,9,31,0.65)]" />
        <AnimatePresence>
          {writing ? (
            <WriteFrame key="write" />
          ) : (
            <motion.div key="card" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <Logo height={28} className="absolute left-[96px] top-[72px]" />
              {/* The app's centered QR fills the left column above this line. */}
              {/* The wait is on screen too: the room is looking at its phones, not at the speaker. */}
              <Rise className="absolute left-[140px] top-[850px] w-[1040px]">
                <p className="text-center text-[44px] font-semibold leading-[1.2]">
                  Name. Color. Country.
                  <br />
                  <span className="text-[var(--arkiv-orange)]">
                    Lifetime: {LIFETIME_MIN_SEC / 60} to {LIFETIME_MAX_SEC / 60} minutes.
                  </span>
                </p>
                <p className="mt-3 text-center text-[32px]" style={{ color: T.t84 }}>
                  Don&apos;t tap Write yet: we write together.
                </p>
              </Rise>
              <Reveal step={step} at={1} className="absolute left-[1260px] top-[230px]">
                <EntityCard />
              </Reveal>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
