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
//   outline  the outline bar across the top (OutlineBar)            z-35
//   controls the "?" keyboard overlay                               z-40
// /slides: every slide scene's Slide, a card for live scenes, the S7 QR, the outline bar and the
// "?" overlay.
//
// Everything is drawn in stage pixels. /slides fits a 1920x1080 box to the window ("contain"). /map
// keeps the box 1920 wide and stretches it to the window's height ("fill"), so in half a 16:9
// screen the HUD reaches the top and bottom edges instead of floating in a letterbox.

import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { KEY_HELP } from "../../lib/stage/keyboard";
import type { DeckRegistry } from "../../lib/stage/deck-contract";
import { SCENES, type SceneDef } from "../../shared/scenes";
import { stage, useScene, useStage } from "../../lib/stage/store";
import { OutlineBar } from "./OutlineBar";

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

export function MapFrame({ map, overlay, hud, slide, qr, bar, writing }: { map: ReactNode; overlay?: ReactNode; hud?: ReactNode; slide?: ReactNode; qr?: ReactNode; bar?: ReactNode; writing?: ReactNode }) {
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
        <div className="pointer-events-none absolute inset-0 z-[35]"><StageBox><OutlineBar /></StageBox></div>
        {/* The map has no free corner for Reset, so it sits in the "?" presenter card. */}
        <ControlsOverlay extra={bar} />
        {writing}
        <StepDots />
        <Annotations />
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
      <div className="pointer-events-none absolute inset-0 z-[35]"><StageBox><OutlineBar /></StageBox></div>
      {bar}
      <ControlsOverlay />
      <StepDots />
      <Annotations />
    </div>
  );
}

/** Bottom right: one small dot per reveal step of this scene, filled up to the current one. */
function StepDots() {
  const { scene, step } = useScene();
  if (scene.steps < 2) return null;
  return <div className="step-dots" role="img" aria-label={`Step ${step + 1} of ${scene.steps}`}>
    {Array.from({ length: scene.steps }, (_, i) => <i key={i} data-on={i <= step} data-current={i === step} />)}
  </div>;
}

/** Drag to draw a rectangle that points at something: with the left mouse button on a slide, or
 * Alt + drag on the map (a plain drag turns the globe). The rectangles clear on the next step or scene. */
function Annotations() {
  const { scene, index, step } = useScene();
  const [boxes, setBoxes] = useState<{ x: number; y: number; w: number; h: number }[]>([]);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const kind = scene.kind;
  const [shown, setShown] = useState(`${index}:${step}`);
  if (shown !== `${index}:${step}`) { setShown(`${index}:${step}`); setBoxes([]); setDraft(null); }
  useEffect(() => {
    const rect = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      if (event.target.closest("button, a, input, select, textarea, label, summary, [role=dialog], .panel, .writing-switch")) return;
      if (kind !== "slide" && !event.altKey) return;
      // On the map, keep this drag away from the globe so it draws instead of turning it.
      if (kind !== "slide") event.stopPropagation();
      start.current = { x: event.clientX, y: event.clientY };
    };
    const hold = (event: MouseEvent) => { if (kind !== "slide" && event.altKey && event.button === 0) event.stopPropagation(); };
    const move = (event: PointerEvent) => {
      if (!start.current) return;
      const box = rect(start.current, { x: event.clientX, y: event.clientY });
      if (box.w > 6 || box.h > 6) { setDraft(box); event.preventDefault(); }
    };
    const up = (event: PointerEvent) => {
      if (!start.current) return;
      const box = rect(start.current, { x: event.clientX, y: event.clientY });
      start.current = null;
      setDraft(null);
      if (box.w > 6 && box.h > 6) setBoxes((old) => [...old, box]);
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("mousedown", hold, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("mousedown", hold, true); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [kind]);
  return <div className="annotations" aria-hidden="true" data-drawing={draft ? "true" : undefined}>
    {[...boxes, ...(draft ? [draft] : [])].map((box, i) => <span key={i} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />)}
  </div>;
}

/** The presenter card: a visible ? button (bottom left) or the ? key opens it; Esc, the backdrop or
 * Close shuts it. It jumps to any scene and holds Reset, so a lost presenter is never stuck. */
function ControlsOverlay({ extra }: { extra?: ReactNode }) {
  const controls = useStage((s) => s.panels.controls);
  const session = useStage((s) => s.session);
  const { index } = useScene();
  const close = () => stage.dispatch({ type: "togglePanel", panel: "controls", open: false });
  return (
    <>
      <button type="button" className="controls-button" aria-label="Presenter controls" title="Presenter controls (?)" aria-expanded={controls} onClick={() => stage.dispatch({ type: "togglePanel", panel: "controls" })}>?</button>
      {controls ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className="controls-card" role="dialog" aria-label="Presenter controls">
            <div className="controls-head">
              <h2>Presenter controls</h2>
              <button type="button" onClick={close}>Close <kbd>Esc</kbd></button>
            </div>
            <p className="controls-session">{session ? <>Session running · phones that scan now land on this map</> : <>No session yet: Reset starts one</>}</p>
            <div className="controls-columns">
              <section>
                <h3>Go to</h3>
                <ol className="controls-scenes">
                  {SCENES.map((scene, i) => (
                    <li key={scene.id}>
                      <button type="button" aria-current={i === index ? "step" : undefined} onClick={() => { stage.dispatch({ type: "goto", index: i }); close(); }}>
                        <span>{scene.id}</span>{scene.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h3>Keys</h3>
                <table>
                  <tbody>
                    {KEY_HELP.map((k) => (
                      <tr key={k.keys}>
                        <td>{k.keys}</td>
                        <td>{k.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {extra}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
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
