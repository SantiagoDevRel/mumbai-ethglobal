"use client";

// S5 · A chain built to be a database. The stack (Ethereum, the Arkiv DB-Chain, your app) with a
// live block counter read from the chain; the block time is measured, never hardcoded.

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useLiveBlock } from "../../../lib/data/useLiveBlock";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { NobodyMeme } from "../memes";
import { Chip, EASE, Reveal, Rise, Slide } from "../ui";

function LiveBlock() {
  const block = useLiveBlock();
  if (!block) return <span className="text-[var(--stage-muted)]">Reading the chain…</span>;
  return (
    <span className="flex items-baseline gap-5">
      <span className="text-[var(--stage-muted)]">block</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={block.number.toString()}
          className="tabular-nums text-[var(--arkiv-orange)]"
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -22, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          #{block.number.toLocaleString("en-US")}
        </motion.span>
      </AnimatePresence>
      <span className="text-[26px] text-[var(--stage-muted)]">
        one every {(block.blockTimeMs / 1000).toFixed(1)} s, measured live
      </span>
    </span>
  );
}

function Layer({ label, sub, tone, children }: { label: string; sub?: string; tone: "app" | "arkiv" | "eth"; children?: ReactNode }) {
  const style =
    tone === "arkiv"
      ? "border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.14)]"
      : tone === "app"
        ? "border-[var(--panel-border)] bg-[rgba(17,17,17,0.82)]"
        : "border-[var(--arkiv-blue)] bg-[rgba(24,30,169,0.7)]";
  return (
    <div className={`rounded-[22px] border-[3px] px-9 py-6 ${style}`}>
      <p className="text-[40px] font-semibold">{label}</p>
      {sub ? <p className="mt-1 text-[26px] text-[var(--stage-muted)]">{sub}</p> : null}
      {children ? <div className="mt-3 font-mono text-[38px] font-medium">{children}</div> : null}
    </div>
  );
}

export function S5({ step }: SceneContentProps) {
  return (
    <Slide headline="A chain built to be a database">
      <Rise delay={0.15} className="absolute left-[120px] top-[230px] flex gap-5">
        <Chip>No smart contracts. By construction.</Chip>
        <Chip tone="blue">Ethereum-aligned</Chip>
        <Chip tone="sand">A new block every few seconds</Chip>
      </Rise>
      <div className="absolute left-[120px] top-[360px] flex w-[980px] flex-col gap-4">
        <Rise delay={0.45}>
          <Layer label="Your app" sub="Write entities. Query them." tone="app" />
        </Rise>
        <Rise delay={0.35}>
          <Layer label="Arkiv DB-Chain" tone="arkiv">
            <LiveBlock />
          </Layer>
        </Rise>
        <Rise delay={0.25}>
          <Layer label="Ethereum" tone="eth" />
        </Rise>
      </div>
      <Reveal step={step} at={1} className="absolute left-[1160px] top-[360px]">
        <NobodyMeme />
      </Reveal>
    </Slide>
  );
}
