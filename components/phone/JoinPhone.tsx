"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DOT_COLOR_NAMES, DOT_PALETTE, shortKey } from "../../shared/encoding";
import { explorerUrl, getProfile } from "../../shared/arkiv/profiles";
import { SubmitRequest, SubmitResponse } from "../../shared/writer-api";
import type { DotDraft, Hex } from "../../shared/types";
import { LIFETIME_DEFAULT_SEC, LIFETIME_MIN_SEC, LIFETIME_MAX_SEC, LIFETIME_STEP_SEC, NAME_MAX_CHARS } from "../../shared/types";
import { deviceToken, writerRequest, WriterRequestError, WRITER_ROUTES, WRITER_CONNECTED } from "../../lib/data/writer-client";
import { phoneWriteMessage } from "../../lib/data/phone-ticket";
import { CountryPicker } from "./CountryPicker";
import { LifetimeRing } from "./LifetimeRing";
import { ArrowUpRight, BookOpen, Plug, Terminal, Gift } from "lucide-react";
import "./phone.css";

type PhoneState = { status: "form" } | { status: "submitting" } | { status: "queued"; draft: DotDraft } |
  { status: "written"; key: Hex; includedAt: bigint; draft: DotDraft; endsAt: number };

/** The phone makes one request: it sends the form and the writer answers once the entity is in a
 * block. The countdown runs on the phone's own clock from the chosen lifetime; nothing is fetched. */
export function JoinPhone() {
  const [device, setDevice] = useState("");
  const [state, setState] = useState<PhoneState>({ status: "form" });
  const [draft, setDraft] = useState<DotDraft>({ name: "", color: DOT_PALETTE[0], country: "IN", lifetimeSec: LIFETIME_DEFAULT_SEC });
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [build, setBuild] = useState(false);
  const submitLock = useRef(false);
  const profile = useMemo(() => { try { return getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE); } catch { return null; } }, []);

  useEffect(() => {
    let stopped = false;
    void Promise.resolve().then(() => {
      if (stopped) return;
      // The L8 QR adds ?build: the same page opens the build resources.
      setBuild(new URLSearchParams(location.search).has("build"));
      try { setDevice(deviceToken()); } catch { setError("Allow browser storage so we can keep your place on the map."); }
    });
    return () => { stopped = true; };
  }, []);

  const counting = state.status === "written" && now < state.endsAt;
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [counting]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || !device || !ready) return;
    const validated = SubmitRequest.safeParse(draft);
    if (!validated.success) { setError(phoneWriteMessage("invalid")); return; }
    submitLock.current = true;
    setError(null);
    setState({ status: "submitting" });
    try {
      const sent = { ...draft };
      const result = SubmitResponse.parse(await writerRequest(`${WRITER_ROUTES.submit}?wait=1`, { body: validated.data, device, timeoutMs: 40_000 }));
      if (result.status === "failed") { setError("The write failed. Try again."); setState({ status: "form" }); return; }
      if (result.status === "written" && result.entityKey && result.block) {
        const writtenAt = Date.now();
        setNow(writtenAt);
        setState({ status: "written", key: result.entityKey as Hex, includedAt: BigInt(result.block), draft: sent, endsAt: writtenAt + sent.lifetimeSec * 1000 });
      } else setState({ status: "queued", draft: sent });
    } catch (err) { setError(phoneWriteMessage(err instanceof WriterRequestError ? err.code : undefined)); setState({ status: "form" }); }
    finally { submitLock.current = false; }
  }
  const ready = WRITER_CONNECTED && profile;
  const entityLink = profile && state.status === "written" ? explorerUrl(profile, "entity", state.key) : null;
  const left = state.status === "written" ? Math.max(0, state.endsAt - now) / 1000 : 0;
  return <div className="phone-surface"><main className="phone-main">
    <h1 className="phone-header">{build ? "Build on Arkiv this weekend" : "Join the map"}</h1>
    {!WRITER_CONNECTED && <p className="phone-notice">Not ready yet.</p>}
    {!profile && <p className="phone-notice">Network not configured</p>}
    {error && <p className="phone-notice" role="alert">{error}</p>}
    {build ? <BuildResources /> : state.status === "written" ? <section className="phone-entity" aria-live="polite">
      <p className="phone-status is-confirmed">Written in block #{state.includedAt.toString()}</p><LifetimeRing color={state.draft.color} progress={left / state.draft.lifetimeSec} muted={left === 0} /><h2>{state.draft.name}</h2><p className="phone-place">{new Intl.DisplayNames(["en"], { type: "region" }).of(state.draft.country)}</p>
      {left > 0 ? <p className="phone-countdown" aria-label="Time left">{formatClock(left)}</p> : <p className="phone-lifetime-status">Time’s up. Unless someone extended it, your entity has expired: that’s Entity Expiration.</p>}
      <code>{shortKey(state.key)}</code>
      {entityLink && <a className="entity-explorer" href={entityLink} target="_blank" rel="noreferrer">View in explorer <ArrowUpRight size={18} /></a>}
      {left === 0 && <button className="phone-submit" onClick={() => { setError(null); setState({ status: "form" }); }}>Write another</button>}
    </section> : state.status === "queued" ? <section className="phone-entity" role="status"><p className="phone-status">On its way</p><LifetimeRing color={state.draft.color} progress={0} muted /><h2>{state.draft.name}</h2><p>Your dot is on its way. Watch the map.</p></section> : <form className="phone-form" onSubmit={submit}>
      <label>Your name<input name="name" placeholder="Name or nickname" autoComplete="nickname" maxLength={NAME_MAX_CHARS} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <fieldset><legend>Pick a color</legend><div className="color-grid">{DOT_PALETTE.map((color) => <button key={color} type="button" className="color-swatch" style={{ background: color }} aria-label={DOT_COLOR_NAMES[color]} aria-pressed={draft.color === color} onClick={() => setDraft({ ...draft, color })} />)}</div></fieldset>
      <div className="phone-field"><span>Choose a country</span><CountryPicker value={draft.country} onChange={(country) => setDraft({ ...draft, country })} /></div>
      <label>How long should this data (entity) live?<output className="lifetime-value">{draft.lifetimeSec / 60} min</output><input type="range" style={{ background: `linear-gradient(to right, #fe7446 ${(draft.lifetimeSec - LIFETIME_MIN_SEC) / (LIFETIME_MAX_SEC - LIFETIME_MIN_SEC) * 100}%, var(--phone-track) 0)` }} min={LIFETIME_MIN_SEC} max={LIFETIME_MAX_SEC} step={LIFETIME_STEP_SEC} value={draft.lifetimeSec} onChange={(event) => setDraft({ ...draft, lifetimeSec: Number(event.target.value) })} /><span className="range-labels"><span>{LIFETIME_MIN_SEC / 60} min</span><span>{LIFETIME_MAX_SEC / 60} min</span></span></label><button className="phone-submit" disabled={!ready || !device || state.status === "submitting"}>{state.status === "submitting" ? "Writing… (a few seconds)" : "Write my entity"}</button>
    </form>}
  </main></div>;
}

/** 14:59, then 0:09: minutes and seconds left. */
function formatClock(seconds: number): string {
  const total = Math.ceil(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function BuildResources() {
  return <div className="build-resources"><a href="https://docs.arkiv.network/start-here/fundamentals/" target="_blank" rel="noreferrer"><BookOpen />Docs<ArrowUpRight /></a><a href="https://hub.arkiv.network/ai-tools" target="_blank" rel="noreferrer"><Plug />Arkiv AI plugin<ArrowUpRight /></a><a href="https://hub.arkiv.network/ai-tools#mcp" target="_blank" rel="noreferrer"><Terminal />Arkiv MCP<ArrowUpRight /></a><div className="resource-soon"><Gift /><span>Prizes<small>Announced soon</small></span></div><p>Your agent can help you build.</p></div>;
}
