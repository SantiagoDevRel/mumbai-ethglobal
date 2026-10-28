"use client";

// A3b · Anatomy of a plugin. One card per plugin component (the parts a Claude Code plugin can
// ship: the manifest reference's standard layout plus evals/). → steps: 0 the components, 1 where
// Arkiv ships something (orange) and what it leaves out (dashed), 2 plugin.json, 3 skills/,
// 4 hooks/, 5 .mcp.json, 6 evals/, 7 why the dashed ones are empty, with the install line. The
// canvas also jumped to a card on click; the talk follows the arrow only. Facts in facts.ts.

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Rise, Slide, T } from "../../ui";
import {
  ALL_SKILLS,
  CLAUDE_HOOK_EVENTS,
  EVAL_GROUPS,
  INSTALL,
  MCP_HOST,
  MCP_PROMPTS,
  MCP_TOOLS,
  PLUGIN_VERSION,
  PROJECT_RULE_COUNT,
  ROUTER,
  evalCaseCount,
  mcpDocumentCount,
} from "./facts";

type Part = { path: string; job: string; arkiv?: string; at?: number; codex?: boolean };

const PARTS: Part[] = [
  { path: "plugin.json", job: "Name and version", arkiv: `arkiv ${PLUGIN_VERSION}`, at: 2, codex: true },
  { path: "skills/", job: "Recipes your agent pulls on demand", arkiv: `${ALL_SKILLS.length} skills`, at: 3, codex: true },
  { path: "commands/", job: "Slash commands" },
  { path: "agents/", job: "Subagents" },
  { path: "output-styles/", job: "How replies look" },
  { path: "hooks/", job: "Your code, run at set moments", arkiv: `${CLAUDE_HOOK_EVENTS.length} events`, at: 4, codex: true },
  { path: "monitors/", job: "Background processes" },
  { path: ".mcp.json", job: "MCP servers to connect", arkiv: "1 server", at: 5, codex: true },
  { path: ".lsp.json", job: "Language servers" },
  { path: "bin/", job: "Commands on PATH" },
  { path: "workflows/", job: "Multi-agent scripts" },
  { path: "settings.json", job: "Default agent settings" },
  { path: "themes/", job: "Color themes" },
  { path: "evals/", job: "Tests for the plugin", arkiv: `${evalCaseCount()} test cases`, at: 6 },
];

const SHIPPED = PARTS.filter((p) => p.arkiv);
const EMPTY = PARTS.filter((p) => !p.arkiv);
const CODEX_PARTS = PARTS.filter((p) => p.codex);

const K = ({ children }: { children: ReactNode }) => <span className="text-[var(--arkiv-orange)]">{children}</span>;

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[18px] font-bold tracking-[0.08em]" style={{ color: T.t56 }}>
      {children}
    </span>
  );
}

function Code({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <div
      className={`whitespace-pre rounded-[12px] border border-[rgba(246,244,239,0.12)] bg-[rgba(0,0,0,0.38)] px-[22px] py-4 font-mono ${small ? "text-[18px] leading-[27px]" : "text-[20px] leading-[30px]"}`}
    >
      {children}
    </div>
  );
}

const Lead = ({ children }: { children: ReactNode }) => <span className="text-[40px] font-semibold leading-[1.15]">{children}</span>;
const Sub = ({ children }: { children: ReactNode }) => (
  <span className="text-[26px] leading-[1.35]" style={{ color: "rgba(246,244,239,0.78)" }}>
    {children}
  </span>
);
const Foot = ({ children }: { children: ReactNode }) => (
  <span className="text-[22px] leading-[1.35]" style={{ color: "rgba(246,244,239,0.72)" }}>
    {children}
  </span>
);
const Fact = ({ name, children }: { name: string; children: ReactNode }) => (
  <div className="grid grid-cols-[150px_minmax(0,1fr)] items-baseline gap-4 text-[24px] leading-[1.35]">
    <span className="font-mono text-[22px] font-semibold text-[var(--arkiv-orange)]">{name}</span>
    <span>{children}</span>
  </div>
);

function Detail({ step }: { step: number }) {
  const maxEval = Math.max(...EVAL_GROUPS.map(([n]) => n));
  const layers: ReactNode[] = [
    <>
      <Eyebrow>A PLUGIN IS ONE FOLDER</Eyebrow>
      <div className="mt-[22px] grid grid-cols-2 gap-8">
        <Lead>Each card above is one component: a part it can ship.</Lead>
        <div className="flex flex-col gap-3.5">
          <Sub>Every part is optional.</Sub>
          <Sub>You fill only the ones that do a real job, and your users get all of it with one install.</Sub>
        </div>
      </div>
    </>,
    <>
      <Eyebrow>WHERE ARKIV SHIPS SOMETHING</Eyebrow>
      <div className="mt-4 grid grid-cols-2 items-center gap-8">
        <div className="flex items-baseline gap-[22px]">
          <span className="text-[120px] font-semibold leading-[0.9] text-[var(--arkiv-orange)]">{SHIPPED.length}</span>
          <Lead>of {PARTS.length} parts</Lead>
        </div>
        <div className="flex flex-col gap-4 text-[26px]">
          <span className="flex items-center gap-4">
            <span className="h-[40px] w-[96px] flex-none rounded-[10px] border-[1.5px] border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.16)]" />
            Orange: Arkiv ships something here
          </span>
          <span className="flex items-center gap-4">
            <span className="h-[40px] w-[96px] flex-none rounded-[10px] border-[1.5px] border-dashed border-[rgba(246,244,239,0.36)]" />
            Dashed: not used by Arkiv
          </span>
          <span className="flex items-center gap-4">
            <span className="w-[96px] flex-none whitespace-nowrap rounded-full border-[1.5px] border-[rgba(246,244,239,0.7)] py-[5px] text-center text-[15px] font-bold tracking-[0.06em]">
              + CODEX
            </span>
            Arkiv&apos;s Codex plugin has it too
          </span>
        </div>
      </div>
    </>,
    <>
      <Eyebrow>
        <span className="font-mono tracking-normal text-[var(--arkiv-orange)]">.claude-plugin/plugin.json</span> · THE MANIFEST
      </Eyebrow>
      <div className="mt-4 grid grid-cols-2 gap-8">
        <Code>
          {"{\n  "}
          <K>&quot;name&quot;</K>: &quot;arkiv&quot;,{"\n  "}
          <K>&quot;displayName&quot;</K>: &quot;Arkiv&quot;,{"\n  "}
          <K>&quot;version&quot;</K>: &quot;{PLUGIN_VERSION}&quot;,{"\n  "}
          <K>&quot;author&quot;</K>: {"{ "}&quot;name&quot;: &quot;Arkiv Network&quot;{" }"},{"\n  "}
          <K>&quot;repository&quot;</K>: &quot;https://github.com/Arkiv-Network/ai-plugin&quot;{"\n}"}
        </Code>
        <div className="flex flex-col gap-[18px]">
          <Fact name="name">
            The only required field. Every part is filed under it: <span className="font-mono text-[var(--arkiv-orange)]">arkiv:arkiv-query</span>
          </Fact>
          <Fact name="version">Keeps your users on {PLUGIN_VERSION} until you ship a new one.</Fact>
        </div>
      </div>
    </>,
    <>
      <Eyebrow>
        <span className="font-mono tracking-normal text-[var(--arkiv-orange)]">skills/</span> · BUILD RECIPES, ONE SKILL.md EACH
      </Eyebrow>
      <div className="mt-[18px] grid grid-cols-4 gap-2.5">
        {ALL_SKILLS.map((id) => (
          <span
            key={id}
            className={`whitespace-nowrap rounded-[8px] border px-3 py-[11px] font-mono text-[18px] leading-none ${
              id === ROUTER ? "border-[var(--arkiv-orange)] text-[var(--arkiv-orange)]" : "border-[rgba(246,244,239,0.22)] bg-[rgba(246,244,239,0.05)]"
            }`}
          >
            {id === ROUTER ? `${id} · router` : id}
          </span>
        ))}
      </div>
      <span className="mt-4 block">
        <Foot>Your agent loads a skill only when the task needs it.</Foot>
      </span>
    </>,
    <>
      <Eyebrow>
        <span className="font-mono tracking-normal text-[var(--arkiv-orange)]">hooks/hooks.json</span> · YOUR CODE, RUN AT SET MOMENTS
      </Eyebrow>
      <div className="mt-4 grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-3">
          {[
            ["Project rules", "SessionStart → hooks/arkiv-rules.mjs", `In an Arkiv project, adds ${PROJECT_RULE_COUNT} rules to your agent's context.`],
            ["SDK check", `${CLAUDE_HOOK_EVENTS.length} events → scripts/context/`, "Tells your agent which SDK version is really installed."],
          ].map(([title, where, what]) => (
            <div key={title} className="flex flex-col gap-1 rounded-[12px] border-[1.5px] border-[rgba(254,116,70,0.6)] bg-[rgba(254,116,70,0.06)] px-5 py-2.5">
              <span className="text-[24px] font-semibold">{title}</span>
              <span className="font-mono text-[16px] text-[var(--arkiv-orange)]">{where}</span>
              <span className="text-[20px] leading-[1.35]" style={{ color: T.t84 }}>
                {what}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Code small>
            &quot;SessionStart&quot;: [{"{\n  "}
            <K>&quot;matcher&quot;</K>: &quot;startup|resume|clear|compact&quot;,{"\n  "}
            <K>&quot;hooks&quot;</K>: [{"{ "}
            <K>&quot;type&quot;</K>: &quot;command&quot;, <K>&quot;command&quot;</K>: &quot;node&quot;,{"\n    "}
            <K>&quot;args&quot;</K>: [&quot;…/hooks/arkiv-rules.mjs&quot;],{"\n    "}
            <K>&quot;timeout&quot;</K>: 2, <K>&quot;onFailure&quot;</K>: &quot;continue&quot;{" }]\n}]"}
          </Code>
          <Foot>Next slide: when each hook runs.</Foot>
        </div>
      </div>
    </>,
    <>
      <Eyebrow>
        <span className="font-mono tracking-normal text-[var(--arkiv-orange)]">.mcp.json</span> · ONE MCP SERVER
      </Eyebrow>
      <div className="mt-4 grid grid-cols-2 gap-8">
        <Code>
          {"{ "}
          <K>&quot;mcpServers&quot;</K>: {"{ "}
          <K>&quot;arkiv&quot;</K>: {"{\n    "}
          <K>&quot;type&quot;</K>: &quot;http&quot;,{"\n    "}
          <K>&quot;url&quot;</K>: &quot;https://{MCP_HOST}/&quot;,{"\n    "}
          <K>&quot;headersHelper&quot;</K>: &quot;node …/scripts/client-headers.mjs&quot;{"\n} } }"}
        </Code>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-[12px] border-[1.5px] border-[rgba(254,116,70,0.6)] bg-[rgba(254,116,70,0.06)] px-[22px] py-4">
            <span className="text-[20px]" style={{ color: T.t64 }}>
              headersHelper adds one header to each request
            </span>
            <span className="font-mono text-[20px] text-[var(--arkiv-orange)]">X-Arkiv-Client: arkiv-plugin/{PLUGIN_VERSION}; host=claude-code</span>
            <span className="text-[20px]" style={{ color: T.t84 }}>
              Only version and host. <span className="font-mono">ARKIV_TELEMETRY=off</span> removes it.
            </span>
          </div>
          <div className="flex items-baseline gap-7 text-[24px]" style={{ color: T.t84 }}>
            {(
              [
                [MCP_TOOLS.length, "tools"],
                [MCP_PROMPTS.length, "prompts"],
                [mcpDocumentCount(), "documents"],
              ] as const
            ).map(([n, unit]) => (
              <span key={unit}>
                <b className="mr-2 text-[44px] font-semibold text-[var(--arkiv-orange)]">{n}</b>
                {unit}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>,
    <>
      <Eyebrow>
        <span className="font-mono tracking-normal text-[var(--arkiv-orange)]">evals/</span> · {evalCaseCount()} TEST CASES · RUN WITH{" "}
        <span className="font-mono tracking-normal text-[var(--arkiv-orange)]">claude plugin eval</span>
      </Eyebrow>
      <div className="mt-[22px] grid grid-cols-2 gap-x-10 gap-y-1.5">
        {EVAL_GROUPS.map(([n, name, what]) => (
          <div key={name} className="grid h-[52px] grid-cols-[56px_150px_minmax(0,1fr)] items-center gap-4">
            <span className="text-right text-[32px] font-semibold text-[var(--arkiv-orange)]">{n}</span>
            <div className="h-[12px] overflow-hidden rounded-full bg-[rgba(246,244,239,0.1)]">
              <div className="h-full rounded-full bg-[var(--arkiv-orange)]" style={{ width: `${(n / maxEval) * 100}%` }} />
            </div>
            <span className="whitespace-nowrap text-[22px]">
              {name} <span style={{ color: "rgba(246,244,239,0.6)" }}>· {what}</span>
            </span>
          </div>
        ))}
      </div>
    </>,
    <>
      <Eyebrow>THE {EMPTY.length} DASHED PARTS</Eyebrow>
      <div className="mt-4 grid grid-cols-2 gap-8">
        <div className="mt-1 flex flex-col gap-[18px]">
          <Fact name="commands/">The docs say: prefer skills/ for new plugins.</Fact>
          <Fact name="bin/">claude.ai and Cowork don&apos;t install a plugin that has one.</Fact>
          <Fact name="the rest">Arkiv has no real job for them.</Fact>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-[12px] bg-[var(--arkiv-sand)] px-[22px] py-[18px] text-[24px] font-semibold text-[var(--arkiv-ink)]">
            One install
            <span className="font-mono text-[24px] text-[var(--arkiv-blue)]">{INSTALL.claude.lines[1]}</span>
          </div>
          <Foot>Shown: Claude Code. Arkiv&apos;s Codex plugin has the {CODEX_PARTS.length} parts marked + Codex.</Foot>
        </div>
      </div>
    </>,
  ];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        className="absolute inset-0 px-8 py-[26px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.12, ease: EASE } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        {layers[Math.min(step, layers.length - 1)]}
      </motion.div>
    </AnimatePresence>
  );
}

function Card({ part, step }: { part: Part; step: number }) {
  const shown = step >= 1;
  const ark = Boolean(part.arkiv);
  const focus = ark && part.at === step;
  const zoom = step >= 2 && step <= 6;
  let opacity = 1;
  if (shown && !ark) opacity = step === 7 ? 1 : 0.5;
  if (ark && zoom && !focus) opacity = 0.55;
  const borderColor = !shown ? "rgba(246,244,239,0.24)" : ark ? "#FE7446" : step === 7 ? "rgba(246,244,239,0.5)" : "rgba(246,244,239,0.2)";
  const background = shown && ark ? "rgba(254,116,70,0.16)" : shown ? "rgba(17,17,17,0.5)" : "rgba(17,17,17,0.78)";
  return (
    <motion.div
      className={`relative flex h-[168px] flex-col gap-1.5 rounded-[14px] border-[1.5px] px-[18px] pb-3.5 pt-4 ${shown && !ark ? "border-dashed" : ""}`}
      initial={false}
      animate={{
        opacity,
        borderColor,
        backgroundColor: background,
        y: focus ? -6 : 0,
        boxShadow: focus ? "0 0 0 4px #FE7446, 0 18px 40px rgba(0,0,0,0.5)" : "0 0 0 0 rgba(254,116,70,0), 0 0 0 rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <span className={`whitespace-nowrap font-mono text-[21px] font-semibold ${shown && ark ? "text-[var(--arkiv-orange)]" : ""}`}>{part.path}</span>
      <span className="text-[18px] leading-[1.3]" style={{ color: "rgba(246,244,239,0.72)" }}>
        {part.job}
      </span>
      <motion.span className="mt-auto flex flex-col gap-0.5" initial={false} animate={{ opacity: shown ? 1 : 0 }} transition={{ duration: 0.4 }}>
        <span className="text-[13px] font-bold tracking-[0.1em]" style={{ color: ark ? "#FE7446" : T.t50 }}>
          IN ARKIV
        </span>
        <span className="whitespace-nowrap text-[20px] font-semibold" style={{ color: ark ? "var(--arkiv-sand)" : T.t50 }}>
          {part.arkiv ?? "Not used"}
        </span>
      </motion.span>
      {part.codex ? (
        <motion.span
          className="absolute bottom-4 right-3 rounded-full border-[1.5px] border-[rgba(246,244,239,0.7)] px-[9px] py-[3px] text-[13px] font-bold tracking-[0.06em]"
          initial={false}
          animate={{ opacity: shown ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        >
          + CODEX
        </motion.span>
      ) : null}
    </motion.div>
  );
}

export function A3b({ step }: SceneContentProps) {
  return (
    <Slide headline="Anatomy of a plugin" under={`Plugin components: the ${PARTS.length} parts a Claude Code plugin can ship.`}>
      <Rise delay={0.2} className="absolute left-[96px] top-[322px] grid w-[1728px] grid-cols-7 gap-3">
        {PARTS.map((part) => (
          <Card key={part.path} part={part} step={step} />
        ))}
      </Rise>
      <Rise delay={0.3} className={`${PANEL} absolute left-[96px] top-[700px] h-[320px] w-[1728px] overflow-hidden`}>
        <Detail step={step} />
      </Rise>
    </Slide>
  );
}

export const A3B_NOTES: string[] = [
  "What is inside a plugin? One folder, and each card is a part it can ship: Claude Code calls them plugin components. Every part is optional; you fill only the ones that do a real job.",
  "Arkiv fills the orange ones. The manifest names it and pins the version. skills/ holds the build recipes. hooks/ runs a little code at set moments. .mcp.json connects the Arkiv MCP and adds one header with only the version and host, which you can turn off. And evals/ tests the plugin itself. Arkiv's Codex plugin has the parts marked + Codex too.",
  "The dashed ones stay empty on purpose: the docs prefer skills over commands, a bin/ folder would block installing it from claude.ai and Cowork, and the rest have no real job for Arkiv. One install line gets all of it.",
];
