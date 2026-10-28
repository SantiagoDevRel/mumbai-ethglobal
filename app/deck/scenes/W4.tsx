"use client";

// W4 · What is Arkiv: the Web3 database, an Ethereum-aligned DB-Chain. The stack top-down (your
// app, the SDK, the DB-Chain with its real latest block, Ethereum), each layer with one line saying
// what it is for someone who has never heard of Arkiv (review round, October 29), then where each
// kind of data goes: small, searchable data on Arkiv, big files on Swarm. → steps: 0 the stack, 1
// Arkiv and Swarm.

import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Reveal, Slide, T } from "../ui";
import { Layer, LiveBlock } from "./S5";

export function W4({ step }: SceneContentProps) {
  return (
    <Slide headline="Arkiv, the Web3 database" under="An Ethereum-aligned DB-Chain: a chain built to store and query app data.">
      <div className="absolute left-[96px] top-[330px] flex w-[940px] flex-col gap-3">
        <Layer compact label="Your app" tone="app" sub="Writes Arkiv entities and queries them." />
        <Layer compact label="Arkiv SDK" tone="app" sub="TypeScript, built on viem." />
        <Layer compact label="Arkiv DB-Chain" tone="arkiv" sub="Stores entities: attributes, an owner, an expiration.">
          <LiveBlock />
        </Layer>
        <Layer compact label="Ethereum" tone="eth" sub="Same wallets and tools you already use." />
      </div>
      <Reveal step={step} at={1} className="absolute left-[1112px] top-[330px] flex w-[712px] flex-col gap-5">
        <p className="text-[28px] font-semibold" style={{ color: T.t64 }}>Where your data goes</p>
        <div className="rounded-[20px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.14)] px-9 py-7">
          <p className="text-[44px] font-semibold">Arkiv</p>
          <p className="mt-2 text-[30px] leading-[1.3]" style={{ color: T.t84 }}>Small data you search and filter.</p>
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
  "Arkiv is the Web3 database: an Ethereum-aligned DB-Chain, a chain built to store and query app data. Your app writes entities through the SDK. The DB-Chain keeps each one: attributes you can query, an owner and an expiration. Ethereum-aligned means the same wallets and tools you already use. That block number is the real chain, live.",
  "One rule of thumb: small, searchable data goes on Arkiv, the things you filter on. Big files, like photos and video, go on Swarm.",
];
