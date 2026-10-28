"use client";

// A2b · All the skills, then inside one. The map groups the task skills under the arkiv router;
// → zooms into arkiv-query and walks the three loading levels, then zooms back out. → steps:
// 0 the map, 1 inside at level 1 (always loaded), 2 level 2 (the whole SKILL.md), 3 level 3
// (references), 4 back to the map. The canvas also zoomed into any skill on click; the talk follows
// arkiv-query only. Skill names, sections, references and dates are in facts.ts.

import { AnimatePresence, motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { PANEL, Rise, Slide, T } from "../../ui";
import { ALL_SKILLS, QUERY_SKILL, ROUTER, SKILL_GROUPS, TASK_SKILLS } from "./facts";

const ZOOM: Transition = { duration: 0.65, ease: [0.2, 0.7, 0.2, 1] };

/** Where arkiv-query sits on the map: the zoom grows out of it. */
function queryOrigin(): string {
  const g = SKILL_GROUPS.findIndex((group) => group.skills.includes(QUERY_SKILL.id));
  const j = SKILL_GROUPS[g]?.skills.indexOf(QUERY_SKILL.id) ?? 0;
  return `${96 + (g % 4) * 437 + 170}px ${420 + Math.floor(g / 4) * 248 + 80 + j * 50}px`;
}

function SkillMap({ inside }: { inside: boolean }) {
  return (
    <motion.div
      className="absolute left-0 top-0 h-[1080px] w-[1920px]"
      style={{ transformOrigin: queryOrigin(), pointerEvents: "none" }}
      initial={false}
      animate={{ scale: inside ? 2.2 : 1, opacity: inside ? 0 : 1 }}
      transition={ZOOM}
    >
      <div className="absolute left-[580px] top-[316px] flex h-[72px] w-[760px] items-center justify-center gap-4 rounded-full border-2 border-[var(--arkiv-orange)]">
        <span className="font-mono text-[30px] font-semibold text-[var(--arkiv-orange)]">{ROUTER}</span>
        <span className="text-[24px]" style={{ color: T.t84 }}>
          The router: reads your task, picks the skill
        </span>
      </div>
      <div className="absolute left-[959px] top-[388px] h-[16px] w-[2px] bg-[rgba(246,244,239,0.22)]" />
      <div className="absolute left-[304px] top-[403px] h-[2px] w-[1312px] bg-[rgba(246,244,239,0.22)]" />
      {[303, 740, 1177, 1614].map((x) => (
        <div key={x} className="absolute top-[404px] h-[16px] w-[2px] bg-[rgba(246,244,239,0.22)]" style={{ left: x }} />
      ))}
      {SKILL_GROUPS.map((group, i) => (
        <div
          key={group.name}
          className={`${PANEL} absolute flex h-[228px] w-[417px] flex-col gap-2 px-6 py-[18px]`}
          style={{ left: 96 + (i % 4) * 437, top: 420 + Math.floor(i / 4) * 248 }}
        >
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[24px] font-semibold leading-[1.2]">{group.name}</span>
            <span className="font-mono text-[16px]" style={{ color: T.t50 }}>
              {group.skills.length} skills
            </span>
          </div>
          {group.skills.map((id) => {
            const on = id === QUERY_SKILL.id;
            return (
              <span
                key={id}
                className={`block w-fit rounded-[10px] border-[1.5px] px-3.5 py-1.5 font-mono text-[21px] leading-[28px] ${
                  on ? "border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.16)] text-[var(--arkiv-orange)]" : "border-[rgba(246,244,239,0.2)] bg-[rgba(246,244,239,0.04)]"
                }`}
              >
                {id}
              </span>
            );
          })}
        </div>
      ))}
      <div className="absolute left-[1407px] top-[668px] flex h-[228px] w-[417px] flex-col justify-center gap-2 rounded-[16px] border-2 border-dashed border-[rgba(246,244,239,0.22)] px-6 py-[18px]">
        <div className="flex items-baseline gap-3.5">
          <span className="text-[68px] font-semibold leading-none text-[var(--arkiv-orange)]">{ALL_SKILLS.length}</span>
          <span className="text-[36px] font-semibold">skills</span>
        </div>
        <span className="text-[22px] leading-[1.3]">1 router + {TASK_SKILLS.length} task skills</span>
        <span className="text-[20px] leading-[1.3]" style={{ color: "rgba(246,244,239,0.6)" }}>
          Each one is a folder with a SKILL.md.
        </span>
      </div>
    </motion.div>
  );
}

const LEVELS: { title: string; line: string }[] = [
  { title: "Always loaded", line: `Name and description of all ${ALL_SKILLS.length} skills.` },
  { title: "When the task matches", line: `The whole SKILL.md: ${QUERY_SKILL.sections.length} sections of recipe and rules.` },
  {
    title: "Only if needed",
    line:
      QUERY_SKILL.references.length === 1
        ? "1 file in references/ for the deep details."
        : `${QUERY_SKILL.references.length} files in references/ for the deep details.`,
  },
];

function Ln({ children, dim = false }: { children: ReactNode; dim?: boolean }) {
  return (
    <div className="overflow-hidden text-ellipsis whitespace-pre font-mono text-[21px] leading-[29px]" style={dim ? { color: T.t50 } : undefined}>
      {children}
    </div>
  );
}

function Hl({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <motion.div
      className="-mx-3.5 rounded-[8px] px-3.5"
      initial={false}
      animate={{ backgroundColor: on ? "rgba(254,116,70,0.22)" : "rgba(254,116,70,0)" }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

const K = ({ children }: { children: ReactNode }) => <span className="text-[var(--arkiv-orange)]">{children}</span>;

function InsideSkill({ level }: { level: number }) {
  const inside = level > 0;
  const sk = QUERY_SKILL;
  return (
    <motion.div
      className="absolute left-0 top-0 h-[1080px] w-[1920px]"
      style={{ transformOrigin: queryOrigin(), pointerEvents: "none" }}
      initial={false}
      animate={{ scale: inside ? 1 : 0.45, opacity: inside ? 1 : 0 }}
      transition={ZOOM}
    >
      {LEVELS.map((lv, i) => {
        const n = i + 1;
        const on = level === n;
        return (
          <motion.div
            key={lv.title}
            className={`${PANEL} absolute left-[96px] grid h-[176px] w-[640px] grid-cols-[56px_minmax(0,1fr)] content-center gap-x-[22px] gap-y-1.5 !border-2 px-7 py-[26px]`}
            style={{ top: 330 + i * 192 }}
            initial={false}
            animate={{
              borderColor: on ? "#FE7446" : "rgba(246,244,239,0.12)",
              backgroundColor: on ? "rgba(254,116,70,0.14)" : "rgba(17,17,17,0.78)",
              opacity: level < n ? 0.45 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <span className="row-span-2 flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[var(--arkiv-orange)] text-[28px] font-semibold text-[var(--arkiv-orange)]">
              {n}
            </span>
            <span className="text-[32px] font-semibold leading-[1.2]">{lv.title}</span>
            <span className="text-[23px] leading-[1.35]" style={{ color: "rgba(246,244,239,0.72)" }}>
              {lv.line}
            </span>
          </motion.div>
        );
      })}

      <div className={`${PANEL} absolute left-[776px] top-[330px] flex h-[566px] w-[1048px] flex-col px-10 py-[22px]`}>
        <div className="mb-2.5 flex h-[48px] items-center gap-[18px]">
          <span className="rounded-full border-[1.5px] border-[rgba(246,244,239,0.3)] px-4 py-2 text-[20px] font-semibold">‹ All skills</span>
          <span className="font-mono text-[22px]" style={{ color: "rgba(246,244,239,0.6)" }}>
            skills / <span className="font-semibold text-[var(--arkiv-sand)]">{sk.id}</span> /
          </span>
        </div>
        <Hl on={level === 2}>
          <div className="flex justify-between gap-5">
            <Ln>SKILL.md</Ln>
            <span className="text-[18px]" style={{ color: T.t56 }}>
              {sk.sections.length} sections
            </span>
          </div>
        </Hl>
        <Hl on={level === 3}>
          {sk.references.length ? sk.references.map((r) => <Ln key={r}>{r}</Ln>) : <Ln dim>no references/ folder</Ln>}
        </Hl>
        <div className="my-2.5 h-px bg-[rgba(246,244,239,0.12)]" />
        <Ln dim>---</Ln>
        <Hl on={level === 1}>
          <Ln>
            <K>name:</K> {sk.id}
          </Ln>
          <Ln>
            <K>description:</K> {sk.description}
          </Ln>
        </Hl>
        <Ln>
          <K>metadata:</K>
        </Ln>
        <Ln>
          {"  "}
          <K>arkiv-sdk:</K> &quot;{sk.sdkRange}&quot;
        </Ln>
        <Ln>
          {"  "}
          <K>verified:</K> &quot;{sk.verified}&quot;
        </Ln>
        <Ln dim>---</Ln>
        <Hl on={level === 2}>
          <Ln># {sk.h1}</Ln>
          <Ln>## {sk.sections[0]}</Ln>
          <Ln>## {sk.sections[1]}</Ln>
          <Ln dim>…</Ln>
        </Hl>
      </div>
    </motion.div>
  );
}

export function A2b({ step }: SceneContentProps) {
  const level = step >= 1 && step <= 3 ? step : 0;
  const inside = level > 0;
  const headline = inside ? "Inside a skill" : `${ALL_SKILLS.length} skills, one router`;
  const under = inside ? "A folder with one SKILL.md. Your agent reads only what the task needs." : "Grouped by what you are doing. The router picks one for each task.";
  return (
    <Slide
      headline={
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={headline} className="block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {headline}
          </motion.span>
        </AnimatePresence>
      }
      under={
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={under} className="block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {under}
          </motion.span>
        </AnimatePresence>
      }
    >
      <Rise delay={0.2} className="absolute inset-0">
        <SkillMap inside={inside} />
        <InsideSkill level={level} />
      </Rise>
      <Rise
        delay={0.35}
        className={`${PANEL} absolute left-[96px] top-[914px] flex h-[96px] w-[1728px] items-center gap-7 !border-[var(--arkiv-orange)] px-8`}
      >
        <span className="text-[22px] font-semibold" style={{ color: T.t64 }}>
          Install
        </span>
        <span className="font-mono text-[26px] font-semibold">npx skills add Arkiv-Network/skills --skill {ROUTER}</span>
        <span aria-hidden className="h-[40px] w-px bg-[rgba(246,244,239,0.2)]" />
        <span className="text-[24px]" style={{ color: T.t84 }}>
          Start with <span className="font-mono text-[var(--arkiv-orange)]">{ROUTER}</span>, the router. Add the skills you need.
        </span>
      </Rise>
    </Slide>
  );
}

export const A2B_NOTES: string[] = [
  "Here are all of them, grouped by what you are doing: start, model your data, write and change it, read it, build the app, privacy and trust, and when it breaks. The arkiv router reads your task and picks one.",
  "Let's open one: arkiv-query. A skill is a folder with one SKILL.md. Level one is always loaded: just the name and description of every skill, so your agent knows what exists. Level two loads only when the task matches: the whole SKILL.md, the recipe and its rules. Level three only if needed: the reference files for the deep details.",
  "That's why skills stay cheap: your agent reads only what the task needs. Install them with one command, starting with the router.",
];
