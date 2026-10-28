"use client";

// Overlays for the live scenes (L1, L3, L6, L2, L9): the caption pill and scene copy only (handoff
// 4). The map, counter, QR card, event log, filters, inspector, owner panel and the query panel
// (with its app-side row) belong to the app. Captions sit at (432, 60), or (352, 60) when the right
// column holds a wide panel, below the outline bar.

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Mascot } from "../Mascot";
import { Caption, EASE, GLASS, OverlayShell, PANEL_EASE, Rise, T } from "../ui";

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
      <SwapCaption id="l1">Write it. Every dot is an entity you just wrote.</SwapCaption>
    </OverlayShell>
  );
}

export function L2({ step }: SceneContentProps) {
  return (
    <OverlayShell>
      {step === 0 ? (
        <SwapCaption id="before">Entity Expiration: no cron job, no cleanup script.</SwapCaption>
      ) : (
        <SwapCaption id="after">Expire it. Or extend it.</SwapCaption>
      )}
    </OverlayShell>
  );
}

export function L3(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <SwapCaption id="l3">Same query, on your entities.</SwapCaption>
    </OverlayShell>
  );
}

/** L6: "Own it." The inspector holds a real transfer: a wallet address and Transfer ownership (Rabby). */
export function L6({ step }: SceneContentProps) {
  return (
    <OverlayShell>
      <SwapCaption id="l6" wide>
        Own it.
      </SwapCaption>
      <div className="absolute left-[96px] top-[700px] w-[880px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={step >= 1 ? "each" : "one"}
            className="text-[48px] font-bold leading-[1.1] [text-shadow:0_4px_24px_rgba(0,0,0,0.8)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: PANEL_EASE } }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.16, ease: PANEL_EASE } }}
          >
            {step >= 1 ? "Transfer it: paste a wallet, sign once." : "One wallet, ours, owns every entity on this map."}
          </motion.p>
        </AnimatePresence>
      </div>
    </OverlayShell>
  );
}

/** Where to start building, under the corner QR: the event log stays hidden on L9. */
const LINKS: { name: string; where: string; url?: boolean }[] = [
  { name: "Docs", where: "docs.arkiv.network", url: true },
  { name: "Hub", where: "hub.arkiv.network", url: true },
  { name: "MCP", where: "mcp.arkiv.network", url: true },
  { name: "Prizes", where: "On the ETHGlobal Mumbai page" },
];

export function L9(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <Rise className={`${GLASS} absolute left-[1464px] top-[300px] flex w-[424px] flex-col gap-5 px-8 py-7`}>
        <p className="text-[20px] font-bold tracking-[0.1em]" style={{ color: T.t64 }}>START BUILDING</p>
        {LINKS.map(({ name, where, url }) => (
          <div key={name} className="flex flex-col gap-1">
            <span className="text-[28px] font-semibold">{name}</span>
            <span className={`whitespace-nowrap text-[24px] ${url ? "font-mono text-[var(--arkiv-orange)]" : ""}`} style={url ? undefined : { color: T.t84 }}>
              {where}
            </span>
          </div>
        ))}
      </Rise>
      {/* The closing lines sit bottom-left; the mascot stands under the links card, below its
          bottom edge (about 770). */}
      <Rise className="absolute left-[96px] top-[820px]">
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
        transition={{ duration: 0.6, ease: EASE }}
      >
        <Mascot pose="wave" height={240} />
      </motion.div>
    </OverlayShell>
  );
}
