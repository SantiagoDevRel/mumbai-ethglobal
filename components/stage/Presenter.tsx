"use client";

// Presenter chrome shared by /map and /slides: the password gate, the Reset button, and (on /map)
// the session sync with the writer.

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { PresenterStatus, SessionStartResponse } from "../../shared/writer-api";
import { WRITER_ROUTES, WRITER_CONNECTED, WriterRequestError } from "../../lib/data/writer-client";
import { waitVisible } from "../../lib/data/visible-poll";
import { presenterLogin, presenterRequest, usePresenterToken } from "../../lib/data/presenter-auth";
import { stage } from "../../lib/stage/store";
import "./presenter.css";

/** Children render only after the presenter password; the phones' /scan needs none. */
export function PresenterGate({ children }: { children: ReactNode }) {
  const token = usePresenterToken();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (token === null) return <div className="presenter-gate" />;
  if (token) return <>{children}</>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    if (typeof password !== "string" || !password) return;
    setBusy(true); setError(null);
    try { await presenterLogin(password); }
    catch (err) { setError(err instanceof WriterRequestError ? err.message : WRITER_CONNECTED ? "The writer is not answering. Try again." : "The workshop writer is not connected yet."); }
    finally { setBusy(false); }
  }
  return <main className="presenter-gate"><form className="gate-card" onSubmit={submit}>
    <Image src="/brand/arkiv-white.svg" alt="Arkiv" width={104} height={24} priority />
    <h1>Presenter</h1>
    <label>Password<input name="password" type="password" autoComplete="current-password" autoFocus required /></label>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy}>{busy ? "Checking…" : "Enter"}</button>
  </form></main>;
}

/** Reset: a new writer session (empty map, fresh limits for every phone) and the deck back at S0.
 * Two clicks, so a stray one during the talk does nothing. `inline` sits in the "?" card on /map;
 * otherwise it is a faint button in the bottom-right corner (/slides). */
export function PresenterBar({ inline = false }: { inline?: boolean }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disarm = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(disarm.current), []);
  async function click() {
    if (busy) return;
    if (!armed) { setArmed(true); setError(null); disarm.current = setTimeout(() => setArmed(false), 4000); return; }
    clearTimeout(disarm.current); setArmed(false); setBusy(true);
    try {
      const { code } = SessionStartResponse.parse(await presenterRequest(WRITER_ROUTES.presenter.sessionStart, {}));
      stage.dispatch({ type: "reset", session: code });
    } catch (err) { setError(err instanceof Error ? err.message : "Reset failed."); }
    finally { setBusy(false); }
  }
  return <div className={inline ? "presenter-bar is-inline" : "presenter-bar"}>
    {inline && <p>New session, empty map, first slide.</p>}
    {error && <span role="alert">{error}</span>}
    <button className={armed ? "is-armed" : undefined} disabled={busy} onClick={() => void click()}>{busy ? "Resetting…" : armed ? "Click again to reset" : "Reset"}</button>
  </div>;
}

/** /map keeps the stage on the writer's running session and starts one if there is none, so the
 * QR works from the first slide. */
export function usePresenterSession() {
  useEffect(() => {
    if (!WRITER_CONNECTED) return;
    const controller = new AbortController();
    async function poll() {
      try {
        let { session } = PresenterStatus.parse(await presenterRequest(WRITER_ROUTES.presenter.status));
        if (!session) session = SessionStartResponse.parse(await presenterRequest(WRITER_ROUTES.presenter.sessionStart, {})).code;
        if (!controller.signal.aborted && stage.getState().session !== session) stage.dispatch({ type: "session", code: session });
      } catch { /* The next poll retries; a rejected login brings the password form back. */ }
      // A hidden /map stops polling the writer until it is shown again.
      waitVisible(3000, controller.signal).then(poll, () => undefined);
    }
    void poll();
    return () => controller.abort();
  }, []);
}
