"use client";

// A3 · Plugin: MCP + skills in one. Left, the install (a tab switches Claude Code and Codex CLI;
// a click, not a step). Right, one ask and what your agent uses for it. → steps: 0 empty terminal,
// 1-4 the install lines, 5 the ask, 6-9 what your agent uses (skill, MCP tool, skill, skill),
// 10 ready, 11 which one to use. Install commands are from the Arkiv-Network/ai-plugin README.

import { motion } from "motion/react";
import { useState, type MouseEvent, type ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { Mascot } from "../../Mascot";
import { EASE, PANEL, Rise, Slide, T } from "../../ui";
import { INSTALL, type Host } from "./facts";

const USES: { kind: "SKILL" | "MCP"; name: string; what: string }[] = [
  { kind: "SKILL", name: "arkiv-data-modeling", what: "Designs the business entity" },
  { kind: "MCP", name: "network_status", what: "Gets today's network and SDK" },
  { kind: "SKILL", name: "arkiv-app-integration", what: "Adds wallet sign-in and save" },
  { kind: "SKILL", name: "arkiv-query", what: "Shows saved businesses on the map" },
];

const WHICH: [who: string, answer: string][] = [
  ["Claude Code or Codex CLI", "The plugin"],
  ["Another coding agent", "MCP + skills"],
  ["A chat app with connectors", "The MCP URL"],
];

function TypedLine({ shown, className = "", children }: { shown: boolean; className?: string; children: ReactNode }) {
  if (!shown) return null;
  return (
    <motion.span
      className={`block whitespace-nowrap font-mono text-[22px] leading-[46px] ${className}`}
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: 0.6, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}

function Appear({ shown, className = "", children, delay = 0 }: { shown: boolean; className?: string; children: ReactNode; delay?: number }) {
  if (!shown) return null;
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

function Arrow() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function A3({ step }: SceneContentProps) {
  const [host, setHost] = useState<Host>("claude");
  const install = INSTALL[host];
  const asking = step >= 5;
  const pick = (h: Host) => (e: MouseEvent) => {
    e.stopPropagation();
    setHost(h);
  };
  const box = (active: boolean) => ({ opacity: active ? 1 : 0.4, borderColor: active ? "#FE7446" : "rgba(246,244,239,0.12)" });

  return (
    <Slide headline="Plugin: MCP + skills in one" under="Install once in Claude Code or Codex CLI. Then just ask.">
      <Rise delay={0.2} className="absolute left-[96px] top-[340px]">
        <motion.div className={`${PANEL} relative h-[520px] w-[800px]`} initial={false} animate={box(!asking)} transition={{ duration: 0.4 }}>
          <span className="absolute left-[32px] top-[30px] text-[18px] font-semibold tracking-[0.06em]" style={{ color: T.t56 }}>
            1 · INSTALL
          </span>
          <div className="pointer-events-auto absolute right-[28px] top-[20px] flex gap-1 rounded-[12px] bg-[rgba(246,244,239,0.08)] p-1">
            {(Object.keys(INSTALL) as Host[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={pick(h)}
                className="cursor-pointer rounded-[8px] px-[18px] py-2 text-[20px] font-semibold"
                style={host === h ? { background: "var(--arkiv-sand)", color: "var(--arkiv-ink)" } : { color: T.t64 }}
              >
                {INSTALL[h].label}
              </button>
            ))}
          </div>
          <div key={host} className="absolute left-[32px] top-[100px] h-[200px] w-[740px]">
            {step === 0 ? (
              <span className="block font-mono text-[22px] leading-[46px]">
                <span style={{ color: T.t50 }}>$ </span>
                <span className="inline-block h-[24px] w-[12px] translate-y-[4px] bg-[rgba(246,244,239,0.7)]" />
              </span>
            ) : null}
            {install.lines.map((line, i) => (
              <TypedLine key={line} shown={step >= i + 1}>
                <span style={{ color: T.t50 }}>$ </span>
                {line}
              </TypedLine>
            ))}
            <TypedLine shown={step >= 3} className="text-[rgba(246,244,239,0.46)]">
              {install.note}
            </TypedLine>
            <TypedLine shown={step >= 4} className="font-semibold text-[var(--arkiv-orange)]">
              {install.start}
            </TypedLine>
          </div>
          <Appear shown={step >= 4} delay={0.6} className="absolute bottom-[28px] left-[32px] right-[32px] flex items-center gap-7">
            <Mascot pose="wave" height={126} />
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[36px] font-semibold">arkiv@arkiv</span>
              <span className="text-[22px] leading-[1.35]" style={{ color: "rgba(246,244,239,0.72)" }}>
                No key, no wallet. It never signs.
              </span>
            </div>
          </Appear>
        </motion.div>
      </Rise>

      <Rise delay={0.3} className="absolute left-[936px] top-[340px]">
        <motion.div className={`${PANEL} h-[520px] w-[888px] px-8 py-7`} initial={false} animate={box(asking)} transition={{ duration: 0.4 }}>
          <span className="text-[18px] font-semibold tracking-[0.06em]" style={{ color: T.t56 }}>
            2 · ASK
          </span>
          <Appear shown={step >= 5} className="mb-[18px] mt-3.5 flex justify-end">
            <div className="max-w-[620px] rounded-[20px_20px_4px_20px] bg-[var(--arkiv-sand)] px-[22px] py-3 text-[24px] font-medium leading-[1.3] text-[var(--arkiv-ink)]">
              Build a map where people save businesses with their wallet.
            </div>
          </Appear>
          {USES.map((use, i) => (
            <Appear
              key={use.name}
              shown={step >= 6 + i}
              className="grid grid-cols-[92px_340px_minmax(0,1fr)] items-center gap-4 border-t border-[rgba(246,244,239,0.08)] py-3"
            >
              <span
                className={`justify-self-start rounded-[6px] border-[1.5px] px-2.5 py-1 text-[15px] font-bold tracking-[0.06em] ${
                  use.kind === "MCP" ? "border-[var(--arkiv-blue)] bg-[var(--arkiv-blue)] text-[var(--arkiv-sand)]" : "border-[var(--arkiv-orange)] text-[var(--arkiv-orange)]"
                }`}
              >
                {use.kind}
              </span>
              <span className="font-mono text-[21px] font-semibold">{use.name}</span>
              <span className="text-[22px] leading-[1.3]" style={{ color: "rgba(246,244,239,0.8)" }}>
                {use.what}
              </span>
            </Appear>
          ))}
          <Appear shown={step >= 10} className="flex items-center gap-3 pt-3.5 text-[24px] font-semibold text-[var(--arkiv-orange)]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Ready. Run it, then sign with your wallet.
          </Appear>
        </motion.div>
      </Rise>

      <motion.div
        className={`${PANEL} absolute left-[96px] top-[884px] grid h-[122px] w-[1728px] grid-cols-3 items-center gap-8 px-9`}
        initial={false}
        animate={{ opacity: step >= 11 ? 1 : 0, y: step >= 11 ? 0 : 20 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        {WHICH.map(([who, answer]) => (
          <div key={who} className="flex flex-col gap-1.5">
            <span className="text-[20px]" style={{ color: T.t56 }}>
              {who}
            </span>
            <span className="flex items-center gap-2.5 text-[28px] font-semibold leading-[1.25] text-[var(--arkiv-orange)]">
              <Arrow />
              {answer}
            </span>
          </div>
        ))}
      </motion.div>
    </Slide>
  );
}

export const A3_NOTES: string[] = [
  "The plugin puts the MCP and the skills in one install. Two commands in Claude Code, or two in Codex CLI (click the tab to switch), restart, and start with the arkiv router.",
  "Then you just ask: build a map where people save businesses with their wallet. Your agent pulls data modeling to design the entity, asks the MCP for today's network and SDK, adds wallet sign-in with app integration, and shows the saved businesses with a query.",
  "It never signs: you run the app and sign with your wallet. Which one to use? Claude Code or Codex CLI: the plugin. Another coding agent: the MCP plus the skills. A chat app with connectors: just the MCP URL.",
];
