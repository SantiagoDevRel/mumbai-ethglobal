"use client";

// S4 · Queries like a database. Lives on a chain. One server (the mascot calm in a
// burning room) vs the same table held by a DB-Chain. The blocks under the table are a picture,
// not chain data, so they carry neutral labels (block n, n+1, …) instead of numbers.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { CalmRoom } from "../memes";
import { EASE, Reveal, Rise, Slide } from "../ui";

const BLOCKS = ["n", "n+1", "n+2", "n+3", "n+4"];

function ChainTable() {
  const rows = ["Chai Corner · cafe · 4.6", "Masala Box · street-food · 4.4", "Page Turner · bookstore · 4.8"];
  return (
    <div className="w-[700px]">
      <div className="overflow-hidden rounded-[20px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.9)]">
        {rows.map((r, i) => (
          <div key={r} className={`px-6 py-4 font-mono text-[28px] ${i > 0 ? "border-t border-[rgba(246,244,239,0.08)]" : ""}`}>
            {r}
          </div>
        ))}
      </div>
      {/* the DB-Chain holding the table: blocks linked under it, entering left to right */}
      <div className="mt-6 flex items-center">
        {BLOCKS.map((n, i) => (
          <div key={n} className="flex items-center">
            {i > 0 ? <div className="h-[4px] w-[20px] bg-[var(--arkiv-stone)]/60" /> : null}
            <motion.div
              className="flex h-[78px] w-[120px] flex-col items-center justify-center rounded-[12px] bg-[var(--arkiv-blue)] font-mono text-[var(--arkiv-sand)]"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: EASE }}
            >
              <span className="text-[14px] opacity-70">block</span>
              <span className="text-[22px] font-semibold">{n}</span>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function S4({ step }: SceneContentProps) {
  return (
    <Slide
      headline={
        <>
          Queries like a database.
          <br />
          Lives on a chain.
        </>
      }
    >
      <Rise delay={0.2} className="absolute left-[96px] top-[400px]">
        <CalmRoom />
      </Rise>
      <Rise delay={0.3} className="absolute left-[96px] top-[904px]">
        <p className="text-[32px] font-semibold text-[var(--arkiv-orange)]">Server down. Rules changed. Data gone.</p>
      </Rise>
      <Reveal step={step} at={1} className="absolute left-[912px] top-[400px]">
        {step >= 1 ? <ChainTable /> : <div className="h-[320px]" />}
      </Reveal>
      <Reveal step={step} at={1} className="absolute left-[912px] top-[904px] w-[900px]">
        <p className="text-[32px] font-semibold leading-[1.35]">Every write is a transaction. Anyone can query. Owners are wallets.</p>
      </Reveal>
    </Slide>
  );
}
