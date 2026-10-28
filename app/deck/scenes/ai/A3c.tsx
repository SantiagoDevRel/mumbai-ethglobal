"use client";

// A3c · Claude + Codex plugin hooks. Only what the Arkiv plugin does: the moments of a session where
// it runs its own code. → steps: 0 the moments, 1 what it does at each, 2 Claude Code vs Codex,
// 3 the lines your agent receives. Source: hooks/hooks.json and scripts/context/ of both 0.4.1
// packages and the ai-plugin README. The sample in step 3 is the 0.4.1 hook's own wording; its
// range is fixed in that release, so update the sample with the next plugin release.

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Rise, Slide, T } from "../../ui";
import { CLAUDE_HOOK_EVENTS, CODEX_HOOK_EVENTS, PROJECT_RULE_COUNT } from "./facts";

const MOMENTS: { events: string[]; label: string; does: string; claude: string; codex: string | null }[] = [
  { events: ["SessionStart"], label: "Session starts", does: `If package.json lists the Arkiv SDK: adds ${PROJECT_RULE_COUNT} rules and the SDK version.`, claude: "Rules + SDK check", codex: "SDK check, no rules" },
  { events: ["UserPromptSubmit"], label: "You send a prompt", does: "Checks the SDK again. Adds lines only if something changed.", claude: "SDK check", codex: "SDK check" },
  { events: ["FileChanged", "CwdChanged"], label: "package.json or the folder changes", does: "Marks the SDK facts for a fresh check.", claude: "SDK check", codex: null },
  { events: ["PostCompact"], label: "The chat is compacted", does: "Brings the SDK facts back on your next prompt.", claude: "SDK check", codex: "SDK check" },
  { events: ["SessionEnd"], label: "Session ends", does: "Stops the local check.", claude: "Stops it", codex: "Stops it" },
];

const COL_LEFT = [316, 618, 920, 1222, 1524];
const CELL_LEFT = [220, 522, 824, 1126, 1428];

function Cell({ left, children, yes }: { left: number; children: ReactNode; yes: boolean }) {
  return (
    <span
      className={`absolute top-0 flex h-[50px] w-[282px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[20px] ${
        yes ? "border-[1.5px] border-[rgba(254,116,70,0.7)] bg-[rgba(254,116,70,0.1)] font-semibold" : "border-[1.5px] border-dashed border-[rgba(246,244,239,0.28)] font-medium"
      }`}
      style={{ left, color: yes ? undefined : T.t50 }}
    >
      {yes ? <b className="text-[var(--arkiv-orange)]">✓</b> : null}
      {children}
    </span>
  );
}

function Caption({ step }: { step: number }) {
  const eyebrow = (text: string) => (
    <span className="text-[18px] font-bold tracking-[0.08em]" style={{ color: T.t56 }}>
      {text}
    </span>
  );
  const lead = "text-[38px] font-semibold leading-[1.18]";
  const sub = "text-[25px] leading-[1.35] text-[rgba(246,244,239,0.78)]";
  const layers: ReactNode[] = [
    <>
      {eyebrow("A HOOK")}
      <span className={lead}>Code a plugin runs at a set moment of a session.</span>
      <span className={sub}>These are the moments where Arkiv runs its code.</span>
    </>,
    <>
      {eyebrow("WHAT IT READS")}
      <span className={lead}>Only package.json, the lockfile and the installed SDK.</span>
      <span className={sub}>It never runs your code, makes no network requests and writes no files.</span>
    </>,
    <>
      {eyebrow("BOTH PLUGINS")}
      <span className={lead}>
        {CLAUDE_HOOK_EVENTS.length} hook events in Claude Code, {CODEX_HOOK_EVENTS.length} in Codex.
      </span>
      <span className={sub}>
        Codex has no rules hook and no file or folder events. You trust the hook once with <span className="font-mono text-[var(--arkiv-orange)]">/hooks</span>.
      </span>
    </>,
    <>
      {eyebrow("WHAT YOUR AGENT SEES")}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-9">
        <div className="whitespace-pre rounded-[12px] border border-[rgba(246,244,239,0.12)] bg-[rgba(0,0,0,0.38)] px-[22px] py-3.5 font-mono text-[19px] leading-[29px]">
          {"Arkiv SDK evidence for the local workspace:\nSDK version category: "}
          <span className="text-[var(--arkiv-orange)]">compatible</span>
          {".\nInstalled SDK version: "}
          <span className="text-[var(--arkiv-orange)]">0.8.1</span>
          {".\nPlugin-supported SDK range: >=0.8.1 <0.9."}
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-[32px] font-semibold leading-[1.18]">A few lines of context, so your agent uses the SDK you really have.</span>
          <span className="text-[22px] leading-[1.35] text-[rgba(246,244,239,0.78)]">It never blocks your agent.</span>
        </div>
      </div>
    </>,
  ];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        className="absolute inset-0 flex flex-col gap-3.5 px-9 py-[26px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.12, ease: EASE } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        {layers[Math.min(step, layers.length - 1)]}
      </motion.div>
    </AnimatePresence>
  );
}

export function A3c({ step }: SceneContentProps) {
  const rows = step >= 2;
  return (
    <Slide headline="Claude + Codex plugin hooks" under="When the Arkiv plugin runs its own code during a session.">
      <Rise delay={0.2} className="absolute inset-0">
        <svg className="pointer-events-none absolute left-0 top-0" width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden>
          <path d="M316 441 H1810" stroke="rgba(246,244,239,0.36)" strokeWidth="3" strokeLinecap="round" />
          <path d="M1798 431 L1812 441 L1798 451" fill="none" stroke="rgba(246,244,239,0.36)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="absolute left-[96px] top-[430px] w-[200px] text-[16px] font-bold tracking-[0.1em]" style={{ color: T.t56 }}>
          ONE SESSION
        </span>
        {MOMENTS.map((m, i) => (
          <div key={m.label} className="absolute top-[330px] h-[290px] w-[282px]" style={{ left: COL_LEFT[i] }}>
            <span className="absolute left-[140px] top-[20px] h-[90px] w-[2px] bg-[var(--arkiv-orange)]" />
            <div className="absolute left-0 right-0 top-0 flex flex-col items-center gap-1.5">
              {m.events.map((e) => (
                <span key={e} className="flex h-[40px] items-center whitespace-nowrap rounded-[10px] bg-[var(--arkiv-orange)] px-3.5 font-mono text-[19px] font-semibold text-[var(--arkiv-ink)]">
                  {e}
                </span>
              ))}
            </div>
            <span className="absolute left-[130px] top-[100px] h-[22px] w-[22px] rounded-full bg-[var(--arkiv-orange)] shadow-[0_0_0_6px_#08091F]" />
            <span className="absolute left-1 right-1 top-[140px] text-center text-[25px] font-semibold leading-[1.22]">{m.label}</span>
            <motion.span
              className="absolute left-1 right-1 top-[212px] text-center text-[20px] leading-[1.3]"
              style={{ color: "rgba(246,244,239,0.8)" }}
              initial={false}
              animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 8 }}
              transition={{ duration: 0.4, delay: step >= 1 ? i * 0.08 : 0, ease: EASE }}
            >
              {m.does}
            </motion.span>
          </div>
        ))}
        {(["claude", "codex"] as const).map((host, r) => (
          <motion.div
            key={host}
            className="absolute left-[96px] h-[50px] w-[1710px]"
            style={{ top: 632 + r * 60 }}
            initial={false}
            animate={{ opacity: rows ? 1 : 0, y: rows ? 0 : 8 }}
            transition={{ duration: 0.4, delay: rows ? r * 0.12 : 0, ease: EASE }}
          >
            <span className="absolute left-0 top-0 flex h-[50px] items-center text-[22px] font-semibold">{host === "claude" ? "Claude Code" : "Codex"}</span>
            {MOMENTS.map((m, i) => {
              const text = host === "claude" ? m.claude : m.codex;
              return (
                <Cell key={m.label} left={CELL_LEFT[i] ?? 0} yes={text !== null}>
                  {text ?? "No file events"}
                </Cell>
              );
            })}
          </motion.div>
        ))}
      </Rise>
      <Rise delay={0.3} className={`${PANEL} absolute left-[96px] top-[764px] h-[252px] w-[1728px] overflow-hidden`}>
        <Caption step={step} />
      </Rise>
    </Slide>
  );
}

export const A3C_NOTES: string[] = [
  "A hook is code a plugin runs at a set moment of a session. These are the only moments where the Arkiv plugin runs its own code: the session starts, you send a prompt, package.json or the folder changes, the chat is compacted, the session ends.",
  "What it does is small: if your package.json lists the Arkiv SDK, it adds the project rules and tells your agent which SDK version is really installed. It reads only package.json, the lockfile and the installed SDK. It never runs your code, makes no network requests and writes no files.",
  "Codex gets the same SDK check, without the rules hook or the file events; you trust it once with /hooks. Your agent receives a few lines like these, so it codes against the SDK you really have. It never blocks your agent.",
];
