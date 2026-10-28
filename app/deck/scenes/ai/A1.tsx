"use client";

// A1 · MCP: your agent asks Arkiv. Your agent asks for its first entity. Without MCP it searches
// the web and builds on old pages (the struck-through answer is the outdated one on purpose). With
// MCP it asks Arkiv's network_status; the values come from the app's active network profile, so
// they follow the network switch. Each step lands whole. → steps: 0 the ask, the web search and the
// agent's answer, 1 it is out of date, 2 with MCP and how to add it.

import { AnimatePresence, motion } from "motion/react";
import { useMemo, type ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { getProfile } from "../../../../shared/arkiv/profiles";
import { Mascot } from "../../Mascot";
import { EASE, PANEL, PANEL_EASE, Reveal, Rise, Slide, T } from "../../ui";
import { MCP_HOST } from "./facts";

function Check({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Badge({ children, icon }: { children: ReactNode; icon: "x" | "check" }) {
  return (
    <span className="inline-flex items-center gap-3 rounded-full border-2 border-[var(--arkiv-orange)] px-5 py-1.5 text-[24px] font-semibold text-[var(--arkiv-orange)]">
      {icon === "check" ? (
        <Check />
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      )}
      {children}
    </span>
  );
}

function WithoutMcp({ step }: { step: number }) {
  return (
    <div className="absolute inset-0">
      <div className="flex items-center gap-3.5" style={{ color: T.t56 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="text-[24px] font-semibold">Your agent searched the web and read old pages.</span>
      </div>
      <div className="absolute left-0 top-[64px] flex flex-col items-start gap-2">
        <span className="text-[18px] font-semibold" style={{ color: T.t56 }}>
          Your agent
        </span>
        <div className="relative rounded-[20px_20px_20px_4px] border border-[rgba(246,244,239,0.14)] bg-[rgba(246,244,239,0.08)] px-6 py-3.5 text-[28px] font-medium">
          Connect to Braga and install SDK 0.6.
          <motion.div
            aria-hidden
            className="absolute left-[18px] right-[18px] top-1/2 -mt-[2px] h-[4px] origin-left rounded-[2px] bg-[var(--arkiv-orange)]"
            initial={false}
            animate={{ scaleX: step >= 1 ? 1 : 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </div>
      </div>
      <Reveal step={step} at={1} y={12} className="absolute left-0 top-[196px]">
        <Badge icon="x">Out of date: Braga closed in August.</Badge>
      </Reveal>
    </div>
  );
}

function WithMcp() {
  const profile = useMemo(() => {
    try {
      return getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE);
    } catch {
      return null;
    }
  }, []);
  const rows: [string, string, boolean?][] = [
    ["network", profile?.name ?? "—"],
    ["install", profile ? `npm install ${profile.sdk.package}@${profile.sdk.version} viem` : "—", true],
  ];
  return (
    <div className="absolute inset-0">
      <motion.div
        className="inline-flex items-center gap-3 rounded-full bg-[var(--arkiv-blue)] px-5 py-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <span className="font-mono text-[22px] font-semibold">arkiv › network_status</span>
        <Check size={24} />
      </motion.div>
      <div className="absolute left-0 top-[66px] w-[820px] rounded-[14px] border border-[rgba(246,244,239,0.14)] bg-[rgba(246,244,239,0.06)] px-6 py-4">
        <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-y-1.5 font-mono text-[24px] leading-[1.45]">
          {rows.flatMap(([key, value, accent]) => [
            <span key={key} style={{ color: T.t56 }}>
              {key}
            </span>,
            <span key={key + "-v"} className={accent ? "text-[var(--arkiv-orange)]" : undefined}>
              {value}
            </span>,
          ])}
        </div>
      </div>
      <div className="absolute left-0 top-[196px]">
        <Badge icon="check">Today&apos;s answer, straight from Arkiv.</Badge>
      </div>
    </div>
  );
}

export function A1({ step }: SceneContentProps) {
  const withMcp = step >= 2;
  const pose = withMcp ? "thumbsUp" : step >= 1 ? "thumbsDown" : "stand";
  return (
    <Slide headline="MCP: your agent asks Arkiv" under="Instead of guessing from the web, your agent asks Arkiv.">
      <Rise className={`${PANEL} absolute left-[96px] top-[340px] h-[400px] w-[1728px]`}>
        <div className="absolute left-[28px] top-[20px] flex h-[210px] w-[440px] justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={pose} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: PANEL_EASE }}>
              <Mascot pose={pose} height={200} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute left-[28px] top-[248px] w-[440px] rounded-[20px] bg-[var(--arkiv-sand)] px-6 py-[18px] text-center text-[28px] font-semibold leading-[1.3] text-[var(--arkiv-ink)]">
          <span aria-hidden className="absolute left-1/2 top-[-9px] -ml-[9px] h-[18px] w-[18px] rotate-45 bg-[var(--arkiv-sand)]" />
          Help me write my first Arkiv entity.
        </div>
        <svg className="absolute left-[496px] top-[200px]" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(246,244,239,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>

        <div className="absolute bottom-0 left-[572px] right-[28px] top-0">
          <div className="absolute left-0 top-[28px] flex gap-1 rounded-[12px] bg-[rgba(246,244,239,0.08)] p-1">
            {["Without MCP", "With MCP"].map((label, i) => {
              const on = (i === 1) === withMcp;
              return (
                <span
                  key={label}
                  className="rounded-[8px] px-5 py-2 text-[22px] font-semibold transition-colors duration-300"
                  style={on ? { background: "var(--arkiv-sand)", color: "var(--arkiv-ink)" } : { color: T.t64 }}
                >
                  {label}
                </span>
              );
            })}
          </div>
          <div className="absolute left-0 top-[104px] h-[280px] w-[1128px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={withMcp ? "with" : "without"}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.16 } }}
                transition={{ duration: 0.24, ease: PANEL_EASE }}
              >
                {withMcp ? <WithMcp /> : <WithoutMcp step={step} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Rise>

      <Reveal
        step={step}
        at={2}
        className={`${PANEL} absolute left-[96px] top-[764px] grid h-[184px] w-[1728px] grid-cols-[600px_minmax(0,1fr)] items-center gap-10 !border-[var(--arkiv-orange)] px-8 py-6`}
      >
        <div className="flex flex-col gap-2.5">
          <span className="text-[22px] font-semibold" style={{ color: T.t64 }}>
            Add it once
          </span>
          <span className="font-mono text-[38px] font-semibold leading-[1.2] text-[var(--arkiv-orange)]">{MCP_HOST}</span>
          <div className="flex gap-3">
            {["No key", "Never signs"].map((chip) => (
              <span key={chip} className="inline-flex items-center rounded-full border-[1.5px] border-[rgba(246,244,239,0.28)] px-4 py-1.5 text-[20px] font-semibold">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 text-[28px] leading-[1.3]" style={{ color: T.t84 }}>
          <span>Claude Code or Codex CLI: one command.</span>
          <span>Chat apps: add the URL as a custom connector.</span>
        </div>
      </Reveal>
    </Slide>
  );
}

export const A1_NOTES: string[] = [
  "Your agent, on the left, asks for help with its first Arkiv entity. Without MCP it searches the web, reads old pages and confidently answers.",
  "But that answer is out of date: that network closed in August, and that SDK is old.",
  "With MCP it asks Arkiv directly: network_status answers with today's network and install line. Same question, today's answer. Add it once with one command in Claude Code or Codex CLI, or as a custom connector in a chat app. No key needed. It reads and checks; it never signs.",
];
