"use client";

// W4 · What is Arkiv: the Web3 database. Two views, one per → (Santiago, October 29):
//   step 0 · the network, after the Arkiv leaflet's "How it works": DB-Chains on the left, wired to
//            Arkiv's own chain (under construction), which bridges to Ethereum mainnet; the footer
//            rows are the leaflet's (DB ENGINE / EVM / EVM, GLM / GLM · ETH · … / ETH). The live
//            DB-Chains are Rabdi, lit in orange because builders use it at ETHGlobal Mumbai, and
//            Sorbet, which holds Sourcify's verified contracts. Tiramisu is listed with the previous
//            testnets (builders don't use it this weekend); it still runs, so it carries no OFF tag.
//            Braga, Kaolin and Mendoza are switched off. Only the live DB-Chains are wired, and
//            neither shows a block here, only a LIVE pill (October 29). Network names only: no RPC
//            URL, chain ID or explorer for Rabdi or Sorbet in this public repo.
//   step 1 · your app: it reaches a DB-Chain through the SDK or straight through JSON-RPC, and Rabdi
//            keeps its entities. No live block until this app itself moves to Rabdi: today it would
//            be Tiramisu's (October 29). Arkiv runs no contracts, so your logic lives in contracts on
//            any EVM chain or in a web2 backend, and big files go to Swarm. The app talks to each
//            side: contracts on other chains can't read entities directly, so nothing joins the
//            DB-Chain to them.
// Logos: official files, colors unchanged, each on a Sand tile so every one reads on the dark stage.
//   ethereum-diamond-purple.svg · ethereum.org/en/assets, "ETH diamond (purple)":
//     https://ethereum.org/images/assets/svgs/eth-diamond-purple.svg
//   base-square-blue.svg · Base brand kit, "The Square":
//     https://raw.githubusercontent.com/base/brand-kit/main/logo/TheSquare/Digital/Base_square_blue.svg
//   op-mainnet-symbol.svg · optimism.io/brand, "OP Mainnet symbol", cropped to the symbol (the brand
//     page's grey card background removed):
//     https://cdn.sanity.io/images/y6ka751a/production/0619395edc911805bcea3268156418134c1c5b32-2500x1875.svg
//   arbitrum-logomark.svg · arbitrum.io/brand-kit, 1225_Arbitrum_Logomark_FullColor.zip
//     (…_ClearSpace.svg), viewBox cropped to the mark's own clip rectangle:
//     https://arbitrum.io/brandkit/downloads/1225_Arbitrum_Logomark_FullColor.zip
//   swarm-logo.svg · Swarm's documentation repository (Swarm publishes no press kit):
//     https://raw.githubusercontent.com/ethersphere/bee-docs/master/static/img/swarm-logo-2.svg
//   The [A] marks are Arkiv's own (public/brand/a-white.svg, a-orange.svg).

import { AppWindow, ArrowDown, Server } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, REVEAL_TIME, Slide, T } from "../ui";

/** Both views share one box on the stage, under the headline. */
const BOX = { left: 96, top: 336, width: 1728, height: 700 };

/** One of the two views. Both stay mounted (the live block keeps reading); the → crossfades them. */
function View({ shown, children }: { shown: boolean; children: ReactNode }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: BOX.left, top: BOX.top, width: BOX.width, height: BOX.height, pointerEvents: shown ? "auto" : "none" }}
      initial={false}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={{ duration: REVEAL_TIME, ease: EASE }}
      aria-hidden={!shown}
    >
      {children}
    </motion.div>
  );
}

// ── Step 0 · the network ─────────────────────────────────────────────────────────────────────────

const COLUMNS = [
  { band: "TESTNETS", x: 0, w: 640, tint: 0.2 },
  { band: "UNDER CONSTRUCTION", x: 640, w: 540, tint: 0.36 },
  { band: "", x: 1180, w: 548, tint: 0.56 },
] as const;
const [, ARKIV_COLUMN, MAINNET_COLUMN] = COLUMNS;
/** The leaflet's footer, one cell per column: what runs the column's state, then its gas tokens. */
const FOOTER = [
  ["DB ENGINE", "EVM", "EVM"],
  ["GLM", "GLM · ETH · …", "ETH"],
] as const;
const HUB = { x: 910, y: 300, r: 96, orbit: 124 };
const ETH = { x: 1454, y: 300, r: 80, orbit: 104 };
/** The live DB-Chains, each with its node on the wire to the hub. Rabdi is the lit one. */
const RABDI = { name: "Rabdi", node: { x: 616, y: 158, r: 16 } };
const SORBET = { name: "Sorbet", node: { x: 616, y: 276, r: 12 } };
/** The previous testnets. Tiramisu still runs, so only the others say OFF. */
const PREVIOUS = [
  { name: "Tiramisu", off: false },
  { name: "Braga", off: true },
  { name: "Kaolin", off: true },
  { name: "Mendoza", off: true },
];

/** A wire from a DB-Chain's node to the hub's orbit, on the line between their centers. */
function wire(node: { x: number; y: number; r: number }) {
  const dx = HUB.x - node.x;
  const dy = HUB.y - node.y;
  const length = Math.hypot(dx, dy);
  const [ux, uy] = [dx / length, dy / length];
  return `M ${node.x + ux * node.r} ${node.y + uy * node.r} L ${HUB.x - ux * HUB.orbit} ${HUB.y - uy * HUB.orbit}`;
}

function LivePill({ lit }: { lit: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-2.5 rounded-full px-4 py-1.5 font-mono text-[22px] font-semibold leading-none tracking-[0.08em] ${
        lit ? "bg-[var(--arkiv-orange)] text-[var(--arkiv-ink)]" : "border-[1.5px] border-[rgba(246,244,239,0.6)] text-[var(--arkiv-sand)]"
      }`}
    >
      <span className={`block h-[12px] w-[12px] rounded-full ${lit ? "bg-[var(--arkiv-ink)]" : "bg-[var(--arkiv-sand)]"}`} aria-hidden />
      LIVE
    </span>
  );
}

const CAPS = "font-mono font-semibold uppercase tracking-[0.08em]";

function Network() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] border border-[rgba(246,244,239,0.14)]">
      {COLUMNS.map((column) => (
        <div key={column.x} className="absolute top-0 h-full" style={{ left: column.x, width: column.w, background: `rgba(24,30,169,${column.tint})` }} />
      ))}
      <div className="absolute left-0 top-0 h-[44px] w-full bg-[rgba(246,244,239,0.06)]" />
      {COLUMNS.map((column) =>
        column.band ? (
          <p key={column.band} className={`absolute top-0 flex h-[44px] items-center justify-center text-[20px] ${CAPS}`} style={{ left: column.x, width: column.w, color: T.t64 }}>
            {column.band}
          </p>
        ) : null,
      )}

      <svg className="absolute left-0 top-0" width={BOX.width} height={BOX.height} viewBox={`0 0 ${BOX.width} ${BOX.height}`} aria-hidden>
        <circle cx={HUB.x} cy={HUB.y} r={HUB.orbit} fill="none" stroke="#F6F4EF" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" strokeDasharray="0 17" />
        <circle cx={ETH.x} cy={ETH.y} r={ETH.orbit} fill="none" stroke="#F6F4EF" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" strokeDasharray="0 17" />
        {/* Only the live DB-Chains are wired to the hub; Rabdi's wire is the lit one. */}
        <path d={wire(SORBET.node)} fill="none" stroke="#F6F4EF" strokeOpacity="0.6" strokeWidth="3" />
        <path d={wire(RABDI.node)} fill="none" stroke="#FE7446" strokeWidth="4.5" />
        <line x1="592" y1={RABDI.node.y} x2={RABDI.node.x} y2={RABDI.node.y} stroke="#FE7446" strokeWidth="4.5" />
        <line x1="592" y1={SORBET.node.y} x2={SORBET.node.x} y2={SORBET.node.y} stroke="#F6F4EF" strokeOpacity="0.6" strokeWidth="3" />
        <circle cx={RABDI.node.x} cy={RABDI.node.y} r={RABDI.node.r + 8} fill="#FE7446" fillOpacity="0.25" />
        <circle cx={RABDI.node.x} cy={RABDI.node.y} r={RABDI.node.r} fill="#FE7446" />
        <circle cx={SORBET.node.x} cy={SORBET.node.y} r={SORBET.node.r} fill="#0B0C2A" stroke="#F6F4EF" strokeOpacity="0.85" strokeWidth="3" />
        {/* The bridge, both ways. */}
        <line x1={HUB.x + HUB.orbit + 12} y1={HUB.y} x2={ETH.x - ETH.orbit - 12} y2={ETH.y} stroke="#F6F4EF" strokeOpacity="0.9" strokeWidth="3" />
        <path d={`M ${HUB.x + HUB.orbit + 26} ${HUB.y - 12} L ${HUB.x + HUB.orbit + 12} ${HUB.y} L ${HUB.x + HUB.orbit + 26} ${HUB.y + 12}`} fill="none" stroke="#F6F4EF" strokeOpacity="0.9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M ${ETH.x - ETH.orbit - 26} ${ETH.y - 12} L ${ETH.x - ETH.orbit - 12} ${ETH.y} L ${ETH.x - ETH.orbit - 26} ${ETH.y + 12}`} fill="none" stroke="#F6F4EF" strokeOpacity="0.9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Column 1: the live DB-Chains, then the previous testnets. */}
      <p className={`absolute left-[32px] top-[60px] text-[26px] leading-none text-[var(--arkiv-sand)] ${CAPS}`}>DB-Chains</p>
      <div className="absolute left-[32px] top-[104px] flex h-[108px] w-[560px] items-center justify-between rounded-[16px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.16)] px-7 shadow-[0_0_48px_rgba(254,116,70,0.32)]">
        <span className="flex flex-col gap-1.5">
          <span className="text-[44px] font-bold leading-none">{RABDI.name}</span>
          <span className="text-[22px] leading-none" style={{ color: T.t84 }}>Build on it at ETHGlobal Mumbai</span>
        </span>
        <LivePill lit />
      </div>
      <div className="absolute left-[32px] top-[228px] flex h-[96px] w-[560px] items-center justify-between rounded-[16px] border-[1.5px] border-[rgba(246,244,239,0.28)] bg-[rgba(17,17,17,0.55)] px-7">
        <span className="flex flex-col gap-1.5">
          <span className="text-[34px] font-semibold leading-none">{SORBET.name}</span>
          <span className="text-[20px] leading-none" style={{ color: T.t64 }}>Sourcify&apos;s verified contracts</span>
        </span>
        <LivePill lit={false} />
      </div>
      <p className={`absolute left-[32px] top-[352px] text-[22px] leading-none ${CAPS}`} style={{ color: T.t50 }}>Previous testnets</p>
      <ul className="absolute left-[32px] top-[390px] flex w-[560px] flex-col gap-2">
        {PREVIOUS.map(({ name, off }) => (
          <li key={name} className="flex h-[34px] items-center gap-4">
            <span className="block h-[14px] w-[14px] rounded-full border-2" style={{ borderColor: T.t28 }} aria-hidden />
            <span className="text-[28px] leading-none" style={{ color: T.t42 }}>{name}</span>
            {off ? (
              <span className="rounded-full border-[1.5px] px-3 py-1 font-mono text-[17px] font-semibold leading-none tracking-[0.08em]" style={{ borderColor: T.t14, color: T.t42 }}>
                OFF
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Column 2: Arkiv's own chain, the hub. */}
      <p className={`absolute top-[60px] text-center text-[26px] leading-none text-[var(--arkiv-sand)] ${CAPS}`} style={{ left: ARKIV_COLUMN.x, width: ARKIV_COLUMN.w }}>Arkiv</p>
      <div
        className="absolute flex items-center justify-center rounded-full border-[3px] border-[rgba(246,244,239,0.85)] bg-[var(--arkiv-blue)] shadow-[0_0_64px_rgba(24,30,169,0.9)]"
        style={{ left: HUB.x - HUB.r, top: HUB.y - HUB.r, width: HUB.r * 2, height: HUB.r * 2 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the official [A] mark at its own aspect */}
        <img src="/brand/a-white.svg" alt="Arkiv" width={124} height={70} draggable={false} className="block h-[70px] w-[124px]" />
      </div>

      {/* Column 3: Ethereum mainnet, over the bridge. */}
      <p className={`absolute top-[60px] text-center text-[26px] leading-none text-[var(--arkiv-sand)] ${CAPS}`} style={{ left: MAINNET_COLUMN.x, width: MAINNET_COLUMN.w }}>Ethereum mainnet</p>
      <p className={`absolute text-center text-[22px] leading-none ${CAPS}`} style={{ left: HUB.x + HUB.orbit, width: ETH.x - ETH.orbit - HUB.x - HUB.orbit, top: HUB.y - 48, color: T.t84 }}>
        Bridge
      </p>
      <div className="absolute flex items-center justify-center rounded-full bg-[var(--arkiv-sand)]" style={{ left: ETH.x - ETH.r, top: ETH.y - ETH.r, width: ETH.r * 2, height: ETH.r * 2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the official Ethereum mark at its own aspect */}
        <img src="/deck/logos/ethereum-diamond-purple.svg" alt="Ethereum" width={112} height={112} draggable={false} className="block h-[112px] w-[112px]" />
      </div>

      {/* The leaflet's footer: what runs each column's state, and the gas tokens. */}
      {FOOTER.map((row, i) => (
        <div key={row[0]} className="absolute left-0 flex h-[64px] w-full border-t" style={{ top: 572 + i * 64, borderColor: T.t14 }}>
          {COLUMNS.map((column, j) => (
            <p
              key={column.x}
              className={`flex h-full items-center justify-center leading-none ${CAPS} ${i === 0 ? "text-[22px]" : "text-[26px] text-[var(--arkiv-sand)]"}`}
              style={{ width: column.w, color: i === 0 ? T.t64 : undefined }}
            >
              {row[j]}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Step 1 · your app ────────────────────────────────────────────────────────────────────────────

const APP = { x: 664, w: 400, h: 104 };
const COLS = { top: 188, a: { x: 0, w: 760 }, b: { x: 784, w: 540 }, c: { x: 1348, w: 380 } };
const CHAINS = [
  { src: "/deck/logos/ethereum-diamond-purple.svg", name: "Ethereum" },
  { src: "/deck/logos/base-square-blue.svg", name: "Base" },
  { src: "/deck/logos/op-mainnet-symbol.svg", name: "Optimism" },
  { src: "/deck/logos/arbitrum-logomark.svg", name: "Arbitrum" },
];

/** An official logo on a Sand tile, its name under it. */
function LogoTile({ src, name }: { src: string; name: string }) {
  return (
    <span className="flex w-[104px] flex-col items-center gap-2.5">
      <span className="flex h-[84px] w-[84px] items-center justify-center rounded-[18px] bg-[var(--arkiv-sand)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- official logo files at their own aspect */}
        <img src={src} alt="" width={56} height={56} draggable={false} className="block h-[56px] w-[56px] object-contain" />
      </span>
      <span className="text-[20px] font-medium leading-none" style={{ color: T.t84 }}>{name}</span>
    </span>
  );
}

/** One way into Arkiv. */
function WayIn({ title, sub }: { title: string; sub: string }) {
  return (
    <span className="flex h-[88px] flex-1 flex-col justify-center gap-1.5 rounded-[14px] border-[1.5px] border-[rgba(246,244,239,0.28)] bg-[rgba(17,17,17,0.72)] px-6">
      <span className="text-[30px] font-semibold leading-none">{title}</span>
      <span className="text-[22px] leading-none" style={{ color: T.t64 }}>{sub}</span>
    </span>
  );
}

function YourApp() {
  const appX = APP.x + APP.w / 2;
  const drops = [COLS.a.x + COLS.a.w / 2, COLS.b.x + COLS.b.w / 2, COLS.c.x + COLS.c.w / 2];
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute flex items-center justify-center gap-5 rounded-[20px] border-[3px] border-[rgba(246,244,239,0.8)] bg-[rgba(17,17,17,0.85)]"
        style={{ left: APP.x, top: 0, width: APP.w, height: APP.h }}
      >
        <AppWindow size={52} strokeWidth={1.8} aria-hidden />
        <span className="text-[48px] font-bold leading-none">Your app</span>
      </div>

      {/* Your app talks to each side. Nothing joins the DB-Chain to the contracts. */}
      <svg className="absolute left-0 top-0" width={BOX.width} height={COLS.top} viewBox={`0 0 ${BOX.width} ${COLS.top}`} aria-hidden>
        {drops.map((x, i) => (
          <g key={x} stroke={i === 0 ? "#FE7446" : "#F6F4EF"} strokeOpacity={i === 0 ? 1 : 0.7} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={`M ${appX} ${APP.h} V 140 H ${x} V ${COLS.top - 12}`} />
            <path d={`M ${x - 11} ${COLS.top - 24} L ${x} ${COLS.top - 10} L ${x + 11} ${COLS.top - 24}`} />
          </g>
        ))}
      </svg>

      {/* The DB-Chain: the SDK or JSON-RPC, then Rabdi, which keeps the entities. */}
      <div
        className="absolute flex flex-col rounded-[20px] border-[3px] border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.1)] px-8 pb-7 pt-6"
        style={{ left: COLS.a.x, top: COLS.top, width: COLS.a.w, height: BOX.height - COLS.top }}
      >
        <span className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- the official [A] mark at its own aspect */}
          <img src="/brand/a-orange.svg" alt="" width={62} height={35} draggable={false} className="block h-[35px] w-[62px]" />
          <span className="text-[44px] font-bold leading-none">DB-Chain</span>
        </span>
        <span className="mt-2.5 text-[26px] leading-[1.25]" style={{ color: T.t84 }}>Small data you search and filter</span>
        <span className="mt-6 flex items-center gap-4">
          <WayIn title="Arkiv SDK" sub="TypeScript" />
          <span className="w-[28px] text-center text-[24px]" style={{ color: T.t64 }}>or</span>
          <WayIn title="JSON-RPC" sub="Any language" />
        </span>
        {/* Both ways lead into Rabdi: one arrow under each, on the same columns as the row above. */}
        <span className="flex h-[52px] items-center gap-4 text-[var(--arkiv-orange)]">
          <span className="flex flex-1 justify-center"><ArrowDown size={36} strokeWidth={2.4} aria-hidden /></span>
          <span className="w-[28px]" />
          <span className="flex flex-1 justify-center"><ArrowDown size={36} strokeWidth={2.4} aria-hidden /></span>
        </span>
        <span className="flex flex-1 flex-col justify-center rounded-[16px] border-2 border-[rgba(254,116,70,0.6)] bg-[rgba(17,17,17,0.72)] px-7">
          <span className="flex items-center justify-between gap-4">
            <span className="text-[44px] font-bold leading-none">{RABDI.name}</span>
            <LivePill lit />
          </span>
          <span className="mt-5 text-[26px] leading-none" style={{ color: T.t64 }}>Keeps your Arkiv entities</span>
        </span>
      </div>

      {/* Your logic: Arkiv runs no contracts, so it lives on an EVM chain or in a backend. */}
      <div
        className="absolute flex flex-col rounded-[20px] border-[3px] border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.82)] px-8 pb-7 pt-6"
        style={{ left: COLS.b.x, top: COLS.top, width: COLS.b.w, height: BOX.height - COLS.top }}
      >
        <span className="text-[44px] font-bold leading-none">Your logic</span>
        <span className="mt-2.5 text-[26px] leading-[1.25]" style={{ color: T.t84 }}>Arkiv runs no smart contracts</span>
        <span className="mt-6 text-[28px] font-semibold leading-none">Smart contracts on any EVM chain</span>
        <span className="mt-4 flex gap-2">
          {CHAINS.map((chain) => (
            <LogoTile key={chain.name} src={chain.src} name={chain.name} />
          ))}
        </span>
        <span className="mt-5 flex items-center gap-4 text-[22px]" style={{ color: T.t64 }}>
          <span className="h-px flex-1" style={{ background: T.t14 }} />
          or
          <span className="h-px flex-1" style={{ background: T.t14 }} />
        </span>
        <span className="mt-4 flex items-center gap-5">
          <span className="flex h-[84px] w-[84px] items-center justify-center rounded-[18px] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)]">
            <Server size={46} strokeWidth={1.8} aria-hidden />
          </span>
          <span className="text-[30px] font-semibold leading-none">A web2 backend</span>
        </span>
      </div>

      {/* Big files: Swarm. */}
      <div
        className="absolute flex flex-col rounded-[20px] border-[3px] border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.82)] px-8 pb-7 pt-6"
        style={{ left: COLS.c.x, top: COLS.top, width: COLS.c.w, height: BOX.height - COLS.top }}
      >
        <span className="text-[44px] font-bold leading-none">Big files</span>
        <span className="mt-2.5 text-[26px] leading-[1.25]" style={{ color: T.t84 }}>Photos, video, documents</span>
        <span className="flex flex-1 flex-col items-center justify-center gap-4">
          <span className="flex h-[144px] w-[144px] items-center justify-center rounded-[28px] bg-[var(--arkiv-sand)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- the official Swarm mark at its own aspect */}
            <img src="/deck/logos/swarm-logo.svg" alt="" width={112} height={112} draggable={false} className="block h-[112px] w-[112px]" />
          </span>
          <span className="text-[36px] font-semibold leading-none">Swarm</span>
        </span>
      </div>
    </div>
  );
}

export function W4({ step }: SceneContentProps) {
  return (
    <Slide headline="Arkiv, the Web3 database" under="Ethereum-aligned DB-Chains, built to store and query app data.">
      <View shown={step < 1}>
        <Network />
      </View>
      <View shown={step >= 1}>
        <YourApp />
      </View>
    </Slide>
  );
}

export const W4_NOTES: string[] = [
  "Arkiv is the Web3 database. Here's the network: DB-Chains, chains built to store and query app data, joined by Arkiv's own chain, still under construction, which bridges to Ethereum mainnet. A DB-Chain runs a database engine instead of the EVM. Two DB-Chains are live: Rabdi, the one you build on this weekend, and Sorbet, which holds Sourcify's verified contracts. Tiramisu was our previous testnet; Braga, Kaolin and Mendoza came before it and are switched off.",
  "And here's your app. It talks to a DB-Chain through the SDK, or straight to JSON-RPC from any language, and the DB-Chain keeps your Arkiv entities: small data you search and filter. This weekend, that's Rabdi. Arkiv runs no smart contracts, so your logic lives in contracts on any EVM chain, like Ethereum, Base, Optimism or Arbitrum, or in a web2 backend. Those contracts can't read your entities directly: your app talks to each side. Big files, like photos and video, go on Swarm.",
];
