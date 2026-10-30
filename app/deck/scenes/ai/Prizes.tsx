"use client";

// Prizes · Arkiv's prizes at ETHGlobal Mumbai, as published on
// https://ethglobal.com/events/mumbai/prizes/arkiv (read October 29 and 30, 2026): names, places,
// amounts and how each one is judged, no network, chain ID or SDK version, which are not settled.
// → steps: 0-3 one track per step, Mirror first; step 4 the Arkiv + Swarm bonus. Each track row is a
// pill saying who can enter (From scratch, or Continuity: the second Build on Arkiv prize, only for
// projects in ETHGlobal's Continuity batch), the name and the money, its places as gold and silver
// medals (Santiago, October 30: medals instead of 1st and 2nd, a gold one for a single winner); what
// each track asks for is in the notes, said out loud. The page's parentheses are gone from the names,
// the pill carries them (October 29). Two titles open what they point at: Mirror the Sourcify mirror
// on Arkiv (the page's example), Node tooling the community nodes' dashboard (the page's reference).
// The Swarm bonus is an add-on to a track, not a track, so it sits smaller under the rows, split into
// $500 from scratch and $500 Continuity (October 29, ahead of the ETHGlobal page, which Santiago
// updates). The link at the bottom, there from the first step, opens the page itself, with every
// prize's rules and full rubric; it replaces the totals.
// The (i) next to each name (Santiago, October 30) opens that prize's rubric in its simplest form:
// the page's "How we judge", one file per criterion in the team's /arkiv/ folder at 25% each, and for
// the Swarm bonus its one file and "the most useful integration wins". One opens at a time, beside its
// row and never over the link or the logo; Esc, a click anywhere else or a → closes it.

import { ArrowUpRight, Info, Plus } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { PANEL, Reveal, Slide, T } from "../../ui";

type Entry = "scratch" | "continuity";
/** `label` names the prize on its own (the (i) and its rubric); `rubric` is its How we judge files. */
type Prize = { name: string; label: string; entry: Entry; places: number[]; href?: string; rubric: string[] };

const PRIZES_URL = "https://ethglobal.com/events/mumbai/prizes/arkiv";

const BUILD_RUBRIC = ["friction.md", "reach.md", "why-arkiv.md", "how-you-use-arkiv.md"];

const PRIZES: Prize[] = [
  {
    name: "Mirror something Ethereum depends on",
    label: "Mirror",
    entry: "scratch",
    places: [3000, 1000],
    href: "https://sourcify.arkiv.network",
    rubric: ["friction.md", "reach.md", "why-arkiv.md", "data-quality.md"],
  },
  { name: "Build on Arkiv", label: "Build on Arkiv, from scratch", entry: "scratch", places: [3000, 1000], rubric: BUILD_RUBRIC },
  { name: "Build on Arkiv", label: "Build on Arkiv, Continuity", entry: "continuity", places: [3000, 1000], rubric: BUILD_RUBRIC },
  {
    name: "Node tooling",
    label: "Node tooling",
    entry: "scratch",
    places: [2000],
    href: "https://nodes.arkiv.network",
    rubric: ["friction.md", "real-use.md", "whats-new.md", "easy-to-run.md"],
  },
];

/** The Arkiv + Swarm bonus, on top of a track: one prize for each kind of entry. */
const SWARM_BONUS: { entry: Entry; amount: number }[] = [
  { entry: "scratch", amount: 500 },
  { entry: "continuity", amount: 500 },
];
const SWARM_LABEL = "Arkiv + Swarm bonus";
const SWARM_RUBRIC = { file: "swarm.md", line: "The most useful Swarm integration wins" };

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
/** Gold, silver and bronze for 1st, 2nd and 3rd place. */
const MEDALS = ["🥇", "🥈", "🥉"];

/** Keys that close an open rubric: Esc, and the ones that move the talk (lib/stage/keyboard.ts). */
const CLOSE_KEYS = new Set(["Escape", "ArrowRight", "ArrowLeft", "PageDown", "PageUp", " "]);

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

/** The (i) beside a prize's name: opens or closes its rubric. */
function RubricButton({ label, open, controls, size, onToggle }: { label: string; open: boolean; controls: string; size: number; onToggle: () => void }) {
  return (
    <button
      type="button"
      data-rubric=""
      aria-label={`Rubric for ${label}`}
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      onClick={onToggle}
      className={`flex-none rounded-full p-1 transition-colors duration-200 ${open ? "text-[var(--arkiv-orange)]" : "text-[rgba(246,244,239,0.64)] hover:text-[var(--arkiv-sand)]"} ${FOCUS}`}
    >
      <Info size={size} strokeWidth={2.2} aria-hidden />
    </button>
  );
}

/** One criterion's file, with its share of the score when it has one. */
function RubricFile({ name, share }: { name: string; share?: string }) {
  return (
    <span className="inline-flex items-baseline gap-2.5 rounded-full border-[1.5px] border-[rgba(246,244,239,0.2)] px-4 py-2">
      <span className="font-mono text-[26px] leading-none text-[var(--arkiv-sand)]">{name}</span>
      {share ? <span className="text-[26px] font-semibold leading-none tabular-nums text-[var(--arkiv-orange)]">{share}</span> : null}
    </span>
  );
}

/** The open rubric, one line under a small heading, lined up with its prize's name: below the first
 * three rows, above the fourth and the Swarm bonus, so it stays between y 440 and 800 (the link at the
 * bottom starts at y 918, the logo at 1012). */
function Rubric({ id, label, place, left, children }: { id: string; label: string; place: "below" | "above"; left: number; children: ReactNode }) {
  return (
    <div
      id={id}
      role="dialog"
      aria-label={`Rubric for ${label}`}
      data-rubric=""
      className={`absolute z-20 rounded-[16px] border-[1.5px] border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.96)] px-8 py-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${place === "below" ? "top-[calc(100%+10px)]" : "bottom-[calc(100%+10px)]"}`}
      style={{ left }}
    >
      <p className="text-[20px] font-bold leading-none tracking-[0.1em]" style={{ color: T.t64 }}>
        HOW WE JUDGE
      </p>
      <div className="mt-4 flex items-center gap-3 whitespace-nowrap">{children}</div>
    </div>
  );
}

/** The add-on row: smaller and dashed, indented under the tracks, with the Swarm mark. */
function SwarmBonus({ shown, open, id, onToggle }: { shown: boolean; open: boolean; id: string; onToggle: () => void }) {
  return (
    <div
      className="relative ml-[48px] mt-2 flex h-[76px] items-center gap-5 rounded-[16px] border-[1.5px] border-dashed border-[rgba(246,244,239,0.36)] bg-[rgba(17,17,17,0.55)] pl-5 pr-8"
      inert={!shown}
    >
      <Plus size={30} strokeWidth={2.6} className="flex-none text-[var(--arkiv-orange)]" aria-hidden />
      <span className="flex h-[48px] w-[48px] flex-none items-center justify-center rounded-[12px] bg-[var(--arkiv-sand)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- the official Swarm mark at its own aspect */}
        <img src="/deck/logos/swarm-logo.svg" alt="" width={36} height={36} draggable={false} className="block h-[36px] w-[36px]" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="text-[28px] font-semibold leading-none">{SWARM_LABEL}</span>
          <RubricButton label={SWARM_LABEL} open={open} controls={id} size={28} onToggle={onToggle} />
        </span>
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
      {/* Lined up with the title: 20 px padding, the + (30), the tile (48) and two 20 px gaps. */}
      {open ? (
        <Rubric id={id} label={SWARM_LABEL} place="above" left={138}>
          <RubricFile name={SWARM_RUBRIC.file} />
          <span className="text-[26px] leading-none" style={{ color: T.t84 }}>
            {SWARM_RUBRIC.line}
          </span>
        </Rubric>
      ) : null}
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
  const uid = useId();
  // The rubric open on this step, if any: one at a time, and a step change closes it for good (the
  // stage's arrow can re-render this before the key listener below runs, so the step itself clears it).
  const [rubric, setRubric] = useState<{ key: string; step: number } | null>(null);
  if (rubric !== null && rubric.step !== step) setRubric(null);
  const open = rubric !== null && rubric.step === step ? rubric.key : null;
  const toggle = (key: string) => setRubric(open === key ? null : { key, step });

  useEffect(() => {
    if (open === null) return;
    const close = () => setRubric(null);
    const onKey = (event: KeyboardEvent) => {
      if (CLOSE_KEYS.has(event.key)) close();
    };
    // A primary click outside the rubric and its (i); a right-drag still draws a box over it.
    const onPointer = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest("[data-rubric]")) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <Slide headline="Arkiv prizes at ETHGlobal Mumbai" under="Build something with Arkiv this weekend.">
      <div className="absolute left-[96px] top-[330px] flex w-[1728px] flex-col gap-3.5">
        {PRIZES.map((prize, i) => {
          const key = `track-${i}`;
          const id = `${uid}-rubric-${key}`;
          const amount = prize.places.reduce((a, b) => a + b, 0);
          const split = prize.places.map((place, j) => `${MEDALS[j]} ${usd(place)}`).join(" · ");
          const share = `${Math.round(100 / prize.rubric.length)}%`;
          return (
            <Reveal key={`${prize.name}-${prize.entry}`} step={step} at={i} y={16} className={open === key ? "relative z-10" : "relative"}>
              {/* Not shown yet: nothing in it can be clicked or focused. */}
              <div className={`${PANEL} relative grid h-[100px] grid-cols-[200px_minmax(0,1fr)_auto] items-center gap-8 px-9`} inert={step < i}>
                <EntryPill entry={prize.entry} />
                <div className="flex min-w-0 items-center gap-3">
                  <Title prize={prize} />
                  <RubricButton label={prize.label} open={open === key} controls={id} size={34} onToggle={() => toggle(key)} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[48px] font-semibold leading-none tabular-nums text-[var(--arkiv-orange)]">{usd(amount)}</span>
                  <span className="mt-1.5 text-[24px] leading-none tabular-nums" style={{ color: T.t64 }}>
                    {split}
                  </span>
                </div>
                {/* Lined up with the name: 36 px padding, the 200 px pill and a 32 px gap. */}
                {open === key ? (
                  <Rubric id={id} label={prize.label} place={i < 3 ? "below" : "above"} left={268}>
                    {prize.rubric.map((file) => (
                      <RubricFile key={file} name={file} share={share} />
                    ))}
                  </Rubric>
                ) : null}
              </div>
            </Reveal>
          );
        })}
        <Reveal step={step} at={PRIZES.length} y={16} className={open === "swarm" ? "relative z-10" : "relative"}>
          <SwarmBonus shown={step >= PRIZES.length} open={open === "swarm"} id={`${uid}-rubric-swarm`} onToggle={() => toggle("swarm")} />
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
  "Arkiv's prizes this weekend, one at a time. The (i) next to each name shows how we judge it: one file per criterion in your repo, under /arkiv/. The full rules are on ETHGlobal, the link at the bottom. The tag says who can enter: from scratch means built here, this weekend. First, mirror something Ethereum depends on: pick public data that Ethereum apps and developers rely on, and mirror it into Arkiv entities anyone can query. The arrow opens ours, Sourcify's verified contracts on Arkiv; yours can be anything but Sourcify data.",
  "Build on Arkiv, from scratch: a new app whose data lives in Arkiv. For example, agents sharing ephemeral coordination state, or listings that expire at their deadline.",
  "Build on Arkiv again, for Continuity: if you came with a product you already have, move part of its data into Arkiv. Only projects in ETHGlobal's Continuity track can enter it, and we judge only what you add here.",
  "Node tooling is for the people who run Arkiv nodes: an operator dashboard, or a tool that finds slow queries on your own node. The arrow opens nodes.arkiv.network, our community nodes seen from the outside: a guide, not something to rebuild.",
  "And on top of a track, the Arkiv + Swarm bonus, an add-on: use Swarm with Arkiv in a meaningful way, and select the bonus next to your track when you submit. Five hundred dollars go to a from-scratch project and five hundred to a Continuity project, the most useful integration in each. Each team can win one Arkiv track prize, plus this bonus on top, and every track scores your Arkiv feedback.",
];
