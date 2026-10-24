"use client";

// Overlays for the live scenes (L1-L6, L9): captions and scene text only. The map, query panel
// (bottom), event log (right), filters, inspector and QR belong to the app; captions sit top-left.

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { Mascot } from "../Mascot";
import { Caption, EASE, OverlayShell, Rise } from "../ui";

export function L1(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <Caption>The map is a query.</Caption>
    </OverlayShell>
  );
}

/** Swaps the caption text with a short cross-fade. */
function SwapCaption({ id, children, sub }: { id: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <Caption sub={sub}>{children}</Caption>
      </motion.div>
    </AnimatePresence>
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

export function L3({ step }: SceneContentProps) {
  return (
    <OverlayShell>
      <Caption>Query it like a database.</Caption>
      <motion.div
        className="absolute left-[64px] top-[230px]"
        initial={false}
        animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 10 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <div className="inline-flex items-center gap-4 rounded-[16px] border-2 border-dashed border-[var(--app-side)] bg-[rgba(7,8,31,0.72)] px-7 py-4 backdrop-blur-md">
          <span className="font-mono text-[22px] uppercase tracking-[0.12em] text-[var(--app-side)]">app-side</span>
          <span className="text-[32px] font-medium">No ORDER BY. Your app sorts.</span>
        </div>
      </motion.div>
    </OverlayShell>
  );
}

const BADGES: [string, string][] = [
  ["$key", "its address, forever"],
  ["$creator", "who wrote it, never changes"],
  ["$owner", "who controls it, can change"],
  ["$expiresAt", "can be extended"],
];

export function L4(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <Caption>Creator: who wrote it. Owner: who controls it.</Caption>
      <Rise delay={0.25} className="absolute left-[64px] top-[230px]">
        <div className="flex flex-col gap-3 rounded-[20px] border border-[var(--panel-border)] bg-[rgba(7,8,31,0.72)] px-7 py-5 backdrop-blur-md">
          {BADGES.map(([field, meaning]) => (
            <p key={field} className="text-[28px]">
              <span className="inline-block w-[190px] font-mono font-medium text-[var(--arkiv-orange)]">{field}</span>
              {meaning}
            </p>
          ))}
        </div>
      </Rise>
    </OverlayShell>
  );
}

export function L5({ step }: SceneContentProps) {
  return (
    <OverlayShell>
      {step === 0 ? (
        <SwapCaption id="question">What if every dot were a business?</SwapCaption>
      ) : (
        <SwapCaption
          id="caption"
          sub={
            step >= 2 ? (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                Photos: Swarm. Everything you filter on: Arkiv.
              </motion.span>
            ) : undefined
          }
        >
          Your Google Maps, on Arkiv.
        </SwapCaption>
      )}
    </OverlayShell>
  );
}

export function L6(_props: SceneContentProps) {
  const transferred = useStage((s) => s.transferred);
  return (
    <OverlayShell>
      <div className="absolute left-[64px] top-[56px] max-w-[1180px]">
        <Rise>
          <p className="mb-3 font-mono text-[26px] uppercase tracking-[0.18em] text-[var(--arkiv-orange)]">Own it.</p>
        </Rise>
        <AnimatePresence mode="wait">
          <motion.div
            key={transferred ? "each" : "one"}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="inline-block rounded-[20px] border border-[var(--panel-border)] bg-[rgba(7,8,31,0.72)] px-9 py-6 backdrop-blur-md"
          >
            <p className="text-[56px] font-semibold leading-tight">
              {transferred ? "Each business owns its own data." : "Santiago owns all the businesses' data."}
            </p>
          </motion.div>
        </AnimatePresence>
        <p className="mt-5 max-w-[1100px] rounded-[14px] bg-[rgba(7,8,31,0.72)] px-6 py-4 text-[22px] leading-snug text-[var(--stage-muted)] backdrop-blur-md">
          Demo view. In your app: <span className="font-mono">changeOwnership</span> for each entity, or one{" "}
          <span className="font-mono">executeBatch</span>. The creator still says santiago: history doesn&apos;t change.
        </p>
      </div>
    </OverlayShell>
  );
}

export function L9(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <div className="absolute left-[64px] top-[56px] flex items-end gap-8">
        <div className="rounded-[24px] border border-[var(--panel-border)] bg-[rgba(7,8,31,0.72)] px-10 py-8 backdrop-blur-md">
          <Rise>
            <p className="text-[64px] font-semibold leading-tight">Write it. Query it. Own it. Expire it.</p>
          </Rise>
          <Rise delay={0.4}>
            <p className="mt-3 text-[48px] font-medium text-[var(--arkiv-orange)]">Thank you.</p>
          </Rise>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
        >
          <Mascot pose="wave" mood="smile" height={220} />
        </motion.div>
      </div>
    </OverlayShell>
  );
}
