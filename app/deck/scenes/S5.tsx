"use client";

// S5 · A chain built to be a database. The stack builds bottom-up, one layer per →, then "own it, or
// give it to every user" plays one state per →. Nothing moves on a timer:
//   step 0 · headline, the Ethereum layer and its "Ethereum-aligned" chip
//   step 1 · the Arkiv DB-Chain layer with the real latest block, and "A new block every few seconds"
//   step 2 · the Your app layer
//   step 3 · own it: the four entities owned by your app's wallet
//   step 4 · give it to every user: each entity's owner line moves to its own user's wallet
// The block number is real data and updates with each block; its dot flashes once per new block
// (grey and "mock" with the mock source). The user wallets are illustrative.

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useSourceMode } from "../../../lib/data/source-mode";
import { useLiveBlock } from "../../../lib/data/useLiveBlock";
import { WRITER_CONNECTED } from "../../../lib/data/writer-client";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { WRITER_ADDRESS } from "../../../shared/arkiv/profiles";
import { Chip, EASE, PANEL_EASE, Reveal, Slide, T } from "../ui";

/** The stage's resolved source: the same rule as useLiveData (live when chosen, or auto with a writer). */
function useIsMock(): boolean {
  const mode = useSourceMode();
  return !(mode === "live" || (mode === "auto" && WRITER_CONNECTED));
}

function LiveBlock() {
  const block = useLiveBlock();
  const mock = useIsMock();
  if (!block) return <span className="text-[rgba(246,244,239,0.64)]">Reading the chain…</span>;
  return (
    <span className="flex items-center gap-5">
      {/* One short flash per new block (keyed by the number), then still: no looping pulse. */}
      <motion.span
        key={block.number.toString()}
        className={`block h-[22px] w-[22px] rounded-full ${mock ? "bg-[rgba(246,244,239,0.4)]" : "bg-[#14f195]"}`}
        initial={mock ? false : { scale: 1.5, boxShadow: "0 0 22px #14f195" }}
        animate={mock ? { scale: 1 } : { scale: 1, boxShadow: "0 0 0px rgba(20,241,149,0)" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        aria-hidden
      />
      <span className="text-[rgba(246,244,239,0.64)]">block</span>
      {/* The number rolls inside its own clipped slot, so the old one never leaves the chip. */}
      <span className="relative inline-flex h-[1.25em] items-center overflow-hidden align-baseline">
        <span className="invisible tabular-nums" aria-hidden>
          #{block.number.toLocaleString("en-US")}
        </span>
        <AnimatePresence initial={false}>
          <motion.span
            key={block.number.toString()}
            className="absolute inset-0 flex items-center tabular-nums text-[var(--arkiv-sand)]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            #{block.number.toLocaleString("en-US")}
          </motion.span>
        </AnimatePresence>
      </span>
      {mock ? <span className="text-[24px] text-[rgba(246,244,239,0.64)]">mock</span> : null}
    </span>
  );
}

function Layer({ label, sub, tone, children }: { label: string; sub?: ReactNode; tone: "app" | "arkiv" | "eth"; children?: ReactNode }) {
  const style =
    tone === "arkiv"
      ? "border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.14)]"
      : tone === "app"
        ? "border-[rgba(246,244,239,0.12)] bg-[rgba(17,17,17,0.78)]"
        : "border-[var(--arkiv-blue)] bg-[rgba(24,30,169,0.7)]";
  return (
    <div className={`rounded-[20px] border-[3px] px-9 py-6 ${style}`}>
      <p className="text-[40px] font-semibold">{label}</p>
      {sub ? <div className="mt-1 text-[28px] leading-[1.35] text-[rgba(246,244,239,0.72)]">{sub}</div> : null}
      {children ? <div className="mt-3 font-mono text-[38px] font-medium">{children}</div> : null}
    </div>
  );
}

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const ENTITIES = [
  { name: "Priya", color: "#fe7446", user: "0xA1c4…09bd" },
  { name: "Rahul", color: "#14f195", user: "0x5C2e…71fa" },
  { name: "Mei", color: "#9945ff", user: "0x93d0…4c18" },
  { name: "Lucas", color: "#00c2ff", user: "0x0bF7…e2a3" },
];
const CARD_W = 160;
const GAP = 24;
const centerX = (i: number) => i * (CARD_W + GAP) + CARD_W / 2;

/**
 * Own it, or give it to every user: the owner lines swap from one app wallet to four user wallets
 * when `given` turns on (the presenter's →), and back on ←.
 */
function OwnOrGive({ given }: { given: boolean }) {
  const width = ENTITIES.length * CARD_W + (ENTITIES.length - 1) * GAP;
  const appX = width / 2;
  return (
    <div className="flex w-[712px] flex-col gap-5">
      <div className="h-[92px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={given ? "give" : "own"}
            className="text-[38px] font-semibold leading-[1.15]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: PANEL_EASE } }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.16, ease: PANEL_EASE } }}
          >
            {given ? (
              <>
                …or <span className="text-[var(--arkiv-orange)]">give it to every user.</span>
                <br />
                Each one owns their own.
              </>
            ) : (
              <>
                <span className="text-[var(--arkiv-orange)]">Own it:</span> your app&apos;s wallet
                <br />
                owns every entity.
              </>
            )}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="relative" style={{ width, height: 400 }}>
        {ENTITIES.map((e, i) => (
          <div key={e.name} className="absolute top-0 flex h-[124px] flex-col justify-center gap-1.5 rounded-[14px] border border-[rgba(246,244,239,0.14)] bg-[rgba(17,17,17,0.85)] px-4" style={{ left: i * (CARD_W + GAP), width: CARD_W }}>
            <span className="flex items-center gap-2 text-[24px] font-semibold">
              <span className="block h-[16px] w-[16px] rounded-full" style={{ background: e.color }} /> {e.name}
            </span>
            <span className="font-mono text-[15px]" style={{ color: T.t64 }}>
              $owner
            </span>
            <motion.span key={given ? "u" : "a"} className="font-mono text-[16px] text-[var(--arkiv-orange)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.5 }}>
              {given ? e.user : short(WRITER_ADDRESS)}
            </motion.span>
          </div>
        ))}
        <svg className="absolute left-0 top-0" width={width} height={400} viewBox={`0 0 ${width} 400`} aria-hidden>
          {ENTITIES.map((e, i) => (
            <motion.path
              key={e.name}
              fill="none"
              stroke={given ? e.color : "#F6F4EF"}
              strokeWidth="3"
              strokeDasharray="8 8"
              initial={false}
              animate={{ d: given ? `M ${centerX(i)} 128 L ${centerX(i)} 300` : `M ${centerX(i)} 128 L ${appX} 300` }}
              transition={{ duration: 0.7, ease: EASE }}
            />
          ))}
        </svg>
        <AnimatePresence mode="wait">
          {given ? (
            <motion.div key="users" className="absolute left-0 top-[300px] flex" style={{ gap: GAP }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              {ENTITIES.map((e) => (
                <div key={e.name} className="flex h-[84px] flex-col items-center justify-center rounded-[14px] border-[2px] bg-[rgba(17,17,17,0.85)]" style={{ width: CARD_W, borderColor: e.color }}>
                  <span className="text-[22px] font-semibold">{e.name}&apos;s wallet</span>
                  <span className="font-mono text-[15px]" style={{ color: T.t64 }}>
                    {e.user}
                  </span>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="app"
              className="absolute top-[300px] flex h-[84px] w-[300px] flex-col items-center justify-center rounded-[14px] border-[2px] border-[var(--arkiv-sand)] bg-[rgba(17,17,17,0.85)]"
              style={{ left: appX - 150 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-[24px] font-semibold">Your app&apos;s wallet</span>
              <span className="font-mono text-[16px]" style={{ color: T.t64 }}>
                {short(WRITER_ADDRESS)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function S5({ step }: SceneContentProps) {
  return (
    <Slide headline="A chain built to be a database">
      <div className="absolute left-[96px] top-[284px] flex gap-4">
        <Reveal step={step} at={0}>
          <Chip tone="blue">Ethereum-aligned</Chip>
        </Reveal>
        <Reveal step={step} at={1}>
          <Chip tone="sand">A new block every few seconds</Chip>
        </Reveal>
      </div>
      <div className="absolute left-[96px] top-[380px] flex w-[940px] flex-col gap-4">
        <Reveal step={step} at={2}>
          <Layer
            label="Your app"
            tone="app"
            sub={
              <>
                Write entities. Query them.
                <br />
                <span className="text-[var(--arkiv-orange)]">Own them, or give them to every user.</span>
              </>
            }
          />
        </Reveal>
        <Reveal step={step} at={1}>
          <Layer label="Arkiv DB-Chain" tone="arkiv">
            <LiveBlock />
          </Layer>
        </Reveal>
        <Reveal step={step} at={0}>
          <Layer label="Ethereum" tone="eth" />
        </Reveal>
      </div>
      <Reveal step={step} at={3} className="absolute left-[1112px] top-[380px]">
        {step >= 3 ? <OwnOrGive given={step >= 4} /> : null}
      </Reveal>
    </Slide>
  );
}
