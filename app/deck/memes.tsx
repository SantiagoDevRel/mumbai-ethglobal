"use client";

// Original illustrations that borrow only the layout idea of known meme formats, starring the
// Arkiv mascot placeholder (app/deck/Mascot.tsx). No third-party meme images, no original artwork
// traced, no format names on screen. Palette only; props sit beside the mascot, never on it.

import { Lock, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useStage } from "../../lib/stage/store";
import { Mascot, type MascotPose } from "./Mascot";
import { EASE, T } from "./ui";

/**
 * Reject / approve on a 2x2 grid (handoff board "S1 · Meme style"): the mascot saying nope on
 * Stone, then pointing on Sand, each beside its line of text. Ink rules between the cells.
 */
export function RejectApproveMeme({ no, yes }: { no: string; yes: string }) {
  const cell = (good: boolean) => (
    <>
      <motion.div
        className={`flex items-center justify-center border-r-[3px] border-[var(--arkiv-ink)] ${good ? "bg-[var(--arkiv-sand)]" : "border-b-[3px] bg-[var(--arkiv-stone)]"}`}
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: good ? 0.5 : 0, ease: EASE }}
      >
        <Mascot pose={good ? "point" : "nope"} unit={34} on="light" />
      </motion.div>
      <motion.div
        className={`flex flex-col justify-center gap-5 p-10 ${good ? "bg-[var(--arkiv-sand)]" : "border-b-[3px] border-[var(--arkiv-ink)] bg-[var(--arkiv-stone)]"}`}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: good ? 0.6 : 0.1, ease: EASE }}
      >
        {good ? (
          <ThumbsUp size={48} strokeWidth={2} className="text-[var(--arkiv-orange)]" aria-label="Yes" role="img" />
        ) : (
          <ThumbsDown size={48} strokeWidth={2} className="text-[var(--arkiv-ink)]" aria-label="No" role="img" />
        )}
        <p className="text-[44px] font-semibold leading-[1.15] text-[var(--arkiv-ink)]">{good ? yes : no}</p>
      </motion.div>
    </>
  );
  return (
    <div className="grid h-[772px] w-[912px] grid-cols-2 grid-rows-2 overflow-hidden rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
      {cell(false)}
      {cell(true)}
    </div>
  );
}

/** One original three-lobed flame, Orange with a Sand inner tongue. Only the flame moves. */
function Flame({ x, h, delay }: { x: number; h: number; delay: number }) {
  const w = h * 0.62;
  return (
    <motion.svg
      className="absolute bottom-0"
      style={{ left: x, transformOrigin: "50% 100%" }}
      width={w}
      height={h}
      viewBox="0 0 62 100"
      animate={{ scaleY: [1, 1.06, 0.92, 1.04, 1], skewX: [0, 2, -2, 1, 0] }}
      transition={{ duration: 1.2, delay, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      <path d="M31 0 C 40 22 62 38 58 66 C 56 86 44 100 31 100 C 18 100 6 86 4 66 C 2 50 14 44 18 28 C 22 40 26 42 28 36 C 30 26 26 12 31 0 Z" fill="#FE7446" />
      <path d="M31 42 C 37 56 46 64 44 78 C 43 90 37 96 31 96 C 25 96 19 90 18 80 C 17 70 24 64 31 42 Z" fill="#F6F4EF" opacity={0.85} />
    </motion.svg>
  );
}

/** Calm in a burning room: the mascot stands next to the company server while it burns. */
export function CalmRoom() {
  const flames: [number, number][] = [
    [-10, 150], [40, 200], [100, 140], [560, 170], [610, 210], [650, 150],
  ];
  return (
    <div className="relative h-[470px] w-[720px] overflow-hidden rounded-[20px] border border-[rgba(246,244,239,0.12)] bg-[var(--arkiv-ink)]">
      {/* smoke */}
      {[[90, 30, 70], [230, 10, 90], [420, 24, 80], [580, 8, 100]].map(([x, y, r], i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[var(--arkiv-stone)]"
          style={{ left: x, top: y, width: r, height: r, opacity: 0.08 }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* floor */}
      <div className="absolute bottom-[56px] left-0 right-0 h-[2px] bg-[var(--arkiv-stone)]/40" />
      {/* server rack with the company padlock */}
      <div className="absolute bottom-[58px] left-[130px] flex h-[260px] w-[150px] flex-col gap-3 rounded-[12px] bg-[var(--arkiv-stone)] p-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex h-[44px] items-center gap-2 rounded-[6px] bg-[var(--arkiv-ink)] px-3">
            <motion.span
              className="h-[9px] w-[9px] rounded-full bg-[var(--arkiv-orange)]"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.7, delay: i * 0.2, repeat: Infinity }}
            />
            <span className="h-[4px] flex-1 rounded bg-[var(--arkiv-stone)]/30" />
          </div>
        ))}
        <div className="absolute -right-[26px] top-[90px] flex h-[56px] w-[56px] items-center justify-center rounded-[12px] bg-[var(--arkiv-sand)] text-[var(--arkiv-blue)] shadow-lg">
          <Lock size={32} strokeWidth={2.4} />
        </div>
      </div>
      {/* the mascot, calm, with a mug on a side table beside it */}
      <div className="absolute bottom-[56px] left-[292px]">
        <Mascot pose="stand" unit={24} />
      </div>
      <div className="absolute bottom-[56px] left-[545px] h-[90px] w-[8px] bg-[var(--arkiv-stone)]/70" />
      <div className="absolute bottom-[146px] left-[515px] h-[8px] w-[70px] rounded bg-[var(--arkiv-stone)]/70" />
      <div className="absolute bottom-[154px] left-[535px] h-[30px] w-[26px] rounded-b-[6px] bg-[var(--arkiv-sand)]" />
      {/* speech bubble */}
      <div className="absolute left-[420px] top-[56px] rounded-[16px] bg-[var(--arkiv-sand)] px-6 py-3 text-[30px] font-semibold text-[var(--arkiv-ink)]">
        This is fine.
        <span className="absolute -bottom-[12px] left-[30px] h-0 w-0 border-l-[12px] border-r-[12px] border-t-[14px] border-l-transparent border-r-transparent border-t-[var(--arkiv-sand)]" />
      </div>
      {flames.map(([x, h], i) => (
        <Flame key={i} x={x} h={h} delay={i * 0.17} />
      ))}
    </div>
  );
}

/** "Nobody: / Arkiv:" post, the mascot deadpan next to an EVM box that fades away. */
export function NobodyMeme() {
  return (
    <div className="relative w-[640px] rounded-[20px] bg-[var(--arkiv-sand)] p-9 text-[var(--arkiv-ink)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
      <p className="text-[34px]">Nobody:</p>
      <p className="mt-4 text-[34px] leading-tight">
        <span className="font-semibold">Arkiv:</span> removes the EVM on purpose
      </p>
      <div className="relative mt-5 flex h-[260px] items-end gap-10 rounded-[12px] bg-[var(--arkiv-ink)] px-8 pb-4">
        <Mascot pose="stand" unit={24} />
        <motion.div
          className="mb-6 flex h-[100px] w-[180px] items-center justify-center gap-3 rounded-[12px] border-2 border-[var(--arkiv-stone)] font-mono text-[40px] font-semibold text-[var(--arkiv-stone)]"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: [1, 1, 0.12], y: [0, 0, 20] }}
          transition={{ duration: 2.6, times: [0, 0.45, 1], repeat: Infinity, repeatDelay: 1.4, ease: EASE }}
        >
          EVM <X size={34} strokeWidth={3} className="text-[var(--arkiv-orange)]" />
        </motion.div>
      </div>
    </div>
  );
}

const SLOT_POSES: MascotPose[] = ["stand", "wave", "point"];

/**
 * Game-style select panel (handoff board "S7 · Doors open"): "Choose your lifespan." The Orange
 * frame hops slot to slot until the doors open; the bar shows the selected lifetime.
 */
export function CharacterSelect({ lifespans, maxSec }: { lifespans: { label: string; sec: number }[]; maxSec: number }) {
  const doorsOpen = useStage((s) => s.doors === "open");
  const [selected, setSelected] = useState(1);
  useEffect(() => {
    if (doorsOpen) return;
    const id = setInterval(() => setSelected((s) => (s + 1) % lifespans.length), 900);
    return () => clearInterval(id);
  }, [doorsOpen, lifespans.length]);
  const current = lifespans[selected] ?? lifespans[0]!;
  return (
    <div className="flex w-[560px] flex-col gap-6 rounded-[20px] border-[3px] border-[var(--arkiv-sand)] bg-[var(--arkiv-ink)] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
      <p className="font-mono text-[20px] tracking-[0.12em]" style={{ color: T.t64 }}>
        PLAYER 1 · SELECT
      </p>
      <p className="text-[48px] font-bold leading-[1.05]">Choose your lifespan.</p>
      <div className="grid grid-cols-3 gap-4">
        {lifespans.map(({ label }, i) => {
          const isSel = i === selected;
          return (
            <div
              key={label}
              className={`relative flex flex-col items-center gap-3 rounded-[12px] border-[3px] px-2 pb-4 pt-5 ${isSel ? "border-transparent bg-[rgba(254,116,70,0.14)]" : "bg-[rgba(17,17,17,0.6)]"}`}
              style={isSel ? undefined : { borderColor: "rgba(246,244,239,0.24)" }}
            >
              {isSel ? (
                <motion.div
                  layoutId="lifespan-frame"
                  className="absolute -inset-[3px] rounded-[12px] border-[3px] border-[var(--arkiv-orange)] shadow-[0_0_0_4px_rgba(254,116,70,0.25)]"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              ) : null}
              <Mascot pose={SLOT_POSES[i % SLOT_POSES.length]} unit={12} still />
              <p className={`font-mono text-[24px] font-semibold ${isSel ? "text-[var(--arkiv-orange)]" : ""}`}>{label}</p>
            </div>
          );
        })}
      </div>
      <div className="h-[14px] overflow-hidden rounded-full" style={{ background: "rgba(246,244,239,0.16)" }}>
        <motion.div
          className="h-full bg-[var(--arkiv-orange)]"
          initial={false}
          animate={{ width: `${(current.sec / maxSec) * 100}%` }}
          transition={{ duration: 0.3, ease: EASE }}
        />
      </div>
    </div>
  );
}
