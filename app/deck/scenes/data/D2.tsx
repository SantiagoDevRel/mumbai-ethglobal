"use client";

// D2 · Arkiv adds a few fields for you. Your attributes (right, on Sand) are there from the start;
// → brings in the fields Arkiv keeps on every entity (left, on Arkiv Blue), each starting with $.
// Steps: 0 your attributes (Arkiv's column a ghost) · 1 Arkiv's fields.

import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { Slide } from "../../ui";
import { CARD_SHADOW, Show } from "./kit";

const ARKIV: [field: string, value: string, meaning: string][] = [
  ["$key", "0x9c4e…d21b", "Its unique ID"],
  ["$owner", "0x7a3f…c91e · you", "Who can change and transfer it"],
  ["$creator", "0x7a3f…c91e · you", "Who created it. Never changes."],
  ["$createdAt", "block #…", "Block it was created in"],
  ["$updatedAt", "block #…", "Block it last changed in"],
  ["$expiresAt", "block #…", "When it expires. You choose."],
  ["$creationFlags", "set once", "Switches fixed at creation"],
];

const MINE: [attribute: string, value: string, mono: boolean][] = [
  ["name", "Chai Corner", false],
  ["category", "cafe", false],
  ["rating", "4.6", false],
  ["open_now", "true", true],
  ["photo", "swarm://3f…a1", true],
  ["added_by", "0x7a3f…c91e", true],
];

function Header({ eyebrow, sub, tone }: { eyebrow: string; sub: string; tone: "ark" | "mine" }) {
  const ark = tone === "ark";
  return (
    <div
      className="flex h-[84px] flex-col justify-center gap-1 border-b-2 px-7 py-4"
      style={{ borderColor: ark ? "rgba(246,244,239,0.2)" : "rgba(17,17,17,0.12)" }}
    >
      <span className="text-[18px] font-bold tracking-[0.08em]" style={{ color: ark ? undefined : "#181EA9" }}>
        {eyebrow}
      </span>
      <span className="text-[22px]" style={{ color: ark ? "rgba(246,244,239,0.78)" : "rgba(17,17,17,0.64)" }}>
        {sub}
      </span>
    </div>
  );
}

export function D2({ step }: SceneContentProps) {
  return (
    <Slide headline="Arkiv adds a few fields for you" under="You write the attributes. Arkiv keeps its own fields on every entity." wash={0.82}>
      <Show on={step >= 1} dim={0.1} y={12} className="absolute left-[96px] top-[330px] w-[852px]">
        <div className="overflow-hidden rounded-[20px] bg-[var(--arkiv-blue)] text-[var(--arkiv-sand)]" style={{ boxShadow: CARD_SHADOW }}>
          <Header eyebrow="ARKIV ADDS THESE" sub="On every entity. Each one starts with $." tone="ark" />
          {ARKIV.map(([field, value, meaning], i) => (
            <div
              key={field}
              className={`grid h-[68px] items-center px-7 ${i > 0 ? "border-t border-[rgba(246,244,239,0.12)]" : ""}`}
              style={{ gridTemplateColumns: "210px 244px minmax(0, 1fr)" }}
            >
              <span className="whitespace-nowrap font-mono text-[24px] font-semibold">{field}</span>
              <span className="whitespace-nowrap font-mono text-[20px] text-[rgba(246,244,239,0.72)]">{value}</span>
              <span className="whitespace-nowrap text-[21px]">{meaning}</span>
            </div>
          ))}
        </div>
      </Show>

      <div className="absolute left-[972px] top-[330px] w-[852px] overflow-hidden rounded-[20px] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)]" style={{ boxShadow: CARD_SHADOW }}>
        <Header eyebrow="YOUR ATTRIBUTES" sub="You pick the names and the values." tone="mine" />
        {MINE.map(([attribute, value, mono], i) => (
          <div key={attribute} className={`grid h-[68px] items-center px-7 ${i > 0 ? "border-t border-[rgba(17,17,17,0.08)]" : ""}`} style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}>
            <span className="whitespace-nowrap font-mono text-[24px] font-semibold">{attribute}</span>
            <span className={`whitespace-nowrap ${mono ? "font-mono text-[24px] font-medium" : "text-[30px] font-semibold"}`}>{value}</span>
          </div>
        ))}
        <div className="grid h-[68px] items-center border-t border-[rgba(17,17,17,0.08)] px-7 text-[21px] text-[rgba(17,17,17,0.5)]" style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}>
          <span>+ more</span>
          <span>Up to 32 attributes per entity</span>
        </div>
      </div>
    </Slide>
  );
}

export const D2_STEPS = 2;

export const D2_NOTES: string[] = [
  "On the right are your attributes: you pick the names and the values.",
  "On the left are the fields Arkiv keeps on every entity, and each one starts with a dollar sign. $key is its unique ID. $owner is the wallet that can change and transfer it; $creator is the wallet that created it, and it never changes. Arkiv also keeps the block it was created in, the block it last changed in, when it expires, and the flags set at creation.",
  "If someone asks: a key is 32 bytes (64 hex characters) and a wallet address is 20 bytes (40).",
];
