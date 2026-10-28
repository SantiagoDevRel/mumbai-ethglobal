"use client";

// D3 · Each attribute has a type. Five groups start as ghosts; each → lights the next one (Orange
// outline on the current group), then a closing line.
// Steps: 0 ghosts · 1 yes or no · 2 numbers · 3 text · 4 Ethereum · 5 files · 6 closing line.

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Slide } from "../../ui";
import { Show, SUB } from "./kit";

type TypeCard = [name: string, example: string, what: string];

const GROUPS: { title: string; style: CSSProperties; types: TypeCard[]; never?: boolean }[] = [
  { title: "Yes or no", style: { left: 96, top: 330, width: 300 }, types: [["bool", "open_now: true", "True or false"]] },
  {
    title: "Numbers",
   
    style: { left: 416, top: 330, width: 1408 },
    types: [
      ["i32", "seats: 24", "Small whole numbers"],
      ["u64", "opened_at: 1767225600000", "Big ones, like a time in ms"],
      ["u256", "tips_wei: 5000000000000000", "Huge ones, like token amounts"],
      ["dec", 'rating: "4.6"', "Decimals"],
    ],
  },
  { title: "Text", style: { left: 96, top: 620, width: 456 }, types: [["str", 'category: "cafe"', "Up to 128 bytes"]] },
  {
    title: "Ethereum",
   
    style: { left: 572, top: 620, width: 640 },
    types: [
      ["addr", "added_by: 0x7a3f…c91e", "A wallet address"],
      ["key", "city: 0x51ab…07e2", "Links to another entity"],
    ],
  },
  { title: "Files", style: { left: 1232, top: 620, width: 592 }, types: [["bytes", "menu: 0x2550…44", "Up to 128 KiB"]], never: true },
];

// Counts come from the lists above, never typed into the copy.
const TYPE_COUNT = GROUPS.reduce((sum, group) => sum + group.types.length, 0);
const FILTERABLE = GROUPS.filter((group) => !group.never).reduce((sum, group) => sum + group.types.length, 0);
const typesLabel = (n: number) => `${n} ${n === 1 ? "type" : "types"}`;

function TypeBox({ card: [name, example, what] }: { card: TypeCard }) {
  return (
    <div className="flex min-w-0 flex-1 basis-0 flex-col gap-1.5 rounded-[12px] bg-[var(--arkiv-sand)] px-4 py-[14px] text-[var(--arkiv-ink)]">
      <span className="self-start font-mono text-[24px] font-semibold text-[var(--arkiv-blue)]">{name}</span>
      <span className="whitespace-nowrap font-mono text-[18px] leading-[1.35]">{example}</span>
      <span className="text-[17px] leading-[1.3] text-[rgba(17,17,17,0.64)]">{what}</span>
    </div>
  );
}

export function D3({ step }: SceneContentProps) {
  return (
    <Slide headline="Each attribute has a type" under={`${typesLabel(TYPE_COUNT)}. The type decides what you can store and how you filter it.`} wash={0.82}>
      {GROUPS.map((g, i) => {
        const n = i + 1;
        const lit = step >= n;
        const now = step === n;
        return (
          <motion.div
            key={g.title}
            className={`${PANEL} absolute box-border flex h-[270px] flex-col gap-[14px] p-6 transition-[border-color] duration-[450ms]`}
            style={{ ...g.style, borderColor: now ? "#FE7446" : undefined }}
            initial={false}
            animate={{ opacity: lit ? 1 : 0.16, y: lit ? 0 : 10 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <span className="text-[28px] font-semibold leading-[1.2]">{g.title}</span>
            <span className="-mt-1.5 text-[19px] leading-[1.3] text-[rgba(246,244,239,0.6)]">{typesLabel(g.types.length)}</span>
            <div className="flex items-center gap-[14px]">
              {g.types.map((t) => (
                <TypeBox key={t[0]} card={t} />
              ))}
              {g.never ? (
                <div className="flex flex-none items-center gap-2.5 rounded-[10px] border-2 border-[var(--arkiv-orange)] px-[14px] py-2.5 text-[19px] font-semibold text-[var(--arkiv-orange)]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="m5.7 5.7 12.6 12.6" />
                  </svg>
                  Never filterable
                </div>
              ) : null}
            </div>
          </motion.div>
        );
      })}

      <Show on={step >= 6} className="absolute left-[96px] top-[924px] flex items-baseline gap-[18px]">
        <span className="text-[30px] font-semibold">The other {typesLabel(FILTERABLE)} can be filtered.</span>
        <span className="text-[26px]" style={{ color: SUB }}>
          If you mark them as indexed. That&apos;s next.
        </span>
      </Show>
    </Slide>
  );
}

export const D3_STEPS = 7;

export const D3_NOTES: string[] = [
  "Every attribute has a type, and the type decides what you can store and how you can filter it.",
  "Yes or no is bool. Numbers come in four sizes: i32 for small whole numbers, u64 for big ones like a time in milliseconds, u256 for token amounts, and dec for decimals. Text is str, up to 128 bytes. For Ethereum there is addr for a wallet and key to link to another entity. Files go in bytes.",
  "bytes is the only type you can never filter. The other eight can be filtered if you mark them as indexed, and that is the next slide.",
];
