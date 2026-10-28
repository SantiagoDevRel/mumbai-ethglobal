"use client";

// L8 · Your turn: build it this weekend. Four cards: Docs, Hub, AI tools and Prizes. Every URL was
// checked with a live request. Prizes is expandable and stays empty until the prizes are final:
// never invent amounts or details. The right column belongs to the corner QR card. One card per →:
//   step 0 · headline, the mascot and Docs · step 1 · Hub · step 2 · AI tools · step 3 · Prizes
// Nothing moves on its own; Prizes opens only on a click.

import { BookOpen, Bot, ChevronDown, LayoutGrid, Trophy, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { Mascot } from "../Mascot";
import { EASE, Rise, Slide, T } from "../ui";

const LINKS: { title: string; line: string; url: string; icon: LucideIcon }[] = [
  { title: "Docs", line: "SDK, queries and every Arkiv concept", url: "docs.arkiv.network", icon: BookOpen },
  { title: "Hub", line: "Faucet, API keys and tools", url: "hub.arkiv.network", icon: LayoutGrid },
  { title: "AI tools", line: "Your agent already knows Arkiv", url: "hub.arkiv.network/ai-tools", icon: Bot },
];

/** Prize details, filled in once they are final. Empty: the card expands to an empty panel. */
const PRIZES: string[] = [];

const CARD = "flex gap-7 rounded-[20px] border border-[rgba(246,244,239,0.12)] bg-[rgba(17,17,17,0.78)] p-8 backdrop-blur-[16px]";

export function L8({ step }: SceneContentProps) {
  const [open, setOpen] = useState(false);
  return (
    <Slide headline="Your turn: build it this weekend">
      <div className="absolute left-[96px] top-[320px] grid w-[1300px] grid-cols-2 gap-6">
        {LINKS.map(({ title, line, url, icon: Icon }, i) => (
          <motion.div
            key={title}
            className={CARD}
            initial={{ opacity: 0, y: 24 }}
            animate={step >= i ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.55, ease: EASE }}
            aria-hidden={step < i}
          >
            <Icon size={60} strokeWidth={1.6} className="shrink-0 text-[var(--arkiv-orange)]" />
            <div>
              <p className="text-[44px] font-semibold leading-tight">{title}</p>
              <p className="mt-1 text-[26px]" style={{ color: T.t64 }}>
                {line}
              </p>
              <p className="mt-3 font-mono text-[28px] text-[var(--arkiv-orange)]">{url}</p>
            </div>
          </motion.div>
        ))}
        <motion.button
          type="button"
          className={`${CARD} items-center text-left`}
          aria-expanded={open}
          aria-hidden={step < LINKS.length}
          tabIndex={step < LINKS.length ? -1 : undefined}
          disabled={step < LINKS.length}
          onClick={() => setOpen((o) => !o)}
          initial={{ opacity: 0, y: 24 }}
          animate={step >= LINKS.length ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <Trophy size={60} strokeWidth={1.6} className="shrink-0 text-[var(--arkiv-orange)]" />
          <p className="flex-1 text-[44px] font-semibold leading-tight">Prizes</p>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown size={48} aria-hidden />
          </motion.span>
        </motion.button>
        <AnimatePresence>
          {open && step >= LINKS.length ? (
            <motion.div
              key="prizes"
              className="col-span-2 overflow-hidden rounded-[20px] border-[1.5px] border-dashed border-[rgba(246,244,239,0.4)] bg-[rgba(17,17,17,0.6)]"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 220, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <ul className="flex flex-col gap-3 p-8 text-[34px]">
                {PRIZES.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <Rise delay={0.05} className="absolute left-[1430px] top-[420px]">
        <Mascot pose="wave" height={560} />
      </Rise>
    </Slide>
  );
}
