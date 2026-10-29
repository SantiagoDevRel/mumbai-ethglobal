"use client";

// D6 · Encrypt what's private (outline v3 scene B4). A table where everyone reads every value, the
// owner's phone among them; → your app encrypts the value with your key before it writes, and the
// field keeps its name, owner_phone, with ciphertext as its value (base64 text in a string
// attribute: anyone can read the field, only the key holder can read the value); → with the key you
// get the number back, without it only ciphertext, and two links: the arkiv-encryption npm package
// and its Arkiv skill. Both encrypt an entity's payload, so the slide presents them as tools to
// encrypt private values and claims nothing about attributes. Each step lands whole.
// Steps: 0 every field is public · 1 encrypt before you write · 2 decrypt or not, and the two tools.
// Santiago, October 29: owner_phone keeps its name (no "payload" on the slide) and the step-0 line
// says all fields are public.

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, REVEAL_TIME, Slide } from "../../ui";
import { ALERT, CARD_SHADOW, Show } from "./kit";

const COLS = "320px 200px 620px minmax(0, 1fr)";

const PHONE = "+91 98765 43210";
/** The phone under AES-GCM (12-byte IV, 15 bytes of ciphertext, 16-byte tag) in base64: 60
 * characters in full, shortened here. */
const CIPHER = "kZ8rQm…Vf2w==";

/** Where each tool lives (checked October 29). */
const TOOLS: { kind: string; name: string; href: string }[] = [
  { kind: "npm package", name: "arkiv-encryption", href: "https://www.npmjs.com/package/arkiv-encryption" },
  { kind: "Arkiv skill", name: "arkiv-encryption", href: "https://github.com/Arkiv-Network/skills/tree/main/skills/arkiv-encryption" },
];

/** Two layers in one cell: `a` until `flip`, then `b`. */
function Swap({ flip, a, b }: { flip: boolean; a: ReactNode; b: ReactNode }) {
  return (
    <div className="relative h-[48px]">
      <motion.div className="absolute left-0 top-1/2 -translate-y-1/2" initial={false} animate={{ opacity: flip ? 0 : 1 }} transition={{ duration: REVEAL_TIME }}>
        {a}
      </motion.div>
      <motion.div className="absolute left-0 top-1/2 -translate-y-1/2" initial={false} animate={{ opacity: flip ? 1 : 0 }} transition={{ duration: REVEAL_TIME }}>
        {b}
      </motion.div>
    </div>
  );
}

function TypeTag({ children }: { children: ReactNode }) {
  return <span className="justify-self-start rounded-[8px] border-2 border-[var(--arkiv-blue)] px-3 py-[2px] font-mono text-[24px] font-semibold text-[var(--arkiv-blue)]">{children}</span>;
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

const LABEL = "text-[24px] font-bold leading-none tracking-[0.08em]";

function Box({ label, accent, children, sub }: { label: string; accent?: boolean; children: ReactNode; sub?: string }) {
  return (
    <div className={`${PANEL} box-border flex h-full w-full flex-col justify-center gap-2.5 px-6`} style={accent ? { borderColor: "#FE7446" } : undefined}>
      <span className={LABEL} style={{ color: "rgba(246,244,239,0.6)" }}>
        {label}
      </span>
      {children}
      {sub ? <span className="text-[24px] leading-[1.25] text-[rgba(246,244,239,0.72)]">{sub}</span> : null}
    </div>
  );
}

/** One result of step 2 on one line: who reads it, and what they see. */
function Branch({ label, labelColor, accent, children }: { label: string; labelColor: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className={`${PANEL} box-border flex h-full w-full items-center gap-6 px-6`} style={accent ? { borderColor: "#FE7446" } : undefined}>
      <span className={`${LABEL} whitespace-nowrap`} style={{ color: labelColor }}>
        {label}
      </span>
      {children}
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
  const encrypted = step >= 1;
  const read = step >= 2;
  const rowBg = encrypted ? "rgba(24,30,169,0.12)" : "rgba(254,116,70,0.3)";
  return (
    <Slide headline="Encrypt what's private" under="Encrypt a private value in your app, before you write it." wash={0.82}>
      <div className="absolute left-[96px] top-[330px] w-[1728px] overflow-hidden rounded-[20px] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)]" style={{ boxShadow: CARD_SHADOW }}>
        <div className="grid h-[56px] items-center border-b-2 border-[rgba(17,17,17,0.12)] px-8 font-mono text-[24px] text-[rgba(17,17,17,0.56)]" style={{ gridTemplateColumns: COLS }}>
          <span>field</span>
          <span>type</span>
          <span>value</span>
          <span>who reads it in plain text</span>
        </div>
        <PublicRow name="name" value="chai corner" />
        <PublicRow name="category" value="cafe" />
        <motion.div className="grid h-[80px] items-center px-8" style={{ gridTemplateColumns: COLS }} initial={false} animate={{ backgroundColor: rowBg }} transition={{ duration: REVEAL_TIME, ease: EASE }}>
          <span className="font-mono text-[30px] font-semibold">owner_phone</span>
          <TypeTag>str</TypeTag>
          <Swap
            flip={encrypted}
            a={<span className="whitespace-nowrap text-[34px] font-semibold">{PHONE}</span>}
            b={
              <span className="inline-flex items-center gap-[14px] whitespace-nowrap font-mono text-[30px] font-medium">
                <Lock color="#181EA9" />
                {CIPHER}
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
                Only the key holder
              </span>
            }
          />
        </motion.div>
      </div>

      <Show on={!encrypted} className="absolute left-[96px] top-[680px] flex items-center gap-4">
        <Eye color="#FE7446" size={44} />
        <span className="text-[36px] font-semibold">
          All fields in an entity are <span className="text-[var(--arkiv-orange)]">public</span>.
        </span>
      </Show>

      <svg width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden className="pointer-events-none absolute left-0 top-0">
        <motion.g fill="none" stroke="#FE7446" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ opacity: encrypted ? 1 : 0 }} transition={{ duration: REVEAL_TIME }}>
          <path d="M464 784 H486" />
          <path d="M478 776 L488 784 L478 792" />
          <path d="M598 784 H620" />
          <path d="M612 776 L622 784 L612 792" />
        </motion.g>
        <motion.g fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ opacity: read ? 1 : 0 }} transition={{ duration: REVEAL_TIME }}>
          <path d="M1098 784 C1124 784 1124 730 1150 730" stroke="#FE7446" />
          <path d="M1098 784 C1124 784 1124 838 1150 838" stroke="rgba(246,244,239,0.4)" strokeDasharray="8 8" />
          <path d="M1234 730 H1250" stroke="#FE7446" />
          <path d="M1242 722 L1252 730 L1242 738" stroke="#FE7446" />
          <path d="M1234 838 H1250" stroke="rgba(246,244,239,0.4)" />
          <path d="M1242 830 L1252 838 L1242 846" stroke="rgba(246,244,239,0.4)" />
        </motion.g>
      </svg>

      <Show on={encrypted} className="absolute left-[96px] top-[724px] h-[120px] w-[360px]">
        <Box label="IN YOUR APP">
          <span className="whitespace-nowrap text-[32px] font-semibold leading-none">{PHONE}</span>
        </Box>
      </Show>
      <Show on={encrypted} className="absolute left-[494px] top-[736px]">
        <span className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[var(--arkiv-orange)] shadow-[0_10px_28px_rgba(254,116,70,0.35)]">
          <KeyIcon color="#111111" size={48} />
        </span>
      </Show>
      <Show on={encrypted} className="absolute left-[462px] top-[846px] w-[160px] text-center">
        <span className="text-[24px] font-semibold">Encrypt</span>
      </Show>
      <Show on={encrypted} className="absolute left-[628px] top-[714px] h-[140px] w-[470px]">
        <Box label="ON ARKIV" accent sub="Anyone can read the ciphertext.">
          <span className="flex items-center gap-3 whitespace-nowrap font-mono text-[28px] font-medium leading-none">
            <Lock color="#FE7446" />
            {CIPHER}
          </span>
        </Box>
      </Show>

      <Show on={read} className="absolute left-[1150px] top-[690px]">
        <span className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-2 border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.14)]">
          <KeyIcon color="#FE7446" size={40} />
        </span>
      </Show>
      <Show on={read} className="absolute left-[1260px] top-[690px] h-[80px] w-[564px]">
        <Branch label="WITH THE KEY" labelColor="#FE7446" accent>
          <span className="whitespace-nowrap text-[30px] font-semibold">{PHONE}</span>
        </Branch>
      </Show>
      <Show on={read} className="absolute left-[1150px] top-[798px]">
        <span className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-2 border-dashed border-[rgba(246,244,239,0.36)] bg-[rgba(246,244,239,0.06)]">
          <KeyIcon color="rgba(246,244,239,0.56)" size={40} cross />
        </span>
      </Show>
      <Show on={read} className="absolute left-[1260px] top-[798px] h-[80px] w-[564px]">
        <Branch label="NO KEY" labelColor="rgba(246,244,239,0.6)">
          <span className="whitespace-nowrap font-mono text-[28px] font-medium text-[rgba(246,244,239,0.72)]">{CIPHER}</span>
        </Branch>
      </Show>

      <Show on={read} className="absolute left-[96px] top-[930px] flex items-center gap-5">
        <span className="text-[28px] font-semibold text-[rgba(246,244,239,0.84)]">Encrypt private values:</span>
        {TOOLS.map((tool) => (
          <a
            key={tool.href}
            href={tool.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[60px] items-center gap-3 rounded-full border-2 border-[var(--arkiv-orange)] bg-[rgba(17,17,17,0.78)] px-6 transition-colors duration-200 hover:bg-[rgba(254,116,70,0.18)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[var(--arkiv-orange)]"
          >
            <span className="text-[24px] font-semibold text-[rgba(246,244,239,0.84)]">{tool.kind}</span>
            <span className="font-mono text-[26px] font-semibold text-[var(--arkiv-orange)]">{tool.name}</span>
            <ArrowUpRight size={28} strokeWidth={2.4} className="text-[var(--arkiv-orange)]" aria-hidden />
          </a>
        ))}
      </Show>
    </Slide>
  );
}

export const D6_STEPS = 3;

export const D6_NOTES: string[] = [
  "Everything in an entity is public: every field, readable by anyone. That's what makes it queryable. So think about what you write in plain text: here, the owner's phone number, in owner_phone.",
  "So your app encrypts the value with your key, before it writes it. The field keeps its name, owner_phone; its value is now ciphertext. Anyone can read the field. Only the key holder can read the value.",
  "With the key you get the number back; without it, only ciphertext. To do it for real: the arkiv-encryption npm package, and the arkiv-encryption skill for your agent. They encrypt an entity's payload, its data body, with your key.",
];
