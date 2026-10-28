"use client";

// W2 · The meme: an original composition that borrows only the layout of a known format. You (the
// mascot, magnifier up) turn to look at web3 data on the left while your app's database, on the
// right, asks for your eyes back. No format name, no third-party image, no headline. One step.

import { Boxes, Database, Sparkles } from "lucide-react";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Mascot } from "../Mascot";
import { Logo, Rise } from "../ui";

/** The white caption tag of the format: short, bold, on top of what it names. */
function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-[var(--arkiv-sand)] px-7 py-3 text-[40px] font-bold leading-none text-[var(--arkiv-ink)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
      {children}
    </span>
  );
}

export function W2(_props: SceneContentProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <div className="absolute inset-0 bg-[rgba(8,9,31,0.88)]" />
        <Logo height={28} className="absolute left-[96px] top-[72px]" />

        {/* Left: web3 data, the one everyone turns to look at. */}
        <Rise className="absolute left-[150px] top-[330px] flex w-[500px] flex-col items-center gap-8">
          <Tag>web3 data</Tag>
          {/* No list of qualities here: the next slide (W3) names them, once. */}
          <div className="relative flex h-[440px] w-[500px] items-center justify-center rounded-[28px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.12)] shadow-[0_0_80px_rgba(254,116,70,0.35)]">
            <Boxes size={170} strokeWidth={1.3} className="text-[var(--arkiv-orange)]" aria-hidden />
            <Sparkles size={56} strokeWidth={1.6} className="absolute right-8 top-8 text-[var(--arkiv-orange)]" aria-hidden />
            <Sparkles size={40} strokeWidth={1.6} className="absolute bottom-10 left-10 text-[var(--arkiv-sand)]" aria-hidden />
          </div>
        </Rise>

        {/* Center: you, magnifier up, looking left. A dashed gaze line leads to the left card. */}
        <svg width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden className="pointer-events-none absolute left-0 top-0">
          <path d="M800 470 C 760 420 720 420 680 450" fill="none" stroke="#FE7446" strokeWidth="5" strokeLinecap="round" strokeDasharray="4 14" />
          <path d="M694 432 L676 452 L702 460" fill="none" stroke="#FE7446" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Rise className="absolute left-[730px] top-[270px] flex w-[460px] flex-col items-center gap-6">
          <Tag>you</Tag>
          <Mascot pose="magnifier" height={600} />
        </Rise>

        {/* Right: your app's database, asking for your eyes back. */}
        <Rise className="absolute left-[1270px] top-[330px] flex w-[500px] flex-col items-center gap-8">
          <Tag>your app&apos;s database</Tag>
          <div className="relative flex h-[440px] w-[500px] flex-col items-center justify-center gap-6 rounded-[28px] border-[3px] border-[rgba(246,244,239,0.28)] bg-[var(--arkiv-stone)] text-[var(--arkiv-ink)]">
            <Database size={150} strokeWidth={1.3} aria-hidden />
            <span className="rounded-[18px] bg-[var(--arkiv-ink)] px-6 py-3 text-[34px] font-semibold text-[var(--arkiv-sand)]">Hey. Eyes over here.</span>
          </div>
        </Rise>
      </div>
    </MotionConfig>
  );
}

export const W2_NOTES: string[] = [
  "Let it land for a second. That's most of us right now: the app's database is fine, but web3 data does things it can't. So what does web3 data give you?",
];
