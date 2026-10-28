"use client";

// D8 · Deleting an entity. Chai Corner in a query for cafés (left); → its owner signs deleteEntity
// and the query returns nothing; → the create transaction in its block still holds the data in its
// input (eth_getTransactionByHash); → a query at that older block still returns it; → takeaway.
// Steps: 0 in the query · 1 deleted · 2 the create transaction · 3 a query at that block · 4 takeaway.
//
// Checked read-only on Tiramisu (October 28, 2026) with a real deleted entity: after the delete,
// arkiv_query and arkiv_getEntity at head return nothing; at the create block both return it, and
// eth_getTransactionByHash on the create transaction returns calldata to 0x4400…0044 that carries
// every attribute and the payload. Block numbers, key and hash on the slide are illustrative.

import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Slide } from "../../ui";
import { ALERT, Show, SUB } from "./kit";

const CREATE_BLOCK = "#1,204,310";
const DELETE_BLOCK = "#1,204,350";
const CREATE_TX = "0x5e1d…a7c4";

/** A glass panel that rises in at `at` and wears the Orange outline while it is the current step. */
function StepPanel({ step, at, now, className, style, children }: { step: number; at: number; now?: boolean; className: string; style?: CSSProperties; children: ReactNode }) {
  const on = step >= at;
  return (
    <motion.div
      className={`${PANEL} absolute box-border flex flex-col transition-[border-color] duration-[400ms] ${className}`}
      style={{ ...style, borderColor: now ? "#FE7446" : undefined }}
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 14 }}
      transition={{ duration: 0.45, ease: EASE }}
      aria-hidden={!on}
    >
      {children}
    </motion.div>
  );
}

function Dim({ children }: { children: ReactNode }) {
  return <span className="text-[rgba(246,244,239,0.5)]">{children}</span>;
}

function Hot({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-[var(--arkiv-orange)]">{children}</span>;
}

function Block({ left, width, number, lit, children }: { left: number; width: number; number: string; lit?: boolean; children?: ReactNode }) {
  return (
    <div
      className="absolute top-0 box-border flex h-[88px] items-center gap-4 rounded-[12px] border-[1.5px] bg-[#15161f] px-5 transition-[border-color,box-shadow] duration-[400ms]"
      style={{
        left,
        width,
        borderColor: lit ? "#FE7446" : "rgba(246,244,239,0.22)",
        boxShadow: lit ? "0 0 0 3px rgba(254,116,70,0.3)" : "none",
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="whitespace-nowrap font-mono text-[20px] font-semibold">{number}</span>
        <span className="whitespace-nowrap text-[16px] text-[rgba(246,244,239,0.56)]">block</span>
      </div>
      {children}
    </div>
  );
}

function More({ left }: { left: number }) {
  return (
    <span className="absolute top-[30px] bg-[#08091F] px-2 font-mono text-[22px] text-[rgba(246,244,239,0.5)]" style={{ left }}>
      ···
    </span>
  );
}

function ShopIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F6F4EF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" />
      <path d="M17.8 10.1V20a1 1 0 0 1-1 1H7.2a1 1 0 0 1-1-1v-9.9" />
      <path d="M2 7.5 4.6 3.2A1 1 0 0 1 5.5 3h13a1 1 0 0 1 .9.5L22 7.5" />
      <path d="M2 7.5h20v1.3a3 3 0 0 1-5.2 2A3 3 0 0 1 12 10.8a3 3 0 0 1-4.8 0 3 3 0 0 1-5.2-2z" />
    </svg>
  );
}

function Value({ name, children }: { name: string; children: ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-[8px] bg-[var(--arkiv-sand)] px-3 py-1 text-[20px] font-semibold text-[var(--arkiv-ink)]">
      <span className="mr-1.5 font-mono font-medium text-[rgba(17,17,17,0.56)]">{name}</span>
      {children}
    </span>
  );
}

export function D8({ step }: SceneContentProps) {
  const deleted = step >= 1;
  const createLit = step === 2 || step === 3;

  return (
    <Slide headline="Deleting an entity" under="Delete takes it out of queries. Its history stays on the DB-Chain." wash={0.82}>
      {/* Query, right now */}
      <div
        className={`${PANEL} absolute left-[96px] top-[330px] box-border flex h-[296px] w-[840px] flex-col gap-[14px] px-8 py-6 transition-[border-color] duration-[400ms]`}
        style={{ borderColor: step <= 1 ? "#FE7446" : undefined }}
      >
        <span className="text-[28px] font-semibold">Cafés, right now</span>
        <span
          className="absolute right-[32px] top-[26px] rounded-full border-2 px-[14px] py-1 font-mono text-[20px] font-semibold transition-colors duration-[400ms]"
          style={deleted ? { borderColor: "rgba(246,244,239,0.36)", color: "rgba(246,244,239,0.72)" } : { borderColor: "#FE7446", color: "#FE7446" }}
        >
          {deleted ? "0 entities" : "1 entity"}
        </span>
        <div className="whitespace-nowrap font-mono text-[23px] leading-[34px]">
          <Dim>.where(</Dim>eq(&quot;category&quot;, &quot;cafe&quot;)<Dim>)</Dim>
        </div>
        <div className="relative h-[96px]">
          <AnimatePresence initial={false} mode="wait">
            {deleted ? (
              <motion.div
                key="empty"
                className="absolute inset-0 box-border flex items-center gap-4 rounded-[14px] border-2 border-dashed border-[rgba(246,244,239,0.3)] px-6 text-[24px] text-[rgba(246,244,239,0.72)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(246,244,239,0.72)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Nothing. Chai Corner is gone from queries.
              </motion.div>
            ) : (
              <motion.div
                key="entity"
                className="absolute inset-0 box-border flex items-center gap-5 rounded-[14px] bg-[var(--arkiv-sand)] px-6 text-[var(--arkiv-ink)] shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <span className="whitespace-nowrap text-[30px] font-semibold">Chai Corner</span>
                <span className="whitespace-nowrap text-[22px] text-[rgba(17,17,17,0.64)]">cafe · 4.6</span>
                <span className="ml-auto whitespace-nowrap font-mono text-[18px] text-[rgba(17,17,17,0.56)]">$key 0x9c4e…d21b</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* The owner deletes it */}
      <StepPanel step={step} at={1} now={step === 1} className="left-[976px] top-[330px] h-[296px] w-[848px] gap-[14px] px-8 py-6">
        <span className="text-[28px] font-semibold">The owner deletes it</span>
        <div className="whitespace-nowrap font-mono text-[23px] leading-[34px]">
          <Dim>walletClient.</Dim>
          <Hot>deleteEntity</Hot>({"{"} entityKey {"}"})
        </div>
        <div className="mt-1.5 flex items-center gap-4">
          <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-[rgba(246,244,239,0.1)]">
            <ShopIcon />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-[24px] font-semibold leading-[1.15]">Chai Corner&apos;s owner signs</span>
            <span className="font-mono text-[18px] text-[rgba(246,244,239,0.72)]">
              0xb41c…9a20 · <Hot>$owner</Hot>
            </span>
          </div>
        </div>
        <span className="text-[22px]" style={{ color: SUB }}>
          One transaction. Only the $owner can delete it.
        </span>
      </StepPanel>

      {/* The DB-Chain, block after block */}
      <div className="absolute left-[96px] top-[660px] h-[88px] w-[1728px]">
        <div className="absolute inset-x-0 top-[44px] h-[2px] bg-[rgba(246,244,239,0.2)]" />
        <Block left={0} width={200} number="#1,204,309" />
        <Block left={220} width={520} number={CREATE_BLOCK} lit={createLit}>
          <span className="whitespace-nowrap rounded-[8px] bg-[var(--arkiv-blue)] px-3 py-1.5 text-[19px] font-semibold">+ create Chai Corner</span>
          <span className="whitespace-nowrap font-mono text-[17px] text-[rgba(246,244,239,0.6)]">tx {CREATE_TX}</span>
        </Block>
        <More left={762} />
        <Show on={deleted} className="absolute left-[860px] top-0 h-[88px] w-[520px]">
          <Block left={0} width={520} number={DELETE_BLOCK}>
            <span className="whitespace-nowrap rounded-[8px] border-[1.5px] px-3 py-1.5 text-[19px] font-semibold" style={{ borderColor: ALERT, background: "rgba(201,87,47,0.35)" }}>
              ✕ delete Chai Corner
            </span>
            <span className="whitespace-nowrap font-mono text-[17px] text-[rgba(246,244,239,0.6)]">signed by $owner</span>
          </Block>
        </Show>
        <More left={1402} />
        <Block left={1500} width={228} number="latest" />
      </div>

      <svg width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden className="pointer-events-none absolute left-0 top-0">
        <motion.path d="M480 748 V784" fill="none" stroke="#FE7446" strokeWidth="3" strokeLinecap="round" initial={false} animate={{ opacity: step >= 2 ? 1 : 0 }} transition={{ duration: 0.45 }} />
        <motion.path
          d="M720 748 C720 770 1140 760 1140 784"
          fill="none"
          stroke="#FE7446"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="8 8"
          initial={false}
          animate={{ opacity: step >= 3 ? 1 : 0 }}
          transition={{ duration: 0.45 }}
        />
      </svg>

      {/* The create transaction still has it */}
      <StepPanel step={step} at={2} now={step === 2} className="left-[96px] top-[784px] h-[190px] w-[840px] gap-2.5 px-8 py-5">
        <div className="whitespace-nowrap font-mono text-[22px] leading-[34px]">
          <Hot>eth_getTransactionByHash</Hot>
          <Dim>(</Dim>&quot;{CREATE_TX}&quot;<Dim>)</Dim>
        </div>
        <div className="grid whitespace-nowrap font-mono text-[21px] leading-[30px]" style={{ gridTemplateColumns: "96px minmax(0, 1fr)", columnGap: 16 }}>
          <span className="text-[rgba(246,244,239,0.5)]">block</span>
          <span>1204310</span>
          <span className="text-[rgba(246,244,239,0.5)]">to</span>
          <span>
            0x4400…0044 <span className="text-[rgba(246,244,239,0.5)]">· Arkiv&apos;s write address</span>
          </span>
          <span className="text-[rgba(246,244,239,0.5)]">input</span>
          <span>0x49650044…</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Value name="name">Chai Corner</Value>
          <Value name="category">cafe</Value>
          <Value name="rating">4.6</Value>
          <span className="text-[20px] font-semibold text-[var(--arkiv-orange)]">still in the input</span>
        </div>
      </StepPanel>

      {/* Or query an older block */}
      <StepPanel step={step} at={3} now={step === 3} className="left-[976px] top-[784px] h-[190px] w-[848px] gap-[14px] px-8 py-5">
        <span className="text-[26px] font-semibold">Or query an older block</span>
        <div className="whitespace-nowrap font-mono text-[22px] leading-[34px]">
          <Dim>.where(</Dim>eq(&quot;category&quot;, &quot;cafe&quot;)<Dim>)</Dim>
          <Hot>.atBlock(1204310n)</Hot>
        </div>
        <span className="inline-flex items-center gap-3 self-start rounded-full border-2 border-[var(--arkiv-orange)] px-[18px] py-1.5 text-[22px] font-semibold text-[var(--arkiv-orange)]">
          ✓ 1 entity · Chai Corner, as it was
        </span>
      </StepPanel>

      <Show on={step >= 4} className="absolute left-[96px] top-[990px] flex items-baseline gap-[18px]">
        <span className="text-[30px] font-semibold">Delete = gone from queries, not erased from history.</span>
        <span className="text-[26px]" style={{ color: SUB }}>
          Never put secrets on chain.
        </span>
      </Show>
    </Slide>
  );
}

export const D8_STEPS = 5;

export const D8_NOTES: string[] = [
  "Here is Chai Corner in a query for cafés. Its owner signs one deleteEntity transaction, and from that block on the query returns nothing: the entity is gone from queries and reads at the latest block.",
  "But the transaction that created it is still in its block. Ask any RPC for it with eth_getTransactionByHash, or read the whole block with eth_getBlockByNumber: its input still carries every attribute. Arkiv can also answer as of an older block: the same query with atBlock, or arkiv_query with an atBlock option, returns Chai Corner as it was. That needs a node that keeps old state; the public Tiramisu RPC does today.",
  "So delete means gone from queries, not erased from history. Never put secrets on chain, even ones you plan to delete: encrypt what must stay private.",
];
