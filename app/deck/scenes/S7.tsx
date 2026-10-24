"use client";

// S7 · Doors open. The app draws the QR large in the center; the copy sits around it.
// When D opens the doors (`state.doorsCountdownAt`), play 3 · 2 · 1 · write! from that time.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { LIFETIME_MAX_SEC, LIFETIME_MIN_SEC } from "../../../shared/types";
import { CharacterSelect } from "../memes";
import { Blok, EASE, Rise, Slide } from "../ui";

const BEATS = ["3", "2", "1", "write!"] as const;
const BEAT_MS = 1000;

function formatLifetime(sec: number): string {
  return sec % 60 === 0 ? `${sec / 60} min` : sec > 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s` : `${sec} s`;
}

/** Index into BEATS for the current time, or -1 before/without a countdown. */
function useCountdownBeat(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [startedAt]);
  if (startedAt === null) return -1;
  const elapsed = now - startedAt;
  if (elapsed < 0) return -1;
  return Math.min(BEATS.length - 1, Math.floor(elapsed / BEAT_MS));
}

function Countdown() {
  const startedAt = useStage((s) => s.doorsCountdownAt);
  const beat = useCountdownBeat(startedAt);
  return (
    <div className="flex h-[260px] items-center justify-center">
      <AnimatePresence mode="popLayout">
        {beat >= 0 ? (
          <motion.p
            key={beat}
            className={`font-semibold leading-none tracking-[-0.03em] ${beat === BEATS.length - 1 ? "text-[170px] text-[var(--arkiv-orange)]" : "text-[220px]"}`}
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {BEATS[beat]}
          </motion.p>
        ) : (
          <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
              <Blok pose="flat-stand-smile" height={240} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function S7(_props: SceneContentProps) {
  const lifespans = [LIFETIME_MIN_SEC, 60, 90, LIFETIME_MAX_SEC].map(formatLifetime);
  return (
    <Slide headline="Doors open" under="Name. Color. Country. Lifetime: 20 seconds to 2 minutes." wash={0.8}>
      {/* The QR is drawn by the app in the center; the left and right columns stay clear of it. */}
      <Rise delay={0.2} className="absolute left-[120px] top-[330px]">
        <CharacterSelect lifespans={lifespans} />
      </Rise>
      <div className="absolute left-[1340px] top-[420px] w-[460px]">
        <Countdown />
      </div>
    </Slide>
  );
}
