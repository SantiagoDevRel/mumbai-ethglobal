"use client";

// S4 · Two ideas, one per step, never on screen together. Step 0, the problem: your data on one
// company's server, and the server on fire (the mascot scared in front of it). Step 1, the answer:
// you query Arkiv like a database, and the table lives on a DB-Chain. The blocks under the table
// are a picture, not chain data, so they carry neutral labels (n, n+1, …).

import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { ServerOnFire } from "../memes";
import { EASE, Rise, Slide, T } from "../ui";

const BLOCKS = ["n", "n+1", "n+2", "n+3", "n+4"];
const ROWS: [name: string, category: string, rating: string, match: boolean][] = [
  ["Chai Corner", "cafe", "4.6", true],
  ["Masala Box", "street-food", "4.4", false],
  ["Bombay Brew", "cafe", "4.8", true],
  ["Page Turner", "bookstore", "4.8", false],
  ["Irani Bakery", "cafe", "4.1", false],
];

function QueryAndChain() {
  return (
    <div className="absolute left-[96px] top-[360px] flex w-[1728px] gap-14">
      <Rise delay={0.15} className="flex w-[640px] flex-col gap-6">
        <p className="text-[28px] font-semibold" style={{ color: T.t64 }}>
          Ask like a database
        </p>
        <div className="flex items-center gap-4 rounded-[18px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.85)] px-7 py-6 font-mono text-[34px]">
          <Search size={34} className="shrink-0 text-[var(--arkiv-orange)]" aria-hidden />
          <span>
            category = <span className="text-[var(--arkiv-orange)]">cafe</span>
            <br />
            rating ≥ <span className="text-[var(--arkiv-orange)]">4.5</span>
          </span>
        </div>
        <p className="text-[30px] leading-[1.35]">Filter here, sort in your app. No database server to run.</p>
      </Rise>
      <Rise delay={0.3} className="flex w-[880px] flex-col gap-6">
        <p className="text-[28px] font-semibold" style={{ color: T.t64 }}>
          The table lives on a DB-Chain
        </p>
        <div className="overflow-hidden rounded-[20px] border border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.9)]">
          {ROWS.map(([name, category, rating, match], i) => (
            <motion.div
              key={name}
              className={`grid grid-cols-[1.4fr_1.2fr_0.6fr] px-7 py-3.5 font-mono text-[28px] ${i > 0 ? "border-t border-[rgba(246,244,239,0.08)]" : ""}`}
              initial={false}
              animate={{ opacity: match ? 1 : 0.32, backgroundColor: match ? "rgba(254,116,70,0.18)" : "rgba(0,0,0,0)" }}
              transition={{ duration: 0.5, delay: 1 + i * 0.08, ease: EASE }}
            >
              <span>{name}</span>
              <span>{category}</span>
              <span>{rating}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center">
          {BLOCKS.map((n, i) => (
            <div key={n} className="flex items-center">
              {i > 0 ? <div className="h-[4px] w-[24px] bg-[var(--arkiv-stone)]/60" /> : null}
              <motion.div
                className="flex h-[72px] w-[148px] flex-col items-center justify-center rounded-[12px] bg-[var(--arkiv-blue)] font-mono text-[var(--arkiv-sand)]"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.4 + i * 0.08, ease: EASE }}
              >
                <span className="text-[14px] opacity-70">block</span>
                <span className="text-[22px] font-semibold">{n}</span>
              </motion.div>
            </div>
          ))}
        </div>
        <p className="text-[28px] leading-[1.35]">Every write is a transaction. Anyone can query. Owners are wallets.</p>
      </Rise>
    </div>
  );
}

export function S4({ step }: SceneContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={step >= 1 ? "answer" : "problem"} className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
        {step >= 1 ? (
          <Slide headline="Arkiv: query it like a database" size={72}>
            <QueryAndChain />
          </Slide>
        ) : (
          <Slide headline="Your data, on one company's server" size={72} wash={0.86}>
            <Rise delay={0.2} className="absolute left-[96px] top-[300px]">
              <ServerOnFire />
            </Rise>
          </Slide>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
