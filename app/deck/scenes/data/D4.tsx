"use client";

// D4 · Indexed = you can filter on it. The attribute table (left); → a query on three indexed
// attributes works (their rows light up); → filtering by name fails (its row turns red);
// → which Arkiv fields can always be filtered.
// Steps: 0 table · 1 query that works · 2 query that fails · 3 closing line.

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Slide } from "../../ui";
import { ALERT, CARD_SHADOW, Show, SUB } from "./kit";

type Can = "yes" | "no" | "never";

const ROWS: { name: string; can: Can; example: string; lit?: 1 | 2 }[] = [
  { name: "category", can: "yes", example: "Only cafés", lit: 1 },
  { name: "rating", can: "yes", example: "4.5 or more", lit: 1 },
  { name: "open_now", can: "yes", example: "Open now", lit: 1 },
  { name: "added_by", can: "yes", example: "The ones I added" },
  { name: "name", can: "no", example: "Shown, not filtered", lit: 2 },
  { name: "photo", can: "no", example: "A Swarm link" },
  { name: "menu", can: "never", example: "It's bytes" },
];

const COLS = "230px 260px minmax(0, 1fr)";

function CanCell({ can }: { can: Can }) {
  if (can === "yes") return <span className="text-[25px] font-semibold text-[var(--arkiv-blue)]">✓ Indexed</span>;
  if (can === "no") return <span className="text-[25px] text-[rgba(17,17,17,0.56)]">Stored only</span>;
  return (
    <span className="text-[25px] font-semibold" style={{ color: ALERT }}>
      Never
    </span>
  );
}

function rowBackground(lit: 1 | 2 | undefined, step: number) {
  if (lit === 1 && step === 1) return "rgba(254,116,70,0.28)";
  if (lit === 2 && step === 2) return "rgba(201,87,47,0.3)";
  return "rgba(201,87,47,0)";
}

function Dim({ children }: { children: ReactNode }) {
  return <span className="text-[rgba(246,244,239,0.5)]">{children}</span>;
}

function QueryCard({ step, at, top, title, code, result }: { step: number; at: number; top: number; title: string; code: ReactNode; result: ReactNode }) {
  const on = step >= at;
  return (
    <motion.div
      className={`${PANEL} absolute left-[1036px] box-border flex w-[788px] flex-col gap-[14px] px-8 py-[26px] transition-[border-color] duration-[400ms]`}
      style={{ top, borderColor: step === at ? "#FE7446" : undefined }}
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 16 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-hidden={!on}
    >
      <span className="text-[28px] font-semibold">{title}</span>
      <div className="whitespace-pre font-mono text-[23px] leading-[36px] text-[var(--arkiv-sand)]">{code}</div>
      <Show on={on} delay={0.5} y={10} className="self-start">
        {result}
      </Show>
    </motion.div>
  );
}

export function D4({ step }: SceneContentProps) {
  return (
    <Slide headline="Indexed = you can filter on it" under="You choose which attributes to index. The rest are only stored." wash={0.82}>
      <div className="absolute left-[96px] top-[330px] w-[900px] overflow-hidden rounded-[20px] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)]" style={{ boxShadow: CARD_SHADOW }}>
        <div className="grid h-[56px] items-center border-b-2 border-[rgba(17,17,17,0.12)] px-8 font-mono text-[19px] text-[rgba(17,17,17,0.56)]" style={{ gridTemplateColumns: COLS }}>
          <span>attribute</span>
          <span>can you filter?</span>
          <span>for example</span>
        </div>
        {ROWS.map((r, i) => (
          <motion.div
            key={r.name}
            className={`grid h-[76px] items-center px-8 ${i < ROWS.length - 1 ? "border-b border-[rgba(17,17,17,0.08)]" : ""}`}
            style={{ gridTemplateColumns: COLS }}
            initial={false}
            animate={{ backgroundColor: rowBackground(r.lit, step) }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <span className="font-mono text-[27px] font-semibold">{r.name}</span>
            <CanCell can={r.can} />
            <span className="text-[24px] text-[rgba(17,17,17,0.72)]">{r.example}</span>
          </motion.div>
        ))}
      </div>

      <QueryCard
        step={step}
        at={1}
        top={330}
        title="Cafés rated 4.5 or more, open now"
        code={
          <>
            <Dim>.where(and(</Dim>
            {'\n  eq("category", "cafe"),\n  gte("rating", dec("4.5")),\n  eq("open_now", true)\n'}
            <Dim>))</Dim>
          </>
        }
        result={
          <span className="inline-flex items-center gap-3 rounded-full border-2 border-[var(--arkiv-orange)] px-[18px] py-1.5 text-[22px] font-semibold text-[var(--arkiv-orange)]">
            ✓ Works: all three are indexed
          </span>
        }
      />

      <QueryCard
        step={step}
        at={2}
        top={708}
        title="Find a business by its name"
        code={
          <>
            <Dim>.where(</Dim>eq(&quot;name&quot;, &quot;Chai Corner&quot;)<Dim>)</Dim>
          </>
        }
        result={
          <span className="inline-flex items-center gap-3 rounded-full border-2 px-[18px] py-1.5 text-[22px] font-semibold text-[var(--arkiv-sand)]" style={{ borderColor: ALERT, background: "rgba(201,87,47,0.35)" }}>
            ✗ InvalidPredicateError: name is not indexed
          </span>
        }
      />

      <Show on={step >= 3} className="absolute left-[96px] top-[940px] flex w-[1728px] flex-col gap-2">
        <div className="text-[28px] font-semibold">
          <span className="font-mono text-[var(--arkiv-orange)]">$key</span>, <span className="font-mono text-[var(--arkiv-orange)]">$owner</span>,{" "}
          <span className="font-mono text-[var(--arkiv-orange)]">$creator</span> and <span className="font-mono text-[var(--arkiv-orange)]">$expiresAt</span> can always be
          filtered.
        </div>
        <div className="text-[24px]" style={{ color: SUB }}>
          Index what you search by. Stored-only attributes cost less.
        </div>
      </Show>
    </Slide>
  );
}

export const D4_STEPS = 4;

export const D4_NOTES: string[] = [
  "When you write an entity you choose which attributes are indexed. Indexed means you can filter on it; the rest are only stored and shown.",
  "This query asks for cafés rated 4.5 or more that are open now. It works because category, rating and open_now are all indexed. Filtering by name fails with InvalidPredicateError, because name is stored only.",
  "$key, $owner, $creator and $expiresAt can always be filtered ($createdAt and $updatedAt cannot). Index what you search by: stored-only attributes cost less.",
];
