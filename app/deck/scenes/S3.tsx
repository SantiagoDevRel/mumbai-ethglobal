"use client";

// S3 · One pin = one entity: a card shaped like a table row, your columns on top and Arkiv's
// fields in a thinner strip underneath. The milk carton analogy for Entity Expiration.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, Reveal, Rise, Slide } from "../ui";

const COLUMNS: [string, string][] = [
  ["name", "Chai Corner"],
  ["category", "cafe"],
  ["rating", "4.6"],
  ["photos", "swarm://3f…a1"],
];

const FIELDS = ["$key", "$owner", "$creator", "$expiresAt"];

function MilkCarton() {
  return (
    <svg width="210" height="300" viewBox="0 0 210 300" aria-hidden>
      <path d="M40 70 L105 20 L170 70 Z" fill="#e9e6de" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
      <rect x="85" y="4" width="40" height="22" rx="3" fill="#fe7446" stroke="#111" strokeWidth="4" />
      <rect x="40" y="70" width="130" height="220" rx="6" fill="#f6f4ef" stroke="#111" strokeWidth="4" />
      <rect x="40" y="118" width="130" height="60" fill="#181ea9" />
      <text x="105" y="157" textAnchor="middle" fontFamily="var(--font-plex-sans)" fontSize="26" fontWeight="700" fill="#f6f4ef">MILK</text>
      <text x="105" y="222" textAnchor="middle" fontFamily="var(--font-plex-mono)" fontSize="15" fill="#111">best before</text>
      <text x="105" y="248" textAnchor="middle" fontFamily="var(--font-plex-mono)" fontSize="18" fontWeight="600" fill="#fe7446">block #…</text>
    </svg>
  );
}

export function S3({ step }: SceneContentProps) {
  return (
    <Slide headline="One pin = one entity" under="Your columns on top. Arkiv's fields underneath.">
      <Rise delay={0.2} className="absolute left-[120px] top-[400px] w-[1180px]">
        <div className="overflow-hidden rounded-[24px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.9)]">
          <div className="grid grid-cols-[1.1fr_0.8fr_0.6fr_1.2fr]">
            {COLUMNS.map(([name]) => (
              <div key={name} className="border-b border-r border-[var(--panel-border)] px-7 py-4 font-mono text-[26px] text-[var(--stage-muted)] last:border-r-0">
                {name}
              </div>
            ))}
            {COLUMNS.map(([name, value]) => (
              <div key={name} className="border-r border-[var(--panel-border)] px-7 py-6 font-mono text-[36px] font-medium last:border-r-0">
                {value}
              </div>
            ))}
          </div>
          <motion.div
            initial={false}
            animate={{ height: step >= 1 ? "auto" : 0, opacity: step >= 1 ? 1 : 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 bg-[rgba(254,116,70,0.14)]">
              {FIELDS.map((f) => (
                <div key={f} className="border-t-2 border-[var(--arkiv-orange)] px-7 py-4 font-mono text-[30px] font-medium text-[var(--arkiv-orange)]">
                  {f}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </Rise>
      <Reveal step={step} at={1} className="absolute left-[1380px] top-[360px]">
        <motion.div animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
          <MilkCarton />
        </motion.div>
      </Reveal>
    </Slide>
  );
}
