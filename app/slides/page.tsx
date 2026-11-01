"use client";

// /slides: the public copy of the slides, for the room to follow on their own screens (Santiago,
// November 1; it was /talk, which now redirects here). No password and nothing live: it doesn't
// follow /workshop, logs nobody in, shows no QR and reads nothing from the writer or the DB-Chain
// (app/slides/scenes.ts lists what it shows). The page is static, so a room full of viewers costs the
// writer nothing. Each slide shows complete, with no reveals and no animation; ← and → (or a swipe)
// go one slide at a time, the footer shows only the slide's number, and the address keeps the slide
// (/slides#W4).

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MotionGlobalConfig } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "../../components/stage/app-stage.css";
import { useDeckPreload } from "../deck/preload";
import { StagePreview } from "../deck/StagePicture";
import { PublicCopy } from "../deck/ui";
import { FRAMES } from "./scenes";

// Every motion on this page lands at once: slides appear complete. Only this page's bundle sets it.
MotionGlobalConfig.skipAnimations = true;

const LAST = FRAMES.length - 1;
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]";

/** The frame a #hash names. */
function fromHash(): number | null {
  const index = FRAMES.findIndex((frame) => frame.id === decodeURIComponent(location.hash.slice(1)));
  return index < 0 ? null : index;
}

export default function SlidesPage() {
  useDeckPreload();
  const [index, setIndex] = useState(0);
  const frame = FRAMES[index]!;
  const move = (by: 1 | -1) => setIndex((now) => Math.min(LAST, Math.max(0, now + by)));

  useEffect(() => {
    const land = () => { const named = fromHash(); if (named !== null) setIndex(named); };
    land();
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, []);
  useEffect(() => {
    if (location.hash.slice(1) !== frame.id) history.replaceState(null, "", `#${frame.id}`);
  }, [frame.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      // Space on a focused link or button presses it.
      if (event.key === " " && target?.closest("a, button")) return;
      const by = ["ArrowRight", "PageDown", " "].includes(event.key) ? 1 : ["ArrowLeft", "PageUp"].includes(event.key) ? -1 : 0;
      const jump = event.key === "Home" ? 0 : event.key === "End" ? LAST : null;
      if (!by && jump === null) return;
      event.preventDefault();
      if (jump !== null) setIndex(jump);
      else move(by as 1 | -1);
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
            if (Math.abs(dx) >= 48 && Math.abs(dx) > 1.5 * Math.abs(touch.clientY - start.y)) move(dx < 0 ? 1 : -1);
          }}
        >
          {/* As wide as the window allows while the whole 16:9 slide stays on screen. */}
          <div className="w-full max-w-[calc((100dvh-136px)*16/9)] overflow-hidden rounded-[14px] ring-1 ring-[var(--t-14)]">
            <StagePreview key={frame.id} scene={frame.scene} step={frame.step} interactive />
          </div>
        </main>
        <footer className="flex items-center justify-between gap-3 px-4 pb-4 pt-2 sm:px-8">
          <StepButton label="Back" disabled={index === 0} onClick={() => move(-1)}><ChevronLeft size={20} aria-hidden /></StepButton>
          {/* Only the slide's number: never its name (Santiago, November 1). */}
          <p className="font-mono text-[14px] font-semibold text-[var(--t-64)]" aria-live="polite" aria-label={`Slide ${index + 1} of ${FRAMES.length}`}>
            {index + 1} / {FRAMES.length}
          </p>
          <StepButton label="Next" disabled={index === LAST} onClick={() => move(1)} after><ChevronRight size={20} aria-hidden /></StepButton>
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
