"use client";

// S6 · That's the whole talk. Four tiles that light up one per step; under them, a small looping
// example of the lit tile with the mascot: writing an entity, a simple query, the owner changing
// hands, an entity expiring. The examples are pictures of what comes next, not chain data.

import { Check, Hourglass, KeyRound, PenLine, Search, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { WRITER_ADDRESS } from "../../../shared/arkiv/profiles";
import { Mascot, type MascotPose } from "../Mascot";
import { EASE, PANEL, Reveal, Slide, T } from "../ui";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** A counter that restarts every `ms`, for looping examples. */
function useLoop(ms: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

function Appear({ delay, children, className }: { delay: number; children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

function WriteExample() {
  const loop = useLoop(5200);
  const rows: [string, ReactNode][] = [
    ["name", "Priya"],
    ["color", <span key="c" className="inline-block h-[22px] w-[22px] rounded-full bg-[var(--arkiv-orange)] align-middle" />],
    ["country", "India"],
    ["lives", "15 min"],
  ];
  return (
    <div key={loop} className="flex items-center gap-8">
      <div className="flex w-[560px] flex-col gap-3">
        {rows.map(([k, v], i) => (
          <Appear key={k} delay={0.2 + i * 0.4} className="flex items-baseline justify-between border-b border-[rgba(246,244,239,0.14)] pb-2">
            <span className="font-mono text-[24px]" style={{ color: T.t64 }}>
              {k}
            </span>
            <span className="text-[30px] font-semibold">{v}</span>
          </Appear>
        ))}
      </div>
      <div className="flex flex-col items-start gap-4">
        <Appear delay={2} className="rounded-full bg-[var(--arkiv-orange)] px-8 py-3 text-[30px] font-bold text-[var(--arkiv-ink)]">
          Write
        </Appear>
        <Appear delay={2.8} className="flex items-center gap-3 text-[30px] font-semibold">
          <Check size={34} className="text-[#14f195]" aria-hidden /> One transaction, one entity.
        </Appear>
      </div>
    </div>
  );
}

function QueryExample() {
  const loop = useLoop(5200);
  const hits = [
    ["Priya", "#fe7446"],
    ["Arjun", "#fe7446"],
    ["Neha", "#fe7446"],
  ];
  return (
    <div key={loop} className="flex flex-col gap-5">
      <Appear delay={0.2} className="flex items-center gap-4 rounded-[16px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.85)] px-7 py-4 font-mono text-[32px]">
        <Search size={32} className="text-[var(--arkiv-orange)]" aria-hidden />
        color = <span className="text-[var(--arkiv-orange)]">orange</span> &nbsp;and&nbsp; country = <span className="text-[var(--arkiv-orange)]">India</span>
      </Appear>
      <div className="flex gap-4">
        {hits.map(([name, color], i) => (
          <Appear key={name} delay={1.2 + i * 0.3} className="flex items-center gap-3 rounded-[12px] bg-[rgba(246,244,239,0.1)] px-5 py-3 text-[28px] font-semibold">
            <span className="block h-[18px] w-[18px] rounded-full" style={{ background: color }} /> {name}
          </Appear>
        ))}
        <Appear delay={2.3} className="flex items-center px-3 text-[26px]">
          <span style={{ color: T.t64 }}>3 entities</span>
        </Appear>
      </div>
    </div>
  );
}

function OwnExample() {
  const given = useLoop(2600) % 2 === 1;
  return (
    <div className="flex items-center gap-10">
      <div className="flex w-[520px] flex-col gap-2 rounded-[16px] border border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.85)] px-7 py-5">
        <span className="flex items-center gap-3 text-[30px] font-semibold">
          <span className="block h-[18px] w-[18px] rounded-full bg-[var(--arkiv-orange)]" /> Chai Corner
        </span>
        <span className="font-mono text-[22px]" style={{ color: T.t64 }}>
          $owner
        </span>
        <AnimatePresence mode="wait">
          <motion.span key={given ? "shop" : "app"} className="font-mono text-[32px] text-[var(--arkiv-orange)]" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>
            {given ? "0xA1c4…09bd" : short(WRITER_ADDRESS)}
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.div animate={{ x: given ? 24 : 0, rotate: given ? -20 : 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <KeyRound size={72} className="text-[var(--arkiv-orange)]" aria-hidden />
      </motion.div>
      <p className="w-[340px] text-[32px] font-semibold leading-[1.2]">{given ? "Now the café owns its own data." : "The app's wallet owns it…"}</p>
    </div>
  );
}

const RING_R = 70;
const RING_C = 2 * Math.PI * RING_R;

function ExpireExample() {
  const loop = useLoop(5200);
  return (
    <div key={loop} className="flex items-center gap-10">
      <motion.div
        className="flex items-center gap-6 rounded-[16px] border border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.85)] px-7 py-5"
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: [1, 1, 0.12], scale: [1, 1, 0.92] }}
        transition={{ duration: 4.2, times: [0, 0.82, 1] }}
      >
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90" aria-hidden>
          <circle cx="80" cy="80" r={RING_R} fill="none" stroke="rgba(246,244,239,0.16)" strokeWidth="12" />
          <motion.circle cx="80" cy="80" r={RING_R} fill="none" stroke="#FE7446" strokeWidth="12" strokeLinecap="round" strokeDasharray={RING_C} initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: RING_C }} transition={{ duration: 3.4, ease: "linear" }} />
        </svg>
        <div className="flex flex-col gap-1">
          <span className="text-[30px] font-semibold">Chai Corner</span>
          <span className="font-mono text-[24px]" style={{ color: T.t64 }}>
            $expiresAt · 15 min
          </span>
        </div>
      </motion.div>
      <Appear delay={3.6} className="w-[420px] text-[32px] font-semibold leading-[1.2]">
        Time&apos;s up: the DB-Chain deletes it. No cleanup script.
      </Appear>
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
      <Reveal step={step} at={3} className="absolute left-[96px] top-[972px]">
        <p className="text-[44px] font-semibold">You did the first one. The other three, live.</p>
      </Reveal>
    </Slide>
  );
}
