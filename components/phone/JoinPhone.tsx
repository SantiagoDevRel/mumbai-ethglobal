"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DOT_PALETTE, normalizeColor, shortKey } from "../../shared/encoding";
import { explorerUrl, getProfile } from "../../shared/arkiv/profiles";
import { SessionPublic, SubmitRequest, SubmitResponse } from "../../shared/writer-api";
import type { DotDraft, Hex } from "../../shared/types";
import { LIFETIME_MIN_SEC, LIFETIME_MAX_SEC, LIFETIME_STEP_SEC, NAME_MAX_CHARS, MAX_ENTITIES_PER_DEVICE } from "../../shared/types";
import { deviceToken, writerRequest, WriterRequestError, WRITER_ROUTES, WRITER_URL } from "../../lib/data/writer-client";
import { phoneWriteMessage, ticketSeconds } from "../../lib/data/phone-ticket";
import { usePhoneTicket } from "../../lib/data/usePhoneTicket";
import { CountryPicker } from "./CountryPicker";
import { LifetimeRing } from "./LifetimeRing";
import { SessionCodeForm } from "./SessionCodeForm";
import { Plus, ArrowUpRight, BookOpen, Plug, Terminal, Gift } from "lucide-react";
import "./phone.css";

type PhoneState = { status: "form" } | { status: "submitting" } | { status: "queued"; ticket: string } |
  { status: "written"; ticket: string; key: Hex; includedAt: bigint; expiresAt: bigint; draft: DotDraft } |
  { status: "expired"; block: bigint };

export function JoinPhone() {
  const [session, setSession] = useState("");
  const [device, setDevice] = useState("");
  const [sessionInfo, setSessionInfo] = useState<SessionPublic | null>(null);
  const [state, setState] = useState<PhoneState>({ status: "form" });
  const [draft, setDraft] = useState<DotDraft>({ name: "", color: DOT_PALETTE[0], country: "IN", lifetimeSec: 60 });
  const [custom, setCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReconnecting, setSessionReconnecting] = useState(false);
  const [now, setNow] = useState(0);
  const [writes, setWrites] = useState(0);
  const submitLock = useRef(false);
  const profile = useMemo(() => { try { return getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE); } catch { return null; } }, []);
  const ticketId = state.status === "queued" || state.status === "written" ? state.ticket : null;
  const reading = usePhoneTicket(ticketId, device);

  useEffect(() => {
    let stopped = false;
    void Promise.resolve().then(() => {
      if (stopped) return;
      const code = (new URLSearchParams(location.search).get("s") ?? "").trim().toUpperCase();
      setSession(code);
      try {
        const identity = deviceToken();
        setDevice(identity);
        const used = Number(localStorage.getItem(`arkiv-workshop-count:${code}:${identity}`) ?? 0);
        setWrites(Number.isSafeInteger(used) && used >= 0 ? Math.min(used, MAX_ENTITIES_PER_DEVICE) : 0);
      } catch { setError("Allow browser storage so we can keep your place on the map."); }
    });
    return () => { stopped = true; };
  }, []);

  // After inclusion, the only background read is the ticket; phones never call an RPC.
  useEffect(() => {
    if (!session || !WRITER_URL || state.status === "written") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = SessionPublic.parse(await writerRequest(WRITER_ROUTES.session(session), { signal: controller.signal }));
        if (!controller.signal.aborted) { setSessionInfo(result); setSessionReconnecting(false); }
      } catch { if (!controller.signal.aborted) setSessionReconnecting(true); }
      if (!controller.signal.aborted) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [session, state.status]);

  useEffect(() => {
    const ticket = reading.ticket;
    if (state.status !== "queued" || !ticket) return;
    let stopped = false;
    void Promise.resolve().then(() => {
      if (stopped) return;
      if (ticket.status === "failed") { setError("The write failed. Try again."); setState({ status: "form" }); return; }
      if (ticket.status === "written" && ticket.entityKey && ticket.block && ticket.expiresAtBlock) {
        const used = writes + 1;
        setWrites(used);
        try { localStorage.setItem(`arkiv-workshop-count:${session}:${device}`, String(used)); } catch { /* The writer still enforces the device limit. */ }
        setError(null);
        setSessionReconnecting(false);
        setState({ status: "written", ticket: ticket.ticket, key: ticket.entityKey as Hex, includedAt: BigInt(ticket.block), expiresAt: BigInt(ticket.expiresAtBlock), draft });
      }
    });
    return () => { stopped = true; };
  }, [reading.ticket, state.status, draft, device, writes, session]);

  useEffect(() => {
    const clock = reading.clock;
    if (state.status !== "written" || !clock || reading.ticket?.live !== false || reading.ticket.currentBlock === undefined || clock.block < clock.expiresAt) return;
    let stopped = false;
    void Promise.resolve().then(() => { if (!stopped) setState({ status: "expired", block: clock.expiresAt }); });
    return () => { stopped = true; };
  }, [state.status, reading.clock, reading.ticket?.live, reading.ticket?.currentBlock]);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);

  function joinSession(code: string, info: SessionPublic) {
    const url = new URL(location.href);
    url.searchParams.set("s", code);
    history.replaceState(history.state, "", url);
    setSessionInfo(info);
    setSession(code);
    setState({ status: "form" });
    setSessionReconnecting(false);
    setError(null);
    try {
      const used = Number(localStorage.getItem(`arkiv-workshop-count:${code}:${device}`) ?? 0);
      setWrites(Number.isSafeInteger(used) && used >= 0 ? Math.min(used, MAX_ENTITIES_PER_DEVICE) : 0);
    } catch { setError("Allow browser storage so we can keep your place on the map."); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || !device || !open) return;
    submitLock.current = true;
    setError(null);
    try {
      const validated = SubmitRequest.safeParse({ ...draft, session });
      if (!validated.success) { setError(phoneWriteMessage("invalid")); return; }
      const body = validated.data;
      setState({ status: "submitting" });
      const result = SubmitResponse.parse(await writerRequest(WRITER_ROUTES.submit, { body, device }));
      setState({ status: "queued", ticket: result.ticket });
    } catch (err) { setError(phoneWriteMessage(err instanceof WriterRequestError ? err.code : undefined)); setState({ status: "form" }); }
    finally { submitLock.current = false; }
  }
  const open = sessionInfo?.valid && sessionInfo.doors === "open" && !sessionInfo.replay && sessionInfo.network && profile;
  const needsCode = !session || sessionInfo?.valid === false;
  const entityLink = profile && state.status === "written" ? explorerUrl(profile, "entity", state.key) : null;
  const seconds = ticketSeconds(reading.clock, now);
  const blocksLeft = reading.clock ? reading.clock.expiresAt > reading.clock.block ? reading.clock.expiresAt - reading.clock.block : 0n : null;
  const totalBlocks = state.status === "written" ? (reading.clock?.expiresAt ?? state.expiresAt) - state.includedAt : 0n;
  const progress = blocksLeft === null || totalBlocks <= 0n ? 1 : Number(blocksLeft) / Number(totalBlocks);
  const reconnecting = sessionReconnecting || reading.reconnecting;
  return <div className="phone-surface"><main className="phone-main">
    <header className="phone-header"><picture><source media="(prefers-color-scheme: dark)" srcSet="/brand/arkiv-white.svg" /><img src="/brand/arkiv-black.svg" width={70} height={16} alt="Arkiv" /></picture><span>· Join the map</span>{!needsCode && (state.status === "form" || state.status === "submitting") && <small className={open ? "phone-doors is-open" : "phone-doors"}>{open ? "Open" : "Closed"}</small>}</header>
    <h1 className={needsCode || sessionInfo?.phase === "build" ? undefined : "sr-only"}>{needsCode ? "Enter the code on the screen" : sessionInfo?.phase === "build" ? "Build on Arkiv this weekend" : state.status === "written" ? "You’re on the map." : state.status === "expired" ? "Your moment, on-chain." : "Join the map"}</h1>
    {sessionInfo?.replay && <p className="phone-notice">We’re in replay mode.</p>}
    {!WRITER_URL && <p className="phone-notice">Not ready yet. Hang tight.</p>}
    {!profile && <p className="phone-notice">Network not configured</p>}
    {(reconnecting || error) && <p className="phone-notice" role="alert">{reconnecting ? "Reconnecting…" : error}</p>}
    {needsCode ? <SessionCodeForm onJoin={joinSession} inactive={!!session} /> : sessionInfo?.phase === "build" ? <BuildResources /> : state.status === "written" ? <section className="phone-entity" aria-live="polite">
      <p className="phone-status is-confirmed">Written in block #{state.includedAt.toString()}</p><LifetimeRing color={state.draft.color} progress={progress} /><h2>{state.draft.name}</h2><p className="phone-place">{new Intl.DisplayNames(["en"], { type: "region" }).of(state.draft.country)}</p>
      <p className={seconds !== null && seconds > 0 ? "phone-countdown" : "phone-lifetime-status"}>{seconds === null ? blocksLeft === null ? "Reading your lifetime…" : `${blocksLeft} blocks left` : seconds > 0 ? `${Math.ceil(seconds)} s` : "Checking Entity Expiration…"}</p>
      {reading.extended && <p className="phone-notice">Santiago extended you! +20 min.</p>}
      <code>{shortKey(state.key)}</code>
      {entityLink && <a className="entity-explorer" href={entityLink} target="_blank" rel="noreferrer">View in explorer <ArrowUpRight size={18} /></a>}
    </section> : state.status === "expired" ? <section className="phone-entity" aria-live="polite"><p className="phone-status">Entity Expiration</p><LifetimeRing color={draft.color} progress={0} muted /><h2>{draft.name}</h2><p>You expired at block #{state.block.toString()}. That’s Entity Expiration.</p>{open && writes < MAX_ENTITIES_PER_DEVICE && <button className="phone-submit" onClick={() => setState({ status: "form" })}>Write another</button>}</section> : state.status === "queued" ? <section className="phone-entity" role="status"><p className="phone-status">In the queue: next block</p><LifetimeRing color={draft.color} progress={0} muted /><h2>{draft.name}</h2><p>Your dot is on its way.</p></section> : <form className="phone-form" onSubmit={submit}>
      <label>Your name<input name="name" placeholder="Name or nickname" autoComplete="nickname" maxLength={NAME_MAX_CHARS} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <fieldset><legend>Pick a color</legend><div className="color-grid">{DOT_PALETTE.map((color) => <button key={color} type="button" className="color-swatch" style={{ background: color }} aria-label={`Color ${color}`} aria-pressed={!custom && draft.color === color} onClick={() => { setCustom(false); setDraft({ ...draft, color }); }} />)}<button type="button" className="custom-toggle" aria-label="Custom hex color" aria-expanded={custom} onClick={() => setCustom(!custom)}><Plus size={20} /><span>Custom hex</span></button></div>{custom && <div className="custom-color"><input type="color" aria-label="Choose any color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /><input aria-label="Custom hex color value" pattern="#[0-9a-fA-F]{6}" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} onBlur={() => { const color = normalizeColor(draft.color); if (color) setDraft({ ...draft, color }); }} /></div>}</fieldset>
      <div className="phone-field"><span>Where are you from?</span><CountryPicker value={draft.country} onChange={(country) => setDraft({ ...draft, country })} /></div>
      <label>How long should you live?<output className="lifetime-value">{draft.lifetimeSec < 60 ? `${draft.lifetimeSec} s` : `${Math.floor(draft.lifetimeSec / 60)} min${draft.lifetimeSec % 60 ? ` ${draft.lifetimeSec % 60} s` : ""}`}</output><input type="range" style={{ background: `linear-gradient(to right, #fe7446 ${(draft.lifetimeSec - LIFETIME_MIN_SEC) / (LIFETIME_MAX_SEC - LIFETIME_MIN_SEC) * 100}%, var(--phone-track) 0)` }} min={LIFETIME_MIN_SEC} max={LIFETIME_MAX_SEC} step={LIFETIME_STEP_SEC} value={draft.lifetimeSec} onChange={(event) => setDraft({ ...draft, lifetimeSec: Number(event.target.value) })} /><span className="range-labels"><span>20 s</span><span>2 min</span></span></label>
      {!open && <p className="doors-note">Hang tight. Santiago opens the doors in a moment.</p>}{writes >= MAX_ENTITIES_PER_DEVICE && <p className="doors-note">You’ve reached the limit for this session.</p>}<button className="phone-submit" disabled={!open || !device || writes >= MAX_ENTITIES_PER_DEVICE || state.status === "submitting"}>{state.status === "submitting" ? "Sending…" : writes >= MAX_ENTITIES_PER_DEVICE ? "Session limit reached" : open ? "Write my entity" : "Doors closed"}</button>
    </form>}
    <footer>Arkiv testnet · everything you write is public.<span>Arkiv, the Web3 database</span></footer>
  </main></div>;
}

function BuildResources() {
  return <div className="build-resources"><a href="https://docs.arkiv.network/start-here/fundamentals/" target="_blank" rel="noreferrer"><BookOpen />Docs<ArrowUpRight /></a><a href="https://hub.arkiv.network/ai-tools" target="_blank" rel="noreferrer"><Plug />Arkiv AI plugin<ArrowUpRight /></a><a href="https://hub.arkiv.network/ai-tools#mcp" target="_blank" rel="noreferrer"><Terminal />Arkiv MCP<ArrowUpRight /></a><div className="resource-soon"><Gift /><span>Prizes<small>Announced soon</small></span></div><p>Your agent can help you build.</p></div>;
}
