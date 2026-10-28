"use client";

// A4 · Superpowers: plugin + Playwright. Left, the one prompt that sets Playwright MCP up with its
// rules. Right, your app in a browser your agent controls. → steps: 0 the setup, 1 your agent clicks
// Save to Arkiv, 2 the test wallet asks to sign, 3 your agent signs, 4 the pin lands and verify_tx
// confirms it. The wallet address is an example; the scene is an illustration, not a recording.

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../../lib/stage/deck-contract";
import { EASE, PANEL, Rise, Slide, T } from "../../ui";

/** Cursor tip positions inside the browser panel. */
const AT_REST = { x: 700, y: 470 };
const AT_SAVE = { x: 138, y: 198 };
const AT_SIGN = { x: 939, y: 266 };

const RULES: ReactNode[] = [
  <>
    <b>Only</b> my test wallet <span className="font-mono text-[18px]">0x7a3f…c91e</span>. No other.
  </>,
  <>
    <b>Only</b> the Arkiv testnet. Reject other networks.
  </>,
  <>
    <b>Only</b> sign Arkiv entity writes on <span className="font-mono text-[18px]">localhost:3000</span>.
  </>,
  <>
    <b>Never</b> ask for or type a seed phrase or key.
  </>,
  <>
    Anything unexpected: <b>stop and ask me.</b>
  </>,
];

const FLOW: [title: string, tool: string][] = [
  ["Build", "Arkiv plugin"],
  ["Open your app", "Playwright"],
  ["Sign", "your test wallet"],
  ["Check it landed", "arkiv › verify_tx"],
];

function Ripple({ at }: { at: { x: number; y: number } }) {
  return (
    <motion.span
      aria-hidden
      className="absolute h-[60px] w-[60px] rounded-full border-[3px] border-[var(--arkiv-orange)]"
      style={{ left: at.x - 30, top: at.y - 30 }}
      initial={{ opacity: 1, scale: 0.4 }}
      animate={{ opacity: 0, scale: 1.6 }}
      transition={{ duration: 0.6, delay: 0.55, ease: "easeOut" }}
    />
  );
}

const Arrow = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(246,244,239,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export function A4({ step }: SceneContentProps) {
  const cursor = step === 1 || step === 2 ? AT_SAVE : step === 3 ? AT_SIGN : AT_REST;
  const popup = step === 2 || step === 3;
  const landed = step >= 4;
  const flowAt = step === 0 ? 0 : step === 1 ? 1 : step <= 3 ? 2 : 3;

  return (
    <Slide headline="Superpowers: plugin + Playwright" under="The plugin knows Arkiv. Playwright gives your agent a browser.">
      <Rise delay={0.2} className={`${PANEL} absolute left-[96px] top-[330px] flex h-[560px] w-[620px] flex-col gap-[18px] px-8 py-7`}>
        <span className="text-[18px] font-semibold tracking-[0.06em]" style={{ color: T.t56 }}>
          ONE PROMPT TO SET IT UP
        </span>
        <div className="flex flex-col gap-2.5 rounded-[20px_20px_4px_20px] bg-[var(--arkiv-sand)] px-6 py-[18px] text-[var(--arkiv-ink)]">
          <span className="text-[23px] font-medium leading-[1.35]">Install Playwright MCP so you can test my app in my browser. Rules:</span>
          <div className="flex flex-col gap-1.5">
            {RULES.map((rule, i) => (
              <span key={i} className="relative pl-[22px] text-[20px] leading-[1.35] [&_b]:font-bold">
                <span className="absolute left-[2px] top-[11px] h-[8px] w-[8px] rounded-[2px] bg-[var(--arkiv-orange)]" />
                {rule}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-auto flex items-start gap-3.5 rounded-[12px] border-2 border-[var(--arkiv-orange)] px-[18px] py-4">
          <svg className="mt-0.5 flex-none" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <span className="text-[22px] leading-[1.35]">
            <b className="font-semibold">A fresh test wallet with test GLM only.</b> Your agent clicks what you would click.
          </span>
        </div>
      </Rise>

      <Rise delay={0.3} className={`${PANEL} absolute left-[756px] top-[330px] h-[560px] w-[1068px] overflow-hidden`}>
        <div className="absolute left-0 right-0 top-0 flex h-[52px] items-center gap-2.5 border-b border-[rgba(246,244,239,0.12)] bg-[rgba(246,244,239,0.08)] px-5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[12px] w-[12px] rounded-full bg-[rgba(246,244,239,0.3)]" />
          ))}
          <span className="ml-4 rounded-[8px] bg-[rgba(0,0,0,0.35)] px-4 py-[5px] font-mono text-[16px] text-[rgba(246,244,239,0.8)]">localhost:3000</span>
          <span className="ml-auto inline-flex items-center gap-2 text-[15px] font-semibold" style={{ color: "rgba(246,244,239,0.72)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            Controlled by your agent
          </span>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- fixed screenshot behind the mock app */}
        <img src="/deck/data/d1-card-globe.png" alt="" aria-hidden className="absolute left-0 top-[52px] h-[508px] w-[1068px] object-cover opacity-85" draggable={false} />
        {[
          [470, 210],
          [640, 400],
          [390, 450],
        ].map(([x, y]) => (
          <span key={`${x}-${y}`} className="absolute h-[18px] w-[18px] rounded-full border-[3px] border-[var(--arkiv-sand)] bg-[var(--arkiv-orange)]" style={{ left: x, top: y }} />
        ))}
        <motion.span
          className="absolute left-[546px] top-[286px] h-[28px] w-[28px] rounded-full border-4 border-[var(--arkiv-sand)] bg-[var(--arkiv-orange)] shadow-[0_0_0_8px_rgba(254,116,70,0.35)]"
          initial={false}
          animate={{ scale: landed ? [0, 1.25, 1] : 0 }}
          transition={{ duration: 0.5, delay: landed ? 0.2 : 0, ease: EASE }}
        />

        <div className="absolute left-[32px] top-[84px] flex w-[340px] flex-col gap-1.5 rounded-[14px] border border-[rgba(246,244,239,0.16)] bg-[rgba(17,17,17,0.9)] px-[22px] py-5">
          <span className="text-[26px] font-semibold">Chai Corner</span>
          <span className="text-[18px]" style={{ color: "rgba(246,244,239,0.72)" }}>
            Café · open now · 4.6
          </span>
          <motion.span
            key={step === 1 ? "pressed" : "idle"}
            className="mt-3 self-start rounded-[10px] px-5 py-2.5 text-[20px] font-semibold text-[var(--arkiv-ink)]"
            initial={{ backgroundColor: "#FE7446" }}
            animate={{ backgroundColor: step === 1 ? ["#FE7446", "#C9572F", "#FE7446"] : "#FE7446" }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            Save to Arkiv
          </motion.span>
        </div>

        <AnimatePresence>
          {popup ? (
            <motion.div
              key="wallet"
              className="absolute left-[684px] top-[72px] flex w-[360px] flex-col gap-2.5 rounded-[16px] bg-[var(--arkiv-sand)] px-[22px] py-5 text-[var(--arkiv-ink)] shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <span className="text-[15px] font-bold tracking-[0.06em] text-[rgba(17,17,17,0.56)]">TEST WALLET</span>
              <span className="text-[26px] font-semibold">Sign transaction</span>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-[17px]">
                {[
                  ["Network", "Arkiv testnet"],
                  ["Action", "Create entity"],
                  ["Fee", "Test GLM"],
                ].map(([k, v]) => (
                  <span key={k} className="contents">
                    <span className="text-[rgba(17,17,17,0.56)]">{k}</span>
                    <span>{v}</span>
                  </span>
                ))}
              </div>
              <div className="flex gap-2.5 pt-2">
                <span className="flex-1 rounded-[10px] border-[1.5px] border-[rgba(17,17,17,0.24)] py-2.5 text-center text-[19px] font-semibold">Reject</span>
                <motion.span
                  className="flex-1 rounded-[10px] py-2.5 text-center text-[19px] font-semibold text-[var(--arkiv-sand)]"
                  initial={false}
                  animate={
                    step === 3
                      ? { backgroundColor: "#2A31D6", boxShadow: "0 0 0 4px rgba(254,116,70,0.6)" }
                      : { backgroundColor: "#181EA9", boxShadow: "0 0 0 0 rgba(254,116,70,0)" }
                  }
                  transition={{ duration: 0.25, delay: step === 3 ? 0.55 : 0 }}
                >
                  Sign
                </motion.span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          className="absolute bottom-[28px] left-[32px] flex items-center gap-3.5 rounded-full border-[1.5px] border-[rgba(246,244,239,0.2)] bg-[rgba(17,17,17,0.92)] px-5 py-3"
          initial={false}
          animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 12 }}
          transition={{ duration: 0.45, delay: landed ? 0.5 : 0, ease: EASE }}
        >
          <span className="rounded-full bg-[var(--arkiv-blue)] px-3 py-1 font-mono text-[19px] font-semibold">arkiv › verify_tx</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FE7446" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="text-[21px] font-semibold">Entity created</span>
        </motion.div>

        {step === 1 ? <Ripple key="save" at={AT_SAVE} /> : null}
        {step === 3 ? <Ripple key="sign" at={AT_SIGN} /> : null}
        <motion.div
          aria-hidden
          className="absolute left-0 top-0 z-[5]"
          initial={false}
          animate={{ x: cursor.x, y: cursor.y }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="#F6F4EF" stroke="#111111" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
          </svg>
          <span className="absolute left-[30px] top-[26px] whitespace-nowrap rounded-[6px] bg-[var(--arkiv-orange)] px-2.5 py-[3px] text-[15px] font-bold text-[var(--arkiv-ink)]">Your agent</span>
        </motion.div>
      </Rise>

      <Rise
        delay={0.4}
        className={`${PANEL} absolute left-[96px] top-[914px] flex h-[96px] w-[1728px] items-center justify-between gap-6 !border-[var(--arkiv-orange)] px-9`}
      >
        {FLOW.map(([title, tool], i) => (
          <div key={title} className="contents">
            {i > 0 ? <Arrow /> : null}
            <motion.div className="flex items-center gap-4" initial={false} animate={{ opacity: i <= flowAt ? 1 : 0.45 }} transition={{ duration: 0.3 }}>
              <span className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full border-2 border-[var(--arkiv-orange)] text-[22px] font-semibold text-[var(--arkiv-orange)]">
                {i + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-[26px] font-semibold leading-[1.15]">{title}</span>
                <span className="font-mono text-[16px]" style={{ color: "rgba(246,244,239,0.6)" }}>
                  {tool}
                </span>
              </div>
            </motion.div>
          </div>
        ))}
      </Rise>
    </Slide>
  );
}

export const A4_NOTES: string[] = [
  "Superpowers: put the plugin together with Playwright. The plugin knows Arkiv; Playwright gives your agent a browser. One prompt sets it up, and the prompt carries the rules: only this test wallet, only the testnet, only your app on localhost:3000, never a seed phrase or key, and stop and ask when anything is unexpected. The address here is an example.",
  "Then your agent opens your app, clicks Save to Arkiv, your test wallet asks to sign, your agent signs, and verify_tx checks that the entity really landed. Use a fresh test wallet with test funds only.",
  "If someone asks for the manual setup: claude mcp add playwright npx @playwright/mcp@latest.",
];
