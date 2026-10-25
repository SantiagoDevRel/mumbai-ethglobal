"use client";

// Overlays for the live scenes (L1-L6, L9): the caption pill and scene copy only (handoff 4). The
// map, counter, QR card, event log, filters, inspector, business card, owner panel, the L6
// small print and the query panel (with its app-side row) belong to the app. Captions sit at
// (432, 36), or (352, 36) when the right column holds a wide panel.

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { Mascot } from "../Mascot";
import { Caption, EASE, OverlayShell, PANEL_EASE, Rise } from "../ui";

/** Swaps the caption text with a short cross-fade (panel in 240 ms, out 160 ms). */
function SwapCaption({ id, children, wide = false }: { id: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: PANEL_EASE } }}
        exit={{ opacity: 0, y: 12, transition: { duration: 0.16, ease: PANEL_EASE } }}
      >
        <Caption wide={wide}>{children}</Caption>
      </motion.div>
    </AnimatePresence>
  );
}

export function L1(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <SwapCaption id="l1">The map is a query.</SwapCaption>
    </OverlayShell>
  );
}

export function L2({ step }: SceneContentProps) {
  return (
    <OverlayShell>
      {step === 0 ? (
        <SwapCaption id="before">No cron job. No cleanup script. The DB-Chain forgets on time.</SwapCaption>
      ) : (
        <SwapCaption id="after">Expire it. Or extend it.</SwapCaption>
      )}
    </OverlayShell>
  );
}

export function L3(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <SwapCaption id="l3">Query it like a database.</SwapCaption>
    </OverlayShell>
  );
}

export function L4(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <SwapCaption id="l4" wide>
        Creator: who wrote it. Owner: who controls it.
      </SwapCaption>
    </OverlayShell>
  );
}

export function L5({ step }: SceneContentProps) {
  return (
    <OverlayShell>
      {step === 0 ? (
        <SwapCaption id="question" wide>
          What if every dot were a business?
        </SwapCaption>
      ) : step === 1 ? (
        <SwapCaption id="caption" wide>
          Your Google Maps, on Arkiv.
        </SwapCaption>
      ) : (
        <SwapCaption id="reviews" wide>
          Each review is its own entity.
        </SwapCaption>
      )}
    </OverlayShell>
  );
}

/** L6: "Own it." pill plus the big statement in the right column, under the owner panel. */
export function L6(_props: SceneContentProps) {
  const transferred = useStage((s) => s.transferred);
  return (
    <OverlayShell>
      <SwapCaption id="l6" wide>
        Own it.
      </SwapCaption>
      <div className="absolute right-[32px] top-[440px] w-[424px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={transferred ? "each" : "one"}
            className="text-[48px] font-bold leading-[1.1] [text-shadow:0_4px_24px_rgba(0,0,0,0.8)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: PANEL_EASE } }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.16, ease: PANEL_EASE } }}
          >
            {transferred ? "Each business owns its own data." : "Santiago owns all the businesses' data."}
          </motion.p>
        </AnimatePresence>
      </div>
    </OverlayShell>
  );
}

export function L9(_props: SceneContentProps) {
  return (
    <OverlayShell>
      {/* The closing lines sit bottom-left; the mascot stands under the QR column, below the
          event log's bottom edge (783), so it stays clear whether or not the app shows the log. */}
      <Rise delay={0.3} className="absolute left-[96px] top-[820px]">
        <p className="text-[72px] font-bold leading-[1.05] [text-shadow:0_4px_24px_rgba(0,0,0,0.8)]">
          Write it. Query it. Own it. Expire it.
          <br />
          <span className="text-[var(--arkiv-orange)]">Thank you.</span>
        </p>
      </Rise>
      <motion.div
        className="absolute left-[1620px] top-[800px]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
      >
        <Mascot pose="wave" height={240} />
      </motion.div>
    </OverlayShell>
  );
}
