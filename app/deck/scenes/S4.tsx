"use client";

// S4 · Two ideas, never on screen together, built one → at a time:
//   step 0 · the problem: your data on one company's server, the server on fire (mascot scared)
//   step 1 · "Server down. Rules changed. Data gone." (one idea, together)
//   step 2 · the answer slide: "Arkiv: query it like a database" and the query
//   step 3 · the table (every row, nothing filtered yet)
//   step 4 · the query runs: matching rows light up, "Filter here, sort in your app."
//   step 5 · the blocks under the table: the table lives on a DB-Chain
// The blocks under the table are a picture, not chain data, so they carry neutral labels (n, n+1, …).

import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { ServerOnFire } from "../memes";
import { EASE, Reveal, Slide, T } from "../ui";

const BLOCKS = ["n", "n+1", "n+2", "n+3", "n+4"];
const ROWS: [name: string, category: string, rating: string, match: boolean][] = [
  ["Chai Corner", "cafe", "4.6", true],
  ["Masala Box", "street-food", "4.4", false],
  ["Bombay Brew", "cafe", "4.8", true],
  ["Page Turner", "bookstore", "4.8", false],
  ["Irani Bakery", "cafe", "4.1", false],
];

function QueryAndChain({ step }: { step: number }) {
  const filtered = step >= 4;
  return (
    <div className="absolute left-[96px] top-[360px] flex w-[1728px] gap-14">
      <div className="flex w-[640px] flex-col gap-6">
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
        <Reveal step={step} at={4}>
          <p className="text-[30px] leading-[1.35]">Filter here, sort in your app. No database server to run.</p>
        </Reveal>
      </div>
      <Reveal step={step} at={3} className="flex w-[880px] flex-col gap-6">
        <p className="text-[28px] font-semibold" style={{ color: T.t64 }}>
          The table lives on a DB-Chain
        </p>
        <div className="overflow-hidden rounded-[20px] border border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.9)]">
          {ROWS.map(([name, category, rating, match], i) => (
            <motion.div
              key={name}
              className={`grid grid-cols-[1.4fr_1.2fr_0.6fr] px-7 py-3.5 font-mono text-[28px] ${i > 0 ? "border-t border-[rgba(246,244,239,0.08)]" : ""}`}
              initial={false}
              animate={
                filtered
                  ? { opacity: match ? 1 : 0.32, backgroundColor: match ? "rgba(254,116,70,0.18)" : "rgba(0,0,0,0)" }
                  : { opacity: 1, backgroundColor: "rgba(0,0,0,0)" }
              }
              transition={{ duration: 0.5, ease: EASE }}
            >
              <span>{name}</span>
              <span>{category}</span>
              <span>{rating}</span>
            </motion.div>
          ))}
        </div>
        <Reveal step={step} at={5} className="flex flex-col gap-6">
          <div className="flex items-center">
            {BLOCKS.map((n, i) => (
              <div key={n} className="flex items-center">
                {i > 0 ? <div className="h-[4px] w-[24px] bg-[var(--arkiv-stone)]/60" /> : null}
                <div className="flex h-[72px] w-[148px] flex-col items-center justify-center rounded-[12px] bg-[var(--arkiv-blue)] font-mono text-[var(--arkiv-sand)]">
                  <span className="text-[14px] opacity-70">block</span>
                  <span className="text-[22px] font-semibold">{n}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[28px] leading-[1.35]">Every write is a transaction. Anyone can query. Owners are wallets.</p>
        </Reveal>
      </Reveal>
    </div>
  );
}

export function S4({ step }: SceneContentProps) {
  const answer = step >= 2;
  return (
    <AnimatePresence mode="wait">
      <motion.div key={answer ? "answer" : "problem"} className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
        {answer ? (
          <Slide headline="Arkiv: query it like a database" size={72}>
            <QueryAndChain step={step} />
          </Slide>
        ) : (
          <Slide headline="Your data, on one company's server" size={72} wash={0.86}>
            <div className="absolute left-[96px] top-[300px]">
              <ServerOnFire lines={step >= 1} />
            </div>
          </Slide>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
