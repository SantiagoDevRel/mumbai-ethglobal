"use client";

// A1 · MCP: your agent asks Arkiv (scene T2). One step: the two-panel "disappointed" meme with the
// mascot (Santiago, October 29; its name never goes in alt text, see Mascot.tsx). Top, the mascot
// smiling: with MCP your agent asks Arkiv and gets today's answer.
// Bottom, the same shot disappointed: without MCP it answers from old training data. Both pictures
// (public/deck/memes, 1536x1024, same framing) are cropped to a wide strip around the eyes and mouth
// so the panels stack like the original; the labels sit beside them, Sand for the good one and Stone
// for the bad one, as in the deck's other memes. Setup isn't on the slide: one link to the Hub's
// AI tools page, which has the steps.

import { ArrowUpRight } from "lucide-react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { Rise, Slide } from "../../ui";

const AI_TOOLS = "https://hub.arkiv.network/ai-tools";

/** Each picture shows as a 1164x292 strip: source y 358 to 743 at this position, eyes and mouth inside. */
const STRIP = "50% 56%";

function Panel({ label, src, alt, good }: { label: string; src: string; alt: string; good: boolean }) {
  return (
    <>
      <div className={`flex items-center px-12 ${good ? "bg-[var(--arkiv-sand)]" : "bg-[var(--arkiv-stone)]"}`}>
        <span className="text-[72px] font-semibold leading-[1.05] tracking-[-0.015em] text-[var(--arkiv-ink)]">{label}</span>
      </div>
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed illustration, cropped by its frame */}
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: STRIP }} draggable={false} />
      </div>
    </>
  );
}

export function A1(_props: SceneContentProps) {
  return (
    <Slide headline="MCP: your agent asks Arkiv" under="MCP connects your coding agent to Arkiv's docs and tools.">
      {/* Ink shows through the 4 px gaps as the rules between the four cells. */}
      <Rise className="absolute left-[96px] top-[332px] grid h-[588px] w-[1728px] grid-cols-[560px_minmax(0,1fr)] grid-rows-2 gap-[4px] overflow-hidden rounded-[20px] bg-[var(--arkiv-ink)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        <Panel label="With MCP" src="/deck/memes/arkiv-meme-mcp-happy.webp" alt="Arkiv mascot, smiling" good />
        <Panel label="Without MCP" src="/deck/memes/arkiv-meme-mcp-sad.webp" alt="Arkiv mascot, disappointed" good={false} />
      </Rise>
      <Rise className="absolute left-[96px] top-[948px]">
        <a
          href={AI_TOOLS}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-4 rounded-[10px] text-[32px] font-semibold text-[rgba(246,244,239,0.84)] decoration-2 underline-offset-8 hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[var(--arkiv-orange)]"
        >
          Set it up in your agent:
          <span className="font-mono text-[var(--arkiv-orange)]">hub.arkiv.network/ai-tools</span>
          <ArrowUpRight size={34} strokeWidth={2.4} className="text-[var(--arkiv-orange)]" aria-hidden />
        </a>
      </Rise>
    </Slide>
  );
}

export const A1_NOTES: string[] = [
  "Same question to your agent, twice. Without MCP, it answers from old training data: an old network, an old SDK, and it sounds sure. With MCP, it asks Arkiv directly, with the network_status tool, and gets today's answer. Setting it up: the steps are on the Hub, under AI tools.",
];
