"use client";

// Original illustrations that borrow only the layout idea of known meme formats, starring the
// 3D Arkiv mascot (app/deck/Mascot.tsx). No third-party meme images, no format names on screen.

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useStage } from "../../lib/stage/store";
import { Mascot, type MascotPose } from "./Mascot";
import { EASE, T } from "./ui";

type MemeCell = { text: string; visual: ReactNode };

/**
 * Thumbs down / thumbs up on a 2x2 grid: the 3D mascot on the left of each row, the line and its
 * little animation on the right. Stone for the bad way, Sand for the good one; Ink rules between.
 */
export function ThumbsMeme({ no, yes }: { no: MemeCell; yes: MemeCell }) {
  const row = (good: boolean) => {
    const cell = good ? yes : no;
    return (
      <>
        <motion.div
          className={`flex items-end justify-center overflow-hidden border-r-[3px] border-[var(--arkiv-ink)] pt-4 ${good ? "bg-[var(--arkiv-sand)]" : "border-b-[3px] bg-[var(--arkiv-stone)]"}`}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: good ? 0.5 : 0, ease: EASE }}
        >
          <Mascot pose={good ? "thumbsUp" : "thumbsDown"} height={360} />
        </motion.div>
        <motion.div
          className={`flex flex-col justify-center gap-5 px-9 py-8 ${good ? "bg-[var(--arkiv-sand)]" : "border-b-[3px] border-[var(--arkiv-ink)] bg-[var(--arkiv-stone)]"}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: good ? 0.6 : 0.1, ease: EASE }}
        >
          <span className="flex items-center gap-4">
            {good ? (
              <ThumbsUp size={44} strokeWidth={2} className="shrink-0 text-[var(--arkiv-orange)]" aria-label="Yes" role="img" />
            ) : (
              <ThumbsDown size={44} strokeWidth={2} className="shrink-0 text-[var(--arkiv-ink)]" aria-label="No" role="img" />
            )}
            <span className="text-[36px] font-semibold leading-[1.12] text-[var(--arkiv-ink)]">{cell.text}</span>
          </span>
          {cell.visual}
        </motion.div>
      </>
    );
  };
  return (
    <div className="grid h-[800px] w-[912px] grid-cols-[340px_1fr] grid-rows-2 overflow-hidden rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
      {row(false)}
      {row(true)}
    </div>
  );
}

/** "Disaster" composition: the mascot scared in front of the company server on fire. */
export function ServerOnFire() {
  return (
    <div className="relative h-[700px] w-[1728px] overflow-hidden rounded-[24px] border border-[rgba(246,244,239,0.12)] bg-[var(--arkiv-ink)]">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed illustration, cropped by the frame */}
      <img src="/deck/mascot/arkiv-mascot-server-fire.webp" alt="The mascot, scared, in front of a burning server building" className="absolute inset-0 h-full w-full object-cover object-[50%_40%]" draggable={false} />
      <div className="absolute inset-x-0 bottom-0 h-[260px] bg-[linear-gradient(0deg,rgba(8,9,31,0.92)_0%,rgba(8,9,31,0)_100%)]" />
      <motion.div
        className="absolute left-[56px] top-[48px] flex items-center gap-4"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6, ease: EASE }}
      >
        <span className="rounded-full bg-[var(--arkiv-sand)] px-6 py-2.5 text-[34px] font-bold text-[var(--arkiv-ink)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">your centralized server</span>
        <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden>
          <path d="M4 10 C 60 6 96 26 108 66" fill="none" stroke="#F6F4EF" strokeWidth="5" strokeLinecap="round" />
          <path d="M94 58 L108 70 L114 52" fill="none" stroke="#F6F4EF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <div className="absolute bottom-[40px] left-[56px] flex gap-4">
        {["Server down.", "Rules changed.", "Data gone."].map((line, i) => (
          <motion.span
            key={line}
            className="rounded-[12px] bg-[var(--arkiv-orange)] px-6 py-3 text-[40px] font-bold text-[var(--arkiv-ink)]"
            initial={{ opacity: 0, y: 16, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: i === 1 ? 1.5 : -1.5 }}
            transition={{ duration: 0.4, delay: 1 + i * 0.35, ease: EASE }}
          >
            {line}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

const SLOT_POSES: MascotPose[] = ["stand", "wave", "thumbsUp"];

/**
 * Game-style select panel (handoff board "S7 · Doors open"): "Choose your lifespan." The Orange
 * frame hops slot to slot until the countdown starts; the bar shows the selected lifetime.
 */
export function CharacterSelect({ lifespans, maxSec }: { lifespans: { label: string; sec: number }[]; maxSec: number }) {
  const counting = useStage((s) => s.countdownAt !== null);
  const [selected, setSelected] = useState(1);
  useEffect(() => {
    if (counting) return;
    const id = setInterval(() => setSelected((s) => (s + 1) % lifespans.length), 900);
    return () => clearInterval(id);
  }, [counting, lifespans.length]);
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
              <Mascot pose={SLOT_POSES[i % SLOT_POSES.length]!} height={150} />
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
