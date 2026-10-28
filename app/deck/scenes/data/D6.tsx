"use client";

// D6 · Private attributes. A table where everyone reads every value; → flags the phone number
// stored as text; → your app encrypts it with your key and Arkiv stores bytes; → with the key you
// get the number back, without it only bytes; → encrypted bytes can't be filtered, and the tool.
// Steps: 0 table · 1 the phone is public · 2 encrypt · 3 decrypt or not · 4 closing line.

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Slide } from "../../ui";
import { ALERT, CARD_SHADOW, Show } from "./kit";

const COLS = "320px 200px 620px minmax(0, 1fr)";

/** Two layers in one cell: `a` until `flip`, then `b`. */
function Swap({ flip, a, b }: { flip: boolean; a: ReactNode; b: ReactNode }) {
  return (
    <div className="relative h-[48px]">
      <motion.div className="absolute left-0 top-1/2 -translate-y-1/2" initial={false} animate={{ opacity: flip ? 0 : 1 }} transition={{ duration: 0.4 }}>
        {a}
      </motion.div>
      <motion.div className="absolute left-0 top-1/2 -translate-y-1/2" initial={false} animate={{ opacity: flip ? 1 : 0 }} transition={{ duration: 0.4 }}>
        {b}
      </motion.div>
    </div>
  );
}

function TypeTag({ children }: { children: ReactNode }) {
  return <span className="justify-self-start rounded-[8px] border-2 border-[var(--arkiv-blue)] px-3 py-[3px] font-mono text-[22px] font-semibold text-[var(--arkiv-blue)]">{children}</span>;
}

function Lock({ color, size = 30 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function KeyIcon({ color, size, cross }: { color: string; size: number; cross?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
      {cross ? <path d="M3 3 21 21" stroke={ALERT} /> : null}
    </svg>
  );
}

function Eye({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Box({ label, labelColor, accent, children, sub }: { label: string; labelColor?: string; accent?: boolean; children: ReactNode; sub?: string }) {
  return (
    <div className={`${PANEL} box-border flex h-full w-full flex-col justify-center gap-2 px-6 py-[18px]`} style={accent ? { borderColor: "#FE7446" } : undefined}>
      <span className="text-[17px] font-bold tracking-[0.08em]" style={{ color: labelColor ?? "rgba(246,244,239,0.6)" }}>
        {label}
      </span>
      {children}
      {sub ? <span className="text-[20px] leading-[1.3] text-[rgba(246,244,239,0.72)]">{sub}</span> : null}
    </div>
  );
}

function PublicRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="grid h-[80px] items-center border-b border-[rgba(17,17,17,0.08)] px-8" style={{ gridTemplateColumns: COLS }}>
      <span className="font-mono text-[30px] font-semibold">{name}</span>
      <TypeTag>str</TypeTag>
      <span className="whitespace-nowrap text-[34px] font-semibold">{value}</span>
      <span className="text-[24px] font-semibold">Everyone</span>
    </div>
  );
}

export function D6({ step }: SceneContentProps) {
  const encrypted = step >= 2;
  const rowBg = step === 1 ? "rgba(254,116,70,0.3)" : step >= 2 ? "rgba(24,30,169,0.12)" : "rgba(24,30,169,0)";
  return (
    <Slide headline="Private attributes" under="Anyone can read Arkiv. Encrypt what should stay private." wash={0.82}>
      <div className="absolute left-[96px] top-[330px] w-[1728px] overflow-hidden rounded-[20px] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)]" style={{ boxShadow: CARD_SHADOW }}>
        <div className="grid h-[52px] items-center border-b-2 border-[rgba(17,17,17,0.12)] px-8 font-mono text-[20px] text-[rgba(17,17,17,0.56)]" style={{ gridTemplateColumns: COLS }}>
          <span>attribute</span>
          <span>type</span>
          <span>value</span>
          <span>who can read it</span>
        </div>
        <PublicRow name="name" value="Chai Corner" />
        <PublicRow name="category" value="cafe" />
        <motion.div className="grid h-[80px] items-center px-8" style={{ gridTemplateColumns: COLS }} initial={false} animate={{ backgroundColor: rowBg }} transition={{ duration: 0.4, ease: EASE }}>
          <span className="font-mono text-[30px] font-semibold">owner_phone</span>
          <Swap flip={encrypted} a={<TypeTag>str</TypeTag>} b={<TypeTag>bytes</TypeTag>} />
          <Swap
            flip={encrypted}
            a={<span className="whitespace-nowrap text-[34px] font-semibold">+91 98765 43210</span>}
            b={
              <span className="inline-flex items-center gap-[14px] whitespace-nowrap font-mono text-[30px] font-medium">
                <Lock color="#181EA9" />
                0x8f3a…e21b
              </span>
            }
          />
          <Swap
            flip={encrypted}
            a={
              <span className="flex items-center gap-2.5 whitespace-nowrap text-[24px] font-semibold" style={{ color: ALERT }}>
                <Eye color={ALERT} size={28} />
                Everyone
              </span>
            }
            b={
              <span className="flex items-center gap-2.5 whitespace-nowrap text-[24px] font-semibold text-[var(--arkiv-blue)]">
                <KeyIcon color="#181EA9" size={28} />
                Only who has the key
              </span>
            }
          />
        </motion.div>
      </div>

      <Show on={step === 1} className="absolute left-[96px] top-[690px] flex items-center gap-4">
        <Eye color="#FE7446" size={40} />
        <span className="text-[32px] font-semibold">Stored as plain text, anyone can read this phone number.</span>
      </Show>

      <svg width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden className="pointer-events-none absolute left-0 top-0">
        <motion.g fill="none" stroke="#FE7446" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ opacity: encrypted ? 1 : 0 }} transition={{ duration: 0.45, delay: encrypted ? 0.25 : 0 }}>
          <path d="M460 825 H470" />
          <path d="M462 817 L472 825 L462 833" />
          <path d="M592 825 H608" />
          <path d="M600 817 L610 825 L600 833" />
        </motion.g>
        <motion.g fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ opacity: step >= 3 ? 1 : 0 }} transition={{ duration: 0.45 }}>
          <path d="M1064 825 C1120 825 1120 745 1176 745" stroke="#FE7446" />
          <path d="M1064 825 C1120 825 1120 905 1176 905" stroke="rgba(246,244,239,0.4)" strokeDasharray="8 8" />
          <path d="M1264 745 H1282" stroke="#FE7446" />
          <path d="M1274 737 L1284 745 L1274 753" stroke="#FE7446" />
          <path d="M1264 905 H1282" stroke="rgba(246,244,239,0.4)" />
          <path d="M1274 897 L1284 905 L1274 913" stroke="rgba(246,244,239,0.4)" />
        </motion.g>
      </svg>

      <Show on={encrypted} className="absolute left-[96px] top-[760px] h-[130px] w-[360px]">
        <Box label="IN YOUR APP">
          <span className="whitespace-nowrap text-[32px] font-semibold">+91 98765 43210</span>
        </Box>
      </Show>
      <Show on={encrypted} delay={0.25} className="absolute left-[478px] top-[773px]">
        <span className="flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[var(--arkiv-orange)] shadow-[0_10px_28px_rgba(254,116,70,0.35)]">
          <KeyIcon color="#111111" size={52} />
        </span>
      </Show>
      <Show on={encrypted} delay={0.25} className="absolute left-[410px] top-[896px] w-[240px] text-center">
        <span className="whitespace-nowrap text-[20px] font-semibold">Encrypt with your key</span>
      </Show>
      <Show on={encrypted} delay={0.5} className="absolute left-[620px] top-[760px] h-[130px] w-[444px]">
        <Box label="ON ARKIV" accent sub="Anyone can read these bytes.">
          <span className="flex items-center gap-3 whitespace-nowrap font-mono text-[28px] font-medium">
            <Lock color="#FE7446" />
            0x8f3a…e21b
          </span>
        </Box>
      </Show>

      <Show on={step >= 3} delay={0.25} className="absolute left-[1184px] top-[705px]">
        <span className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-2 border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.14)]">
          <KeyIcon color="#FE7446" size={40} />
        </span>
      </Show>
      <Show on={step >= 3} delay={0.25} className="absolute left-[1290px] top-[690px] h-[110px] w-[534px]">
        <Box label="HAS THE KEY · DECRYPT" labelColor="#FE7446" accent>
          <span className="whitespace-nowrap text-[32px] font-semibold">+91 98765 43210</span>
        </Box>
      </Show>
      <Show on={step >= 3} delay={0.5} className="absolute left-[1184px] top-[865px]">
        <span className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-2 border-dashed border-[rgba(246,244,239,0.36)] bg-[rgba(246,244,239,0.06)]">
          <KeyIcon color="rgba(246,244,239,0.56)" size={40} cross />
        </span>
      </Show>
      <Show on={step >= 3} delay={0.5} className="absolute left-[1290px] top-[850px] h-[110px] w-[534px]">
        <Box label="NO KEY">
          <span className="flex items-center gap-3 whitespace-nowrap font-mono text-[28px] font-medium text-[rgba(246,244,239,0.72)]">
            0x8f3a…e21b <span className="font-sans text-[22px] font-medium text-[rgba(246,244,239,0.6)]">just bytes</span>
          </span>
        </Box>
      </Show>

      <Show on={step >= 4} className="absolute left-[96px] top-[976px] flex items-center gap-4">
        <span className="text-[24px] text-[rgba(246,244,239,0.84)]">Encrypted values are bytes, so you can&apos;t filter on them.</span>
        <span className="text-[24px] text-[rgba(246,244,239,0.6)]">Your agent knows how:</span>
        <span className="rounded-[8px] border-[1.5px] border-[var(--arkiv-orange)] px-[14px] py-1.5 font-mono text-[22px] font-semibold text-[var(--arkiv-orange)]">arkiv-encryption</span>
        <span className="text-[22px] text-[rgba(246,244,239,0.6)]">skill and npm package</span>
      </Show>
    </Slide>
  );
}

export const D6_STEPS = 5;

export const D6_NOTES: string[] = [
  "Anyone can read Arkiv, so think about what you store in plain text. Here the owner's phone number is a text attribute, and everyone can read it.",
  "Instead, your app encrypts it with your key before writing, and Arkiv stores bytes. Anyone can read those bytes, but with the key you get the number back; without it, you only get bytes.",
  "Encrypted values are bytes, so you can't filter on them. Your agent knows how to do this: there is an arkiv-encryption skill and npm package.",
];
