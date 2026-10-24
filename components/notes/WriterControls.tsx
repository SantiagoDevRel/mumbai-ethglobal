"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { DoorsRequest, PhaseRequest, PresenterStatus, SessionStartResponse } from "../../shared/writer-api";
import { writerRequest, WRITER_ROUTES, WRITER_URL } from "../../lib/data/writer-client";
import { setPresenterToken, usePresenterToken } from "../../lib/data/presenter-auth";
import { stage } from "../../lib/stage/store";
import "./writer-controls.css";
import { setSourceMode, useSourceMode, type SourceMode } from "../../lib/data/source-mode";

function syncWriterStatus(next: PresenterStatus, reconcile = false) {
  const current = stage.getState();
  const newSession = current.session !== next.session;
  if (newSession) stage.dispatch({ type: "session", code: next.session });
  // A status poll must not undo a newer keyboard command whose HTTP request is in flight.
  if (newSession || reconcile) {
    if (current.doors !== next.doors) stage.dispatch({ type: "doors", open: next.doors === "open" });
    if (current.phase !== next.phase) stage.dispatch({ type: "phase", phase: next.phase });
  }
}

/** No props. Mount <WriterControls /> on /notes inside the notes store connection. */
export function WriterControls() {
  const sourceMode = useSourceMode();
  const token = usePresenterToken();
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [status, setStatus] = useState<PresenterStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!token || !WRITER_URL) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = PresenterStatus.parse(await writerRequest(WRITER_ROUTES.presenter.status, { token, signal: controller.signal }));
        if (!controller.signal.aborted) {
          setStatus(next); setError(null);
          syncWriterStatus(next);
        }
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Writer unavailable."); }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token]);

  async function action(path: string, body: unknown = {}) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null);
    try {
      const result = await writerRequest(path, { token, body });
      if (path === WRITER_ROUTES.presenter.sessionStart) stage.dispatch({ type: "session", code: SessionStartResponse.parse(result).code });
      if (path === WRITER_ROUTES.presenter.sessionEnd) stage.dispatch({ type: "session", code: null });
      if (path === WRITER_ROUTES.presenter.doors) stage.dispatch({ type: "doors", open: DoorsRequest.parse(body).open });
      if (path === WRITER_ROUTES.presenter.phase) stage.dispatch({ type: "phase", phase: PhaseRequest.parse(body).phase });
      const next = PresenterStatus.parse(await writerRequest(WRITER_ROUTES.presenter.status, { token }));
      setStatus(next);
      syncWriterStatus(next, true);
    } catch (err) { setError(err instanceof Error ? err.message : "Writer action failed."); }
    finally { busy.current = false; setPending(false); }
  }
  function authorize(event: FormEvent) { event.preventDefault(); if (input.current?.value.trim()) { setPresenterToken(input.current.value.trim()); input.current.value = ""; } }
  return <section className="writer-controls"><h2>Workshop writer</h2>{!WRITER_URL && <p>The workshop writer is not connected yet.</p>}
    <div className="writer-stage-controls"><label>Stage data<select aria-label="Stage data source" value={sourceMode} onChange={(event) => setSourceMode(event.target.value as SourceMode)}><option value="auto">Auto</option><option value="mock">Mock</option><option value="live">Live</option></select></label><button onClick={() => stage.dispatch({ type: "togglePanel", panel: "filters" })}>Filters F</button><button onClick={() => stage.dispatch({ type: "togglePanel", panel: "query" })}>Query Q</button></div>
    <form onSubmit={authorize}><label>Presenter token<input ref={input} type="password" autoComplete="off" placeholder={token ? "Token saved for this tab" : "Enter presenter token"} aria-label="Presenter token" /></label><button>Connect</button></form>
    {error && <p role="alert">{error}</p>}
    {status && <><dl><div><dt>Session</dt><dd>{status.session ?? "Not started"}</dd></div><div><dt>Network</dt><dd>{status.network ?? "Network not configured"}</dd></div><div><dt>Queue</dt><dd>{status.queued} queued · {status.inFlight ? "sending" : "idle"}</dd></div><div><dt>Writes</dt><dd>{status.written} written · {status.failed} failed</dd></div><div><dt>Wallet balance</dt><dd>{status.balanceWei} wei</dd></div><div><dt>Worker requests today</dt><dd>{status.requestsToday}</dd></div></dl><div className="writer-buttons">
      <button disabled={pending} onClick={() => void action(WRITER_ROUTES.presenter.sessionStart)}>Start session</button><button disabled={pending || !status.session} onClick={() => void action(WRITER_ROUTES.presenter.sessionEnd)}>End session</button>
      <button disabled={pending || !status.session} onClick={() => void action(WRITER_ROUTES.presenter.doors, { open: status.doors !== "open" })}>{status.doors === "open" ? "Close doors" : "Open doors"}</button>
      <button disabled={pending} onClick={() => void action(status.held ? WRITER_ROUTES.presenter.resume : WRITER_ROUTES.presenter.hold)}>{status.held ? "Resume writer" : "Hold writer"}</button>
      <button disabled={pending} onClick={() => void action(WRITER_ROUTES.presenter.phase, { phase: status.phase === "build" ? "talk" : "build" })}>{status.phase === "build" ? "Back to talk" : "Show phone resources"}</button>
    </div></>}
  </section>;
}
