"use client";

// A1 · Plugin: your agent knows Arkiv (scene T2). One step: the two-panel "disappointed" meme with
// the mascot (Santiago, October 29; its name never goes in alt text, see Mascot.tsx), about the Arkiv
// AI plugin rather than MCP (October 30). Top, without the plugin: the mascot disappointed, with a
// small tear, over a short example (your agent has to guess how Arkiv works). Bottom, with the plugin:
// the mascot smiling (your agent builds with Arkiv's skills and docs). Santiago, October 30: no "old
// SDK" wording, which sounds as if the SDK were out of date; the gap is what the agent knows. Both pictures (public/deck/memes,
// 1536x1024, same framing) are cropped to a wide strip around the eyes, the tear and the mouth so the
// panels stack like the original; the labels sit beside them, Stone for the bad one and Sand for the
// good one, as in the deck's other memes. The line under the headline names the two agents the
// plugin is packaged for, with their logos. Setup isn't on the slide: one link to the Hub's AI tools
// page, which has the steps.
// The examples follow the plugin's README (https://github.com/Arkiv-Network/ai-plugin: "Arkiv skills,
// MCP source discovery, and project rules for the Web3 database, packaged separately for Claude Code
// and Codex CLI") and the Hub (https://hub.arkiv.network/ai-tools: "Arkiv skills, MCP tools and safety
// guidance in one install"), both read October 30.
// Pictures:
//   arkiv-meme-plugin-sad.webp · an original illustration made for this deck, in the same set as the
//     other memes: an AI-generated edit of the deck's earlier sad MCP meme (removed October 30) that adds the tear, with no
//     third-party assets.
//   claude-code-ivory.svg · Anthropic's press kit (https://www.anthropic.com/press-kit, "Download press
//     kit"), "Anthropic media resources/Anthropic logos/Claude logos/2 Claude Code logo/SVG/Claude Code
//     logo - Ivory.svg": the Claude Code logo in its own light variant for dark backgrounds, unchanged:
//     https://www-cdn.anthropic.com/ae59ca4ca194dac9c9dc3bc78c5829468cb0e8af.zip
//   openai-blossom-white.svg · OpenAI's brand page (https://openai.com/brand/, "Download logos"),
//     "OpenAI-logos/SVGs/OAI_OpenAI-Blossom_White.svg", unchanged: https://cdn.openai.com/brand/openai-logos.zip
//     OpenAI publishes no Codex logo of its own; its Codex pages (https://openai.com/codex/,
//     https://chatgpt.com/codex) carry this Blossom, so it stands next to the word "Codex". Used under
//     OpenAI's brand terms (https://openai.com/brand/#usage-terms): as provided, smaller than our own
//     marks, and with no endorsement or partnership implied.
//   Both SVGs keep their clear space inside the file; the negative margins below only let the visible
//   marks line up with the text.

import { ArrowUpRight } from "lucide-react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { Rise, Slide } from "../../ui";

const AI_TOOLS = "https://hub.arkiv.network/ai-tools";

/** Each picture shows as a 1104x292 strip: source y 346 to 752 at this position, eyes, tear and mouth inside. */
const STRIP = "50% 56%";

function Panel({ label, example, src, alt, good }: { label: string; example: string; src: string; alt: string; good: boolean }) {
  return (
    <>
      <div className={`flex flex-col justify-center gap-3 px-12 ${good ? "bg-[var(--arkiv-sand)]" : "bg-[var(--arkiv-stone)]"}`}>
        <span className="text-[60px] font-semibold leading-[1.05] tracking-[-0.015em] text-[var(--arkiv-ink)]">{label}</span>
        <span className="text-[28px] leading-[1.3] text-[rgba(17,17,17,0.72)]">{example}</span>
      </div>
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed illustration, cropped by its frame */}
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: STRIP }} draggable={false} />
      </div>
    </>
  );
}

/** "The Arkiv AI plugin, for [Claude Code] and [Blossom] Codex": each visible mark 40 px tall. */
function Agents() {
  return (
    <span className="flex items-center gap-4">
      The Arkiv AI plugin, for
      {/* The file's mark fills y 437-1563 of its 2000-unit height: 72 px tall, 16 px of clear space above and below. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- official logo file, unchanged */}
      <img src="/deck/logos/claude-code-ivory.svg" alt="Claude Code" width={295} height={72} className="-my-4 block h-[72px] w-[295px]" draggable={false} />
      and
      <span className="flex items-center gap-3">
        {/* The Blossom fills 175-541 of its 716-unit box: 78 px box, 19 px of clear space on each side. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- official logo file, unchanged */}
        <img src="/deck/logos/openai-blossom-white.svg" alt="OpenAI" width={78} height={78} className="-m-[19px] block h-[78px] w-[78px]" draggable={false} />
        <span className="font-semibold text-[var(--arkiv-sand)]">Codex</span>
      </span>
    </span>
  );
}

export function A1(_props: SceneContentProps) {
  return (
    <Slide headline="Plugin: your agent knows Arkiv" under={<Agents />}>
      {/* Ink shows through the 4 px gaps as the rules between the four cells. */}
      <Rise className="absolute left-[96px] top-[332px] grid h-[588px] w-[1728px] grid-cols-[620px_minmax(0,1fr)] grid-rows-2 gap-[4px] overflow-hidden rounded-[20px] bg-[var(--arkiv-ink)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        <Panel
          label="Without the plugin"
          example="Your agent has to guess how Arkiv works."
          src="/deck/memes/arkiv-meme-plugin-sad.webp"
          alt="Arkiv mascot, disappointed, with a tear"
          good={false}
        />
        <Panel
          label="With the plugin"
          example="Your agent builds with Arkiv's skills and docs."
          src="/deck/memes/arkiv-meme-mcp-happy.webp"
          alt="Arkiv mascot, smiling"
          good
        />
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
  "Same question to your agent, twice. Without the plugin, it only has what it learned in training, and Arkiv is new: it fills the gaps with guesses, and it sounds sure. With the Arkiv AI plugin, in Claude Code or Codex, it builds with Arkiv's own skills and docs: the SDK, the network and how queries work. Setting it up: the steps are on the Hub, under AI tools.",
];
