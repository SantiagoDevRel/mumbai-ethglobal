"use client";

// /talk: the public copy of the slides, for the room to follow on their own screens (Santiago,
// November 1). No password and nothing live: it doesn't follow /map, logs nobody in, shows no QR and
// reads nothing from the writer or the DB-Chain (app/talk/scenes.ts lists what it shows). The page is
// static, so a room full of viewers costs the writer nothing. ← and → (or a swipe) step through the
// reveals and the slides; the address keeps the slide (/talk#W4).

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "../../components/stage/app-stage.css";
import { useDeckPreload } from "../deck/preload";
import { lastStep, StagePreview, stepThrough, type StageAt } from "../deck/StagePicture";
import { PublicCopy } from "../deck/ui";
import { TALK_SCENES } from "./scenes";

const FIRST: StageAt = { index: 0, step: 0 };
const LAST: StageAt = { index: TALK_SCENES.length - 1, step: lastStep(TALK_SCENES.at(-1)!) };
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]";

/** The slide a #hash names, at its first reveal. */
function fromHash(): StageAt | null {
  const index = TALK_SCENES.findIndex((scene) => scene.id === decodeURIComponent(location.hash.slice(1)));
  return index < 0 ? null : { index, step: 0 };
}

export default function TalkPage() {
  useDeckPreload();
  const [at, setAt] = useState<StageAt>(FIRST);
  const scene = TALK_SCENES[at.index]!;
  const forward = stepThrough(TALK_SCENES, at, 1);
  const back = stepThrough(TALK_SCENES, at, -1);
  const move = (next: StageAt | null) => { if (next) setAt(next); };

  useEffect(() => {
    const land = () => { const named = fromHash(); if (named) setAt((now) => (now.index === named.index ? now : named)); };
    land();
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, []);
  useEffect(() => {
    if (location.hash.slice(1) !== scene.id) history.replaceState(null, "", `#${scene.id}`);
  }, [scene.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      // Space on a focused link or button presses it.
      if (event.key === " " && target?.closest("a, button")) return;
      const next = ["ArrowRight", "PageDown", " "].includes(event.key) ? 1 : ["ArrowLeft", "PageUp"].includes(event.key) ? -1 : 0;
      const jump = event.key === "Home" ? FIRST : event.key === "End" ? LAST : null;
      if (!next && !jump) return;
      event.preventDefault();
      setAt((now) => jump ?? stepThrough(TALK_SCENES, now, next as 1 | -1) ?? now);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A horizontal swipe steps like ← and →; a tap still opens a link and a pinch still zooms.
  const swipe = useRef<{ x: number; y: number } | null>(null);

  return (
    <PublicCopy.Provider value>
      <div className="flex h-dvh flex-col bg-[#05061a] text-[var(--arkiv-sand)]">
        <header className="flex items-center justify-between gap-4 px-4 pb-2 pt-4 sm:px-8">
          <Image src="/brand/arkiv-white.svg" alt="Arkiv" width={88} height={20} priority />
          <h1 className="min-w-0 truncate text-right text-[14px] font-semibold text-[var(--t-64)] sm:text-[15px]">From zero to hero with Arkiv · ETHGlobal Mumbai</h1>
        </header>
        <main
          className="flex min-h-0 flex-1 items-center justify-center px-2 py-2 sm:px-8"
          onTouchStart={(event) => { const touch = event.touches[0]; swipe.current = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null; }}
          onTouchEnd={(event) => {
            const start = swipe.current;
            const touch = event.changedTouches[0];
            swipe.current = null;
            // A pinch-zoomed page pans instead: no swipe then.
            if (!start || !touch || (window.visualViewport?.scale ?? 1) > 1.01) return;
            const dx = touch.clientX - start.x;
            if (Math.abs(dx) >= 48 && Math.abs(dx) > 1.5 * Math.abs(touch.clientY - start.y)) move(dx < 0 ? forward : back);
          }}
        >
          {/* As wide as the window allows while the whole 16:9 slide stays on screen. */}
          <div className="w-full max-w-[calc((100dvh-152px)*16/9)] overflow-hidden rounded-[14px] ring-1 ring-[var(--t-14)]">
            <StagePreview key={scene.id} scene={scene} step={at.step} interactive />
          </div>
        </main>
        <footer className="flex items-center justify-between gap-3 px-4 pb-4 pt-2 sm:px-8">
          <StepButton label="Back" disabled={!back} onClick={() => move(back)}><ChevronLeft size={20} aria-hidden /></StepButton>
          <div className="flex min-w-0 flex-col items-center gap-2">
            <p className="flex min-w-0 max-w-full items-baseline gap-3" aria-live="polite">
              <span className="shrink-0 font-mono text-[14px] font-semibold text-[var(--t-56)]">{at.index + 1} / {TALK_SCENES.length}</span>
              <span className="truncate text-[15px] font-semibold sm:text-[17px]">{scene.title}</span>
            </p>
            {scene.steps > 1 ? (
              <div className="flex gap-2" role="group" aria-label="Reveals">
                {Array.from({ length: scene.steps }, (_, step) => (
                  <button
                    key={step}
                    type="button"
                    aria-label={`Reveal ${step + 1} of ${scene.steps}`}
                    aria-pressed={step === at.step}
                    onClick={() => setAt({ index: at.index, step })}
                    className={`h-3 w-3 rounded-full ${FOCUS}`}
                    style={{ background: step <= at.step ? "var(--arkiv-orange)" : "var(--t-28)" }}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <StepButton label="Next" disabled={!forward} onClick={() => move(forward)} after><ChevronRight size={20} aria-hidden /></StepButton>
        </footer>
      </div>
    </PublicCopy.Provider>
  );
}

function StepButton({ label, disabled, onClick, after = false, children }: { label: string; disabled: boolean; onClick: () => void; after?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-[var(--t-28)] px-3 text-[15px] font-semibold text-[var(--t-84)] hover:text-[var(--arkiv-sand)] disabled:opacity-30 sm:px-4 ${FOCUS}`}
    >
      {after ? null : children}
      <span className="hidden sm:inline">{label}</span>
      {after ? children : null}
    </button>
  );
}
