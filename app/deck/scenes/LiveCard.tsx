"use client";

// What /slides shows during a live scene: the scene's name and an arrow to the map beside it.

import { MotionConfig } from "motion/react";
import { Logo, Rise } from "../ui";

export function LiveCard({ title }: { title: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <Logo height={28} className="absolute left-[96px] top-[72px]" />
        <div className="absolute left-[96px] top-[360px] flex w-[1728px] flex-col gap-8">
          <Rise delay={0.05}>
            <p className="text-[32px] font-semibold tracking-[0.08em] text-[var(--arkiv-orange)]">[ LIVE ON THE MAP ]</p>
          </Rise>
          <Rise delay={0.15}>
            <h1 className="text-[120px] font-bold leading-[1.02] tracking-[-0.02em]">{title}</h1>
          </Rise>
          <Rise delay={0.3}>
            <p className="text-[96px] font-bold leading-none text-[var(--arkiv-orange)]" aria-hidden>→</p>
          </Rise>
        </div>
      </div>
    </MotionConfig>
  );
}
