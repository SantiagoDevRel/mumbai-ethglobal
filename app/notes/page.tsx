"use client";

// Presenter notes (/notes, laptop, 1440x900), on the design handoff section 9: Ink page, #1C1C1C
// boxes, a 60 px header, then scene index | timer, NOW and NEXT | writer and keys. Follower of
// the stage: every button sends the same command as its key on `/`.
// Pre-flight: on S0 with no session, the NOW box asks for "Start session" first and → is refused
// here (the scene index still jumps, for rehearsals without the writer).

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { WriterControls } from "../../components/notes/WriterControls";
import { usePresenterToken } from "../../lib/data/presenter-auth";
import { useLiveBlock } from "../../lib/data/useLiveBlock";
import { writerRequest, WRITER_ROUTES, WRITER_URL } from "../../lib/data/writer-client";
import { commandForKey, KEY_HELP } from "../../lib/stage/keyboard";
import { stage, useScene, useStage, type Command } from "../../lib/stage/store";
import { SCENES, sceneDuration, TALK_LENGTH_SEC } from "../../shared/scenes";
import { SessionStartResponse } from "../../shared/writer-api";
import { REVEALS } from "../deck/notes";
import { deck } from "../deck/registry";

const SAND = "#F6F4EF";
const INK = "#111111";
const TIMER_BUTTON =
  "whitespace-nowrap rounded-[8px] border border-[rgba(246,244,239,0.28)] bg-[#242424] px-3 py-1.5 text-[14px] font-semibold hover:border-[var(--arkiv-orange)]";

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(Math.abs(sec)));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
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

/** Cut lines from the run of show: the time is the "At mm:ss" that opens each cut line. */
const CUTS = SCENES.flatMap((s) => {
  const m = s.cutLine?.match(/At (\d+):(\d{2})/);
  return m ? [{ id: s.id, at: Number(m[1]) * 60 + Number(m[2]), text: s.cutLine! }] : [];
});

/** The keys from WORKSHOP.md 4.9, as buttons that send the keyboard's commands. */
const KEY_BUTTONS: { label: string; key: string; shiftKey?: boolean; hint: string }[] = [
  { label: "←", key: "ArrowLeft", hint: "Previous" },
  { label: "→", key: "ArrowRight", hint: "Next" },
  { label: "D", key: "d", hint: "Doors" },
  { label: "E", key: "e", hint: "Extend" },
  { label: "⇧E", key: "E", shiftKey: true, hint: "Save all" },
  { label: "B", key: "b", hint: "Business" },
  { label: "O", key: "o", hint: "Owner view" },
  { label: "T", key: "t", hint: "Transfer" },
  { label: "F", key: "f", hint: "Filters" },
  { label: "I", key: "i", hint: "Inspector" },
  { label: "Q", key: "q", hint: "Query panel" },
  { label: "H", key: "h", hint: "Hide dot" },
  { label: "R", key: "r", hint: "Reset camera" },
  { label: "P", key: "p", hint: "Plan B" },
  { label: "?", key: "?", hint: "Controls" },
];

const EXTRA_BUTTONS: { label: string; cmd: Command }[] = [
  { label: "Dots view", cmd: { type: "setMap", map: "dots" } },
  { label: "Undo transfer", cmd: { type: "undoTransfer" } },
  { label: "Unhide all", cmd: { type: "unhideAll" } },
];

function send(cmd: Command | null) {
  if (cmd) stage.dispatch(cmd);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** The presenter keys on /notes, with → held back while `blocked` says so. */
function useNotesKeys(blocked: boolean, onRefused: () => void) {
  const latest = useRef({ blocked, onRefused });
  useEffect(() => {
    latest.current = { blocked, onRefused };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const cmd = commandForKey(e);
      if (!cmd) return;
      e.preventDefault();
      if (cmd.type === "next" && latest.current.blocked) latest.current.onRefused();
      else stage.dispatch(cmd);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** S0 with no session: one blocking step, the same writer call as the writer box's button. */
function PreFlight({ refused }: { refused: boolean }) {
  const token = usePresenterToken();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setPending(true);
    setError(null);
    try {
      const { code } = SessionStartResponse.parse(await writerRequest(WRITER_ROUTES.presenter.sessionStart, { token, body: {} }));
      stage.dispatch({ type: "session", code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the session.");
    } finally {
      setPending(false);
    }
  }
  const blocker = !WRITER_URL
    ? "This build has no writer URL, so no session can start."
    : !token
      ? "Enter the presenter token in Workshop writer (right), then start."
      : null;
  return (
    <div className="flex flex-col gap-2 rounded-[12px] bg-[var(--arkiv-orange)] px-5 py-4 text-[#111111]">
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[22px] font-bold">{refused ? "→ is locked: start the session first" : "Start the session before S0"}</span>
          <span className="text-[15px]">{blocker ?? "Phones join this session. → stays locked until it exists."}</span>
        </div>
        <button
          type="button"
          disabled={pending || blocker !== null}
          onClick={() => void start()}
          className="flex-none rounded-[10px] bg-[#111111] px-5 py-3 text-[18px] font-semibold text-[var(--arkiv-sand)] disabled:opacity-40"
        >
          {pending ? "Starting…" : "Start session"}
        </button>
      </div>
      {error ? <span className="text-[15px] font-semibold">{error}</span> : null}
      <span className="text-[13px] opacity-80">Rehearsing without the writer? Click S1 in the scene list.</span>
    </div>
  );
}

function Box({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-[16px] border bg-[#1C1C1C] ${className}`} style={{ borderColor: "rgba(246,244,239,0.10)", ...style }}>
      {children}
    </div>
  );
}

function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-[13px] font-semibold tracking-[0.06em] text-[rgba(246,244,239,0.56)] ${className}`}>{children}</span>;
}

function KeyButton({ k, label, title, onClick }: { k: string; label: string; title?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-[12px] border border-[rgba(246,244,239,0.12)] bg-[#242424] px-3 py-2.5 text-left hover:border-[var(--arkiv-orange)]"
    >
      <span className="rounded-[5px] bg-[rgba(246,244,239,0.14)] px-1.5 py-px font-mono text-[13px] font-semibold">{k}</span>
      <span className="text-[13px] text-[rgba(246,244,239,0.8)]">{label}</span>
    </button>
  );
}

export default function NotesPage() {
  useEffect(() => stage.connect("notes"), []);
  const now = useNow();
  const block = useLiveBlock();
  const { scene, index, step } = useScene();
  const timerStartedAt = useStage((s) => s.timerStartedAt);
  const doors = useStage((s) => s.doors);
  const replay = useStage((s) => s.replay);
  const session = useStage((s) => s.session);
  const connected = stage.lastLeaderStateAt > 0;
  const preflight = index === 0 && !session;
  const [refusedAt, setRefusedAt] = useState(0);
  const refused = preflight && now - refusedAt < 4000;
  const refuse = () => setRefusedAt(Date.now());
  useNotesKeys(preflight, refuse);
  const forward = (cmd: Command | null) => (cmd?.type === "next" && preflight ? refuse() : send(cmd));

  const elapsed = timerStartedAt === null ? null : (now - timerStartedAt) / 1000;
  const p = pace(elapsed, index);
  const behind = p.kind === "behind";
  const next = SCENES[index + 1];
  const notes = deck[scene.id].notes;
  const reveal = REVEALS[scene.id][step];
  const pct = (sec: number) => `${Math.min(100, (sec / TALK_LENGTH_SEC) * 100)}%`;

  return (
    <main className="flex h-screen min-h-[900px] flex-col bg-[#111111] text-[var(--arkiv-sand)]">
      <header className="flex h-[60px] flex-none items-center gap-4 border-b px-6" style={{ borderColor: "rgba(246,244,239,0.10)" }}>
        <Image src="/brand/arkiv-white.svg" alt="Arkiv" width={78} height={18} />
        <span className="text-[17px] font-semibold">Presenter</span>
        <span
          className="flex-none whitespace-nowrap rounded-[6px] px-2.5 py-0.5 font-mono text-[14px]"
          style={session ? { background: "rgba(246,244,239,0.10)" } : { background: "#FE7446", color: INK, fontWeight: 600 }}
        >
          session {session ?? "not started"}
        </span>
        <span className="flex-none whitespace-nowrap rounded-[6px] bg-[rgba(246,244,239,0.10)] px-2.5 py-0.5 text-[14px]">Doors {doors}</span>
        {replay ? <span className="flex-none whitespace-nowrap rounded-[6px] bg-[var(--arkiv-orange)] px-2.5 py-0.5 text-[14px] font-semibold text-[#111111]">Replay mode</span> : null}
        <span className="ml-auto inline-flex min-w-0 items-center gap-2 whitespace-nowrap text-[14px] text-[rgba(246,244,239,0.8)]" title="Open / in this browser">
          <span className="h-2 w-2 flex-none rounded-full" style={{ background: connected ? SAND : "rgba(246,244,239,0.28)" }} />
          {connected ? "Synced with stage" : "Stage not open"}
        </span>
        <span className="inline-flex flex-none items-center gap-2 whitespace-nowrap text-[14px] text-[rgba(246,244,239,0.8)]">
          <span className="h-2 w-2 rounded-full bg-[var(--arkiv-orange)]" />
          Testnet · block {block ? `#${block.number.toLocaleString("en-US")}` : "#…"}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_340px] gap-4 px-6 pb-6 pt-4">
        {/* Scene index */}
        <Box className="flex min-h-0 flex-col gap-0.5 overflow-auto px-2.5 py-3.5">
          <Label className="px-3 pb-2">SCENES · {fmt(TALK_LENGTH_SEC)}</Label>
          <nav aria-label="Scene index" className="flex flex-col gap-0.5">
            {SCENES.map((s, i) => {
              const current = i === index;
              const past = i < index;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => send({ type: "goto", index: i })}
                  className="flex min-h-[40px] flex-none items-center gap-3 rounded-[10px] px-3 py-1.5 text-left text-[15px] leading-[1.25] hover:bg-[rgba(246,244,239,0.06)]"
                  style={current ? { background: SAND, color: INK } : past ? { color: "rgba(246,244,239,0.48)" } : undefined}
                >
                  <span className="w-[44px] font-mono text-[13px] opacity-[0.64]">{fmt(s.at)}</span>
                  <span className="w-[28px] font-semibold">{s.id}</span>
                  <span className="line-clamp-2 min-w-0 flex-1">{s.title}</span>
                  {s.cutLine ? (
                    <span className="rounded-[4px] border border-dashed px-1 font-mono text-[11px]" style={{ borderColor: current ? INK : "rgba(246,244,239,0.5)" }}>
                      cut
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </Box>

        {/* Timer, NOW, NEXT */}
        <section className="flex min-w-0 flex-col gap-4">
          <Box className="flex flex-col gap-3.5 px-[22px] py-[18px]">
            <div className="flex items-end gap-6">
              <div className="flex flex-col gap-0.5">
                <Label>ELAPSED</Label>
                <span className="font-mono text-[64px] font-semibold leading-none tabular-nums">{fmtClock(elapsed ?? 0)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <Label>PLANNED</Label>
                <span className="font-mono text-[32px] leading-[1.2] text-[rgba(246,244,239,0.72)] tabular-nums">{fmtClock(scene.at)}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => send({ type: "timer", action: "start" })} className={TIMER_BUTTON}>
                  Start timer
                </button>
                <button type="button" onClick={() => send({ type: "timer", action: "reset" })} className={TIMER_BUTTON}>
                  Reset
                </button>
                {p.kind === "idle" ? (
                  <span className="max-w-[130px] text-[14px] italic leading-[1.3] text-[rgba(246,244,239,0.56)]">Starts on the first →</span>
                ) : (
                  <span
                    className="whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[18px] font-bold"
                    style={p.kind === "behind" ? { background: "#FE7446", color: INK } : p.kind === "ahead" ? { background: SAND, color: INK } : { border: "1px solid rgba(246,244,239,0.28)" }}
                  >
                    {p.kind === "on" ? "On time" : `${fmt(p.by)} ${p.kind}`}
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-[10px] rounded-[5px] bg-[rgba(246,244,239,0.12)]">
              <div className="absolute inset-y-0 left-0 rounded-[5px]" style={{ width: pct(elapsed ?? 0), background: SAND }} />
              <div className="absolute -top-1 h-[18px] w-[2px] bg-[var(--arkiv-orange)]" style={{ left: pct(scene.at) }} title="Planned" />
              {CUTS.map((c) => (
                <div key={c.id} className="absolute -top-1 h-[18px] w-[2px] bg-[rgba(246,244,239,0.5)]" style={{ left: pct(c.at) }} title={c.text} />
              ))}
            </div>
            <div className="flex justify-between font-mono text-[12px] text-[rgba(246,244,239,0.56)]">
              <span>0:00</span>
              <span>cut lines at {CUTS.map((c) => fmt(c.at)).join(" · ")}</span>
              <span>{fmt(TALK_LENGTH_SEC)}</span>
            </div>
          </Box>

          <Box className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-[22px] py-5" style={{ borderColor: SAND }}>
            <div className="flex items-baseline gap-3">
              <Label>NOW</Label>
              <span className="text-[30px] font-bold">
                {scene.id} · {scene.title}
              </span>
              <span className="ml-auto font-mono text-[14px] text-[rgba(246,244,239,0.56)]">
                planned {fmt(scene.at)} – {fmt(scene.at + sceneDuration(index))}
              </span>
            </div>
            {preflight ? <PreFlight refused={refused} /> : null}
            <p className="text-[16px] text-[rgba(246,244,239,0.72)]">
              Step {step + 1} of {scene.steps} · {scene.kind === "slide" ? "slide" : "live map"}
            </p>
            {notes.map((n) => (
              <p key={n} className="text-[24px] leading-[1.45]">
                {n}
              </p>
            ))}
            <p className="mt-auto rounded-[10px] border border-dashed px-4 py-2.5 text-[18px]" style={{ borderColor: "rgba(246,244,239,0.28)" }}>
              <span className="mr-2 font-mono font-semibold text-[var(--arkiv-orange)]">Next →</span>
              {preflight
                ? "locked until the session starts."
                : reveal
                  ? `reveals ${reveal}.`
                  : next
                    ? `goes to ${next.id} · ${next.title}.`
                    : "nothing: this is the last scene."}
            </p>
            {scene.cutLine ? (
              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-[6px] px-2 py-1 font-mono text-[13px]"
                  style={behind ? { background: "#FE7446", color: INK, fontWeight: 600 } : { background: "rgba(246,244,239,0.10)" }}
                >
                  cut line · {scene.cutLine}
                </span>
              </div>
            ) : null}
          </Box>

          <Box className="flex flex-col gap-1.5 px-[22px] py-4">
            <div className="flex items-baseline gap-3">
              <Label>NEXT</Label>
              {next ? (
                <>
                  <span className="text-[20px] font-semibold">
                    {next.id} · {next.title}
                  </span>
                  <span className="ml-auto font-mono text-[13px] text-[rgba(246,244,239,0.56)]">{fmt(next.at)}</span>
                </>
              ) : (
                <span className="text-[20px] font-semibold">Last scene</span>
              )}
            </div>
            {next ? <p className="text-[16px] leading-[1.4] text-[rgba(246,244,239,0.8)]">{deck[next.id].notes[0]}</p> : null}
          </Box>
        </section>

        {/* Writer and keys */}
        <aside className="flex min-h-0 min-w-0 flex-col gap-4">
          {/* The app's writer box draws its own frame; match it to the other boxes. */}
          <div className="max-h-[50%] flex-none overflow-auto [&_.writer-controls]:mt-0 [&_.writer-controls]:rounded-[16px] [&_.writer-controls]:border-[rgba(246,244,239,0.10)] [&_.writer-controls]:bg-[#1C1C1C] [&_.writer-controls]:p-4">
            <WriterControls />
          </div>
          <Box className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto p-4">
            <Label>KEYS</Label>
            <div className="grid grid-cols-3 gap-2">
              {KEY_BUTTONS.map((b) => (
                <KeyButton
                  key={b.label}
                  k={b.label}
                  label={b.hint}
                  title={KEY_HELP.find((k) => k.keys.includes(b.label === "⇧E" ? "E" : b.label))?.action}
                  onClick={() => forward(commandForKey({ key: b.key, shiftKey: b.shiftKey ?? false }))}
                />
              ))}
              {EXTRA_BUTTONS.map((b) => (
                <KeyButton key={b.label} k="·" label={b.label} onClick={() => send(b.cmd)} />
              ))}
            </div>
          </Box>
        </aside>
      </div>
    </main>
  );
}
