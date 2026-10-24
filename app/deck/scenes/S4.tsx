"use client";

// S4 · Queries like a database. Lives on a chain. One server (the mascot calm in a
// burning room) vs the same table held by a DB-Chain.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useLiveBlock } from "../../../lib/data/useLiveBlock";
import { CalmRoom } from "../memes";
import { EASE, Reveal, Rise, Slide } from "../ui";

function ChainTable() {
  // The DB-Chain under the table shows the five latest real blocks; the newest enters at the right.
  const block = useLiveBlock();
  const heights = Array.from({ length: 5 }, (_, i) => (block ? `#${(block.number - BigInt(4 - i)).toString()}` : "#…"));
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
      {/* the DB-Chain holding the table: blocks linked under it */}
      <div className="mt-6 flex items-center">
        {heights.map((n, i) => (
          <div key={block ? n : i} className="flex items-center">
            {i > 0 ? <div className="h-[4px] w-[20px] bg-[var(--arkiv-stone)]/60" /> : null}
            <motion.div
              layout
              className="flex h-[78px] w-[120px] items-center justify-center rounded-[12px] bg-[var(--arkiv-blue)] font-mono text-[18px] text-[var(--arkiv-sand)]"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              {n}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function S4({ step }: SceneContentProps) {
  return (
    <Slide headline="Queries like a database. Lives on a chain.">
      <Rise delay={0.2} className="absolute left-[96px] top-[300px]">
        <CalmRoom />
        <p className="mt-6 w-[720px] text-[32px] font-semibold text-[var(--arkiv-orange)]">Server down. Rules changed. Data gone.</p>
      </Rise>
      <Reveal step={step} at={1} className="absolute left-[912px] top-[300px]">
        {step >= 1 ? <ChainTable /> : <div className="h-[400px]" />}
        <p className="mt-8 w-[700px] text-[32px] font-semibold leading-[1.35]">
          Every write is a transaction. Anyone can query. Owners are wallets.
        </p>
      </Reveal>
    </Slide>
  );
}
