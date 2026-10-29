"use client";

// T1 · Hub and docs: where to start this weekend. Two cards, one per →. The Hub card keeps three pages
// (Santiago, October 29: faucet, access keys, AI tools); the Docs card the pages the docs home links
// to. Each site and each page is a link that opens in a new tab (all answered October 29).

import { ArrowUpRight, BookOpen, LayoutGrid, type LucideIcon } from "lucide-react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { PANEL, Reveal, Slide, T } from "../ui";

type Card = { title: string; home: string; line: string; pages: [name: string, href: string][]; icon: LucideIcon };

const CARDS: Card[] = [
  {
    title: "Hub",
    home: "https://hub.arkiv.network",
    line: "Everything to get started, in one place.",
    pages: [
      ["Faucet", "https://hub.arkiv.network/faucet"],
      ["Access keys", "https://hub.arkiv.network/access-keys"],
      ["AI tools", "https://hub.arkiv.network/ai-tools"],
    ],
    icon: LayoutGrid,
  },
  {
    title: "Docs",
    home: "https://docs.arkiv.network",
    line: "The SDK and every Arkiv concept.",
    pages: [
      ["Installation", "https://docs.arkiv.network/start-here/installation/"],
      ["Fundamentals", "https://docs.arkiv.network/start-here/fundamentals/"],
      ["Querying data", "https://docs.arkiv.network/json-rpc/querying-data/"],
    ],
    icon: BookOpen,
  },
];

const FOCUS = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[var(--arkiv-orange)]";

export function T1({ step }: SceneContentProps) {
  return (
    <Slide headline="Your turn: start here" under="Two links for the weekend.">
      <div className="absolute left-[96px] top-[340px] grid w-[1728px] grid-cols-2 gap-9">
        {CARDS.map(({ title, home, line, pages, icon: Icon }, i) => (
          <Reveal key={title} step={step} at={i}>
            {/* Not shown yet: its links can't be clicked or focused. */}
            <div className={`${PANEL} flex h-[520px] flex-col gap-6 p-12`} inert={step < i}>
              <Icon size={72} strokeWidth={1.6} className="text-[var(--arkiv-orange)]" aria-hidden />
              <p className="text-[64px] font-semibold leading-none">{title}</p>
              <a
                href={home}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-3 self-start rounded-[8px] font-mono text-[38px] text-[var(--arkiv-orange)] decoration-2 underline-offset-8 hover:underline ${FOCUS}`}
              >
                {new URL(home).host}
                <ArrowUpRight size={38} strokeWidth={2.2} aria-hidden />
              </a>
              <p className="text-[30px] leading-[1.3]" style={{ color: T.t84 }}>
                {line}
              </p>
              <div className="mt-auto flex flex-wrap gap-3">
                {pages.map(([name, href]) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full border-[1.5px] border-[rgba(246,244,239,0.28)] px-5 py-2 text-[24px] font-semibold text-[rgba(246,244,239,0.84)] transition-colors duration-200 hover:border-[var(--arkiv-orange)] hover:text-[var(--arkiv-orange)] ${FOCUS}`}
                  >
                    {name}
                    <ArrowUpRight size={24} strokeWidth={2.4} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Slide>
  );
}

export const T1_NOTES: string[] = [
  "Two links for the weekend. The Hub: test funds from the faucet, your access key, and AI tools to set up your agent.",
  "And the docs: installation, the fundamentals and how to query. Everything we did today is in there.",
];
