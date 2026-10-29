"use client";

// ST · Five steps to get started, on testnet, where everything is free. One row per →:
// install the SDK, a wallet that signs writes, test funds from the faucet, free reads, and an RPC
// access key. Every URL was checked with a live request (October 28). Builders use Rabdi this
// weekend (October 29), so the install line names no version: this app's profile still pins
// Tiramisu's SDK until the app itself moves to Rabdi.

import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { PANEL, Reveal, Slide, T } from "../ui";

/** Only the rows that point somewhere carry a tag: a command or a Hub page. */
const STEPS: { title: string; line: string; tag?: string }[] = [
  { title: "Install the SDK", line: "Built on viem: it feels like the web3 libraries you already use.", tag: "npm install @arkiv-network/sdk viem" },
  { title: "A wallet to sign writes", line: "Your user's browser wallet, or a key on your server." },
  { title: "Test funds from the faucet", line: "Every write is a transaction: the faucet pays its gas.", tag: "hub.arkiv.network/faucet" },
  { title: "Reads are free", line: "Query the public RPC: no wallet needed." },
  { title: "An RPC access key", line: "Higher read limits for your app: get one for the hackathon.", tag: "hub.arkiv.network/access-keys" },
];

export function ST({ step }: SceneContentProps) {
  return (
    <Slide headline="Five steps to get started" under="We're on testnet (Rabdi): everything here is free." size={72}>
      <div role="list" className="absolute left-[96px] top-[330px] flex w-[1728px] flex-col gap-3.5">
        {STEPS.map((item, i) => (
          <Reveal key={item.title} step={step} at={i} y={16}>
            <div role="listitem" className={`${PANEL} grid h-[118px] grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-8 px-8`}>
              <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[var(--arkiv-orange)] text-[34px] font-semibold text-[var(--arkiv-ink)]">{i + 1}</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[38px] font-semibold leading-[1.15]">{item.title}</span>
                <span className="truncate text-[25px] leading-[1.3]" style={{ color: T.t64 }}>{item.line}</span>
              </span>
              {item.tag ? (
                <span className="whitespace-nowrap rounded-[10px] border-[1.5px] border-[var(--arkiv-orange)] px-4 py-2 font-mono text-[26px] text-[var(--arkiv-orange)]">{item.tag}</span>
              ) : null}
            </div>
          </Reveal>
        ))}
      </div>
    </Slide>
  );
}

export const ST_NOTES: string[] = [
  "Five steps, and on testnet, Rabdi this weekend, everything is free. One: npm install the SDK. It's built on viem, so it feels like the web3 libraries you already use.",
  "Two: a wallet to sign writes. In your app that's your user's browser wallet, or a key you keep on your server, never in the browser.",
  "Three: test funds from the faucet on the Hub. Every write is a transaction, and the faucet pays its gas.",
  "Four: reads are free. Anyone can query the public RPC, no wallet needed.",
  "Five: an RPC access key from the Hub gives your app higher read limits. Get one for the hackathon: the whole venue shares one internet connection. That's all you need. Now let's build one together.",
];
