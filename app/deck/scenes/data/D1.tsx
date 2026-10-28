"use client";

// D1 · One business, one entity. The Chai Corner card from S3 (left); → turns it into an entity
// table (attribute, type, value); → labels the three columns; → the attribute limit.
// Steps: 0 card · 1 table · 2 column labels · 3 limit line.

import Image from "next/image";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, Slide } from "../../ui";
import { CARD_SHADOW, Show, SUB } from "./kit";

const ROWS: [attribute: string, type: string, value: string, mono: boolean][] = [
  ["name", "str", "Chai Corner", false],
  ["category", "str", "cafe", false],
  ["rating", "dec", "4.6", false],
  ["open_now", "bool", "true", true],
  ["photo", "str", "swarm://3f…a1", true],
  ["added_by", "addr", "0x7a3f…c91e", true],
];

const COLS = "347px 212px minmax(0, 1fr)";

const CAPTIONS: [left: number, width: number, name: string, what: string][] = [
  [0, 347, "attribute", "A name you choose"],
  [347, 212, "type", "What kind of value"],
  [559, 521, "value", "The data itself"],
];

function UpArrow() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}

function BusinessCard() {
  return (
    <div className="absolute left-[96px] top-[340px] h-[600px] w-[540px] overflow-hidden rounded-[20px] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)]" style={{ boxShadow: CARD_SHADOW }}>
      <div className="relative h-[250px] overflow-hidden bg-[var(--arkiv-blue)]">
        <Image src="/deck/data/d1-card-globe.png" alt="" aria-hidden width={960} height={540} className="absolute max-w-none object-cover" style={{ left: -200, top: -120, width: 960, height: 540, opacity: 0.9 }} />
        <svg width="64" height="80" viewBox="0 0 24 30" aria-hidden className="absolute left-[238px] top-[70px]">
          <path d="M12 29s10-9.4 10-17A10 10 0 0 0 2 12c0 7.6 10 17 10 17Z" fill="#FE7446" stroke="#111111" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" fill="#F6F4EF" />
        </svg>
      </div>
      <div className="flex flex-col gap-[14px] px-8 py-7">
        <span className="text-[48px] font-semibold leading-[1.1]">Chai Corner</span>
        <div className="flex items-center gap-[14px] text-[26px] text-[rgba(17,17,17,0.72)]">
          <span>Cafe</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FE7446" aria-hidden>
              <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
            </svg>
            4.6
          </span>
        </div>
        <span className="self-start rounded-full bg-[var(--arkiv-blue)] px-4 py-1.5 text-[22px] font-semibold text-[var(--arkiv-sand)]">Open now</span>
        <span className="font-mono text-[18px] text-[rgba(17,17,17,0.56)]">Added by 0x7a3f…c91e</span>
      </div>
    </div>
  );
}

export function D1({ step }: SceneContentProps) {
  const table = step >= 1;
  return (
    <Slide headline="One business, one entity" under="Each place on the map is an entity: a few named values, each with a type." wash={0.82}>
      <BusinessCard />

      <Show on={table} className="absolute left-[662px] top-[560px]">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Show>

      <Show on={table} className="absolute left-[744px] top-[340px] w-[1080px]">
        <div className="mb-3 text-[18px] font-semibold" style={{ color: "rgba(246,244,239,0.64)" }}>
          The entity
        </div>
        <div className="overflow-hidden rounded-[20px] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)]" style={{ boxShadow: CARD_SHADOW }}>
          <div className="grid border-b-2 border-[rgba(17,17,17,0.12)] font-mono text-[20px] text-[rgba(17,17,17,0.56)]" style={{ gridTemplateColumns: COLS }}>
            <div className="px-7 pb-2.5 pt-4">attribute</div>
            <div className="px-7 pb-2.5 pt-4">type</div>
            <div className="px-7 pb-2.5 pt-4">value</div>
          </div>
          {ROWS.map(([attribute, type, value, mono], i) => (
            <motion.div
              key={attribute}
              className="grid border-b border-[rgba(17,17,17,0.08)] last:border-b-0"
              style={{ gridTemplateColumns: COLS }}
              initial={false}
              animate={{ opacity: table ? 1 : 0, y: table ? 0 : 14 }}
              transition={{ duration: 0.45, ease: EASE, delay: table ? 0.2 + i * 0.1 : 0 }}
            >
              <div className="flex h-[64px] items-center whitespace-nowrap px-7">
                <span className="font-mono text-[28px] font-semibold">{attribute}</span>
              </div>
              <div className="flex h-[64px] items-center px-7">
                <span className="rounded-[8px] border-2 border-[var(--arkiv-blue)] px-3 py-[3px] font-mono text-[22px] font-semibold text-[var(--arkiv-blue)]">{type}</span>
              </div>
              <div className="flex h-[64px] items-center whitespace-nowrap px-7">
                <span className={`text-[32px] font-semibold ${mono ? "font-mono" : ""}`}>{value}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </Show>

      <Show on={step >= 2} className="pointer-events-none absolute left-[744px] top-[852px] h-[120px] w-[1080px]">
        {CAPTIONS.map(([left, width, name, what]) => (
          <div key={name} className="absolute top-0 flex flex-col items-center gap-2 text-center" style={{ left, width }}>
            <UpArrow />
            <span className="font-mono text-[22px] font-semibold text-[var(--arkiv-orange)]">{name}</span>
            <span className="text-[22px] leading-[1.3]" style={{ color: "rgba(246,244,239,0.84)" }}>
              {what}
            </span>
          </div>
        ))}
      </Show>

      <Show on={step >= 3} className="absolute left-[96px] top-[966px] flex items-baseline gap-[18px]">
        <span className="text-[30px] font-semibold">Up to 32 attributes per entity.</span>
        <span className="text-[26px]" style={{ color: SUB }}>
          Every pin the room drops is one of these.
        </span>
      </Show>
    </Slide>
  );
}

export const D1_STEPS = 4;

export const D1_NOTES: string[] = [
  "This is the same Chai Corner from the last slide. To Arkiv, a business on the map is one entity.",
  "An entity is a short list of attributes. Each one has a name you choose, a type that says what kind of value it is, and the value itself.",
  "An entity holds up to 32 attributes, and every pin the room drops is one of these.",
];
