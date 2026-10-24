"use client";

// Original illustrations in known meme formats, starring BLOK. Composed in HTML/CSS from the
// official BLOK assets only: no third-party meme images.

import { Check, Lock, ServerCrash, X } from "lucide-react";
import { motion } from "motion/react";
import { Blok, EASE } from "./ui";

/** Drake format: BLOK turns away from the bad option and points at the good one. */
export function DrakeMeme({ no, yes }: { no: string; yes: string }) {
  const row = (good: boolean) => (
    <div className="grid grid-cols-[230px_1fr]">
      <div
        className="relative flex h-[280px] items-end justify-center overflow-hidden"
        style={{ background: good ? "#fe7446" : "#c85a35" }}
      >
        <Blok pose={good ? "flat-wave-smile" : "flat-stand-serious"} height={250} flip={!good} className="relative top-[16px]" />
        <span
          className={`absolute left-3 top-3 flex h-[48px] w-[48px] items-center justify-center rounded-full ${good ? "bg-[var(--arkiv-sand)] text-[var(--arkiv-orange)]" : "bg-[var(--arkiv-ink)] text-[var(--arkiv-sand)]"}`}
        >
          {good ? <Check size={30} strokeWidth={3} /> : <X size={30} strokeWidth={3} />}
        </span>
      </div>
      <div className="flex h-[280px] items-center bg-[var(--arkiv-sand)] px-8">
        <p className={`text-[34px] font-semibold leading-tight text-[var(--arkiv-ink)] ${good ? "" : "opacity-80"}`}>{good ? yes : no}</p>
      </div>
    </div>
  );
  return (
    <div className="w-[640px] overflow-hidden rounded-[24px] border-4 border-[var(--arkiv-ink)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      {row(false)}
      <div className="h-[4px] bg-[var(--arkiv-ink)]" />
      {row(true)}
    </div>
  );
}

function Flame({ x, h, delay }: { x: number; h: number; delay: number }) {
  return (
    <motion.div
      className="absolute bottom-0"
      style={{
        left: x,
        width: h * 0.55,
        height: h,
        borderRadius: "50% 50% 20% 20% / 70% 70% 30% 30%",
        background: "linear-gradient(to top, #fe7446 0%, #fe7446 45%, rgba(246,244,239,0.85) 100%)",
        transformOrigin: "50% 100%",
        filter: "blur(0.5px)",
      }}
      animate={{ scaleY: [1, 1.18, 0.92, 1.1, 1], scaleX: [1, 0.92, 1.05, 0.95, 1], opacity: [0.9, 1, 0.85, 1, 0.9] }}
      transition={{ duration: 1.6, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** "This is fine": BLOK sits calmly in a burning server room. */
export function ThisIsFine() {
  const flames = [
    [0, 120], [50, 170], [110, 140], [170, 190], [470, 180], [520, 150], [575, 200], [630, 130],
  ] as const;
  return (
    <div className="relative h-[460px] w-[700px] overflow-hidden rounded-[24px] border-2 border-[var(--panel-border)] bg-[#2a1610]">
      {/* smoke */}
      <div className="absolute inset-x-0 top-0 h-[180px] bg-gradient-to-b from-[rgba(17,17,17,0.85)] to-transparent" />
      {/* server rack with the company padlock */}
      <div className="absolute left-[60px] top-[120px] flex h-[250px] w-[150px] flex-col gap-3 rounded-[10px] border-2 border-[var(--arkiv-stone)]/50 bg-[var(--arkiv-ink)] p-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex h-[40px] items-center gap-2 rounded-[4px] bg-[#222] px-2">
            <span className="h-[8px] w-[8px] rounded-full bg-[var(--arkiv-orange)]" />
            <span className="h-[4px] flex-1 rounded bg-[#333]" />
          </div>
        ))}
        <div className="flex flex-1 items-center justify-center text-[var(--arkiv-stone)]">
          <ServerCrash size={40} strokeWidth={1.6} />
        </div>
        <div className="absolute -right-[22px] top-[96px] flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[var(--arkiv-stone)] text-[var(--arkiv-ink)]">
          <Lock size={30} strokeWidth={2.2} />
        </div>
      </div>
      {/* table and BLOK, calm */}
      <div className="absolute bottom-[70px] left-[300px]">
        <Blok pose="flat-stand-smile" height={250} />
      </div>
      <div className="absolute bottom-[64px] left-[250px] h-[14px] w-[330px] rounded bg-[#5a3a2a]" />
      <div className="absolute bottom-[0px] left-[270px] h-[64px] w-[10px] bg-[#5a3a2a]" />
      <div className="absolute bottom-[0px] left-[550px] h-[64px] w-[10px] bg-[#5a3a2a]" />
      <div className="absolute bottom-[78px] left-[500px] h-[34px] w-[30px] rounded-b-[8px] bg-[var(--arkiv-sand)]" />
      {/* speech bubble */}
      <div className="absolute left-[430px] top-[70px] rounded-[18px] bg-[var(--arkiv-sand)] px-6 py-3 text-[30px] font-semibold text-[var(--arkiv-ink)]">
        This is fine.
        <span className="absolute -bottom-[12px] left-[40px] h-0 w-0 border-l-[12px] border-r-[12px] border-t-[14px] border-l-transparent border-r-transparent border-t-[var(--arkiv-sand)]" />
      </div>
      {flames.map(([x, h], i) => (
        <Flame key={i} x={x} h={h} delay={i * 0.17} />
      ))}
    </div>
  );
}

/** "Nobody: / Arkiv:" format, BLOK tossing the EVM away on purpose. */
export function NobodyMeme() {
  return (
    <div className="relative w-[640px] rounded-[24px] bg-[var(--arkiv-sand)] p-9 text-[var(--arkiv-ink)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      <p className="text-[36px] font-semibold">Nobody:</p>
      <p className="mt-4 text-[36px] leading-tight">
        <span className="font-semibold">Arkiv:</span> removes the EVM on purpose
      </p>
      <div className="relative mt-4 h-[230px]">
        <div className="absolute bottom-0 left-[20px]">
          <Blok pose="claro-flat-wave-serious" height={220} />
        </div>
        <motion.div
          className="absolute left-[220px] top-[60px] flex h-[96px] w-[160px] items-center justify-center rounded-[14px] border-4 border-[var(--arkiv-ink)] bg-[var(--arkiv-stone)] font-mono text-[40px] font-semibold"
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: [0, 180, 220], y: [0, -50, 40], rotate: [0, 25, 40], opacity: [1, 1, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: EASE }}
        >
          EVM
        </motion.div>
      </div>
    </div>
  );
}

/** Video-game character select: "Choose your lifespan." */
export function CharacterSelect({ lifespans }: { lifespans: string[] }) {
  return (
    <div className="w-[520px] rounded-[24px] border-4 border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.85)] p-7 shadow-[0_0_60px_rgba(254,116,70,0.25)]">
      <p className="text-center font-mono text-[30px] font-medium uppercase tracking-[0.14em] text-[var(--arkiv-orange)]">Choose your lifespan.</p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {lifespans.map((label, i) => {
          const selected = i === lifespans.length - 1;
          return (
            <motion.div
              key={label}
              className={`relative flex flex-col items-center rounded-[14px] border-[3px] pb-3 pt-4 ${selected ? "border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.16)]" : "border-[var(--panel-border)] bg-[rgba(246,244,239,0.04)]"}`}
              animate={selected ? { boxShadow: ["0 0 0 rgba(254,116,70,0)", "0 0 28px rgba(254,116,70,0.6)", "0 0 0 rgba(254,116,70,0)"] } : undefined}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              {selected ? (
                <span className="absolute left-2 top-2 rounded bg-[var(--arkiv-orange)] px-2 font-mono text-[18px] font-semibold text-[var(--arkiv-ink)]">P1</span>
              ) : null}
              <Blok pose={selected ? "flat-wave-smile" : "flat-stand-smile"} height={120} />
              <p className="mt-2 font-mono text-[26px] font-medium">{label}</p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: lifespans.length }, (_, b) => (
                  <span key={b} className={`h-[10px] w-[22px] rounded-sm ${b <= i ? "bg-[var(--arkiv-orange)]" : "bg-[rgba(246,244,239,0.15)]"}`} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
