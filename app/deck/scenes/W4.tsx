"use client";

// W4 · What is Arkiv: the Web3 database, an Ethereum-aligned DB-Chain. The stack top-down (your
// app, the SDK, the DB-Chain with its real latest block, Ethereum), then where each kind of data
// goes: small, searchable data on Arkiv, big files on Swarm. → steps: 0 the stack, 1 Arkiv and Swarm.

import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Reveal, Slide, T } from "../ui";
import { Layer, LiveBlock } from "./S5";

export function W4({ step }: SceneContentProps) {
  return (
    <Slide headline="Arkiv, the Web3 database" under="An Ethereum-aligned DB-Chain.">
      <div className="absolute left-[96px] top-[330px] flex w-[940px] flex-col gap-3">
        <Layer label="Your app" tone="app" sub="Writes Arkiv entities and queries them." />
        <Layer label="Arkiv SDK" tone="app" />
        <Layer label="Arkiv DB-Chain" tone="arkiv">
          <LiveBlock />
        </Layer>
        <Layer label="Ethereum" tone="eth" />
      </div>
      <Reveal step={step} at={1} className="absolute left-[1112px] top-[330px] flex w-[712px] flex-col gap-5">
        <p className="text-[28px] font-semibold" style={{ color: T.t64 }}>Where your data goes</p>
        <div className="rounded-[20px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.14)] px-9 py-7">
          <p className="text-[44px] font-semibold">Arkiv</p>
          <p className="mt-2 text-[30px] leading-[1.3]" style={{ color: T.t84 }}>Small, searchable data: everything you filter on.</p>
        </div>
        <div className="rounded-[20px] border-[3px] border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.82)] px-9 py-7">
          <p className="text-[44px] font-semibold">Swarm</p>
          <p className="mt-2 text-[30px] leading-[1.3]" style={{ color: T.t84 }}>Big files: photos, video, documents.</p>
        </div>
      </Reveal>
    </Slide>
  );
}

export const W4_NOTES: string[] = [
  "Arkiv is the Web3 database: an Ethereum-aligned DB-Chain. Your app talks to it through the SDK, and that block number is the real chain, live. You don't need to know how a chain works to use it.",
  "One rule of thumb: small, searchable data goes on Arkiv, the things you filter on. Big files, like photos and video, go on Swarm.",
];
