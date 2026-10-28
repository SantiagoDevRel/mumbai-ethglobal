"use client";

// /outline: the talk's outline for the presenter. It reads the run of show the stage plays
// (shared/scenes.ts) and the script (app/deck/notes.ts), so it can't drift from the slides: each
// part, each scene with its planned start and what each → reveals, and the script per scene. With
// /map or /slides open in this browser, the scene on screen now is marked.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PresenterGate } from "../../components/stage/Presenter";
import { stage, useScene } from "../../lib/stage/store";
import { SCENES, SECTIONS, TALK_LENGTH_SEC, type SceneDef, type SceneId } from "../../shared/scenes";
import "../../components/stage/app-stage.css";
import { NOTES, REVEALS } from "../deck/notes";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** The opening (title and index) has no part of its own; the four parts are the outline bar's. */
const PARTS = [
  { id: "opening", number: null, title: "Opening", line: "The title and what we'll do.", scenes: SCENES.filter((scene) => !scene.section) },
  ...SECTIONS.map((section, i) => ({ ...section, number: i + 1, scenes: SCENES.filter((scene) => scene.section === section.id) })),
];

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

function Outline() {
  const now = useSceneOnScreen();
  const [script, setScript] = useState(false);
  return (
    <main className="mx-auto flex max-w-[880px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Image src="/brand/arkiv-white.svg" alt="Arkiv" width={104} height={24} priority />
          <nav className="flex gap-2 text-[15px] font-semibold" aria-label="Presenter screens">
            <Link className="rounded-[10px] border border-[var(--t-28)] px-3 py-1.5 text-[var(--t-84)] hover:text-[var(--arkiv-sand)]" href="/map">/map</Link>
            <Link className="rounded-[10px] border border-[var(--t-28)] px-3 py-1.5 text-[var(--t-84)] hover:text-[var(--arkiv-sand)]" href="/slides">/slides</Link>
          </nav>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.01em]">Outline</h1>
          <p className="text-[18px] leading-[1.5] text-[var(--t-64)]">
            From zero to hero with Arkiv, the Web3 database · {Math.round(TALK_LENGTH_SEC / 60)} minutes · {SCENES.length} scenes
          </p>
        </div>
        <button
          type="button"
          aria-pressed={script}
          onClick={() => setScript((open) => !open)}
          className="self-start rounded-[12px] border border-[var(--t-28)] px-4 py-2 text-[16px] font-semibold text-[var(--arkiv-sand)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]"
        >
          {script ? "Hide the script" : "Show the script"}
        </button>
      </header>
      {PARTS.map((part) => (
        <section key={part.id} aria-labelledby={`part-${part.id}`} className="flex flex-col gap-4">
          <div className="flex items-start gap-4 border-b border-[var(--t-14)] pb-4">
            <span
              className="mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-[1.5px] font-mono text-[15px] font-semibold"
              style={part.id === "build" ? { borderColor: "var(--arkiv-orange)", color: "var(--arkiv-orange)" } : { borderColor: "var(--t-42)", color: "var(--t-84)" }}
              aria-hidden
            >
              {part.number ?? "0"}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id={`part-${part.id}`} className="text-[26px] font-semibold leading-[1.2]">{part.title}</h2>
                <span className="font-mono text-[15px] text-[var(--t-64)]">from {clock(part.scenes[0]!.at)}</span>
              </div>
              <p className="text-[17px] leading-[1.45] text-[var(--t-64)]">{part.line}</p>
            </div>
          </div>
          <ol className="flex flex-col gap-3">
            {part.scenes.map((scene) => <SceneRow key={`${scene.id}-${script}`} scene={scene} now={scene.id === now} script={script} />)}
          </ol>
        </section>
      ))}
      <p className="text-[15px] leading-[1.5] text-[var(--t-56)]">
        Times are each scene&apos;s planned start. The talk ends at {clock(TALK_LENGTH_SEC)}; the time after the last scene is for live slips and questions.
      </p>
    </main>
  );
}

function SceneRow({ scene, now, script }: { scene: SceneDef; now: boolean; script: boolean }) {
  const reveals = REVEALS[scene.id];
  const notes = NOTES[scene.id];
  return (
    <li
      aria-current={now ? "step" : undefined}
      className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 rounded-[16px] border px-4 py-4 sm:grid-cols-[56px_minmax(0,1fr)] sm:px-5"
      style={now ? { borderColor: "var(--arkiv-orange)", background: "rgba(254,116,70,0.08)" } : { borderColor: "var(--t-14)", background: "rgba(17,17,17,0.55)" }}
    >
      <span className="pt-[3px] font-mono text-[15px] text-[var(--t-64)]">{clock(scene.at)}</span>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="text-[19px] font-semibold leading-[1.3]">{scene.title}</h3>
          <span className="rounded-[8px] border px-2 py-0.5 text-[13px] font-semibold" style={scene.kind === "live" ? { borderColor: "var(--arkiv-orange)", color: "var(--arkiv-orange)" } : { borderColor: "var(--t-28)", color: "var(--t-84)" }}>
            {scene.kind === "live" ? "On the map" : "Slide"}
          </span>
          {now ? <span className="text-[13px] font-semibold text-[var(--arkiv-orange)]">On screen now</span> : null}
        </div>
        {reveals.length ? (
          <ul className="flex flex-col gap-1 text-[16px] leading-[1.45] text-[var(--t-84)]">
            {reveals.map((reveal) => (
              <li key={reveal} className="flex gap-2">
                <span className="text-[var(--arkiv-orange)]" aria-hidden>→</span>
                <span>{reveal}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <details open={script} className="group">
          <summary className="w-fit cursor-pointer text-[14px] font-semibold text-[var(--t-56)] hover:text-[var(--t-84)]">Script</summary>
          <div className="mt-2 flex flex-col gap-2 border-l-2 border-[var(--t-14)] pl-3 text-[15px] leading-[1.55] text-[var(--t-84)]">
            {notes.map((note) => <p key={note}>{note}</p>)}
          </div>
        </details>
      </div>
    </li>
  );
}
