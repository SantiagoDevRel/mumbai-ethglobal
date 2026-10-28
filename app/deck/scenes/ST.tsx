"use client";

// ST · Five steps to get started, on testnet, where everything is free. One row per →:
// install the SDK, a wallet for writes, test funds from the faucet, free reads, and an optional
// access key. Every URL was checked with a live request (October 28).

import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { PANEL, Reveal, Slide, T } from "../ui";

const STEPS: { title: string; line: string; tag: string; code?: boolean }[] = [
  { title: "Install the SDK", line: "Built on viem: it feels like the web3 libraries you already use.", tag: "npm install @arkiv-network/sdk", code: true },
  { title: "A wallet and its private key", line: "Only for writes. Keep the key on your server.", tag: "writes only" },
  { title: "Test funds from the faucet", line: "Every write is a transaction: the faucet pays its gas.", tag: "hub.arkiv.network/faucet", code: true },
  { title: "Reads are free", line: "Query the public RPC: no wallet, no key.", tag: "no wallet" },
  { title: "Optional: an access key", line: "Higher read limits for your app.", tag: "hub.arkiv.network/access-keys", code: true },
];

export function ST({ step }: SceneContentProps) {
  return (
    <Slide headline="Five steps to get started" under="We're on testnet (Tiramisu): everything here is free." size={72}>
      <div role="list" className="absolute left-[96px] top-[330px] flex w-[1728px] flex-col gap-3.5">
        {STEPS.map((item, i) => (
          <Reveal key={item.title} step={step} at={i} y={16}>
            <div role="listitem" className={`${PANEL} grid h-[118px] grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-8 px-8`}>
              <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[var(--arkiv-orange)] text-[34px] font-semibold text-[var(--arkiv-ink)]">{i + 1}</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[38px] font-semibold leading-[1.15]">{item.title}</span>
                <span className="truncate text-[25px] leading-[1.3]" style={{ color: T.t64 }}>{item.line}</span>
              </span>
              <span
                className={`whitespace-nowrap rounded-[10px] border-[1.5px] px-4 py-2 ${item.code ? "font-mono text-[26px] text-[var(--arkiv-orange)]" : "text-[24px] font-semibold"}`}
                style={{ borderColor: item.code ? "var(--arkiv-orange)" : T.t28, color: item.code ? undefined : T.t84 }}
              >
                {item.tag}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </Slide>
  );
}

export const ST_NOTES: string[] = [
  "Five steps, and on testnet everything is free. One: npm install the SDK. It's built on viem, so it feels like the web3 libraries you already use.",
  "Two: a wallet and its private key, only for writes. Keep the key on your server, never in the browser.",
  "Three: test funds from the faucet on the Hub. Every write is a transaction, and the faucet pays its gas.",
  "Four: reads are free. Anyone can query the public RPC, no wallet and no key.",
  "Five, optional: an access key from the Hub for higher read limits. That's all you need. Now let's build one together.",
];
