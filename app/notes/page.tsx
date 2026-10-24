"use client";

// Presenter notes (/notes, laptop, 1440x900, dark). Follower of the stage: every button sends the
// same command as its key on `/`. Talk timer, ahead/behind, cut lines, current and next scene with
// notes, the scene index, and a slot for the app's writer controls.

import { useEffect, useState, type ReactNode } from "react";
import { commandForKey, KEY_HELP, usePresenterKeys } from "../../lib/stage/keyboard";
import { stage, useScene, useStage, type Command } from "../../lib/stage/store";
import { SCENES, sceneDuration, TALK_LENGTH_SEC } from "../../shared/scenes";
import { deck } from "../deck/registry";

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(Math.abs(sec)));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function useNow(ms = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

type Pace = { kind: "idle" } | { kind: "ahead" | "behind" | "on"; by: number };

function pace(elapsed: number | null, index: number): Pace {
  if (elapsed === null) return { kind: "idle" };
  const scene = SCENES[index]!;
  const end = scene.at + sceneDuration(index);
  if (elapsed > end) return { kind: "behind", by: elapsed - end };
  if (elapsed < scene.at - 5) return { kind: "ahead", by: scene.at - elapsed };
  return { kind: "on", by: 0 };
}

/** The keys from WORKSHOP.md 4.9, as buttons that send the keyboard's commands. */
const KEY_BUTTONS: { label: string; key: string; shiftKey?: boolean; hint: string }[] = [
  { label: "←", key: "ArrowLeft", hint: "Previous" },
  { label: "→", key: "ArrowRight", hint: "Next" },
  { label: "D", key: "d", hint: "Doors" },
  { label: "E", key: "e", hint: "Extend selected" },
  { label: "Shift+E", key: "E", shiftKey: true, hint: "Extend all" },
  { label: "B", key: "b", hint: "Business view" },
  { label: "O", key: "o", hint: "Owner view" },
  { label: "T", key: "t", hint: "Transfer" },
  { label: "F", key: "f", hint: "Filters" },
  { label: "I", key: "i", hint: "Inspector" },
  { label: "Q", key: "q", hint: "Query panel" },
  { label: "H", key: "h", hint: "Hide selected" },
  { label: "R", key: "r", hint: "Reset camera" },
  { label: "P", key: "p", hint: "Replay (Plan B)" },
  { label: "?", key: "?", hint: "Controls overlay" },
];

const EXTRA_BUTTONS: { label: string; cmd: Command }[] = [
  { label: "Dots view", cmd: { type: "setMap", map: "dots" } },
  { label: "Undo transfer", cmd: { type: "undoTransfer" } },
  { label: "Unhide all", cmd: { type: "unhideAll" } },
];

function send(cmd: Command | null) {
  if (cmd) stage.dispatch(cmd);
}

function Btn({ children, onClick, title, tone = "plain" }: { children: ReactNode; onClick: () => void; title?: string; tone?: "plain" | "accent" }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-[var(--arkiv-orange)] ${tone === "accent" ? "border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.15)]" : "border-[var(--panel-border)] bg-[rgba(246,244,239,0.04)]"}`}
    >
      {children}
    </button>
  );
}

export default function NotesPage() {
  useEffect(() => stage.connect("notes"), []);
  usePresenterKeys();
  const now = useNow();
  const { scene, index, step } = useScene();
  const timerStartedAt = useStage((s) => s.timerStartedAt);
  const doors = useStage((s) => s.doors);
  const map = useStage((s) => s.map);
  const transferred = useStage((s) => s.transferred);
  const replay = useStage((s) => s.replay);
  const session = useStage((s) => s.session);
  const connected = stage.lastLeaderStateAt > 0;

  const elapsed = timerStartedAt === null ? null : (now - timerStartedAt) / 1000;
  const p = pace(elapsed, index);
  const behind = p.kind === "behind";
  const next = SCENES[index + 1];
  const upcomingCuts = SCENES.map((s, i) => ({ s, i })).filter(({ s, i }) => s.cutLine && i >= index);

  return (
    <main className="flex h-screen min-h-[900px] flex-col gap-4 overflow-hidden bg-[var(--stage-bg)] p-5 text-[var(--stage-fg)]">
      {/* Top bar: timer, pace, status */}
      <header className="flex items-center gap-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--stage-muted)]">Elapsed</p>
          <p className="font-mono text-5xl font-medium tabular-nums">{elapsed === null ? "0:00" : fmt(elapsed)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--stage-muted)]">Planned for {scene.id}</p>
          <p className="font-mono text-3xl tabular-nums text-[var(--stage-muted)]">
            {fmt(scene.at)}–{fmt(scene.at + sceneDuration(index))}
          </p>
        </div>
        <div
          className={`rounded-full px-4 py-2 text-lg font-semibold ${
            p.kind === "behind"
              ? "bg-[var(--arkiv-orange)] text-[var(--arkiv-ink)]"
              : p.kind === "ahead"
                ? "bg-[var(--arkiv-blue)] text-[var(--arkiv-sand)]"
                : "border border-[var(--panel-border)]"
          }`}
        >
          {p.kind === "idle" ? "Timer starts on the first →" : p.kind === "on" ? "On time" : `${p.kind === "behind" ? "Behind" : "Ahead"} by ${fmt(p.by)}`}
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => send({ type: "timer", action: "start" })} title="Start the timer now">Start timer</Btn>
          <Btn onClick={() => send({ type: "timer", action: "reset" })}>Reset timer</Btn>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full border px-3 py-1 ${connected ? "border-[var(--arkiv-orange)]" : "border-[var(--panel-border)] text-[var(--stage-muted)]"}`}>
            {connected ? "Stage connected" : "Waiting for the stage (open / in this browser)"}
          </span>
          <span className="rounded-full border border-[var(--panel-border)] px-3 py-1">Doors {doors}</span>
          <span className="rounded-full border border-[var(--panel-border)] px-3 py-1">
            Map {map}
            {map === "owner" ? (transferred ? " · transferred" : " · one owner") : ""}
          </span>
          {replay ? <span className="rounded-full bg-[var(--app-side)] px-3 py-1 text-[var(--arkiv-ink)]">Replay mode</span> : null}
          <span className="rounded-full border border-[var(--panel-border)] px-3 py-1 font-mono">Session {session ?? "none"}</span>
          <span className="text-[var(--stage-muted)]">Talk {fmt(TALK_LENGTH_SEC)}</span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-4">
        <div className="flex min-h-0 flex-col gap-4">
          {/* Current scene */}
          <section className="min-h-0 flex-[3] overflow-auto rounded-2xl border border-[var(--arkiv-orange)] bg-[var(--panel-bg)] p-6">
            <p className="text-sm uppercase tracking-widest text-[var(--arkiv-orange)]">
              Now · {scene.id} · step {step + 1}/{scene.steps} · {scene.kind}
            </p>
            <h1 className="mt-1 text-3xl font-semibold">{scene.title}</h1>
            <ul className="mt-4 space-y-3 text-2xl leading-snug">
              {deck[scene.id].notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            {scene.cutLine ? (
              <p className={`mt-4 rounded-lg px-4 py-2 text-lg ${behind ? "bg-[var(--arkiv-orange)] font-semibold text-[var(--arkiv-ink)]" : "border border-dashed border-[var(--panel-border)] text-[var(--stage-muted)]"}`}>
                Cut line: {scene.cutLine}
              </p>
            ) : null}
          </section>

          {/* Next scene */}
          <section className="min-h-0 flex-[2] overflow-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
            {next ? (
              <>
                <p className="text-sm uppercase tracking-widest text-[var(--stage-muted)]">
                  Next · {next.id} at {fmt(next.at)}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{next.title}</h2>
                <ul className="mt-2 space-y-2 text-lg leading-snug text-[var(--stage-muted)]">
                  {deck[next.id].notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-lg text-[var(--stage-muted)]">Last scene.</p>
            )}
          </section>

          {/* Keys and writer controls */}
          <section className="grid grid-cols-[1fr_380px] gap-4">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-[var(--stage-muted)]">Keys (same commands as on the stage)</p>
              <div className="grid grid-cols-6 gap-2">
                {KEY_BUTTONS.map((b) => (
                  <Btn
                    key={b.label}
                    tone={b.label === "→" ? "accent" : "plain"}
                    title={KEY_HELP.find((k) => k.keys.includes(b.label.replace("Shift+", "")))?.action}
                    onClick={() => send(commandForKey({ key: b.key, shiftKey: b.shiftKey ?? false }))}
                  >
                    <span className="font-mono font-semibold">{b.label}</span>
                    <span className="block text-xs text-[var(--stage-muted)]">{b.hint}</span>
                  </Btn>
                ))}
                {EXTRA_BUTTONS.map((b) => (
                  <Btn key={b.label} onClick={() => send(b.cmd)}>
                    <span className="text-xs">{b.label}</span>
                  </Btn>
                ))}
              </div>
            </div>
            {/* Slot for components/notes/WriterControls.tsx (app chat). Mounted once it lands on main. */}
            <div className="flex flex-col justify-center rounded-2xl border border-dashed border-[var(--panel-border)] p-4 text-sm text-[var(--stage-muted)]">
              <p className="font-semibold text-[var(--stage-fg)]">Writer controls</p>
              <p className="mt-1">Session, doors, hold and resume, writer status. Coming from the app build.</p>
            </div>
          </section>
        </div>

        {/* Scene index */}
        <aside className="flex min-h-0 flex-col gap-3">
          <nav className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3">
            <p className="mb-2 px-2 text-xs uppercase tracking-widest text-[var(--stage-muted)]">Scenes</p>
            <ol className="space-y-1">
              {SCENES.map((s, i) => {
                const current = i === index;
                const past = elapsed !== null && i < index;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => send({ type: "goto", index: i })}
                      className={`flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[rgba(246,244,239,0.06)] ${current ? "bg-[rgba(254,116,70,0.18)] font-semibold" : past ? "text-[var(--stage-muted)]" : ""}`}
                    >
                      <span className="w-8 font-mono">{s.id}</span>
                      <span className="flex-1 truncate">{s.title}</span>
                      <span className="font-mono text-xs text-[var(--stage-muted)]">{fmt(s.at)}</span>
                      {s.cutLine ? <span className="text-xs text-[var(--arkiv-orange)]">cut</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          {upcomingCuts.length ? (
            <div className={`rounded-2xl p-3 text-sm ${behind ? "bg-[var(--arkiv-orange)] text-[var(--arkiv-ink)]" : "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--stage-muted)]"}`}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest">{behind ? "Behind: cut lines" : "Cut lines"}</p>
              <ul className="space-y-1">
                {upcomingCuts.map(({ s }) => (
                  <li key={s.id}>
                    <span className="font-mono">{s.id}</span> {s.cutLine}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
