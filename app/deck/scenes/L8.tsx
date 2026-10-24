"use client";

// L8 · Your turn: build it this weekend. Every URL here was checked with a live request
// (docs.arkiv.network 200; hub.arkiv.network/ai-tools 200 with #arkiv-ai-plugin and #mcp anchors).
// Prizes stay a placeholder: never invent amounts or details.

import { BookOpen, Bot, Plug, Trophy, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Blok, EASE, Slide } from "../ui";

export const RESOURCES: { title: string; line: string | null; url: string | null; icon: LucideIcon }[] = [
  { title: "Docs", line: null, url: "docs.arkiv.network", icon: BookOpen },
  { title: "Arkiv AI plugin", line: "Your agent already knows Arkiv", url: "hub.arkiv.network/ai-tools", icon: Bot },
  { title: "Arkiv MCP", line: null, url: "hub.arkiv.network/ai-tools#mcp", icon: Plug },
  { title: "Prizes", line: "Prizes: announced at the event", url: null, icon: Trophy },
];

export function L8(_props: SceneContentProps) {
  return (
    <Slide headline="Your turn: build it this weekend">
      <div className="absolute left-[120px] top-[360px] grid w-[1360px] grid-cols-2 gap-7">
        {RESOURCES.map(({ title, line, url, icon: Icon }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 + i * 0.1, ease: EASE }}
            className={`flex gap-7 rounded-[28px] border-[3px] p-8 ${url ? "border-[var(--panel-border)] bg-[rgba(17,17,17,0.82)]" : "border-dashed border-[var(--panel-border)] bg-[rgba(17,17,17,0.6)]"}`}
          >
            <Icon size={64} strokeWidth={1.6} className="shrink-0 text-[var(--arkiv-orange)]" />
            <div>
              <p className="text-[44px] font-semibold leading-tight">{title}</p>
              {line ? <p className="mt-1 text-[28px] text-[var(--stage-muted)]">{line}</p> : null}
              {url ? <p className="mt-3 font-mono text-[28px] text-[var(--arkiv-orange)]">{url}</p> : null}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="absolute left-[1540px] top-[420px]"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
      >
        <Blok pose="flat-wave-smile" height={300} />
      </motion.div>
    </Slide>
  );
}
