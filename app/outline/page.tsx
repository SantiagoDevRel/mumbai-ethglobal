"use client";

// /outline: the talk at a glance, for the presenter (Santiago, October 29: a few short points per
// scene, no script and no times). Each part folds open or shut, and all start shut. Each scene shows
// its slide, drawn by the deck itself at its last reveal, and its points (app/deck/points.ts); click
// the slide to zoom in and step through its reveals with ← and →. With /map or /slides open in this
// browser, the scene on screen is marked.

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, Globe, Maximize2, Presentation, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { QrCard } from "../../components/stage/JoinQR";
import { PresenterGate } from "../../components/stage/Presenter";
import { STAGE_H, STAGE_W } from "../../components/stage/StageFrame";
import { stage, useScene } from "../../lib/stage/store";
import { SCENES, SECTIONS, type SceneDef, type SceneId } from "../../shared/scenes";
import "../../components/stage/app-stage.css";
import { POINTS } from "../deck/points";
import { useDeckPreload } from "../deck/preload";
import { deck } from "../deck/registry";
import { LiveCard } from "../deck/scenes/LiveCard";

/** The opening (title, who I am, index) has no part of its own; the four parts are the outline bar's. */
const PARTS = [
  { id: "opening", number: null, title: "Opening", line: "The title, who I am and what we'll do.", scenes: SCENES.filter((scene) => !scene.section) },
  ...SECTIONS.map((section, i) => ({ ...section, number: i + 1, scenes: SCENES.filter((scene) => scene.section === section.id) })),
];
type Part = (typeof PARTS)[number];

const sceneNumber = (scene: SceneDef) => String(SCENES.indexOf(scene) + 1).padStart(2, "0");
const lastStep = (scene: SceneDef) => scene.steps - 1;

export default function OutlinePage() {
  return <PresenterGate><Outline /></PresenterGate>;
}

/** The scene /map or /slides shows now, once one of them has said so; null before that. */
function useSceneOnScreen(): SceneId | null {
  useEffect(() => stage.connect("follower"), []);
  const { scene } = useScene();
  const [heard, setHeard] = useState(false);
  useEffect(() => stage.subscribe(() => setHeard(stage.lastLeaderStateAt > 0)), []);
  return heard ? scene.id : null;
}

type Zoomed = { index: number; step: number };

function Outline() {
  const now = useSceneOnScreen();
  useDeckPreload();
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(PARTS.map((part) => [part.id, false])));
  const [zoom, setZoom] = useState<Zoomed | null>(null);
  const allOpen = PARTS.every((part) => open[part.id]);
  // A link to a scene or a part (/outline#scene-W2, #part-build) opens that part and lands on it,
  // once the outline is in (after the login) and once the part has unfolded (300 ms).
  useEffect(() => {
    let timer = 0;
    const land = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const part = PARTS.find((p) => id === `part-${p.id}` || p.scenes.some((scene) => id === `scene-${scene.id}`));
      if (!part) return;
      setOpen((state) => ({ ...state, [part.id]: true }));
      clearTimeout(timer);
      timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 320);
    };
    land();
    window.addEventListener("hashchange", land);
    return () => { clearTimeout(timer); window.removeEventListener("hashchange", land); };
  }, []);
  return (
    <div className="min-h-dvh bg-[radial-gradient(1100px_560px_at_78%_-12%,rgba(24,30,169,0.42),transparent_70%)]">
      <main className="mx-auto flex max-w-[1120px] flex-col gap-12 px-4 pb-24 pt-8 sm:px-8 sm:pt-10">
        <header className="flex flex-col gap-10">
          <div className="flex items-center justify-between gap-4">
            <Image src="/brand/arkiv-white.svg" alt="Arkiv" width={104} height={24} priority />
            <nav className="flex gap-2" aria-label="Presenter screens">
              {["/map", "/slides"].map((href) => (
                <Link key={href} href={href} className="rounded-full border border-[var(--t-28)] px-4 py-1.5 font-mono text-[14px] font-medium text-[var(--t-84)] transition-colors hover:border-[var(--t-56)] hover:text-[var(--arkiv-sand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]">
                  {href}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[14px] font-semibold tracking-[0.14em] text-[var(--arkiv-orange)]">[ OUTLINE ]</p>
              <h1 className="max-w-[600px] text-[40px] font-semibold leading-[1.04] tracking-[-0.02em] sm:text-[56px]">Arkiv, the Web3 database</h1>
              <p className="text-[18px] leading-[1.45] text-[var(--t-64)]">From zero to hero · ETHGlobal Mumbai workshop</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(Object.fromEntries(PARTS.map((part) => [part.id, !allOpen])))}
              className="flex items-center gap-2 rounded-full border border-[var(--t-28)] px-4 py-2 text-[15px] font-semibold text-[var(--t-84)] transition-colors hover:border-[var(--t-56)] hover:text-[var(--arkiv-sand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]"
            >
              {allOpen ? <ChevronsDownUp size={18} aria-hidden /> : <ChevronsUpDown size={18} aria-hidden />}
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <PartMap now={now} onPick={(id) => setOpen((state) => ({ ...state, [id]: true }))} />
        </header>
        {PARTS.map((part) => (
          <PartSection
            key={part.id}
            part={part}
            open={open[part.id] ?? false}
            onToggle={() => setOpen((state) => ({ ...state, [part.id]: !state[part.id] }))}
            now={now}
            onZoom={(scene) => setZoom({ index: SCENES.indexOf(scene), step: lastStep(scene) })}
          />
        ))}
      </main>
      {zoom ? <Zoom at={zoom} onMove={setZoom} onClose={() => setZoom(null)} /> : null}
    </div>
  );
}

/** The parts side by side, one tick per scene (like the stage's outline bar); a part jumps to its
 * section. Phones skip it: the sections below are already one column. */
function PartMap({ now, onPick }: { now: SceneId | null; onPick: (id: string) => void }) {
  return (
    <nav aria-label="Parts" className="hidden grid-cols-5 gap-3 sm:grid">
      {PARTS.map((part) => {
        const live = part.id === "build";
        return (
          <a
            key={part.id}
            href={`#part-${part.id}`}
            onClick={() => onPick(part.id)}
            className="group flex min-w-0 flex-col justify-between gap-3 rounded-[14px] border border-[var(--t-14)] bg-[rgba(17,17,17,0.5)] px-3.5 py-3 transition-colors hover:border-[var(--t-42)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]"
          >
            <span className="flex items-baseline gap-2">
              <span className={`font-mono text-[13px] font-semibold ${live ? "text-[var(--arkiv-orange)]" : "text-[var(--t-56)]"}`}>{part.number ?? "0"}</span>
              <span className="text-[15px] font-semibold leading-[1.25] text-[var(--t-84)] group-hover:text-[var(--arkiv-sand)]">{part.title}</span>
            </span>
            <span className="flex gap-1" aria-hidden>
              {part.scenes.map((scene) => (
                <span
                  key={scene.id}
                  className="h-[6px] flex-1 rounded-full"
                  style={{ background: scene.id === now ? "var(--arkiv-sand)" : live ? "rgba(254,116,70,0.75)" : "var(--t-28)", boxShadow: scene.id === now ? "0 0 0 3px rgba(254,116,70,0.55)" : undefined }}
                />
              ))}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

function PartSection({ part, open, onToggle, now, onZoom }: { part: Part; open: boolean; onToggle: () => void; now: SceneId | null; onZoom: (scene: SceneDef) => void }) {
  const live = part.id === "build";
  return (
    <section id={`part-${part.id}`} aria-labelledby={`part-${part.id}-title`} className="scroll-mt-6">
      {/* The whole header row folds the part: the button's hit area stretches over it (after:inset-0),
          while the heading's name stays the part's title. */}
      <div className="group relative flex items-center gap-4 border-b border-[var(--t-14)] pb-5 sm:gap-5">
        <span
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border-2 font-mono text-[18px] font-semibold"
          style={live ? { borderColor: "var(--arkiv-orange)", color: "var(--arkiv-orange)", background: "rgba(254,116,70,0.12)" } : { borderColor: "var(--t-28)", color: "var(--t-84)" }}
          aria-hidden
        >
          {part.number ?? "0"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={`part-${part.id}-title`} className="text-[26px] font-semibold leading-[1.15] sm:text-[30px]">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`part-${part.id}-scenes`}
              onClick={onToggle}
              className="flex items-center gap-3 text-left after:absolute after:inset-0 after:rounded-[12px] after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-[var(--arkiv-orange)]"
            >
              {part.title}
              {live ? <Smartphone size={22} strokeWidth={2} className="text-[var(--arkiv-orange)]" aria-hidden /> : null}
            </button>
          </h2>
          <p className="text-[16px] leading-[1.45] text-[var(--t-64)]">{part.line}</p>
        </div>
        <span className="hidden font-mono text-[14px] text-[var(--t-56)] sm:inline">{part.scenes.length} {part.scenes.length === 1 ? "scene" : "scenes"}</span>
        <ChevronDown size={24} aria-hidden className={`shrink-0 text-[var(--t-64)] transition-transform duration-300 group-hover:text-[var(--arkiv-sand)] ${open ? "rotate-180" : ""}`} />
      </div>
      {/* Folds by animating the row to 0fr; a folded part leaves the tab order (inert). */}
      <div id={`part-${part.id}-scenes`} inert={!open} className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="min-h-0 overflow-hidden">
          <ol className="flex flex-col gap-4 pt-5">
            {part.scenes.map((scene) => <SceneCard key={scene.id} scene={scene} now={scene.id === now} onZoom={() => onZoom(scene)} />)}
          </ol>
        </div>
      </div>
    </section>
  );
}

function KindChip({ scene }: { scene: SceneDef }) {
  const map = scene.kind === "live";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-semibold"
      style={map ? { borderColor: "rgba(254,116,70,0.6)", color: "var(--arkiv-orange)" } : { borderColor: "var(--t-28)", color: "var(--t-84)" }}
    >
      {map ? <Globe size={14} aria-hidden /> : <Presentation size={14} aria-hidden />}
      {map ? "On the map" : "Slide"}
    </span>
  );
}

function SceneCard({ scene, now, onZoom }: { scene: SceneDef; now: boolean; onZoom: () => void }) {
  return (
    <li id={`scene-${scene.id}`} aria-current={now ? "step" : undefined} className="scroll-mt-6">
      <article
        className="grid gap-4 rounded-[20px] border p-3 transition-colors sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)] sm:gap-6 sm:p-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-8"
        style={now ? { borderColor: "var(--arkiv-orange)", background: "rgba(254,116,70,0.08)" } : { borderColor: "var(--t-14)", background: "rgba(17,17,17,0.55)" }}
      >
        <button
          type="button"
          onClick={onZoom}
          aria-label={`Zoom into ${scene.title}`}
          className="group relative block overflow-hidden rounded-[12px] ring-1 ring-[var(--t-14)] transition-shadow hover:ring-[var(--t-42)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]"
        >
          <StagePreview scene={scene} step={lastStep(scene)} lazy />
          <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-[rgba(17,17,17,0.84)] px-2.5 py-1 text-[13px] font-semibold text-[var(--t-84)] transition-colors group-hover:text-[var(--arkiv-sand)]">
            <Maximize2 size={13} aria-hidden />
            Zoom
          </span>
        </button>
        <div className="flex min-w-0 flex-col gap-3 px-1 pb-1 sm:py-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-[14px] font-semibold text-[var(--t-56)]">{sceneNumber(scene)}</span>
            <KindChip scene={scene} />
            {now ? <span className="text-[13px] font-semibold text-[var(--arkiv-orange)]">On screen now</span> : null}
          </div>
          <h3 className="text-[21px] font-semibold leading-[1.25]">{scene.title}</h3>
          <ul className="flex flex-col gap-2">
            {POINTS[scene.id].map((point) => (
              <li key={point} className="flex gap-3 text-[16px] leading-[1.5] text-[var(--t-84)]">
                <span className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-[1px] bg-[var(--arkiv-orange)]" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </li>
  );
}

/** What /slides draws for a scene at a step: the slide, L9's closing lines, or the live card for
 * the other map scenes; S7 gets its big QR. */
function StagePicture({ scene, step }: { scene: SceneDef; step: number }) {
  const entry = deck[scene.id];
  const Content = scene.kind === "slide" ? entry.Slide : scene.id === "L9" ? entry.Overlay : null;
  return (
    <>
      {Content ? <Content scene={scene} step={step} /> : <LiveCard scene={scene} step={step} />}
      {scene.qr.placement === "center" ? <QrCard center label={scene.qr.label} step={step} /> : null}
    </>
  );
}

/** A scene drawn in stage pixels and scaled to the box's width. `lazy`: drawn once the box comes
 * near the screen, so the outline opens without rendering every slide at once. */
function StagePreview({ scene, step, lazy = false }: { scene: SceneDef; step: number; lazy?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [near, setNear] = useState(!lazy);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => setScale((entry?.contentRect.width ?? 0) / STAGE_W));
    resize.observe(element);
    const seen = near ? null : new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) setNear(true); }, { rootMargin: "800px 0px" });
    seen?.observe(element);
    return () => { resize.disconnect(); seen?.disconnect(); };
  }, [near]);
  return (
    <div ref={box} data-preview className="relative aspect-video w-full overflow-hidden bg-[var(--stage-bg)]">
      {near && scale > 0 ? (
        <div inert aria-hidden data-stage className="pointer-events-none absolute left-0 top-0 origin-top-left text-[var(--arkiv-sand)]" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
          <StagePicture scene={scene} step={step} />
        </div>
      ) : null}
    </div>
  );
}

/** One → forward or ← back, through the reveals and then the scenes, like the talk itself. */
function stepFrom({ index, step }: Zoomed, direction: 1 | -1): Zoomed | null {
  const scene = SCENES[index]!;
  if (direction === 1) {
    if (step < lastStep(scene)) return { index, step: step + 1 };
    return index < SCENES.length - 1 ? { index: index + 1, step: 0 } : null;
  }
  if (step > 0) return { index, step: step - 1 };
  const before = SCENES[index - 1];
  return before ? { index: index - 1, step: lastStep(before) } : null;
}

function Zoom({ at, onMove, onClose }: { at: Zoomed; onMove: (next: Zoomed) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scene = SCENES[at.index]!;
  const forward = stepFrom(at, 1);
  const back = stepFrom(at, -1);
  // The dialog closes itself (Esc or the close button) and then unmounts; the page behind it holds
  // still meanwhile.
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = overflow; };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="zoom-title"
      onClose={onClose}
      onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? forward : event.key === "ArrowLeft" ? back : undefined;
        if (next === undefined) return;
        event.preventDefault();
        if (next) onMove(next);
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-[#05061a] p-0 text-[var(--arkiv-sand)] backdrop:bg-[rgba(0,0,0,0.6)]"
    >
      <div className="flex h-full flex-col gap-4 px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="font-mono text-[14px] font-semibold text-[var(--t-56)]">{sceneNumber(scene)}</span>
          <KindChip scene={scene} />
          <h2 id="zoom-title" className="min-w-0 flex-1 truncate text-[18px] font-semibold sm:text-[22px]">{scene.title}</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--t-28)] text-[var(--t-84)] hover:text-[var(--arkiv-sand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {/* As wide as the window allows while the whole 16:9 slide stays on screen. */}
          <div className="w-full max-w-[calc((100dvh-176px)*16/9)] overflow-hidden rounded-[14px] ring-1 ring-[var(--t-14)]">
            <StagePreview key={scene.id} scene={scene} step={at.step} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <ZoomButton disabled={!back} onClick={() => back && onMove(back)}><ChevronLeft size={20} aria-hidden />Back</ZoomButton>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2" role="group" aria-label="Reveals">
              {Array.from({ length: scene.steps }, (_, step) => (
                <button
                  key={step}
                  type="button"
                  aria-label={`Reveal ${step + 1} of ${scene.steps}`}
                  aria-pressed={step === at.step}
                  onClick={() => onMove({ index: at.index, step })}
                  className="h-3 w-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]"
                  style={{ background: step <= at.step ? "var(--arkiv-orange)" : "var(--t-28)" }}
                />
              ))}
            </div>
            <p className="text-[13px] text-[var(--t-56)]">← → to step through</p>
          </div>
          <ZoomButton disabled={!forward} onClick={() => forward && onMove(forward)}>Next<ChevronRight size={20} aria-hidden /></ZoomButton>
        </div>
      </div>
    </dialog>
  );
}

function ZoomButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-full border border-[var(--t-28)] px-4 py-2 text-[15px] font-semibold text-[var(--t-84)] hover:text-[var(--arkiv-sand)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]"
    >
      {children}
    </button>
  );
}
