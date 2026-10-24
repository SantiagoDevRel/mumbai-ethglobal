"use client";

// The stage frame shared by the slides and the live map. Contract owned by the orchestrator.
//
// Layers, bottom to top:
//   map      full viewport, always mounted (app chat)            z-0
//   scene    1920x1080 box scaled to fit: deck Slide / Overlay     z-10
//   hud      query panel, event log, filters, inspector (app chat) z-20, live scenes only
//   qr       the corner QR (app chat)                              z-30
//   controls the "?" keyboard overlay                              z-40

import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { KEY_HELP } from "../../lib/stage/keyboard";
import type { DeckRegistry } from "../../lib/stage/deck-contract";
import { useScene, useStage } from "../../lib/stage/store";

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Scale of the 1920x1080 box in the current viewport. */
export function useStageScale(): number {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      return () => window.removeEventListener("resize", onChange);
    },
    () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H),
    () => 1,
  );
}

/** A 1920x1080 box, centered and scaled to the viewport. Children use stage pixels. */
export function StageBox({ children, interactive = false }: { children: ReactNode; interactive?: boolean }) {
  const scale = useStageScale();
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        className={interactive ? "pointer-events-auto relative shrink-0" : "relative shrink-0"}
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        {children}
      </div>
    </div>
  );
}

export function StageFrame({
  deck,
  map,
  hud,
  qr,
}: {
  deck: DeckRegistry;
  map: ReactNode;
  hud?: ReactNode;
  qr?: ReactNode;
}) {
  const { scene, step } = useScene();
  const controls = useStage((s) => s.panels.controls);
  const entry = deck[scene.id];
  const Content = scene.kind === "slide" ? entry.Slide : entry.Overlay;
  const reduced = usePrefersReducedMotion();

  return (
    <div className="stage-root fixed inset-0 overflow-hidden bg-[var(--stage-bg)] text-[var(--stage-fg)]" data-scene={scene.id} data-kind={scene.kind}>
      <div className="absolute inset-0 z-0">{map}</div>

      <div className={scene.kind === "slide" ? "absolute inset-0 z-10" : "pointer-events-none absolute inset-0 z-10"}>
        {/* Crossfade: the outgoing slide keeps its wash until the next one is in, so the bright globe never flashes. */}
        <AnimatePresence initial={false}>
          {Content ? (
            <motion.div
              key={scene.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <StageBox>
                <Content scene={scene} step={step} />
              </StageBox>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Slides own the whole screen: the HUD shows only on live scenes. */}
      {hud && scene.kind === "live" ? <div className="pointer-events-none absolute inset-0 z-20">{hud}</div> : null}
      {qr ? <div className="pointer-events-none absolute inset-0 z-30">{qr}</div> : null}

      {controls ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl bg-[var(--panel-bg)] p-8 text-[var(--panel-fg)] shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold">Presenter controls</h2>
            <table className="text-base">
              <tbody>
                {KEY_HELP.map((k) => (
                  <tr key={k.keys}>
                    <td className="py-1 pr-6 font-mono">{k.keys}</td>
                    <td className="py-1">{k.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
