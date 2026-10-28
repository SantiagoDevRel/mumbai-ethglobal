"use client";

// The presenter screens. Contract owned by the orchestrator. /map is the whole talk on one screen,
// one thing at a time: the map in live scenes, the slide over it in slide scenes. /slides is the
// optional second window for a split screen.
//
// /map, layers bottom to top:
//   map      full viewport, always mounted                         z-0
//   overlay  live scenes' captions (deck Overlay)                   z-10
//   hud      query panel, event log, filters, inspector (live)      z-20
//   slide    slide scenes' Slide, over the map                      z-25
//   qr       the QR, where the scene places it                      z-30
//   controls the "?" keyboard overlay                               z-40
// /slides: every slide scene's Slide, a card for live scenes, the S7 QR and the "?" overlay.
//
// Everything is drawn in stage pixels. /slides fits a 1920x1080 box to the window ("contain"). /map
// keeps the box 1920 wide and stretches it to the window's height ("fill"), so in half a 16:9
// screen the HUD reaches the top and bottom edges instead of floating in a letterbox.

import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { KEY_HELP } from "../../lib/stage/keyboard";
import type { DeckRegistry } from "../../lib/stage/deck-contract";
import type { SceneDef } from "../../shared/scenes";
import { useScene, useStage } from "../../lib/stage/store";

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export type StageFit = "contain" | "fill";
const FitContext = createContext<StageFit>("contain");

/** Where the stage box sits in a viewport: its scale, size in stage pixels and top-left offset. */
export function stageGeometry(width: number, height: number, fit: StageFit) {
  const scale = Math.min(width / STAGE_W, height / STAGE_H);
  const boxW = STAGE_W;
  const boxH = fit === "fill" ? Math.max(STAGE_H, height / scale) : STAGE_H;
  return { scale, boxW, boxH, x: (width - boxW * scale) / 2, y: (height - boxH * scale) / 2 };
}

let viewport = { width: STAGE_W, height: STAGE_H };
const SERVER_VIEWPORT = viewport;
function useViewport() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      return () => window.removeEventListener("resize", onChange);
    },
    () => {
      if (viewport.width !== window.innerWidth || viewport.height !== window.innerHeight) viewport = { width: window.innerWidth, height: window.innerHeight };
      return viewport;
    },
    () => SERVER_VIEWPORT,
  );
}

/** Scale of the stage box in the current viewport (the same in both fits). */
export function useStageScale(): number {
  const { width, height } = useViewport();
  return stageGeometry(width, height, "contain").scale;
}

/** The stage box, centered and scaled to the viewport. Children use stage pixels. */
export function StageBox({ children, interactive = false }: { children: ReactNode; interactive?: boolean }) {
  const fit = useContext(FitContext);
  const { width, height } = useViewport();
  const box = stageGeometry(width, height, fit);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        className={interactive ? "pointer-events-auto relative shrink-0" : "relative shrink-0"}
        style={{ width: box.boxW, height: box.boxH, transform: `scale(${box.scale})`, transformOrigin: "center" }}
      >
        {children}
      </div>
    </div>
  );
}

const slideFade = (duration: number) => ({
  shown: { opacity: 1, zIndex: 26, transition: { duration, ease: [0.22, 1, 0.36, 1] as const } },
  hidden: (covered: boolean) => covered ? { opacity: 0, zIndex: 25, transition: { delay: duration, duration: 0 } } : { opacity: 0, zIndex: 25, transition: { duration, ease: [0.22, 1, 0.36, 1] as const } },
});

export function MapFrame({ map, overlay, hud, slide, qr, bar }: { map: ReactNode; overlay?: ReactNode; hud?: ReactNode; slide?: ReactNode; qr?: ReactNode; bar?: ReactNode }) {
  const { scene } = useScene();
  const reduced = usePrefersReducedMotion();
  return (
    <FitContext.Provider value="fill">
      <div className="stage-root fixed inset-0 overflow-hidden bg-[var(--stage-bg)] text-[var(--stage-fg)]" data-scene={scene.id} data-kind={scene.kind} data-screen="map">
        <div className="absolute inset-0 z-0">{map}</div>
        {overlay ? <div className="pointer-events-none absolute inset-0 z-10">{overlay}</div> : null}
        {hud ? <div className="pointer-events-none absolute inset-0 z-20">{hud}</div> : null}
        {/* Slides fit the screen like /slides does; while one shows, the map underneath takes no input. */}
        {/* Slide to slide, the new one fades in over the old one, which stays until it is covered, so
            the globe never shows through mid-way. Slide to map, the slide fades out. */}
        <AnimatePresence initial={false} custom={Boolean(slide)}>
          {slide ? (
            <motion.div key={scene.id} className="absolute inset-0" custom={Boolean(slide)} variants={slideFade(reduced ? 0 : 0.45)} initial="hidden" animate="shown" exit="hidden">
              <FitContext.Provider value="contain"><StageBox interactive>{slide}</StageBox></FitContext.Provider>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {qr ? <div className="pointer-events-none absolute inset-0 z-30">{qr}</div> : null}
        {/* The map has no free corner for Reset, so it sits in the "?" presenter card. */}
        <ControlsOverlay extra={bar} />
      </div>
    </FitContext.Provider>
  );
}

export function SlidesFrame({ deck, liveCard, qr, bar }: { deck: DeckRegistry; liveCard: (props: { scene: SceneDef; step: number }) => ReactNode; qr?: ReactNode; bar?: ReactNode }) {
  const { scene, step } = useScene();
  const reduced = usePrefersReducedMotion();
  const entry = deck[scene.id];
  // L9's closing lines belong on the slides; the other live scenes' captions stay on the map.
  const Content = scene.kind === "slide" ? entry.Slide : scene.id === "L9" ? entry.Overlay : null;
  return (
    <div className="stage-root fixed inset-0 overflow-hidden bg-[var(--stage-bg)] text-[var(--stage-fg)]" data-scene={scene.id} data-kind={scene.kind} data-screen="slides">
      <div className="absolute inset-0 z-10">
        <AnimatePresence initial={false}>
          <motion.div
            key={scene.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <StageBox interactive>{Content ? <Content scene={scene} step={step} /> : liveCard({ scene, step })}</StageBox>
          </motion.div>
        </AnimatePresence>
      </div>
      {qr ? <div className="pointer-events-none absolute inset-0 z-30">{qr}</div> : null}
      {bar}
      <ControlsOverlay />
    </div>
  );
}

function ControlsOverlay({ extra }: { extra?: ReactNode }) {
  const controls = useStage((s) => s.panels.controls);
  if (!controls) return null;
  return (
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
        {extra}
      </div>
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
