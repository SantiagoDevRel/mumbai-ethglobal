"use client";

// S3 · One pin = one entity (handoff board "S3 · Slide template: one pin = one entity"). A table
// row: your columns on Sand, Arkiv's fields underneath on Arkiv Blue (→ reveals them, each strip
// labeled above at x 160), and the milk carton for Entity Expiration. Values are illustrative;
// the key is left elided on purpose.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Reveal, Rise, Slide, T } from "../ui";

const COLUMNS: [name: string, value: string, mono?: boolean][] = [
  ["name", "Chai Corner"],
  ["category", "cafe"],
  ["rating", "4.6"],
  ["photos", "swarm://3f…a1", true],
];

const FIELDS: [name: string, value: string][] = [
  ["$key", "0x…"],
  ["$owner", "santiago"],
  ["$creator", "santiago"],
  ["$expiresAt", "block #…"],
];

function MilkCarton() {
  return (
    <svg width="132" height="190" viewBox="0 0 66 95" aria-hidden>
      <path d="M8 26 L18 8 H48 L58 26 Z" fill="#E9E6DE" stroke="#111111" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="18" y="2" width="30" height="7" fill="#F6F4EF" stroke="#111111" strokeWidth="2.5" />
      <rect x="8" y="26" width="50" height="66" rx="2" fill="#F6F4EF" stroke="#111111" strokeWidth="2.5" />
      <rect x="14" y="58" width="38" height="26" rx="2" fill="#FE7446" />
      <path d="M18 66 h30 M18 74 h22" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 38 l6 -6 l6 6 M34 38 l6 -6 l6 6" fill="none" stroke="#181EA9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function S3({ step }: SceneContentProps) {
  return (
    <Slide headline="One pin = one entity" under="Your columns on top. Arkiv's fields underneath." wash={0.8}>
      <Rise delay={0.15} className="absolute left-[160px] top-[380px] text-[18px] font-semibold" style={{ color: T.t64 }}>
        Your columns
      </Rise>
      <Rise delay={0.2} className="absolute left-[160px] top-[412px] w-[1600px]">
        <div className="overflow-hidden rounded-[20px] shadow-[0_28px_72px_rgba(0,0,0,0.55)]">
          <div className="grid h-[160px] grid-cols-[1.25fr_1fr_0.8fr_1.35fr] bg-[var(--arkiv-sand)]">
            {COLUMNS.map(([name]) => (
              <div key={name} className="px-7 py-4 font-mono text-[20px] text-[rgba(17,17,17,0.56)]">
                {name}
              </div>
            ))}
            {COLUMNS.map(([name, value, mono]) => (
              <div
                key={name}
                className={`whitespace-nowrap px-7 pb-7 text-[var(--arkiv-ink)] ${mono ? "pt-2.5 font-mono text-[36px] font-medium" : "pt-1 text-[44px] font-semibold"}`}
              >
                {value}
              </div>
            ))}
          </div>
        </div>
      </Rise>
      <Reveal step={step} at={1} y={-16} className="absolute left-[160px] top-[596px] text-[18px] font-semibold" style={{ color: T.t64 }}>
        Arkiv fields
      </Reveal>
      <Reveal step={step} at={1} y={-24} className="absolute left-[160px] top-[628px] w-[1600px]">
        <div className="grid grid-cols-4 overflow-hidden rounded-[20px] bg-[var(--arkiv-blue)] shadow-[0_28px_72px_rgba(0,0,0,0.55)]">
          {FIELDS.map(([name, value]) => (
            <div key={name} className="flex flex-col gap-1.5 px-7 py-5">
              <span className="font-mono text-[22px] font-semibold text-[var(--arkiv-sand)]">{name}</span>
              <span className="font-mono text-[20px] text-[rgba(246,244,239,0.72)]">{value}</span>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal step={step} at={1} className="absolute left-[160px] top-[800px] flex items-center gap-8">
        <motion.div animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
          <MilkCarton />
        </motion.div>
        <div className="flex flex-col gap-2.5">
          <span className="text-[26px]" style={{ color: T.t64 }}>
            Like a milk carton:
          </span>
          <span className="font-mono text-[36px] font-semibold text-[var(--arkiv-orange)]">best before block #…</span>
        </div>
      </Reveal>
    </Slide>
  );
}
