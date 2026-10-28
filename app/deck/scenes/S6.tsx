"use client";

// S6 · That's the whole talk. Four tiles that light up one per →; under the lit tile, a still
// example with the mascot: an entity written, a simple query, the owner changed hands, an entity
// expired. Each example is a finished picture: nothing loops, counts down or plays on a timer.
//   step 0 · headline, tile 1 "Write it" and its example
//   step 1 · tile 2 "Query it"
//   step 2 · tile 3 "Own it"
//   step 3 · tile 4 "Expire it"
//   step 4 · "You did the first one. The other three, live."
// The examples are pictures of what comes next, not chain data.

import { ArrowRight, Check, Hourglass, KeyRound, PenLine, Search, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { WRITER_ADDRESS } from "../../../shared/arkiv/profiles";
import { Mascot, type MascotPose } from "../Mascot";
import { EASE, PANEL, Reveal, Slide, T } from "../ui";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

function WriteExample() {
  const rows: [string, ReactNode][] = [
    ["name", "Priya"],
    ["color", <span key="c" className="inline-block h-[22px] w-[22px] rounded-full bg-[var(--arkiv-orange)] align-middle" />],
    ["country", "India"],
    ["lives", "15 min"],
  ];
  return (
    <div className="flex items-center gap-8">
      <div className="flex w-[560px] flex-col gap-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between border-b border-[rgba(246,244,239,0.14)] pb-2">
            <span className="font-mono text-[24px]" style={{ color: T.t64 }}>
              {k}
            </span>
            <span className="text-[30px] font-semibold">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-start gap-4">
        <div className="rounded-full bg-[var(--arkiv-orange)] px-8 py-3 text-[30px] font-bold text-[var(--arkiv-ink)]">Write</div>
        <div className="flex items-center gap-3 text-[30px] font-semibold">
          <Check size={34} className="text-[#14f195]" aria-hidden /> One transaction, one entity.
        </div>
      </div>
    </div>
  );
}

function QueryExample() {
  const hits = [
    ["Priya", "#fe7446"],
    ["Arjun", "#fe7446"],
    ["Neha", "#fe7446"],
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-[16px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.85)] px-7 py-4 font-mono text-[32px]">
        <Search size={32} className="text-[var(--arkiv-orange)]" aria-hidden />
        color = <span className="text-[var(--arkiv-orange)]">orange</span> &nbsp;and&nbsp; country = <span className="text-[var(--arkiv-orange)]">India</span>
      </div>
      <div className="flex gap-4">
        {hits.map(([name, color]) => (
          <div key={name} className="flex items-center gap-3 rounded-[12px] bg-[rgba(246,244,239,0.1)] px-5 py-3 text-[28px] font-semibold">
            <span className="block h-[18px] w-[18px] rounded-full" style={{ background: color }} /> {name}
          </div>
        ))}
        <div className="flex items-center px-3 text-[26px]">
          <span style={{ color: T.t64 }}>3 entities</span>
        </div>
      </div>
    </div>
  );
}

/** The owner after the hand-over: the app's wallet, crossed out, then the café's own wallet. */
function OwnExample() {
  return (
    <div className="flex items-center gap-10">
      <div className="flex w-[560px] flex-col gap-2 rounded-[16px] border border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.85)] px-7 py-5">
        <span className="flex items-center gap-3 text-[30px] font-semibold">
          <span className="block h-[18px] w-[18px] rounded-full bg-[var(--arkiv-orange)]" /> Chai Corner
        </span>
        <span className="font-mono text-[22px]" style={{ color: T.t64 }}>
          $owner
        </span>
        <span className="flex items-center gap-4 font-mono">
          <span className="text-[26px] line-through" style={{ color: T.t50 }}>
            {short(WRITER_ADDRESS)}
          </span>
          <ArrowRight size={28} className="shrink-0 text-[var(--arkiv-orange)]" aria-hidden />
          <span className="text-[32px] text-[var(--arkiv-orange)]">0xA1c4…09bd</span>
        </span>
      </div>
      <KeyRound size={72} className="shrink-0 -rotate-[20deg] text-[var(--arkiv-orange)]" aria-hidden />
      <p className="w-[340px] text-[32px] font-semibold leading-[1.2]">Now the café owns its own data.</p>
    </div>
  );
}

const RING_R = 70;

/** The moment after expiration: the ring is empty and the entity has faded. */
function ExpireExample() {
  return (
    <div className="flex items-center gap-10">
      <div className="flex items-center gap-6 rounded-[16px] border border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.85)] px-7 py-5 opacity-[0.35]">
        <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden>
          <circle cx="80" cy="80" r={RING_R} fill="none" stroke="rgba(246,244,239,0.16)" strokeWidth="12" />
        </svg>
        <div className="flex flex-col gap-1">
          <span className="text-[30px] font-semibold">Chai Corner</span>
          <span className="font-mono text-[24px]" style={{ color: T.t64 }}>
            $expiresAt · 15 min
          </span>
        </div>
      </div>
      <p className="w-[420px] text-[32px] font-semibold leading-[1.2]">Time&apos;s up: the DB-Chain deletes it. No cleanup script.</p>
    </div>
  );
}

const TILES: { label: string; icon: LucideIcon; pose: MascotPose; Example: () => ReactNode }[] = [
  { label: "Write it", icon: PenLine, pose: "laptop", Example: WriteExample },
  { label: "Query it", icon: Search, pose: "magnifier", Example: QueryExample },
  { label: "Own it", icon: KeyRound, pose: "key", Example: OwnExample },
  { label: "Expire it", icon: Hourglass, pose: "hourglass", Example: ExpireExample },
];

export function S6({ step }: SceneContentProps) {
  const current = TILES[Math.min(step, TILES.length - 1)]!;
  return (
    <Slide headline="That's the whole talk">
      <div className="absolute left-[96px] top-[290px] grid w-[1728px] grid-cols-4 gap-8">
        {TILES.map(({ label, icon: Icon }, i) => {
          const lit = step >= i;
          const now = step === i;
          return (
            <motion.div
              key={label}
              initial={false}
              animate={{
                opacity: lit ? 1 : 0.28,
                borderColor: now ? "#fe7446" : lit ? "rgba(254,116,70,0.45)" : "rgba(246,244,239,0.14)",
                backgroundColor: now ? "rgba(254,116,70,0.18)" : "rgba(17,17,17,0.6)",
              }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex h-[150px] items-center justify-center gap-6 rounded-[20px] border-[3px]"
            >
              <Icon size={60} strokeWidth={1.6} className={lit ? "text-[var(--arkiv-orange)]" : ""} />
              <p className="text-[48px] font-semibold">{label}</p>
            </motion.div>
          );
        })}
      </div>
      <div className={`${PANEL} absolute left-[96px] top-[480px] flex h-[460px] w-[1728px] items-center gap-12 overflow-hidden px-12`}>
        <AnimatePresence mode="wait">
          <motion.div key={current.label} className="flex items-center gap-12" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4, ease: EASE }}>
            <Mascot pose={current.pose} height={400} />
            <current.Example />
          </motion.div>
        </AnimatePresence>
      </div>
      <Reveal step={step} at={4} className="absolute left-[96px] top-[972px]">
        <p className="text-[44px] font-semibold">You did the first one. The other three, live.</p>
      </Reveal>
    </Slide>
  );
}
