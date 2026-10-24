"use client";

// S2 · Open Google Maps (handoff board "S2 · Slide template: the pin, taken apart"). One pin card
// on top of its heavy photos and videos; → pulls them apart: indexing data (Arkiv) on top,
// storage (Swarm) underneath.

import { FileText, Image as ImageIcon, MapPin, Video } from "lucide-react";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, Reveal, Rise, Slide } from "../ui";

const FIELDS: { key: string; value: string; span?: boolean }[] = [
  { key: "name", value: "Chai Corner" },
  { key: "category", value: "cafe" },
  { key: "rating", value: "4.6" },
  { key: "hours", value: "7:00–22:00" },
  { key: "location", value: "18.93, 72.83", span: true },
];

type Tile = { kind: "photo" | "video" | "file"; cls: string; tone: "stone" | "sand" | "ink"; size: number };

const TILES: Tile[] = [
  { kind: "photo", cls: "col-span-2 row-span-2", tone: "stone", size: 96 },
  { kind: "video", cls: "col-span-2", tone: "ink", size: 72 },
  { kind: "photo", cls: "", tone: "stone", size: 56 },
  { kind: "photo", cls: "", tone: "sand", size: 56 },
  { kind: "photo", cls: "", tone: "sand", size: 56 },
  { kind: "video", cls: "col-span-2", tone: "ink", size: 72 },
  { kind: "file", cls: "", tone: "stone", size: 56 },
];

function TileIcon({ kind, size, ink }: { kind: Tile["kind"]; size: number; ink: boolean }) {
  const Icon = kind === "video" ? Video : kind === "file" ? FileText : ImageIcon;
  return <Icon size={size} strokeWidth={1.25} className={ink ? "text-[var(--arkiv-sand)]" : "text-[var(--arkiv-ink)]"} aria-hidden />;
}

export function S2({ step }: SceneContentProps) {
  const apart = step >= 1;
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
      wash={0.8}
    >
      {/* Storage: the heavy layer */}
      <motion.div
        className="absolute left-[224px] top-[656px] grid h-[360px] w-[1352px] grid-cols-6 grid-rows-2 gap-4 rounded-[24px] border p-6"
        style={{ background: "rgba(233,230,222,0.10)", borderColor: "rgba(246,244,239,0.18)" }}
        initial={false}
        animate={{ y: apart ? 0 : -150, opacity: apart ? 1 : 0.7 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {TILES.map((t, i) => (
          <div
            key={i}
            className={`flex items-center justify-center rounded-[12px] border ${t.cls} ${t.tone === "ink" ? "bg-[var(--arkiv-ink)] border-[rgba(246,244,239,0.2)]" : t.tone === "sand" ? "bg-[var(--arkiv-sand)] border-[rgba(17,17,17,0.12)]" : "bg-[var(--arkiv-stone)] border-[rgba(17,17,17,0.12)]"}`}
          >
            <TileIcon kind={t.kind} size={t.size} ink={t.tone === "ink"} />
          </div>
        ))}
      </motion.div>

      {/* The dashed link from the pin to its photos */}
      <Reveal step={step} at={1} y={0} className="absolute left-[899px] top-[600px] h-[56px] border-l-[3px] border-dashed border-[rgba(246,244,239,0.5)]">
        <span />
      </Reveal>

      {/* Indexing data: the tiny pin card */}
      <Rise delay={0.2} className="absolute left-[520px] top-[424px] z-10">
        <div className="flex h-[176px] w-[760px] items-center gap-7 rounded-[20px] bg-[var(--arkiv-sand)] px-8 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <MapPin size={72} strokeWidth={1.5} fill="#FE7446" className="shrink-0 text-[var(--arkiv-ink)]" aria-hidden />
          <div className="grid flex-1 grid-cols-3 gap-x-7 gap-y-3">
            {FIELDS.map((f) => (
              <div key={f.key} className={`flex flex-col gap-0.5 ${f.span ? "col-span-2" : ""}`}>
                <span className="font-mono text-[16px] text-[rgba(17,17,17,0.56)]">{f.key}</span>
                <span className="text-[26px] font-semibold text-[var(--arkiv-ink)]">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Rise>

      <Reveal step={step} at={1} className="absolute left-[1312px] top-[482px]">
        <span className="inline-flex items-center gap-3 rounded-full bg-[var(--arkiv-blue)] px-5 py-2.5 text-[26px] font-bold tracking-[0.04em] text-[var(--arkiv-sand)]">
          INDEXING DATA <span aria-hidden>→</span> Arkiv
        </span>
      </Reveal>
      <Reveal step={step} at={1} className="absolute left-[1608px] top-[800px]">
        <span className="inline-flex flex-col items-start rounded-[20px] bg-[var(--arkiv-stone)] px-5 py-2.5 text-[26px] font-bold tracking-[0.04em] text-[var(--arkiv-ink)]">
          STORAGE
          <span>→ Swarm</span>
        </span>
      </Reveal>
    </Slide>
  );
}
