"use client";

// Overlays for the live scenes L1 and L3 (L9, the close, is the finale: ./finale/Finale.tsx). The
// map, counter, QR card, event log, filters, entity card and the query panel (with its app-side row)
// belong to the app. October 29 (Santiago): L1 and L3 have no caption and the map keeps the stage; the
// Own it (L6) and Expire it (L2) scenes are gone, and transfer and extension stay in the entity card.
// October 30 (Santiago): the Write it and Query it slides became two buttons on L1's map, under the
// counter, so the presenter shows the code without leaving the map. Each opens its code in a popup on
// the left (x 32-692, from y 280), which leaves India (from about x 708 on L1's globe), Europe above
// it, the event log, the QR card and the entity card's column in view. One popup at a time: the other
// button swaps it. × or Esc closes it, and → goes on to L3. Only /map draws L1's overlay: /slides and
// /outline show its card (./LiveCard.tsx), so the popups never open there.

import { AnimatePresence, motion } from "motion/react";
import { PencilLine, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { stage } from "../../../lib/stage/store";
import { FOCUS, GLASS, OverlayShell, PANEL_EASE, T } from "../ui";
import { QUERY_IT, QueryCode } from "./QueryCode";
import { WRITE_IT, WriteCode } from "./WriteCode";

const CODES = [
  { id: "write", label: "Write it", Icon: PencilLine, ...WRITE_IT },
  { id: "query", label: "Query it", Icon: Search, ...QUERY_IT },
] as const;

type CodeId = (typeof CODES)[number]["id"];

/** Typing in a field keeps its Esc, as the presenter keys skip fields (lib/stage/keyboard.ts). */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

/** Write it, live: no caption. The room's dots, the counter and the corner QR say it; two buttons
 * under the counter open the code behind it. */
export function L1(_props: SceneContentProps) {
  return (
    <OverlayShell>
      <CodePopups />
    </OverlayShell>
  );
}

function CodePopups() {
  const [open, setOpen] = useState<CodeId | null>(null);
  useEffect(() => {
    if (!open) return;
    // In the capture phase, before the presenter keys: with the "?" card open, Esc closes the card first.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || stage.getState().panels.controls || isTyping(event.target)) return;
      setOpen(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  const shown = CODES.find((code) => code.id === open);
  return (
    <>
      <div role="group" aria-label="Show the code" className="pointer-events-auto absolute left-[32px] top-[192px] grid w-[288px] grid-cols-2 gap-2">
        {CODES.map(({ id, label, Icon }) => {
          const on = open === id;
          return (
            <button
              key={id}
              type="button"
              aria-expanded={on}
              aria-controls={on ? "l1-code-popup" : undefined}
              onClick={() => setOpen(on ? null : id)}
              className={`flex h-12 items-center justify-center gap-2 rounded-[12px] border-[1.5px] text-[20px] font-semibold transition-colors ${
                on
                  ? "border-[var(--arkiv-sand)] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)]"
                  : "border-[rgba(246,244,239,0.28)] bg-[rgba(17,17,17,0.78)] text-[var(--arkiv-sand)] backdrop-blur-[16px] hover:border-[rgba(246,244,239,0.56)]"
              } ${FOCUS}`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {shown ? (
          <motion.section
            key={shown.id}
            id="l1-code-popup"
            role="dialog"
            aria-labelledby="l1-code-title"
            className={`${GLASS} pointer-events-auto absolute left-[32px] top-[280px] w-[660px] cursor-auto px-4 pb-4 pt-3`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: PANEL_EASE } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.16, ease: PANEL_EASE } }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="l1-code-title" className="text-[28px] font-semibold leading-[1.2]">
                  {shown.title}
                </h2>
                <p className="mt-1 text-[20px] leading-[1.35]" style={{ color: T.t64 }}>
                  {shown.under}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close the code"
                title="Close (Esc)"
                onClick={() => setOpen(null)}
                className={`flex size-10 shrink-0 items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(246,244,239,0.08)] ${FOCUS}`}
              >
                <X size={26} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4">{shown.id === "write" ? <WriteCode /> : <QueryCode />}</div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Query it, live: no caption. The presenter filters by hand and the query panel shows the query. */
export function L3(_props: SceneContentProps) {
  return null;
}
