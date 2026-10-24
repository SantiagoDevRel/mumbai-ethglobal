"use client";

// S7 · Doors open (handoff boards "S7 · Doors open (QR)" and "S7 · 3 · 2 · 1 · write!"). The app
// draws the big QR in the left column; this slide adds the form line under it and the lifespan
// select card on the right. When D opens the doors (`state.doorsCountdownAt`), 3 · 2 · 1 · write!
// plays over the map column from that time: 1 s per step, an Orange ring draining each step.

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { LIFETIME_MAX_SEC, LIFETIME_MIN_SEC } from "../../../shared/types";
import { CharacterSelect } from "../memes";
import { Logo, Rise } from "../ui";

const BEATS = ["3", "2", "1", "write!"] as const;
const BEAT_MS = 1000;
const RING_R = 240;
const RING_C = 2 * Math.PI * RING_R;

function formatLifetime(sec: number): string {
  return sec <= 60 ? `${sec} s` : sec % 60 === 0 ? `${sec / 60} min` : `${Math.floor(sec / 60)} min ${sec % 60} s`;
}

/** Milliseconds since the countdown started while it runs, else null. */
function useCountdownElapsed(startedAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  const running = startedAt !== null && now - startedAt < BEATS.length * BEAT_MS;
  useEffect(() => {
    if (startedAt === null) return;
    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      if (Date.now() - startedAt < BEATS.length * BEAT_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startedAt]);
  if (startedAt === null || !running) return null;
  const elapsed = now - startedAt;
  return elapsed < 0 ? null : elapsed;
}

function Countdown({ elapsed }: { elapsed: number }) {
  const beat = Math.min(BEATS.length - 1, Math.floor(elapsed / BEAT_MS));
  const left = 1 - (elapsed % BEAT_MS) / BEAT_MS;
  const last = beat === BEATS.length - 1;
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-[rgba(8,9,31,0.55)]" />
      <Logo height={24} className="absolute left-[32px] top-[32px]" />
      <div className="absolute left-0 top-0 flex h-[1080px] w-[1464px] flex-col items-center justify-center gap-6">
        <div className="relative flex h-[520px] w-[520px] items-center justify-center">
          <svg width="520" height="520" viewBox="0 0 520 520" aria-hidden className="absolute inset-0 -rotate-90">
            <circle cx="260" cy="260" r={RING_R} fill="rgba(17,17,17,0.6)" stroke="rgba(246,244,239,0.16)" strokeWidth="16" />
            <circle
              cx="260"
              cy="260"
              r={RING_R}
              fill="none"
              stroke="#FE7446"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${left * RING_C} ${RING_C}`}
            />
          </svg>
          <AnimatePresence initial={false}>
            <motion.span
              key={beat}
              className={`absolute inset-0 flex items-center justify-center font-bold leading-none tracking-[-0.04em] ${last ? "text-[150px] text-[var(--arkiv-orange)]" : "text-[360px]"}`}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {BEATS[beat]}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-baseline gap-7" aria-hidden>
          {BEATS.map((b, i) => (
            <span key={b} className="flex items-baseline gap-7">
              {i > 0 ? <span className="text-[48px] font-semibold text-[rgba(246,244,239,0.36)]">·</span> : null}
              <span className={`text-[48px] font-semibold ${i === beat ? "text-[var(--arkiv-sand)]" : "text-[rgba(246,244,239,0.36)]"}`}>{b}</span>
            </span>
          ))}
        </div>
        <p className="text-[28px] text-[rgba(246,244,239,0.72)]">Every phone unlocks at once.</p>
      </div>
    </motion.div>
  );
}

export function S7(_props: SceneContentProps) {
  const startedAt = useStage((s) => s.doorsCountdownAt);
  const elapsed = useCountdownElapsed(startedAt);
  const lifespans = [LIFETIME_MIN_SEC, 60, LIFETIME_MAX_SEC].map((sec) => ({ sec, label: formatLifetime(sec) }));
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <div className="absolute inset-0 bg-[rgba(8,9,31,0.65)]" />
        <AnimatePresence>
          {elapsed === null ? (
            <motion.div key="doors" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <Logo height={28} className="absolute left-[96px] top-[72px]" />
              {/* The app's centered QR fills the left column above this line. */}
              <Rise delay={0.2} className="absolute left-[140px] top-[880px] w-[1040px]">
                <p className="text-center text-[44px] font-semibold leading-[1.2]">
                  Name. Color. Country.
                  <br />
                  <span className="text-[var(--arkiv-orange)]">
                    Lifetime: {LIFETIME_MIN_SEC} seconds to {LIFETIME_MAX_SEC / 60} minutes.
                  </span>
                </p>
              </Rise>
              <Rise delay={0.3} className="absolute left-[1260px] top-[300px]">
                <CharacterSelect lifespans={lifespans} maxSec={LIFETIME_MAX_SEC} />
              </Rise>
            </motion.div>
          ) : (
            <Countdown key="countdown" elapsed={elapsed} />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
