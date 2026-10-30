"use client";

// ST · Five steps to get started (slide 8), one row per →: install the SDK, a wallet that signs
// writes, test funds from the faucet, an RPC access key, and free reads. The subtitle is Santiago's
// (October 30). Builders use Rabdi, so the install line names no version. Every request to Rabdi's
// RPC carries an access key (the RPC answers 429 without one), so the key comes before reads; reads
// still cost no gas and need no signature. Every tag is a link that opens in a new tab: the SDK's npm
// page, the faucet and the access keys on the Hub (October 30: both Hub pages answer, and the npm
// registry lists the package; npm's site refuses scripted requests).
// Two rows have a live button that uses the presenter's browser wallet (October 30); the logic is in
// lib/data/rabdi-wallet.ts:
//   A wallet to sign writes · Add network: the wallet shares an account, adds Rabdi and switches to
//     it (eth_requestAccounts, then wallet_addEthereumChain, then wallet_switchEthereumChain).
//   Reads are free · Get balance: that account's balance on Rabdi, read through the same wallet
//     (eth_chainId, then eth_getBalance), with no signature and no transaction.
// The wallet's RPC URL carries the presenter's access key, so the writer serves the network to a
// presenter login from server-only env vars (GET /api/presenter/rabdi, lib/server/rabdi.ts). The
// buttons act only on /map and /slides, and each window shows its own result. /outline draws this
// slide inert, as a picture: a click there never reaches a wallet or the writer.
// Logos: official files, colors unchanged, straight on the dark panel (no box), only to say which
// wallets the button works with.
//   metamask-fox.svg · metamask.com/assets, "The official MetaMask logos and symbol" (the fox):
//     https://images.ctfassets.net/clixtyxoaeas/3kVr1oM3HHOI2TcaVGhzew/9914b11aa711809bac60c87e09ea74c8/fox.svg
//     Terms: MetaMask's marks need its prior written consent (metamask.com/terms-of-use, section 7.3).
//   rabby-symbol.svg · Rabby's brand assets repository (RabbyHub/logo; no license stated), pinned:
//     https://raw.githubusercontent.com/RabbyHub/logo/297c81228f53e1db863ee44e49faf68d96719951/symbol.svg

import { ArrowUpRight, Coins, Plus } from "lucide-react";
import { useSyncExternalStore, type MouseEvent } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { presenterRequest } from "../../../lib/data/presenter-auth";
import { injectedWallet, rabdiController, type Status, type Wallet } from "../../../lib/data/rabdi-wallet";
import { WRITER_ROUTES } from "../../../shared/writer-api";
import { PANEL, Reveal, Slide, T } from "../ui";

type Live = "add" | "balance";
/** A row points somewhere (a link) or does something live with the wallet (a button). */
const STEPS: { title: string; line: string; link?: { text: string; href: string }; live?: Live }[] = [
  {
    title: "Install the SDK",
    line: "Built on viem: it feels like the web3 libraries you already use.",
    link: { text: "npm install @arkiv-network/sdk viem", href: "https://www.npmjs.com/package/@arkiv-network/sdk" },
  },
  { title: "A wallet to sign writes", line: "Your user's browser wallet, or a key on your server.", live: "add" },
  {
    title: "Test funds from the faucet",
    line: "Every write is a transaction: the faucet pays its gas.",
    link: { text: "hub.arkiv.network/faucet", href: "https://hub.arkiv.network/faucet" },
  },
  {
    title: "An RPC access key",
    line: "Every request carries it: get one free on the Hub.",
    link: { text: "hub.arkiv.network/access-keys", href: "https://hub.arkiv.network/access-keys" },
  },
  { title: "Reads are free", line: "No gas and no signature: only your key's quota.", live: "balance" },
];

const FOCUS = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[var(--arkiv-orange)]";
const TAG = `inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] border-[1.5px] border-[var(--arkiv-orange)] px-4 py-2 font-mono text-[26px] text-[var(--arkiv-orange)] transition-colors duration-200 hover:bg-[rgba(254,116,70,0.12)] ${FOCUS}`;
/** The deck's quiet pill (T1's page links), as a button. */
const BUTTON = `inline-flex h-[52px] items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-[rgba(246,244,239,0.28)] px-5 text-[24px] font-semibold text-[rgba(246,244,239,0.84)] transition-colors duration-200 enabled:cursor-pointer enabled:hover:border-[var(--arkiv-orange)] enabled:hover:text-[var(--arkiv-orange)] disabled:opacity-60 ${FOCUS}`;

/** One per window: /map and /slides each keep their own wallet connection and lines. */
const rabdi = rabdiController({
  wallet: () => injectedWallet(window as unknown as { ethereum?: Wallet }),
  loadNetwork: () => presenterRequest(WRITER_ROUTES.presenter.rabdi),
});

/** A button's action, except from /outline's inert picture of the slide: no wallet, no writer there. */
function act(run: () => Promise<void>) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    if (event.currentTarget.closest("[inert]")) return;
    void run();
  };
}

/** What the wallet answered, left of its button: quiet while it waits, Orange for a problem. */
function StatusLine({ status, mono = false }: { status: Status | null; mono?: boolean }) {
  const color = status?.tone === "error" ? "var(--arkiv-orange)" : status?.tone === "done" ? T.t84 : T.t64;
  return (
    <span role="status" className={`whitespace-nowrap text-[24px] leading-none ${mono && status?.tone === "done" ? "font-mono" : ""}`} style={{ color }}>
      {status?.text}
    </span>
  );
}

function LiveAction({ live }: { live: Live }) {
  const state = useSyncExternalStore(rabdi.subscribe, rabdi.get, rabdi.get);
  if (live === "add") {
    return (
      <span className="flex items-center gap-5">
        <StatusLine status={state.add} />
        <span className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- official logo files at their own aspect */}
          <img src="/deck/logos/metamask-fox.svg" alt="MetaMask" width={46} height={44} draggable={false} className="block h-[44px] w-[46px]" />
          {/* eslint-disable-next-line @next/next/no-img-element -- official logo files at their own aspect */}
          <img src="/deck/logos/rabby-symbol.svg" alt="Rabby" width={56} height={56} draggable={false} className="block h-[56px] w-[56px]" />
        </span>
        <button type="button" className={BUTTON} disabled={state.add?.tone === "busy"} onClick={act(rabdi.addNetwork)}>
          <Plus size={24} strokeWidth={2.4} aria-hidden />
          Add network
        </button>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-5">
      <StatusLine status={state.balance} mono />
      <button type="button" className={BUTTON} disabled={state.balance?.tone === "busy"} onClick={act(rabdi.getBalance)}>
        <Coins size={24} strokeWidth={2.2} aria-hidden />
        Get balance
      </button>
    </span>
  );
}

export function ST({ step }: SceneContentProps) {
  return (
    <Slide headline="Five steps to get started" under="Use Rabdi testnet" size={72}>
      <div role="list" className="absolute left-[96px] top-[330px] flex w-[1728px] flex-col gap-3.5">
        {STEPS.map((item, i) => (
          <Reveal key={item.title} step={step} at={i} y={16}>
            {/* Not shown yet: its link or button can't be clicked or focused. */}
            <div role="listitem" className={`${PANEL} grid h-[118px] grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-8 px-8`} inert={step < i}>
              <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[var(--arkiv-orange)] text-[34px] font-semibold text-[var(--arkiv-ink)]">{i + 1}</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[38px] font-semibold leading-[1.15]">{item.title}</span>
                <span className="truncate text-[25px] leading-[1.3]" style={{ color: T.t64 }}>{item.line}</span>
              </span>
              {item.link ? (
                <a href={item.link.href} target="_blank" rel="noreferrer" className={TAG}>
                  {item.link.text}
                  <ArrowUpRight size={26} strokeWidth={2.2} aria-hidden />
                </a>
              ) : item.live ? (
                <LiveAction live={item.live} />
              ) : null}
            </div>
          </Reveal>
        ))}
      </div>
    </Slide>
  );
}

export const ST_NOTES: string[] = [
  "Five steps, and we use the Rabdi testnet, so everything here is free. One: npm install the SDK. It's built on viem, so it feels like the web3 libraries you already use.",
  "Two: a wallet to sign writes. In your app that's your user's browser wallet, like MetaMask or Rabby, or a key you keep on your server, never in the browser. Watch: I press Add network, and my wallet adds Rabdi and connects.",
  "Three: test funds from the faucet on the Hub. Every write is a transaction, and the faucet pays its gas.",
  "Four: reads are free. I press Get balance, and my wallet reads my GLM on Rabdi: no signature, no transaction. Anyone can query the public RPC, no wallet needed.",
  "Five: an RPC access key from the Hub gives your app higher read limits. Get one for the hackathon: the whole venue shares one internet connection. That's all you need. Now let's build one together.",
];
