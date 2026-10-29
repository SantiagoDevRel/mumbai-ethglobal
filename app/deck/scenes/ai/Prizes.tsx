"use client";

// Prizes · Arkiv's prizes at ETHGlobal Mumbai, as published on
// https://ethglobal.com/events/mumbai/prizes/arkiv (read October 29, 2026): names, places and
// amounts only, no network, chain ID or SDK version, which are not settled. → steps: 0-3 one track
// per step, Mirror first; step 4 the Arkiv + Swarm bonus. Each track row is a pill saying who can
// enter (From scratch, or Continuity: the second Build on Arkiv prize, only for projects in
// ETHGlobal's Continuity batch), the name and the money; what each track asks for is in the notes,
// said out loud. The page's parentheses are gone from the names, the pill carries them (Santiago,
// October 29). Two titles open what they point at: Mirror the Sourcify mirror on Arkiv (the page's
// example), Node tooling the community nodes' dashboard (the page's reference). The Swarm bonus is
// an add-on to a track, not a track, so it sits smaller under the rows, split into $500 from
// scratch and $500 Continuity (October 29, ahead of the ETHGlobal page, which Santiago updates).
// The link at the bottom, there from the first step, opens the page itself, where every prize has
// its rules and rubric; it replaces the totals.

import { ArrowUpRight, Plus } from "lucide-react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { PANEL, Reveal, Slide, T } from "../../ui";

type Entry = "scratch" | "continuity";
type Prize = { name: string; entry: Entry; places: number[]; href?: string };

const PRIZES_URL = "https://ethglobal.com/events/mumbai/prizes/arkiv";

const PRIZES: Prize[] = [
  { name: "Mirror something Ethereum depends on", entry: "scratch", places: [3000, 1000], href: "https://sourcify.arkiv.network" },
  { name: "Build on Arkiv", entry: "scratch", places: [3000, 1000] },
  { name: "Build on Arkiv", entry: "continuity", places: [3000, 1000] },
  { name: "Node tooling", entry: "scratch", places: [2000], href: "https://nodes.arkiv.network" },
];

/** The Arkiv + Swarm bonus, on top of a track: one prize for each kind of entry. */
const SWARM_BONUS: { entry: Entry; amount: number }[] = [
  { entry: "scratch", amount: 500 },
  { entry: "continuity", amount: 500 },
];

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const ORDINAL = ["1st", "2nd", "3rd"];

const FOCUS = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[var(--arkiv-orange)]";

/** Who can enter, in the two brand colors: Blue for from scratch, Orange for Continuity. `small` for the add-on. */
function EntryPill({ entry, small = false }: { entry: Entry; small?: boolean }) {
  const size = small ? "h-[36px] w-[150px] text-[19px]" : "h-[48px] w-[200px] text-[24px]";
  return entry === "continuity" ? (
    <span className={`inline-flex ${size} items-center justify-center rounded-full bg-[var(--arkiv-orange)] font-semibold text-[var(--arkiv-ink)]`}>
      Continuity
    </span>
  ) : (
    <span className={`inline-flex ${size} items-center justify-center rounded-full border-[1.5px] border-[rgba(246,244,239,0.28)] bg-[var(--arkiv-blue)] font-semibold text-[var(--arkiv-sand)]`}>
      From scratch
    </span>
  );
}

/** The add-on row: smaller and dashed, indented under the tracks, with the Swarm mark. */
function SwarmBonus({ shown }: { shown: boolean }) {
  return (
    <div
      className="ml-[48px] mt-2 flex h-[76px] items-center gap-5 rounded-[16px] border-[1.5px] border-dashed border-[rgba(246,244,239,0.36)] bg-[rgba(17,17,17,0.55)] pl-5 pr-8"
      inert={!shown}
    >
      <Plus size={30} strokeWidth={2.6} className="flex-none text-[var(--arkiv-orange)]" aria-hidden />
      <span className="flex h-[48px] w-[48px] flex-none items-center justify-center rounded-[12px] bg-[var(--arkiv-sand)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- the official Swarm mark at its own aspect */}
        <img src="/deck/logos/swarm-logo.svg" alt="" width={36} height={36} draggable={false} className="block h-[36px] w-[36px]" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[28px] font-semibold leading-none">Arkiv + Swarm bonus</span>
        <span className="text-[20px] leading-none" style={{ color: T.t64 }}>Add-on: select it next to your track</span>
      </span>
      <span className="ml-auto flex items-center gap-8">
        {SWARM_BONUS.map((bonus) => (
          <span key={bonus.entry} className="flex items-center gap-3">
            <EntryPill entry={bonus.entry} small />
            <span className="text-[32px] font-semibold leading-none tabular-nums text-[var(--arkiv-orange)]">{usd(bonus.amount)}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

function Title({ prize }: { prize: Prize }) {
  const text = "truncate text-[38px] font-semibold leading-[1.15]";
  if (!prize.href) return <span className={text}>{prize.name}</span>;
  return (
    <a
      href={prize.href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-w-0 items-center gap-3 rounded-[8px] decoration-2 underline-offset-8 transition-colors duration-200 hover:text-[var(--arkiv-orange)] hover:underline ${FOCUS}`}
    >
      <span className={text}>{prize.name}</span>
      <ArrowUpRight size={38} strokeWidth={2.4} className="flex-none text-[var(--arkiv-orange)]" aria-hidden />
    </a>
  );
}

export function Prizes({ step }: SceneContentProps) {
  return (
    <Slide headline="Arkiv prizes at ETHGlobal Mumbai" under="Build something with Arkiv this weekend.">
      <div className="absolute left-[96px] top-[330px] flex w-[1728px] flex-col gap-3.5">
        {PRIZES.map((prize, i) => {
          const amount = prize.places.reduce((a, b) => a + b, 0);
          const split = prize.places.length > 1 ? prize.places.map((p, j) => `${ORDINAL[j]} ${usd(p)}`).join(" · ") : "One winner";
          return (
            <Reveal key={`${prize.name}-${prize.entry}`} step={step} at={i} y={16}>
              {/* Not shown yet: nothing in it can be clicked or focused. */}
              <div className={`${PANEL} grid h-[100px] grid-cols-[200px_minmax(0,1fr)_auto] items-center gap-8 px-9`} inert={step < i}>
                <EntryPill entry={prize.entry} />
                <div className="flex min-w-0">
                  <Title prize={prize} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[48px] font-semibold leading-none tabular-nums text-[var(--arkiv-orange)]">{usd(amount)}</span>
                  <span className="mt-1.5 text-[24px] leading-none tabular-nums" style={{ color: T.t64 }}>
                    {split}
                  </span>
                </div>
              </div>
            </Reveal>
          );
        })}
        <Reveal step={step} at={PRIZES.length} y={16}>
          <SwarmBonus shown={step >= PRIZES.length} />
        </Reveal>
      </div>

      <a
        href={PRIZES_URL}
        target="_blank"
        rel="noreferrer"
        className={`absolute left-[96px] top-[918px] inline-flex items-center gap-4 rounded-[10px] text-[32px] font-semibold decoration-2 underline-offset-8 hover:underline ${FOCUS}`}
        style={{ color: T.t84 }}
      >
        Rules and rubric:
        <span className="font-mono text-[var(--arkiv-orange)]">ethglobal.com/events/mumbai/prizes/arkiv</span>
        <ArrowUpRight size={34} strokeWidth={2.4} className="text-[var(--arkiv-orange)]" aria-hidden />
      </a>
    </Slide>
  );
}

export const PRIZES_NOTES: string[] = [
  "Arkiv's prizes this weekend, one at a time; the rules and the rubric for each one are on ETHGlobal, the link at the bottom. The tag says who can enter: from scratch means built here, this weekend. First, mirror something Ethereum depends on: pick public data that Ethereum apps and developers rely on, and mirror it into Arkiv entities anyone can query. The arrow opens ours, Sourcify's verified contracts on Arkiv; yours can be anything but Sourcify data.",
  "Build on Arkiv, from scratch: a new app whose data lives in Arkiv. For example, agents sharing ephemeral coordination state, or listings that expire at their deadline.",
  "Build on Arkiv again, for Continuity: if you came with a product you already have, move part of its data into Arkiv. Only projects in ETHGlobal's Continuity track can enter it, and we judge only what you add here.",
  "Node tooling is for the people who run Arkiv nodes: an operator dashboard, or a tool that finds slow queries on your own node. The arrow opens nodes.arkiv.network, our community nodes seen from the outside: a guide, not something to rebuild.",
  "And on top of a track, the Arkiv + Swarm bonus, an add-on: use Swarm with Arkiv in a meaningful way, and select the bonus next to your track when you submit. Five hundred dollars go to a from-scratch project and five hundred to a Continuity project, the most useful integration in each. Each team can win one Arkiv track prize, plus this bonus on top, and every track scores your Arkiv feedback.",
];
