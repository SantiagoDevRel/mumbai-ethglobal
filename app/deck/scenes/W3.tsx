"use client";

// W3 · Your data, the web3 way. The three columns of the Arkiv leaflet (v16): what Arkiv keeps from
// web2 databases, what it takes from web3, and what is its own: rules the data carries itself. It
// keeps web2's good parts on purpose. "A public block explorer" joins the web3 column (Santiago,
// October 29); the columns keep one height. → steps: 0 the first column, 1 the second, 2 the third
// with the closing line ("Guarantees stay with the data, not the host", October 29).

import { Check } from "lucide-react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Reveal, Slide, T } from "../ui";

type Column = { eyebrow: string; items: string[]; tone: "web2" | "web3" | "own" };

const COLUMNS: Column[] = [
  { eyebrow: "FROM WEB2 DATABASES", items: ["Structured data", "Indexing", "A query language"], tone: "web2" },
  { eyebrow: "FROM WEB3", items: ["Ownership", "Tamper-evidence", "Permissionless access", "A public block explorer"], tone: "web3" },
  { eyebrow: "OF ITS OWN", items: ["Rules the data carries itself:", "a lifetime", "who may extend or change it"], tone: "own" },
];

const TONE: Record<Column["tone"], string> = {
  web2: "border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.82)]",
  web3: "border-[var(--arkiv-blue)] bg-[rgba(24,30,169,0.72)]",
  own: "border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.14)]",
};

export function W3({ step }: SceneContentProps) {
  return (
    <Slide headline="Your data, the web3 way" under="What you keep, what you gain, and what's new." wash={0.84}>
      <div className="absolute left-[96px] top-[350px] grid w-[1728px] grid-cols-3 gap-9">
        {COLUMNS.map((column, i) => (
          <Reveal key={column.eyebrow} step={step} at={i}>
            <div className={`flex h-[420px] flex-col gap-7 rounded-[20px] border-[3px] p-10 ${TONE[column.tone]}`}>
              <p className="text-[24px] font-bold tracking-[0.1em]" style={{ color: column.tone === "own" ? "var(--arkiv-orange)" : T.t64 }}>
                {column.eyebrow}
              </p>
              <ul className="flex flex-col gap-5">
                {column.items.map((item, j) => (
                  <li key={item} className="flex items-start gap-4 text-[34px] font-semibold leading-[1.18]">
                    {column.tone === "own" && j === 0 ? null : <Check size={34} strokeWidth={2.6} className="mt-[3px] shrink-0 text-[var(--arkiv-orange)]" aria-hidden />}
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal step={step} at={2} className="absolute left-[96px] top-[820px]">
        <p className="text-[56px] font-semibold leading-[1.1]">
          Guarantees stay with the data, <span className="text-[var(--arkiv-orange)]">not the host.</span>
        </p>
      </Reveal>
    </Slide>
  );
}

export const W3_NOTES: string[] = [
  "So what does web3 data look like? Arkiv takes three things. From web2 databases, the parts we love: structured data, indexing and a query language.",
  "From web3: ownership, tamper-evidence and permissionless access, plus a public block explorer where anyone can check every change. Anyone can read it, and nobody can quietly change it.",
  "And something of its own: rules the data carries itself, like how long it lives and who may extend or change it. Guarantees stay with the data, not the host.",
];
