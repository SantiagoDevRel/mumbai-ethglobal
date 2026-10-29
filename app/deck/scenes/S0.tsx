"use client";

// S0 · Title over the globe at full strength (handoff board "S0 · Title"): a wash on the left
// only, which reaches the window's left edge in a window wider than 16:9, the title at (96, 300),
// the mascot waving beside the logo row. One step: everything enters together once, with no
// staggered reveals; nothing moves after that.

import { MotionConfig } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Mascot } from "../Mascot";
import { BLEED, Logo, Rise, T, Wash } from "../ui";

/** The left wash's stops across the 1920 px box (0 %, 34 %, 58 %), measured from the backdrop's left
 * edge, which starts `BLEED` px left of the box: the box looks as before and the band left of it stays dark. */
const LEFT_WASH = `linear-gradient(90deg, rgba(8,9,31,0.96) ${BLEED}px, rgba(8,9,31,0.78) ${BLEED + 0.34 * 1920}px, rgba(8,9,31,0) ${BLEED + 0.58 * 1920}px)`;

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
        <Wash background={LEFT_WASH} />
        <Logo height={32} className="absolute left-[96px] top-[72px]" />
        <div className="absolute left-[96px] top-[300px] flex w-[1040px] flex-col gap-10">
          <Rise>
            <h1 className="text-[96px] font-semibold leading-[1.02] tracking-[-0.02em]">
              From zero to hero
              <br />
              with Arkiv,
              <br />
              the Web3 database
            </h1>
          </Rise>
          <Rise>
            <p className="text-[40px] leading-[1.25]" style={{ color: T.t64 }}>
              Write it. Query it. Own it. <span className="text-[var(--arkiv-orange)]">Expire it.</span>
            </p>
          </Rise>
        </div>
        <Rise className="absolute left-[1280px] top-[250px]">
          <Mascot pose="wave" height={720} />
        </Rise>
      </div>
    </MotionConfig>
  );
}
