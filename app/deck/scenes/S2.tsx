"use client";

// S2 · Open Google Maps. A map with pins and one place card open on it, the way a maps app shows
// a place: photos and a video on top, name, rating and hours under them. The card comes apart one
// → at a time, and nothing moves without one:
//   step 0 · the map, its pins and the open place card (still)
//   step 1 · the Arkiv tray appears and the small fields move into it (indexing data)
//   step 2 · the Swarm tray appears, the heavy media move into it (storage), and the fields card
//            gains its pointer to the photos
// The street map is a drawing, not a real map.

import { Clock, Image as ImageIcon, MapPin, Play, Star } from "lucide-react";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, Reveal, Slide, T } from "../ui";

const PINS: [x: number, y: number][] = [
  [150, 120], [330, 80], [520, 150], [700, 90], [250, 300], [610, 330], [770, 260], [420, 250], [120, 420], [760, 430],
];
/** The open place: its pin sits at (470, 150) on the map, above its card. */
const PICKED = { x: 470, y: 150 };

function StreetMap({ dim }: { dim: boolean }) {
  return (
    <motion.div
      className="absolute left-[96px] top-[390px] h-[640px] w-[880px] overflow-hidden rounded-[24px] border border-[rgba(246,244,239,0.14)] bg-[#141833]"
      initial={{ opacity: 0 }}
      animate={{ opacity: dim ? 0.45 : 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <svg width="880" height="640" viewBox="0 0 880 640" aria-hidden className="absolute inset-0">
        <path d="M0 520 C 180 470 260 600 520 560 C 700 532 790 600 880 590 L880 640 L0 640 Z" fill="#1d2a5c" />
        <g stroke="rgba(246,244,239,0.16)" strokeWidth="14" fill="none" strokeLinecap="round">
          <path d="M-20 200 C 200 180 420 240 900 170" />
          <path d="M300 -20 C 280 200 360 380 330 660" />
          <path d="M640 -20 C 600 160 690 330 610 520" />
        </g>
        <g stroke="rgba(246,244,239,0.08)" strokeWidth="6" fill="none">
          <path d="M-20 360 L 900 380" />
          <path d="M120 -20 L 160 520" />
          <path d="M480 -20 L 470 560" />
          <path d="M-20 80 L 900 60" />
          <path d="M780 -20 L 820 560" />
        </g>
      </svg>
      {PINS.map(([x, y], i) => (
        <div key={i} className="absolute" style={{ left: x - 18, top: y - 40 }}>
          <MapPin size={36} strokeWidth={1.75} fill="#627EEA" className="text-[var(--arkiv-sand)]" />
        </div>
      ))}
      <div className="absolute" style={{ left: PICKED.x - 30, top: PICKED.y - 66 }}>
        <MapPin size={60} strokeWidth={1.5} fill="#FE7446" className="text-[var(--arkiv-sand)]" />
      </div>
    </motion.div>
  );
}

const MEDIA = [
  { kind: "photo", tint: "linear-gradient(135deg,#fe7446,#7a2d14)" },
  { kind: "video", tint: "linear-gradient(135deg,#181ea9,#08091f)" },
  { kind: "photo", tint: "linear-gradient(135deg,#627eea,#1c1f4a)" },
] as const;

/** The heavy part of the place card: two photos and a video. */
function Media() {
  return (
    <div className="flex gap-3">
      {MEDIA.map((m, i) => (
        <div key={i} className="relative flex h-[140px] w-[210px] items-center justify-center rounded-[12px]" style={{ background: m.tint }}>
          {m.kind === "video" ? (
            <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[rgba(246,244,239,0.9)]">
              <Play size={28} fill="#111111" className="ml-0.5 text-[var(--arkiv-ink)]" aria-hidden />
            </span>
          ) : (
            <ImageIcon size={44} strokeWidth={1.4} className="text-[rgba(246,244,239,0.8)]" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}

/** The light part of the place card: what you search and filter on. */
function Fields() {
  return (
    <div className="flex flex-col gap-2 text-[var(--arkiv-ink)]">
      <p className="text-[40px] font-bold leading-none">Chai Corner</p>
      <p className="flex items-center gap-2 text-[26px]">
        4.6 <Star size={24} fill="#FE7446" className="text-[var(--arkiv-orange)]" aria-hidden /> · Cafe · Colaba
      </p>
      <p className="flex items-center gap-2 text-[24px] text-[rgba(17,17,17,0.64)]">
        <Clock size={22} aria-hidden /> Open until 22:00
      </p>
    </div>
  );
}

export function S2({ step }: SceneContentProps) {
  const fieldsOut = step >= 1;
  const mediaOut = step >= 2;
  return (
    <Slide
      size={72}
      headline={
        <>
          Open Google Maps.
          <br />
          What do you see?
        </>
      }
      under="The pin is tiny. The photos are huge. They live in different places."
      wash={0.82}
    >
      <StreetMap dim={fieldsOut} />

      {/* Trays: Arkiv on the first →, Swarm on the second */}
      <Reveal step={step} at={1} className="absolute left-[1040px] top-[390px] h-[300px] w-[784px] rounded-[24px] border-[3px] border-[var(--arkiv-blue)] bg-[rgba(24,30,169,0.28)]">
        <span className="absolute -top-[22px] left-[28px] rounded-full bg-[var(--arkiv-blue)] px-5 py-1.5 text-[26px] font-bold tracking-[0.04em] text-[var(--arkiv-sand)]">INDEXING DATA → Arkiv</span>
        <span className="absolute bottom-[22px] left-[32px] text-[24px]" style={{ color: T.t84 }}>
          Small. What you search and filter on.
        </span>
      </Reveal>
      <Reveal step={step} at={2} className="absolute left-[1040px] top-[730px] h-[300px] w-[784px] rounded-[24px] border-[3px] border-[rgba(233,230,222,0.6)] bg-[rgba(233,230,222,0.1)]">
        <span className="absolute -top-[22px] left-[28px] rounded-full bg-[var(--arkiv-stone)] px-5 py-1.5 text-[26px] font-bold tracking-[0.04em] text-[var(--arkiv-ink)]">STORAGE → Swarm</span>
        <span className="absolute bottom-[22px] left-[32px] text-[24px]" style={{ color: T.t84 }}>
          Heavy. Photos and videos, about 1.4 GB.
        </span>
      </Reveal>

      {/* The place card: one card on the map; each → moves one piece to its tray */}
      <motion.div
        className="absolute z-10 rounded-[20px] bg-[var(--arkiv-sand)] px-7 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        initial={{ opacity: 0, left: 250, top: 812 }}
        animate={fieldsOut ? { opacity: 1, left: 1080, top: 430 } : { opacity: 1, left: 250, top: 812 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <div className="flex items-center gap-6">
          <Fields />
          <motion.span
            className="ml-4 overflow-hidden whitespace-nowrap rounded-[10px] bg-[rgba(24,30,169,0.1)] px-3 py-2 font-mono text-[20px] text-[var(--arkiv-blue)]"
            initial={false}
            animate={{ opacity: mediaOut ? 1 : 0, width: mediaOut ? "auto" : 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            photos: swarm://3f…a1
          </motion.span>
        </div>
      </motion.div>
      <motion.div
        className="absolute z-10 rounded-[20px] bg-[rgba(17,17,17,0.85)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        initial={{ opacity: 0, left: 250, top: 630 }}
        animate={mediaOut ? { opacity: 1, left: 1080, top: 770 } : { opacity: 1, left: 250, top: 630 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <Media />
      </motion.div>
    </Slide>
  );
}
