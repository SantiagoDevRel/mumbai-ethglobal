"use client";

// Prizes · Arkiv's prizes at ETHGlobal Mumbai, as published on ETHGlobal on October 27, 2026
// (source: ../ethglobal-preview/ethglobal-prizes.md, mirror of
// https://ethglobal.com/events/mumbai/prizes/arkiv). Names, places and amounts only: no network,
// chain ID or SDK version, which are not settled. The total and the number of prizes are summed from
// the places. → steps: 0-4 one prize per step (the first comes with the headline), 5 the total.
// Each row is the name and the money only; what each track asks for is in the notes, said out loud
// (outline v3: less on screen). Only the two tracks that differ carry a tag: Continuity, and the
// Swarm bonus, which only from-scratch projects can enter. The total line carries the two rules a
// team needs before it starts (one track prize plus the bonus, feedback scored in every track), as
// published on ETHGlobal.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, REVEAL_TIME, Reveal, Slide, T } from "../../ui";

type Prize = { name: string; tag?: string; places: number[] };

const PRIZES: Prize[] = [
  { name: "Mirror something Ethereum depends on", places: [3000, 1000] },
  { name: "Build on Arkiv (from scratch)", places: [3000, 1000] },
  { name: "Build on Arkiv (existing projects)", tag: "Continuity", places: [3000, 1000] },
  { name: "Node tooling", places: [2000] },
  { name: "Arkiv + Swarm bonus", tag: "From-scratch projects", places: [1000] },
];

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const ORDINAL = ["1st", "2nd", "3rd"];
const TOTAL = PRIZES.reduce((sum, p) => sum + p.places.reduce((a, b) => a + b, 0), 0);
const PLACES = PRIZES.reduce((sum, p) => sum + p.places.length, 0);

export function Prizes({ step }: SceneContentProps) {
  return (
    <Slide headline="Arkiv prizes at ETHGlobal Mumbai" under="Build something with Arkiv this weekend.">
      <div className="absolute left-[96px] top-[330px] flex w-[1728px] flex-col gap-3.5">
        {PRIZES.map((prize, i) => {
          const amount = prize.places.reduce((a, b) => a + b, 0);
          const split = prize.places.length > 1 ? prize.places.map((p, j) => `${ORDINAL[j]} ${usd(p)}`).join(" · ") : "One winner";
          return (
            <Reveal key={prize.name} step={step} at={i} y={16}>
              <div className={`${PANEL} grid h-[100px] grid-cols-[minmax(0,1fr)_auto] items-center gap-10 px-9`}>
                <div className="flex min-w-0 items-center gap-4">
                  <span className="truncate text-[38px] font-semibold leading-[1.15]">{prize.name}</span>
                  {prize.tag ? (
                    <span className="flex-none rounded-full border-[1.5px] border-[var(--arkiv-orange)] px-3.5 py-0.5 text-[19px] font-semibold text-[var(--arkiv-orange)]">
                      {prize.tag}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[48px] font-semibold leading-none tabular-nums text-[var(--arkiv-orange)]">{usd(amount)}</span>
                  <span className="mt-1.5 text-[20px] tabular-nums" style={{ color: T.t64 }}>
                    {split}
                  </span>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal step={step} at={PRIZES.length} y={16} className="absolute left-[96px] top-[912px] w-[1728px]">
        <div className="grid h-[104px] grid-cols-[minmax(0,1fr)_auto] items-center gap-10 rounded-[16px] bg-[var(--arkiv-blue)] px-9 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-1">
            <span className="text-[34px] font-semibold leading-[1.15]">In total · {PLACES} prizes</span>
            <span className="text-[22px]" style={{ color: "rgba(246,244,239,0.8)" }}>
              One track prize per team, plus the Swarm bonus. Every track scores your Arkiv feedback.
            </span>
          </div>
          <motion.span
            className="text-[64px] font-semibold leading-none tabular-nums"
            initial={false}
            animate={{ scale: step >= PRIZES.length ? 1 : 0.9 }}
            transition={{ duration: REVEAL_TIME, ease: EASE }}
          >
            {usd(TOTAL)}
          </motion.span>
        </div>
      </Reveal>
    </Slide>
  );
}

export const PRIZES_NOTES: string[] = [
  "Arkiv's prizes this weekend, one at a time. Mirror something Ethereum depends on: copy public data that Ethereum apps rely on into Arkiv so anyone can query it. Build on Arkiv from scratch: a new app whose data lives in Arkiv. And if you came with a product you already have, the Continuity track: move part of its data into Arkiv.",
  "Node tooling is for the people who run Arkiv nodes: an operator dashboard, or a tool that finds slow queries on your own node. And the Arkiv + Swarm bonus goes on top of a track prize for new projects that use both in a meaningful way.",
  "Each team can win one track prize, plus the Swarm bonus. Every prize asks for your Arkiv feedback: what got in your way, and what we should build next. Full rules are on the Arkiv page of the ETHGlobal Mumbai prizes.",
];
