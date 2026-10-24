"use client";

// S0 · Title over a dark, empty, slowly turning globe. Small BLOK waving.

import Image from "next/image";
import { motion, MotionConfig } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Blok, EASE, Rise } from "../ui";

export function S0(_props: SceneContentProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--stage-fg)]">
        {/* Light wash on the left only: the globe stays visible and turning. */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(7,8,31,0.88) 0%, rgba(7,8,31,0.55) 48%, rgba(7,8,31,0) 78%)" }}
        />
        <div className="absolute left-[120px] top-[120px]">
          <Rise>
            <Image src="/brand/arkiv-white.svg" alt="Arkiv" width={240} height={55} priority />
          </Rise>
        </div>
        <div className="absolute left-[120px] top-[330px] max-w-[1180px]">
          <Rise delay={0.1}>
            <h1 className="text-[104px] font-semibold leading-[1.0] tracking-[-0.025em]">
              From zero to hero with Arkiv,{" "}
              <span className="text-[var(--arkiv-orange)]">the Web3 database</span>
            </h1>
          </Rise>
          <Rise delay={0.3}>
            <p className="mt-10 text-[44px] font-medium text-[var(--stage-fg)]/90">Write it. Query it. Own it. Expire it.</p>
          </Rise>
        </div>
        <motion.div
          className="absolute bottom-[96px] left-[1180px]"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
        >
          <motion.div
            animate={{ rotate: [0, -3, 0, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 100%" }}
          >
            <Blok pose="3d-wave-smile" height={300} />
          </motion.div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
