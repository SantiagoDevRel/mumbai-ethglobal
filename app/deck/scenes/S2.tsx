"use client";

// S2 · Open Google Maps. One pin pulled apart into two layers: indexing data (Arkiv) on top,
// storage (Swarm) underneath.

import { Clock, Image as ImageIcon, MapPin, Star, Tag, Video } from "lucide-react";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, Reveal, Rise, Slide } from "../ui";

const PIN_FIELDS = [
  { icon: Tag, label: "Chai Corner · cafe" },
  { icon: Star, label: "4.6" },
  { icon: Clock, label: "7:00-22:00" },
  { icon: MapPin, label: "19.07, 72.88" },
];

function BigPin() {
  return (
    <svg width="300" height="400" viewBox="0 0 300 400" aria-hidden>
      <defs>
        <radialGradient id="s2-pin" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ff9a76" />
          <stop offset="100%" stopColor="#fe7446" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="380" rx="70" ry="14" fill="rgba(0,0,0,0.35)" />
      <path d="M150 370 C 150 370 30 220 30 140 A 120 120 0 1 1 270 140 C 270 220 150 370 150 370 Z" fill="url(#s2-pin)" />
      <circle cx="150" cy="140" r="52" fill="#f6f4ef" />
      <circle cx="150" cy="140" r="22" fill="#fe7446" />
    </svg>
  );
}

export function S2({ step }: SceneContentProps) {
  const apart = step >= 1;
  return (
    <Slide
      headline="Open Google Maps. What do you see?"
      under="The pin is tiny. The photos are huge. They live in different places."
    >
      <Rise delay={0.2} className="absolute left-[200px] top-[440px]">
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <BigPin />
        </motion.div>
      </Rise>

      <div className="absolute left-[660px] top-[360px] w-[900px]">
        {/* Top layer: the small, searchable pin */}
        <motion.div
          initial={false}
          animate={{ y: apart ? 0 : 140, scale: apart ? 1 : 0.94 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative z-10 rounded-[24px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.88)] p-6"
        >
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {PIN_FIELDS.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-3 text-[32px]">
                <Icon size={30} className="text-[var(--arkiv-orange)]" />
                {label}
              </span>
            ))}
          </div>
          <Reveal step={step} at={1} y={8}>
            <p className="mt-4 font-mono text-[28px] font-medium tracking-[0.08em] text-[var(--arkiv-orange)]">
              INDEXING DATA → Arkiv
            </p>
          </Reveal>
        </motion.div>

        {/* Bottom layer: the heavy photos and videos */}
        <motion.div
          initial={false}
          animate={{ y: apart ? 36 : -40, opacity: apart ? 1 : 0.6 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="rounded-[24px] border-2 border-[var(--panel-border)] bg-[rgba(17,17,17,0.72)] p-6"
        >
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex h-[96px] items-center justify-center rounded-[10px] bg-[rgba(246,244,239,0.1)]">
                {i % 3 === 1 ? (
                  <Video size={36} strokeWidth={1.5} className="text-[var(--arkiv-stone)]" />
                ) : (
                  <ImageIcon size={36} strokeWidth={1.5} className="text-[var(--arkiv-stone)]" />
                )}
              </div>
            ))}
          </div>
          <Reveal step={step} at={1} y={8}>
            <p className="mt-4 font-mono text-[28px] font-medium tracking-[0.08em] text-[var(--arkiv-stone)]">
              STORAGE → Swarm
            </p>
          </Reveal>
        </motion.div>
      </div>
    </Slide>
  );
}
