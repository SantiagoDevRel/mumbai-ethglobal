"use client";

// S5 · A chain built to be a database. The stack (Ethereum, the Arkiv DB-Chain, your app) with a
// live block counter read from the chain; the block time is measured, never hardcoded. With the
// mock source the line says "mock data" instead of "measured live".

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useSourceMode } from "../../../lib/data/source-mode";
import { useLiveBlock } from "../../../lib/data/useLiveBlock";
import { WRITER_URL } from "../../../lib/data/writer-client";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { NobodyMeme } from "../memes";
import { Chip, EASE, Reveal, Rise, Slide } from "../ui";

/** The stage's resolved source: the same rule as useLiveData (live when chosen, or auto with a writer). */
function useIsMock(): boolean {
  const mode = useSourceMode();
  return !(mode === "live" || (mode === "auto" && !!WRITER_URL));
}

function LiveBlock() {
  const block = useLiveBlock();
  const mock = useIsMock();
  if (!block) return <span className="text-[rgba(246,244,239,0.64)]">Reading the chain…</span>;
  return (
    <span className="flex items-baseline gap-5">
      <span className="text-[rgba(246,244,239,0.64)]">block</span>
      {/* The number rolls inside its own clipped slot, so the old one never leaves the chip. */}
      <span className="relative inline-flex h-[1.25em] items-center overflow-hidden align-baseline">
        <span className="invisible tabular-nums" aria-hidden>
          #{block.number.toLocaleString("en-US")}
        </span>
        <AnimatePresence initial={false}>
          <motion.span
            key={block.number.toString()}
            className="absolute inset-0 flex items-center tabular-nums text-[var(--arkiv-orange)]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            #{block.number.toLocaleString("en-US")}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-[26px] text-[rgba(246,244,239,0.64)]">
        one every {(block.blockTimeMs / 1000).toFixed(1)} s, {mock ? "mock data" : "measured live"}
      </span>
    </span>
  );
}

function Layer({ label, sub, tone, children }: { label: string; sub?: string; tone: "app" | "arkiv" | "eth"; children?: ReactNode }) {
  const style =
    tone === "arkiv"
      ? "border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.14)]"
      : tone === "app"
        ? "border-[rgba(246,244,239,0.12)] bg-[rgba(17,17,17,0.78)]"
        : "border-[var(--arkiv-blue)] bg-[rgba(24,30,169,0.7)]";
  return (
    <div className={`rounded-[20px] border-[3px] px-9 py-6 ${style}`}>
      <p className="text-[40px] font-semibold">{label}</p>
      {sub ? <p className="mt-1 text-[26px] text-[rgba(246,244,239,0.64)]">{sub}</p> : null}
      {children ? <div className="mt-3 font-mono text-[38px] font-medium">{children}</div> : null}
    </div>
  );
}

export function S5({ step }: SceneContentProps) {
  return (
    <Slide headline="A chain built to be a database">
      <Rise delay={0.15} className="absolute left-[96px] top-[284px] flex gap-4">
        <Chip>No smart contracts. By construction.</Chip>
        <Chip tone="blue">Ethereum-aligned</Chip>
        <Chip tone="sand">A new block every few seconds</Chip>
      </Rise>
      <div className="absolute left-[96px] top-[380px] flex w-[980px] flex-col gap-4">
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
      <Reveal step={step} at={1} className="absolute left-[1160px] top-[380px]">
        <NobodyMeme />
      </Reveal>
    </Slide>
  );
}
