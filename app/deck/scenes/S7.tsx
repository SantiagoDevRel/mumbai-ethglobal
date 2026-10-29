"use client";

// S7 · Your entity: the room scans (handoff boards "S7 · Doors open (QR)" and "S7 · write!"). The app
// draws the scan column in the middle (JoinQR): the QR on its own sand square, the URL and what the
// form asks (Santiago, October 29: everything centered, no grey card, a bigger QR). On →, step 1, the
// column moves left and the form read as an entity comes in beside it, so the pair stays centered:
// the fields are attributes and the lifetime is its Entity Expiration. Nothing here moves on a timer.
// D (`state.countdownAt`) shows one still frame, "write!", so the room taps together; a second D, or
// the next scene, clears it.

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { SCAN, scanShift, useScanFade } from "../../../components/stage/JoinQR";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { LIFETIME_MAX_SEC, LIFETIME_MIN_SEC } from "../../../shared/types";
import { Logo, Reveal, T, Wash } from "../ui";

/** What a phone sends, read as an entity: the values are an example, saved in lower case. */
const ATTRIBUTES: [name: string, value: string][] = [
  ["name", '"priya"'],
  ["color", '"#fe7446"'],
  ["country", '"in"'],
];

/** The card's spot at step 1: right of the moved scan column, its top level with the QR's square. */
const CARD_LEFT = 960 + scanShift(1) + SCAN.width / 2 + SCAN.gap;
const CARD_TOP = 540 + SCAN.top + SCAN.label;

/** The form, read as an entity: three attributes and a lifetime, or none. */
function EntityCard() {
  return (
    <div className="flex flex-col gap-5 rounded-[20px] border-[3px] border-[var(--arkiv-sand)] bg-[var(--arkiv-ink)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.55)]" style={{ width: SCAN.card }}>
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
        <span className="text-[30px] font-semibold leading-[1.25] text-[var(--arkiv-orange)]">
          <span className="whitespace-nowrap">in {LIFETIME_MIN_SEC / 60} to {LIFETIME_MAX_SEC / 60} minutes,</span>{" "}
          <span className="whitespace-nowrap">or no expiration</span>
        </span>
      </div>
    </div>
  );
}

/** The still "write!" frame D shows, centered under the outline bar. */
function WriteFrame({ fade }: { fade: number }) {
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: fade, ease: "easeOut" }}>
      <Wash background="rgba(8,9,31,0.55)" />
      <div className="absolute inset-x-0 bottom-0 top-[56px] flex flex-col items-center justify-center gap-8">
        <p className="text-[220px] font-bold leading-none tracking-[-0.04em] text-[var(--arkiv-orange)]">write!</p>
        <p className="text-[44px] font-semibold">Everyone: tap Write my entity.</p>
      </div>
    </motion.div>
  );
}

export function S7({ step }: SceneContentProps) {
  const writing = useStage((s) => s.countdownAt !== null);
  // The same fade as the scan column, which leaves while "write!" comes in.
  const fade = useScanFade();
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <Wash background="rgba(8,9,31,0.65)" />
        <AnimatePresence initial={false}>
          {writing ? (
            <WriteFrame key="write" fade={fade} />
          ) : (
            <motion.div key="card" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: fade }}>
              <Reveal step={step} at={1} className="absolute" style={{ left: CARD_LEFT, top: CARD_TOP }}>
                <EntityCard />
              </Reveal>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Over both frames, so the logo holds still when D swaps them. */}
        <Logo height={28} className="absolute left-[96px] top-[72px]" />
      </div>
    </MotionConfig>
  );
}
