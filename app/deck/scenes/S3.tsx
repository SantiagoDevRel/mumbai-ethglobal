"use client";

// S3 · One pin = one entity. One card, read top to bottom: Arkiv's fields first (on Arkiv Blue,
// every entity has them: its key, two wallets and when it expires), then → adds your attributes
// underneath (on Sand, whatever your app needs). The key is illustrative; the wallet is the
// workshop writer's, shortened.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { WRITER_ADDRESS } from "../../../shared/arkiv/profiles";
import { EASE, Reveal, Rise, Slide, T } from "../ui";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

const FIELDS: [name: string, value: string, hint: string][] = [
  ["$key", "0x7f3a…c21e", "its address"],
  ["$owner", short(WRITER_ADDRESS), "who controls it"],
  ["$creator", short(WRITER_ADDRESS), "who wrote it"],
  ["$expiresAt", "in 15 min", "when it disappears"],
];

const ATTRIBUTES: [name: string, value: string, mono?: boolean][] = [
  ["name", "Chai Corner"],
  ["category", "cafe"],
  ["rating", "4.6"],
  ["photos", "swarm://3f…a1", true],
];

export function S3({ step }: SceneContentProps) {
  return (
    <Slide headline="One pin = one entity" under="Every entity has Arkiv's fields. Then you add your own attributes." wash={0.82}>
      <div className="absolute left-[160px] top-[400px] w-[1600px]">
        <Rise delay={0.15}>
          <p className="mb-3 text-[24px] font-semibold" style={{ color: T.t64 }}>
            Arkiv fields · on every entity
          </p>
          <div className="grid grid-cols-4 overflow-hidden rounded-[20px] bg-[var(--arkiv-blue)] shadow-[0_28px_72px_rgba(0,0,0,0.55)]">
            {FIELDS.map(([name, value, hint], i) => (
              <motion.div
                key={name}
                className={`flex flex-col gap-2 px-8 py-6 ${i > 0 ? "border-l border-[rgba(246,244,239,0.16)]" : ""}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 + i * 0.12, ease: EASE }}
              >
                <span className="font-mono text-[26px] font-semibold text-[var(--arkiv-sand)]">{name}</span>
                <span className="font-mono text-[34px] font-medium text-[var(--arkiv-orange)]">{value}</span>
                <span className="text-[22px] text-[rgba(246,244,239,0.72)]">{hint}</span>
              </motion.div>
            ))}
          </div>
        </Rise>
        <Reveal step={step} at={1} y={-20} className="mt-10">
          <p className="mb-3 text-[24px] font-semibold" style={{ color: T.t64 }}>
            Your attributes · whatever your app needs
          </p>
          <div className="grid grid-cols-[1.25fr_1fr_0.8fr_1.35fr] overflow-hidden rounded-[20px] bg-[var(--arkiv-sand)] shadow-[0_28px_72px_rgba(0,0,0,0.55)]">
            {ATTRIBUTES.map(([name, value, mono], i) => (
              <div key={name} className={`flex flex-col gap-2 px-8 py-6 ${i > 0 ? "border-l border-[rgba(17,17,17,0.1)]" : ""}`}>
                <span className="font-mono text-[22px] text-[rgba(17,17,17,0.56)]">{name}</span>
                <span className={`whitespace-nowrap text-[var(--arkiv-ink)] ${mono ? "font-mono text-[34px] font-medium" : "text-[42px] font-semibold"}`}>{value}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </Slide>
  );
}
