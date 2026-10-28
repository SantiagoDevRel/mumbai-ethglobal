"use client";

// S0 · Title over the globe at full strength (handoff board "S0 · Title"): a wash on the left
// only, the title at (96, 300), the mascot waving beside the logo row. One step: everything enters
// together once, with no staggered reveals; nothing moves after that.

import { MotionConfig } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Mascot } from "../Mascot";
import { Logo, Rise, T } from "../ui";

export function S0(_props: SceneContentProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <div
          className="absolute rounded-full"
          style={{
            left: 700,
            top: 40,
            width: 1240,
            height: 1240,
            background: "radial-gradient(circle, rgba(43,50,201,0.42) 0%, rgba(24,30,169,0.22) 38%, rgba(8,9,31,0) 68%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(8,9,31,0.96) 0%, rgba(8,9,31,0.78) 34%, rgba(8,9,31,0) 58%)" }}
        />
        <Logo height={32} className="absolute left-[96px] top-[72px]" />
        <div className="absolute left-[96px] top-[300px] flex w-[1040px] flex-col gap-10">
          <Rise delay={0.1}>
            <h1 className="text-[96px] font-semibold leading-[1.02] tracking-[-0.02em]">
              From zero to hero
              <br />
              with Arkiv,
              <br />
              the Web3 database
            </h1>
          </Rise>
          <Rise delay={0.1}>
            <p className="text-[40px] leading-[1.25]" style={{ color: T.t64 }}>
              Write it. Query it. Own it. <span className="text-[var(--arkiv-orange)]">Expire it.</span>
            </p>
          </Rise>
        </div>
        <Rise delay={0.1} className="absolute left-[1280px] top-[250px]">
          <Mascot pose="wave" height={720} />
        </Rise>
      </div>
    </MotionConfig>
  );
}
