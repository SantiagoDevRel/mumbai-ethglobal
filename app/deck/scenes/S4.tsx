"use client";

// S4 · Queries like a database. Lives on a chain. One server ("this is fine", BLOK calm in a
// burning room) vs the same table held by a DB-Chain.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { ThisIsFine } from "../memes";
import { EASE, Reveal, Rise, Slide } from "../ui";

function ChainTable() {
  const rows = ["Chai Corner · cafe · 4.6", "Masala Box · street-food · 4.4", "Page Turner · bookstore · 4.8"];
  return (
    <div className="w-[700px]">
      <div className="overflow-hidden rounded-[20px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.9)]">
        {rows.map((r, i) => (
          <div key={r} className={`px-6 py-4 font-mono text-[28px] ${i > 0 ? "border-t border-[var(--panel-border)]" : ""}`}>
            {r}
          </div>
        ))}
      </div>
      {/* the DB-Chain holding the table: blocks linked under it */}
      <div className="mt-6 flex items-center">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center">
            <motion.div
              className="flex h-[78px] w-[86px] items-center justify-center rounded-[12px] border-2 border-[var(--arkiv-stone)]/40 bg-[rgba(24,30,169,0.85)] font-mono text-[18px] text-[var(--arkiv-sand)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 + i * 0.12, ease: EASE }}
            >
              #{i + 1}
            </motion.div>
            {i < 5 ? <div className="h-[4px] w-[24px] bg-[var(--arkiv-blue)]" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function S4({ step }: SceneContentProps) {
  return (
    <Slide headline="Queries like a database. Lives on a chain.">
      <Rise delay={0.2} className="absolute left-[120px] top-[300px]">
        <ThisIsFine />
        <p className="mt-6 w-[700px] text-[34px] font-semibold">Server down. Rules changed. Data gone.</p>
      </Rise>
      <Reveal step={step} at={1} className="absolute left-[920px] top-[300px]">
        {step >= 1 ? <ChainTable /> : <div className="h-[400px]" />}
        <p className="mt-8 w-[700px] text-[34px] font-semibold leading-snug">
          Every write is a transaction. Anyone can query. Owners are wallets.
        </p>
      </Reveal>
    </Slide>
  );
}
