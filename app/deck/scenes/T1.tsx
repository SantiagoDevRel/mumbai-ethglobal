"use client";

// T1 · Hub and docs: where to start this weekend. Two cards, one per →. The page names are the ones
// each site links from its home page (checked October 28).

import { BookOpen, LayoutGrid, type LucideIcon } from "lucide-react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { PANEL, Reveal, Slide, T } from "../ui";

const CARDS: { title: string; url: string; line: string; pages: string[]; icon: LucideIcon }[] = [
  { title: "Hub", url: "hub.arkiv.network", line: "Everything to get started, in one place.", pages: ["Faucet", "Access keys", "Try it out"], icon: LayoutGrid },
  { title: "Docs", url: "docs.arkiv.network", line: "The SDK and every Arkiv concept.", pages: ["Installation", "Fundamentals", "Querying data"], icon: BookOpen },
];

export function T1({ step }: SceneContentProps) {
  return (
    <Slide headline="Your turn: start here" under="Two links for the weekend.">
      <div className="absolute left-[96px] top-[340px] grid w-[1728px] grid-cols-2 gap-9">
        {CARDS.map(({ title, url, line, pages, icon: Icon }, i) => (
          <Reveal key={title} step={step} at={i}>
            <div className={`${PANEL} flex h-[520px] flex-col gap-6 p-12`}>
              <Icon size={72} strokeWidth={1.6} className="text-[var(--arkiv-orange)]" aria-hidden />
              <p className="text-[64px] font-semibold leading-none">{title}</p>
              <p className="font-mono text-[38px] text-[var(--arkiv-orange)]">{url}</p>
              <p className="text-[30px] leading-[1.3]" style={{ color: T.t84 }}>{line}</p>
              <div className="mt-auto flex flex-wrap gap-3">
                {pages.map((page) => (
                  <span key={page} className="rounded-full border-[1.5px] px-5 py-2 text-[24px] font-semibold" style={{ borderColor: T.t28, color: T.t84 }}>
                    {page}
                  </span>
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
  "Two links for the weekend. The Hub: the faucet, access keys and a place to try it out.",
  "And the docs: installation, the fundamentals and how to query. Everything we did today is in there.",
];
