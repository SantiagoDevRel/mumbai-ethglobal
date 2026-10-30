"use client";

// NT · What Arkiv DB-Chain is not, right after the five steps (Santiago, October 29; the title names
// the DB-Chain since the day's second round): the three edges a builder hits first, one per →, each
// with its own icon (a contract crossed out, a big file going to Swarm, an open lock). Minimal since
// October 30 (Santiago): each row is its icon and its title; only the big-files row gets a size to
// picture, and the privacy row a way out. Every line was checked against the sources:
//   - a DB-Chain runs no contracts: "No smart contracts, by construction"; a transaction is accepted
//     only when it targets a known Arkiv operation address (docs.arkiv.network/start-here/fundamentals);
//   - 128 KB per entity: @arkiv-network/sdk 1.0.0 on Rabdi caps the bytes of one create or patch at
//     MAX_ENTITY_BYTES = 128 * 1024 (src/schema/attributes.ts). A page of plain text is about
//     3,000 bytes, so about 43 pages fit; real travel photos re-encoded as JPEG quality 85 at 640×427
//     measured 52-92 KB (October 30). Big files go to Swarm and the entity keeps the reference (W4,
//     and the arkiv-large-files skill's external-blob pointers);
//   - there is no read access control, so anyone can read every entity (Arkiv cookbook, "Multi-tenant
//     data when there is no read access control"), and you encrypt private values yourself before
//     writing them; an encrypted value is stored as bytes, and the other columns stay public.
// The Swarm mark is the official file from the ethersphere/bee-docs repository, unchanged:
// https://raw.githubusercontent.com/ethersphere/bee-docs/master/static/img/swarm-logo-2.svg
// (public/deck/logos/swarm-logo.svg).

import { ArrowRight, FileCode, FilePlay, LockKeyholeOpen } from "lucide-react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { PANEL, Reveal, Slide, T } from "../ui";

/** The contract icon with a slash through it, cut out of the panel like lucide's "-off" icons. */
function NoContract() {
  return (
    <span className="relative block h-[104px] w-[104px]">
      <FileCode size={104} strokeWidth={1.6} className="text-[var(--arkiv-orange)]" aria-hidden />
      <svg className="absolute inset-0" width="104" height="104" viewBox="0 0 24 24" aria-hidden>
        <path d="M3 3 21 21" stroke="#111111" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M3 3 21 21" stroke="#F6F4EF" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** A big file on its way to Swarm. */
function FileToSwarm() {
  return (
    <span className="flex items-center gap-4">
      <FilePlay size={92} strokeWidth={1.6} className="text-[var(--arkiv-orange)]" aria-hidden />
      <ArrowRight size={44} strokeWidth={2.4} style={{ color: T.t84 }} aria-hidden />
      <span className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[var(--arkiv-sand)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- official logo file at its own aspect */}
        <img src="/deck/logos/swarm-logo.svg" alt="Swarm" width={80} height={80} draggable={false} className="block h-[80px] w-[80px]" />
      </span>
    </span>
  );
}

const ITEMS: { icon: ReactNode; title: string; line?: string }[] = [
  { icon: <NoContract />, title: "Not a smart-contract chain" },
  { icon: <FileToSwarm />, title: "Not built for big files", line: "128 KB per entity: about 40 pages of text or a 640×480 photo" },
  { icon: <LockKeyholeOpen size={104} strokeWidth={1.6} className="text-[var(--arkiv-orange)]" aria-hidden />, title: "Not private by default", line: "You can encrypt values yourself" },
];

export function NT({ step }: SceneContentProps) {
  return (
    <Slide headline="What Arkiv DB-Chain is not" size={72}>
      <div role="list" className="absolute left-[96px] top-[300px] flex w-[1728px] flex-col gap-7">
        {ITEMS.map((item, i) => (
          <Reveal key={item.title} step={step} at={i} y={16}>
            <div role="listitem" className={`${PANEL} grid h-[192px] grid-cols-[300px_minmax(0,1fr)] items-center gap-10 pl-4 pr-12`}>
              <span className="flex items-center justify-center">{item.icon}</span>
              <span className="flex min-w-0 flex-col gap-3">
                <span className="text-[60px] font-semibold leading-[1.1]">{item.title}</span>
                {item.line ? (
                  <span className="text-[34px] leading-[1.3]" style={{ color: T.t64 }}>
                    {item.line}
                  </span>
                ) : null}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </Slide>
  );
}

export const NT_NOTES: string[] = [
  "Before we build, three things an Arkiv DB-Chain is not. One: not a smart-contract chain. A DB-Chain runs no contracts at all. Your logic lives in your app, or in contracts on another chain, and your app talks to each side.",
  "Two: not built for big files. An entity holds small data you can query. Videos and big files go to Swarm, and the entity keeps the reference.",
  "Three: not private by default. Anyone can read every entity, so encrypt private values before you write them, and keep them out of attributes, which stay public. We'll see that in a few minutes.",
];
