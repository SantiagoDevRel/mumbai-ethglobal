"use client";

// T1 · Hub, docs and AI tools: where to start this weekend. Three cards, one per →. The Hub card keeps
// the faucet and access keys; the Docs card the pages the docs home links to; the AI tools card links
// straight to the Hub's AI tools page and its sections (Santiago, October 30; the anchors #arkiv-ai-plugin,
// #mcp and #skills checked on hub.arkiv.network/ai-tools that day). Each site and each page is a link
// that opens in a new tab.

import { ArrowUpRight, BookOpen, Bot, LayoutGrid, type LucideIcon } from "lucide-react";
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
  {
    title: "AI tools",
    home: "https://hub.arkiv.network/ai-tools",
    line: "Set up your coding agent for Arkiv.",
    pages: [
      ["Plugin", "https://hub.arkiv.network/ai-tools#arkiv-ai-plugin"],
      ["MCP", "https://hub.arkiv.network/ai-tools#mcp"],
      ["Skills", "https://hub.arkiv.network/ai-tools#skills"],
    ],
    icon: Bot,
  },
];

/** What a card shows of its link: the host, and the path when there is one. */
const shown = (href: string) => {
  const url = new URL(href);
  return url.pathname === "/" ? url.host : `${url.host}${url.pathname}`;
};

const FOCUS = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[var(--arkiv-orange)]";

export function T1({ step }: SceneContentProps) {
  return (
    <Slide headline="Your turn: start here">
      <div className="absolute left-[96px] top-[312px] grid w-[1728px] grid-cols-3 gap-8">
        {CARDS.map(({ title, home, line, pages, icon: Icon }, i) => (
          <Reveal key={title} step={step} at={i}>
            {/* Not shown yet: its links can't be clicked or focused. */}
            <div className={`${PANEL} flex h-[548px] flex-col gap-5 p-10`} inert={step < i}>
              <Icon size={64} strokeWidth={1.6} className="text-[var(--arkiv-orange)]" aria-hidden />
              <p className="text-[56px] font-semibold leading-none">{title}</p>
              {/* The longest, hub.arkiv.network/ai-tools, fits a card's 474 px at 28 px. */}
              <a
                href={home}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 self-start whitespace-nowrap rounded-[8px] font-mono text-[28px] text-[var(--arkiv-orange)] decoration-2 underline-offset-8 hover:underline ${FOCUS}`}
              >
                {shown(home)}
                <ArrowUpRight size={26} strokeWidth={2.4} aria-hidden />
              </a>
              <p className="text-[28px] leading-[1.3]" style={{ color: T.t84 }}>
                {line}
              </p>
              <div className="mt-auto flex flex-wrap gap-3">
                {pages.map(([name, href]) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full border-[1.5px] border-[rgba(246,244,239,0.28)] px-4 py-2 text-[24px] font-semibold text-[rgba(246,244,239,0.84)] transition-colors duration-200 hover:border-[var(--arkiv-orange)] hover:text-[var(--arkiv-orange)] ${FOCUS}`}
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
  "Your turn. The Hub: test funds from the faucet and your access key.",
  "The docs: installation, the fundamentals and how to query. Everything we did today is in there.",
  "And AI tools, to set up your coding agent: the Arkiv AI plugin, the MCP and the skills. More on that next.",
];
