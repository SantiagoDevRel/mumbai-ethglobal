"use client";

// A1b · Inside the Arkiv MCP. Three columns: tools it runs, prompts to start from, documents it
// reads. Counts come from the lists in facts.ts (read live from the General MCP). → steps: 0 the
// three totals, 1 opens tools, 2 prompts, 3 documents. The canvas had a fourth step for the /mumbai
// profile; /mumbai answered 404 on October 28, so it is left out until that profile is live.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, Rise, Slide, T } from "../../ui";
import { FACTS_CHECKED, MCP_DOCUMENTS, MCP_HOST, MCP_PROMPTS, MCP_TOOLS, mcpDocumentCount } from "./facts";

type Item = { text: string; count?: number; mono?: boolean; more?: boolean };

const SHOWN_TOOLS = ["network_status", "search_knowledge", "get_skill", "verify_tx"];
const SHOWN_PROMPTS = ["start", "minimal_app", "model_entities", "diagnose_query"];

const named = (shown: string[], all: readonly string[]): Item[] => [
  ...shown.map((text) => ({ text, mono: true })),
  { text: `+ ${all.length - shown.length} more`, more: true },
];

const COLUMNS: { left: number; count: number; unit: string; line: string; items: Item[] }[] = [
  { left: 96, count: MCP_TOOLS.length, unit: "tools", line: "Actions your agent can run", items: named(SHOWN_TOOLS, MCP_TOOLS) },
  { left: 683, count: MCP_PROMPTS.length, unit: "prompts", line: "Ready-made ways to start", items: named(SHOWN_PROMPTS, MCP_PROMPTS) },
  {
    left: 1270,
    count: mcpDocumentCount(),
    unit: "documents",
    line: "What your agent can read",
    items: MCP_DOCUMENTS.map(([text, count]) => ({ text, count })),
  },
];

export function A1b({ step }: SceneContentProps) {
  return (
    <Slide headline="Inside the Arkiv MCP" under="Tools it runs, prompts to start from, docs it reads.">
      <Rise delay={0.15} className="absolute right-[96px] top-[280px]">
        <span className="font-mono text-[16px]" style={{ color: T.t42 }}>
          Live count · {MCP_HOST} · {FACTS_CHECKED}
        </span>
      </Rise>
      {COLUMNS.map((col, c) => {
        const at = c + 1;
        const open = step >= at;
        const now = step === at;
        return (
          <Rise key={col.unit} delay={0.2 + c * 0.08} className="absolute top-[316px]" style={{ left: col.left }}>
            <motion.div
              className="flex h-[392px] w-[554px] flex-col rounded-[16px] border bg-[rgba(17,17,17,0.78)] px-8 py-6 backdrop-blur-[16px]"
              initial={false}
              animate={{
                y: now ? -6 : 0,
                borderColor: now ? "#FE7446" : "rgba(246,244,239,0.12)",
                boxShadow: now ? "0 0 0 3px rgba(254,116,70,0.3), 0 12px 40px rgba(0,0,0,0.45)" : "0 0 0 0 rgba(254,116,70,0), 0 12px 40px rgba(0,0,0,0.45)",
              }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="flex items-baseline gap-3.5">
                <span className="text-[68px] font-semibold leading-none tracking-[-0.02em] text-[var(--arkiv-orange)]">{col.count}</span>
                <span className="text-[36px] font-semibold leading-none">{col.unit}</span>
              </div>
              <span className="py-3 text-[24px] leading-[1.3]" style={{ color: T.t64 }}>
                {col.line}
              </span>
              {col.items.map((item, i) => (
                <motion.span
                  key={item.text}
                  className={`flex items-baseline justify-between gap-4 border-t border-[rgba(246,244,239,0.08)] py-[7px] text-[22px] leading-[1.25] ${item.mono ? "font-mono" : ""}`}
                  style={item.more ? { color: T.t56 } : undefined}
                  initial={false}
                  animate={{ opacity: open ? 1 : 0, y: open ? 0 : 8 }}
                  transition={{ duration: 0.35, delay: open ? 0.05 + i * 0.1 : 0, ease: EASE }}
                >
                  <span>{item.text}</span>
                  {item.count !== undefined ? <span className="font-mono text-[22px] font-semibold text-[rgba(246,244,239,0.92)]">{item.count}</span> : null}
                </motion.span>
              ))}
            </motion.div>
          </Rise>
        );
      })}
    </Slide>
  );
}

export const A1B_NOTES: string[] = [
  "What is inside the MCP your agent just connected to. First the tools: actions your agent can run, like network_status, searching the docs, loading a skill, or verify_tx to check that a transaction landed.",
  "Then the prompts: ready-made ways to start, from a minimal app to modeling your entities or diagnosing a query that returns nothing.",
  "And the documents it can read: the official docs, every skill, the packages, guides and recipes, and the SDK source. Your agent reads these instead of guessing.",
];
