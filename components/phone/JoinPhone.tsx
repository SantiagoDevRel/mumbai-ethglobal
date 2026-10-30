"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DOT_COLOR_NAMES, DOT_PALETTE, shortKey } from "../../shared/encoding";
import { explorerUrl, getProfile } from "../../shared/arkiv/profiles";
import { hasVisibleName, SubmitRequest, SubmitResponse } from "../../shared/writer-api";
import type { DotDraft, Hex } from "../../shared/types";
import { LIFETIME_DEFAULT_SEC, LIFETIME_MIN_SEC, LIFETIME_MAX_SEC, LIFETIME_STEP_SEC, MAX_ENTITIES_PER_DEVICE, NAME_MAX_CHARS, LONGEST_LIFETIME_LABEL } from "../../shared/types";
import { deviceToken, writerRequest, WriterRequestError, WRITER_ROUTES, WRITER_CONNECTED } from "../../lib/data/writer-client";
import { entityName, phoneWriteMessage, writtenWithoutExpiry } from "../../lib/data/phone-ticket";
import { CountryPicker } from "./CountryPicker";
import { LifetimeRing } from "./LifetimeRing";
import { ArrowUpRight, Check, InfinityIcon } from "lucide-react";
import "./phone.css";

/** `endsAt` is when the countdown reaches zero on this phone's clock, or null for an entity written
 * with Permanent: it shows "Permanent" with its deadline and never counts down. */
type PhoneState = { status: "form" } | { status: "submitting" } | { status: "queued"; draft: DotDraft } |
  { status: "written"; key: Hex; includedAt: bigint; draft: DotDraft; endsAt: number | null };
/** One entity this phone wrote: the rows under "Your entities". `key` is null while it is on its way. */
type Mine = { key: Hex | null; name: string; color: string; endsAt: number | null };

/** The longest choice, next to the slider: Rabdi's maximum lifetime, six months (shared/types.ts
 * MAX_LIFETIME_BLOCKS). It was "Permanent" (2**64 − 1) on the previous testnet; Rabdi refuses that
 * deadline. The toggle, the readout, the written entity and the list name it the same way. */
const LONGEST = LONGEST_LIFETIME_LABEL;

const MINE_KEY = "arkiv-mumbai-mine";
function loadMine(): Mine[] {
  try {
    const rows: unknown = JSON.parse(sessionStorage.getItem(MINE_KEY) ?? "[]");
    return Array.isArray(rows) ? (rows as Mine[]).filter((row) => typeof row?.name === "string" && (typeof row.endsAt === "number" || row.endsAt === null)).slice(0, MAX_ENTITIES_PER_DEVICE) : [];
  } catch { return []; }
}

/** Each write is one request: the phone sends the form and the writer answers once the entity is in a
 * block. A phone can write up to MAX_ENTITIES_PER_DEVICE entities per session ("Create new entity"),
 * and every countdown runs on the phone's own clock from the chosen lifetime; nothing is fetched.
 * "Permanent" writes the entity with the deadline 2**64 − 1: no countdown, nothing to count.
 * Everything the phone writes is lower case (Santiago, October 29): the name is lowercased as you
 * type, and the country is stored as its lower-case code ("in"). */
export function JoinPhone() {
  const [device, setDevice] = useState("");
  const [state, setState] = useState<PhoneState>({ status: "form" });
  const [draft, setDraft] = useState<DotDraft>({ name: "", color: DOT_PALETTE[0], country: "in", lifetimeSec: LIFETIME_DEFAULT_SEC });
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [mine, setMine] = useState<Mine[]>([]);
  const [nameMissing, setNameMissing] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const submitLock = useRef(false);
  const profile = useMemo(() => { try { return getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE); } catch { return null; } }, []);

  useEffect(() => {
    let stopped = false;
    void Promise.resolve().then(() => {
      if (stopped) return;
      try { setDevice(deviceToken()); } catch { setError("Allow browser storage so we can keep your place on the map."); }
      setMine(loadMine());
    });
    return () => { stopped = true; };
  }, []);

  function remember(row: Mine) {
    setMine((rows) => {
      const next = [row, ...rows].slice(0, MAX_ENTITIES_PER_DEVICE);
      try { sessionStorage.setItem(MINE_KEY, JSON.stringify(next)); } catch { /* The list is a convenience. */ }
      return next;
    });
  }
  const counting = mine.some((row) => row.endsAt !== null && now < row.endsAt);
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [counting]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    // The name labels the dot on the map: no write without one you can see.
    if (!hasVisibleName(draft.name)) { setNameMissing(true); nameInput.current?.focus(); return; }
    if (!device || !ready) return;
    const validated = SubmitRequest.safeParse(draft);
    if (!validated.success) { setError(phoneWriteMessage("invalid")); return; }
    submitLock.current = true;
    setError(null);
    setState({ status: "submitting" });
    try {
      // What the writer stores (trimmed, lower case), so the ticket shows the entity as written.
      const sent: DotDraft = validated.data;
      const result = SubmitResponse.parse(await writerRequest(`${WRITER_ROUTES.submit}?wait=1`, { body: validated.data, device, timeoutMs: 40_000 }));
      if (result.status === "failed") { setError("The write failed. Try again."); setState({ status: "form" }); return; }
      if (result.status === "written" && result.entityKey && result.block) {
        const writtenAt = Date.now();
        const endsAt = writtenWithoutExpiry(result.expiresAtBlock, sent.noExpiry) ? null : writtenAt + sent.lifetimeSec * 1000;
        setNow(writtenAt);
        setState({ status: "written", key: result.entityKey as Hex, includedAt: BigInt(result.block), draft: sent, endsAt });
        remember({ key: result.entityKey as Hex, name: sent.name, color: sent.color, endsAt });
      } else {
        setState({ status: "queued", draft: sent });
        remember({ key: null, name: sent.name, color: sent.color, endsAt: sent.noExpiry ? null : Date.now() + sent.lifetimeSec * 1000 });
      }
    } catch (err) { setError(phoneWriteMessage(err instanceof WriterRequestError ? err.code : undefined)); setState({ status: "form" }); }
    finally { submitLock.current = false; }
  }
  const ready = WRITER_CONNECTED && profile;
  const entityLink = profile && state.status === "written" ? explorerUrl(profile, "entity", state.key) : null;
  const left = state.status === "written" && state.endsAt !== null ? Math.max(0, state.endsAt - now) / 1000 : 0;
  const forever = draft.noExpiry === true;
  const full = mine.length >= MAX_ENTITIES_PER_DEVICE;
  const another = state.status === "written" || state.status === "queued" ? <button className="phone-submit" disabled={full} onClick={() => { setError(null); setState({ status: "form" }); }}>{full ? `That’s ${MAX_ENTITIES_PER_DEVICE} entities, the limit` : "Create new entity"}</button> : null;
  return <div className="phone-surface"><main className="phone-main">
    <h1 className="phone-header">Your first entity</h1>
    {!WRITER_CONNECTED && <p className="phone-notice">Not ready yet.</p>}
    {!profile && <p className="phone-notice">Network not configured</p>}
    {error && <p className="phone-notice" role="alert">{error}</p>}
    {state.status === "written" ? <section className="phone-entity" aria-live="polite">
      <p className="phone-status is-confirmed">Written in block #{state.includedAt.toString()}</p><LifetimeRing color={state.draft.color} progress={state.endsAt === null ? 1 : left / state.draft.lifetimeSec} muted={state.endsAt !== null && left === 0} /><h2>{state.draft.name}</h2><p className="phone-place">{new Intl.DisplayNames(["en"], { type: "region" }).of(state.draft.country.toUpperCase())}</p>
      {state.endsAt === null ? <><p className="phone-lifetime-status">{LONGEST}</p><p className="phone-expires-at"><span>The longest lifetime</span> Rabdi allows</p></> : left > 0 ? <p className="phone-countdown" aria-label="Time left">{formatClock(left)}</p> : <p className="phone-lifetime-status">Time’s up. Unless someone extended it, your entity has expired: that’s Entity Expiration.</p>}
      <code>{shortKey(state.key)}</code>
      {entityLink && <a className="entity-explorer" href={entityLink} target="_blank" rel="noreferrer">View in explorer <ArrowUpRight size={18} /></a>}
    </section> : state.status === "queued" ? <section className="phone-entity" role="status"><p className="phone-status">On its way</p><LifetimeRing color={state.draft.color} progress={0} muted /><h2>{state.draft.name}</h2><p>Your dot is on its way. Watch the map.</p></section> : <form className="phone-form" onSubmit={submit} noValidate>
      <label>Your name<input ref={nameInput} name="name" placeholder="Name or nickname" autoComplete="nickname" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={NAME_MAX_CHARS} required aria-invalid={nameMissing} aria-describedby={nameMissing ? "name-missing" : undefined} value={draft.name} onChange={(event) => { const name = lowerCaseName(event.currentTarget); setDraft({ ...draft, name }); if (hasVisibleName(name)) setNameMissing(false); }} /></label>
      {nameMissing && <p className="phone-field-error" id="name-missing" role="alert">Add a name or nickname: it shows next to your dot.</p>}
      <fieldset><legend>Pick a color</legend><div className="color-grid">{DOT_PALETTE.map((color) => <button key={color} type="button" className="color-swatch" style={{ background: color }} aria-label={DOT_COLOR_NAMES[color]} aria-pressed={draft.color === color} onClick={() => setDraft({ ...draft, color })} />)}</div></fieldset>
      <div className="phone-field"><span>Choose a country</span><CountryPicker value={draft.country} onChange={(country) => setDraft({ ...draft, country })} /></div>
      {/* The longest choice sits under the slider and switches it off: the entity is written with
          Rabdi's maximum lifetime, six months (LONGEST). The slider keeps its value. */}
      <div className={`phone-lifetime${forever ? " is-forever" : ""}`}>
        <div className="lifetime-head"><label htmlFor="lifetime">How long should this data (entity) live?</label><output className="lifetime-value" htmlFor="lifetime">{forever ? <>{LONGEST} <small>max</small></> : `${draft.lifetimeSec / 60} min`}</output></div>
        <input id="lifetime" type="range" disabled={forever} style={{ background: forever ? "var(--phone-track)" : `linear-gradient(to right, #fe7446 ${(draft.lifetimeSec - LIFETIME_MIN_SEC) / (LIFETIME_MAX_SEC - LIFETIME_MIN_SEC) * 100}%, var(--phone-track) 0)` }} min={LIFETIME_MIN_SEC} max={LIFETIME_MAX_SEC} step={LIFETIME_STEP_SEC} value={draft.lifetimeSec} onChange={(event) => setDraft({ ...draft, lifetimeSec: Number(event.target.value) })} /><span className="range-labels"><span>{LIFETIME_MIN_SEC / 60} min</span><span>{LIFETIME_MAX_SEC / 60} min</span></span>
        <button type="button" className="lifetime-forever" aria-pressed={forever} onClick={() => setDraft({ ...draft, noExpiry: !forever })}><InfinityIcon size={20} aria-hidden="true" /><span>{LONGEST} <small>the longest</small></span><span className="lifetime-forever-box" aria-hidden="true">{forever && <Check size={16} strokeWidth={3} />}</span></button>
      </div>
      <button className="phone-submit" disabled={!ready || !device || state.status === "submitting"}>{state.status === "submitting" ? "Writing… (a few seconds)" : "Write my entity"}</button>
    </form>}
    {another && <div className="phone-another">{another}</div>}
    {mine.length > 0 && <section className="phone-mine" aria-label="Your entities">
      <h2>Your entities <span>{mine.length} of {MAX_ENTITIES_PER_DEVICE}</span></h2>
      <ul>{mine.map((row, index) => {
        const rest = row.endsAt === null ? 0 : Math.max(0, row.endsAt - now) / 1000;
        const link = profile && row.key ? explorerUrl(profile, "entity", row.key) : null;
        return <li key={`${row.key ?? "queued"}-${index}`}>
          <span className="phone-mine-dot" style={{ background: row.color }} aria-hidden="true" />
          <span className="phone-mine-name">{row.name}</span>
          <span className="phone-mine-time">{!row.key ? "on its way" : row.endsAt === null ? LONGEST : rest > 0 ? formatClock(rest) : "expired"}</span>
          {link ? <a href={link} target="_blank" rel="noreferrer" aria-label={`View ${row.name} in explorer`}><ArrowUpRight size={16} /></a> : <span />}
        </li>;
      })}</ul>
    </section>}
  </main></div>;
}

/** Keeps the name field in lower case as you type or paste (entityName), with the caret where it was:
 * a controlled input whose value changes under it would jump to the end. */
function lowerCaseName(input: HTMLInputElement): string {
  const name = entityName(input.value);
  if (name !== input.value) {
    const { selectionStart, selectionEnd } = input;
    input.value = name;
    if (selectionStart !== null && selectionEnd !== null) input.setSelectionRange(Math.min(selectionStart, name.length), Math.min(selectionEnd, name.length));
  }
  return name;
}

/** 14:59, then 0:09: minutes and seconds left. */
function formatClock(seconds: number): string {
  const total = Math.ceil(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
