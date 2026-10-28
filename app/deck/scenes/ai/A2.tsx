"use client";

// A2 · Skills: recipes on demand. Four things hackers really ask; for each one the arkiv router
// loads one real skill. → steps: 0 the empty prompt, then one task per step (1 model, 2 connect,
// 3 query, 4 fix), each lighting its line and card.

import { Search, Table, Wallet, Wrench, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Rise, Slide, T } from "../../ui";
import { ROUTER } from "./facts";

const TASKS: { ask: string; verb: string; skill: string; line: string; icon: LucideIcon; left: number; x: number }[] = [
  { ask: "Design the data for my map of businesses", verb: "Model it", skill: "arkiv-data-modeling", line: "Which attributes to keep, and which ones to filter on.", icon: Table, left: 96, x: 298 },
  { ask: "Let people save a business with their wallet", verb: "Connect it", skill: "arkiv-app-integration", line: "Wallet connection and signing in your web app.", icon: Wallet, left: 537, x: 739 },
  { ask: "Show businesses open now, rated 4 or more", verb: "Query it", skill: "arkiv-query", line: "Filters, pages and counts that return what you expect.", icon: Search, left: 978, x: 1181 },
  { ask: "My query returns nothing. Why?", verb: "Fix it", skill: "arkiv-troubleshooting", line: "Reads the error and finds the cause.", icon: Wrench, left: 1419, x: 1622 },
];

export function A2({ step }: SceneContentProps) {
  const active = step >= 1 ? step : 0;
  const task = active ? TASKS[active - 1] : null;
  return (
    <Slide headline="Skills: recipes on demand" under="Ask for what you want. Your agent loads the right recipe.">
      <Rise delay={0.2} className={`${PANEL} absolute left-[96px] top-[340px] flex h-[108px] w-[1728px] items-center gap-6 px-8`}>
        <span className="flex-none rounded-[6px] bg-[rgba(246,244,239,0.1)] px-3 py-1 font-mono text-[20px] font-semibold" style={{ color: "rgba(246,244,239,0.72)" }}>
          You
        </span>
        <div className="relative h-[52px] flex-1">
          <AnimatePresence mode="wait">
            {task ? (
              <motion.span
                key={task.ask}
                className="absolute left-0 top-0 whitespace-nowrap text-[38px] font-semibold leading-[52px]"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.7, ease: "linear" }}
              >
                {task.ask}
                <span className="ml-1.5 inline-block h-[40px] w-[3px] translate-y-[7px] bg-[var(--arkiv-orange)]" />
              </motion.span>
            ) : (
              <motion.span key="placeholder" className="absolute left-0 top-0 text-[38px] font-medium leading-[52px]" style={{ color: "rgba(246,244,239,0.36)" }} exit={{ opacity: 0 }}>
                Ask your agent…
                <span className="ml-1.5 inline-block h-[40px] w-[3px] translate-y-[7px] bg-[var(--arkiv-orange)]" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </Rise>

      <Rise delay={0.3} className="absolute left-[730px] top-[482px]">
        <motion.div
          key={active}
          className={`${PANEL} flex h-[64px] w-[460px] items-center justify-center gap-3.5 !rounded-full !border-2 !border-[var(--arkiv-orange)]`}
          initial={active ? { boxShadow: "0 0 0 0 rgba(254,116,70,0.7)" } : false}
          animate={{ boxShadow: "0 0 0 22px rgba(254,116,70,0)" }}
          transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
        >
          <span className="font-mono text-[26px] font-semibold text-[var(--arkiv-orange)]">{ROUTER}</span>
          <span className="text-[22px]" style={{ color: T.t84 }}>
            picks the right skill
          </span>
        </motion.div>
      </Rise>

      <svg className="absolute left-0 top-[546px]" width="1920" height="64" viewBox="0 0 1920 64" aria-hidden>
        {TASKS.map((t, i) => (
          <motion.path
            key={t.skill}
            d={`M960 0 C960 34 ${t.x} 30 ${t.x} 64`}
            fill="none"
            strokeWidth="3"
            strokeDasharray="6 8"
            initial={false}
            animate={{ stroke: active === i + 1 ? "#FE7446" : "rgba(246,244,239,0.18)" }}
            transition={{ duration: 0.3, delay: active === i + 1 ? 0.6 : 0 }}
          />
        ))}
      </svg>

      {TASKS.map((t, i) => {
        const on = active === i + 1;
        const dim = active > 0 && !on;
        const Icon = t.icon;
        return (
          <Rise key={t.skill} delay={0.35 + i * 0.08} className="absolute top-[610px]" style={{ left: t.left }}>
            <motion.div
              className="relative flex h-[396px] w-[405px] flex-col gap-3.5 rounded-[20px] border-[3px] p-8"
              initial={false}
              animate={{
                opacity: dim ? 0.45 : 1,
                borderColor: on ? "#FE7446" : "rgba(246,244,239,0.14)",
                backgroundColor: on ? "rgba(254,116,70,0.16)" : "rgba(17,17,17,0.6)",
              }}
              transition={{ duration: 0.35, delay: on ? 0.75 : 0, ease: EASE }}
            >
              <motion.span
                className="absolute right-[26px] top-[26px] rounded-full bg-[var(--arkiv-orange)] px-3.5 py-1 text-[18px] font-bold text-[var(--arkiv-ink)]"
                initial={false}
                animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.8 }}
                transition={{ duration: 0.25, delay: on ? 1 : 0 }}
              >
                loaded
              </motion.span>
              <Icon size={64} strokeWidth={1.75} className="text-[var(--arkiv-orange)]" aria-hidden />
              <span className="mt-2 text-[52px] font-semibold leading-[1.15]">{t.verb}</span>
              <span className="font-mono text-[23px] font-semibold text-[var(--arkiv-orange)]">{t.skill}</span>
              <span className="text-[27px] leading-[1.35]" style={{ color: "rgba(246,244,239,0.8)" }}>
                {t.line}
              </span>
            </motion.div>
          </Rise>
        );
      })}
    </Slide>
  );
}

export const A2_NOTES: string[] = [
  "Skills are build recipes your agent pulls on demand. You don't pick them: you ask for what you want, and the arkiv router loads the right one.",
  "Four things hackers really ask. Design the data: data modeling. Let people save with their wallet: app integration. Show what's open now and well rated: query. And when a query returns nothing: troubleshooting.",
  "One skill per task, loaded only when the task needs it.",
];
