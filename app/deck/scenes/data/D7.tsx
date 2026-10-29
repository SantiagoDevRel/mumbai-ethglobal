"use client";

// D7 · Transfer ownership. You own the four businesses you added; each real owner waits below.
// → Chai Corner's owner asks for their data; → you sign changeOwnership: your link breaks and the
// entity drops under its owner ($creator stays you); → the same for the other three; → only each
// owner can change, transfer or delete it now.
// Steps: 0 you own 4 · 1 the ask · 2 first transfer · 3 the other three · 4 who can do what.

import { motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { PANEL, Slide } from "../../ui";
import { ALERT, SPACE, Show, SUB } from "./kit";

const YOU = "0x7a3f…c91e";
const BIZ: [name: string, owner: string][] = [
  ["Chai Corner", "0xb41c…9a20"],
  ["Book Nook", "0x52de…7f03"],
  ["Vada Pav Stall", "0xe8a1…44c6"],
  ["Sea Breeze Juice", "0x3c97…b815"],
];
const LEFT = [96, 544, 992, 1440];
const CENTER = [288, 736, 1184, 1632];
const MOVE_EASE: Transition["ease"] = [0.65, 0, 0.35, 1];

function Caption({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <Show on={on} delay={0.15} y={12} className="pointer-events-none absolute left-[96px] top-[916px] flex w-[1500px] flex-col gap-3">
      {children}
    </Show>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <span className="text-[32px] font-semibold">{children}</span>;
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <span className="text-[24px]" style={{ color: SUB }}>
      {children}
    </span>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border-[1.5px] border-[var(--arkiv-orange)] px-[18px] py-2 text-[24px] font-semibold text-[var(--arkiv-orange)]">{children}</span>;
}

export function D7({ step }: SceneContentProps) {
  const moved = (i: number) => step >= (i === 0 ? 2 : 3);
  const owned = BIZ.filter((_, i) => !moved(i)).length;

  return (
    <Slide headline="Transfer ownership" under="You added the businesses. Each real owner can take theirs." wash={0.82}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden className="pointer-events-none absolute left-0 top-0">
        {CENTER.map((x) => (
          <path key={`g${x}`} d={`M960 404 V440 H${x}`} fill="none" stroke="rgba(246,244,239,0.3)" strokeWidth="2.5" strokeDasharray="7 9" strokeLinecap="round" />
        ))}
        {CENTER.map((x, i) => (
          <motion.path
            key={`b${x}`}
            d={`M960 404 V440 H${x} V476`}
            fill="none"
            stroke="#FE7446"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ opacity: moved(i) ? 0 : 1 }}
            transition={{ duration: 0.5 }}
          />
        ))}
        {CENTER.map((x, i) => (
          <motion.path
            key={`n${x}`}
            d={`M${x} 728 V776`}
            fill="none"
            stroke="#FE7446"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: moved(i) ? 1 : 0 }}
            transition={{ duration: 0.4, delay: moved(i) ? 0.85 + i * 0.15 : 0 }}
          />
        ))}
        {CENTER.map((x, i) => (
          <motion.g key={`k${x}`} initial={false} animate={{ opacity: moved(i) ? 1 : 0 }} transition={{ duration: 0.3 }}>
            <circle cx={x} cy="458" r="15" fill={SPACE} stroke={ALERT} strokeWidth="2" />
            <path d={`M${x - 6} 452 L${x + 6} 464 M${x + 6} 452 L${x - 6} 464`} stroke={ALERT} strokeWidth="3" strokeLinecap="round" />
          </motion.g>
        ))}
      </svg>

      <div
        className={`${PANEL} absolute left-[720px] top-[316px] box-border flex h-[88px] w-[480px] items-center gap-[18px] px-6 transition-[border-color] duration-500`}
        style={{ borderColor: owned === 0 ? "rgba(246,244,239,0.2)" : "#FE7446" }}
      >
        <span className="flex h-[56px] w-[56px] flex-none items-center justify-center rounded-full bg-[rgba(246,244,239,0.1)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F6F4EF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </span>
        <div className="flex flex-col gap-1.5">
          <span className="text-[28px] font-semibold leading-[1.1]">You</span>
          <span className="whitespace-nowrap font-mono text-[18px] text-[rgba(246,244,239,0.72)]">
            {YOU} · owns <b className="font-semibold text-[var(--arkiv-orange)]">{owned === 1 ? "1 entity" : `${owned} entities`}</b>
          </span>
        </div>
      </div>

      {BIZ.map(([name, owner], i) => {
        const isMoved = moved(i);
        const asking = i === 0 && step === 1;
        return (
          <div key={name}>
            <motion.div
              className="absolute top-[476px] z-[1] box-border flex h-[116px] w-[384px] flex-col gap-1 rounded-[16px] bg-[var(--arkiv-sand)] px-[22px] py-[14px] text-[var(--arkiv-ink)] transition-shadow duration-[400ms]"
              style={{
                left: LEFT[i],
                boxShadow: asking ? "0 0 0 4px #FE7446, 0 18px 48px rgba(0,0,0,0.5)" : "0 18px 48px rgba(0,0,0,0.5)",
              }}
              initial={false}
              animate={{ y: isMoved ? 300 : 0 }}
              transition={{ duration: 0.9, ease: MOVE_EASE, delay: isMoved && i > 0 ? i * 0.15 : 0 }}
            >
              <span className="whitespace-nowrap text-[27px] font-semibold">{name}</span>
              <div className="grid h-[28px] items-center font-mono text-[19px]" style={{ gridTemplateColumns: "110px minmax(0, 1fr)" }}>
                <span className="text-[rgba(17,17,17,0.56)]">$owner</span>
                <div className="relative h-[28px]">
                  <motion.span className="absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap" initial={false} animate={{ opacity: isMoved ? 0 : 1 }} transition={{ duration: 0.4, delay: isMoved ? 0.5 : 0 }}>
                    {YOU} · you
                  </motion.span>
                  <motion.span
                    className="absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap font-semibold"
                    style={{ color: ALERT }}
                    initial={false}
                    animate={{ opacity: isMoved ? 1 : 0 }}
                    transition={{ duration: 0.4, delay: isMoved ? 0.5 : 0 }}
                  >
                    {owner}
                  </motion.span>
                </div>
              </div>
              <div className="grid h-[28px] items-center font-mono text-[19px]" style={{ gridTemplateColumns: "110px minmax(0, 1fr)" }}>
                <span className="text-[rgba(17,17,17,0.56)]">$creator</span>
                <span>{YOU} · you</span>
              </div>
            </motion.div>

            <motion.div
              className="absolute top-[652px] z-[2] box-border flex h-[76px] w-[384px] items-center gap-[14px] rounded-[14px] border-[1.5px] bg-[#15161f] px-5"
              style={{
                left: LEFT[i],
                borderStyle: isMoved || asking ? "solid" : "dashed",
                borderColor: isMoved ? "#FE7446" : asking ? "rgba(246,244,239,0.6)" : "rgba(246,244,239,0.3)",
              }}
              initial={false}
              animate={{ opacity: isMoved || asking ? 1 : 0.5 }}
              transition={{ duration: 0.5 }}
            >
              <span className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full bg-[rgba(246,244,239,0.1)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F6F4EF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" />
                  <path d="M17.8 10.1V20a1 1 0 0 1-1 1H7.2a1 1 0 0 1-1-1v-9.9" />
                  <path d="M2 7.5 4.6 3.2A1 1 0 0 1 5.5 3h13a1 1 0 0 1 .9.5L22 7.5" />
                  <path d="M2 7.5h20v1.3a3 3 0 0 1-5.2 2A3 3 0 0 1 12 10.8a3 3 0 0 1-4.8 0 3 3 0 0 1-5.2-2z" />
                </svg>
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[22px] font-semibold leading-[1.1]">{name}&apos;s owner</span>
                <span className="font-mono text-[17px] text-[rgba(246,244,239,0.72)]">{owner}</span>
              </div>
            </motion.div>
          </div>
        );
      })}

      <Show on={step === 1} y={8} className="absolute left-[120px] top-[598px] z-[3]">
        <span className="relative block whitespace-nowrap rounded-[12px] bg-[var(--arkiv-sand)] px-[18px] py-2 text-[22px] font-semibold text-[var(--arkiv-ink)] shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          “Give me my data”
          <span className="absolute bottom-[-9px] left-[36px] h-0 w-0 border-x-[9px] border-t-[9px] border-x-transparent border-t-[var(--arkiv-sand)]" />
        </span>
      </Show>

      <Caption on={step === 0}>
        <Title>You added 4 businesses, so you own all 4 entities.</Title>
        <Sub>Each one has a real owner. Today only you can change them.</Sub>
      </Caption>
      <Caption on={step === 1}>
        <Title>Chai Corner&apos;s owner asks for their entity.</Title>
        <Sub>They want to run it themselves.</Sub>
      </Caption>
      <Caption on={step === 2}>
        <div className={`${PANEL} self-start whitespace-nowrap px-[26px] py-[14px] font-mono text-[24px]`}>
          <span className="text-[rgba(246,244,239,0.5)]">walletClient.</span>
          <span className="font-semibold text-[var(--arkiv-orange)]">changeOwnership</span>({"{"} entityKey, newOwner: &quot;0xb41c…9a20&quot; {"}"})
        </div>
        <Sub>One transaction. Your link breaks and the entity moves under its owner.</Sub>
      </Caption>
      <Caption on={step === 3}>
        <Title>Same call for each one. Every business now owns its own.</Title>
        <Sub>You are not the owner of any of them anymore.</Sub>
      </Caption>
      <Caption on={step === 4}>
        <div className="flex flex-wrap items-center gap-[14px]">
          <Title>Only each owner can</Title>
          <Pill>change it</Pill>
          <Pill>transfer ownership</Pill>
          <Pill>delete it</Pill>
        </div>
        <Sub>You stay the $creator of all four. That&apos;s the owner view you&apos;ll see on the map.</Sub>
      </Caption>
    </Slide>
  );
}

export const D7_STEPS = 5;

export const D7_NOTES: string[] = [
  "You added these four businesses, so your wallet owns all four entities. Each one has a real owner waiting below, but today only you can change them.",
  "Chai Corner's owner asks for their data. You sign one changeOwnership transaction: your link breaks and the entity moves under its owner. $creator still says you. Then the same call for the other three, and you own none of them.",
  "Now only each owner can change it, transfer ownership or delete it. You stay the $creator of all four, and that is the owner view you'll see on the map.",
];
