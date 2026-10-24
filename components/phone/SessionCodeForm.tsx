"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SessionPublic } from "../../shared/writer-api";
import { writerRequest, WRITER_ROUTES, WRITER_URL } from "../../lib/data/writer-client";

export function SessionCodeForm({ onJoin, inactive = false }: { onJoin: (code: string, info: SessionPublic) => void; inactive?: boolean }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const normalized = code.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(normalized)) { setError("Enter the 8-character code on the screen."); return; }
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    setError(null);
    try {
      const info = SessionPublic.parse(await writerRequest(WRITER_ROUTES.session(normalized), { signal: controller.signal }));
      if (controller.signal.aborted) return;
      if (!info.valid) { setError("That code is not active. Check the screen and try again."); return; }
      onJoin(normalized, info);
    } catch { if (!controller.signal.aborted) setError("Unable to check the code. Try again."); }
    finally { request.current = null; if (!controller.signal.aborted) setChecking(false); }
  }

  return <form className="phone-form session-code-form" onSubmit={submit} aria-busy={checking} noValidate>
    {inactive && <p className="phone-notice" role="status">This session is no longer active. Enter the current code on the screen.</p>}
    <label htmlFor="workshop-code">Workshop code<input id="workshop-code" name="code" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={32} disabled={checking} aria-describedby="code-hint code-error" aria-invalid={!!error} value={code} onChange={(event) => { setCode(event.target.value.replace(/\s/g, "").toUpperCase()); setError(null); }} /></label>
    <p id="code-hint" className="doors-note">8 characters. Letters and numbers.</p>
    <p id="code-error" className="code-error" role="alert">{error}</p>
    <button className="phone-submit" disabled={checking || !WRITER_URL}>{checking ? "Checking code…" : "Join the map"}</button>
  </form>;
}
