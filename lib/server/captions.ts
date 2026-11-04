// Live captions for the presenter pages (components/stage/Captions.tsx): the browser streams the
// presenter's microphone to Deepgram, authenticated with a short-lived token this writer grants. The
// Deepgram API key stays in the server-only DEEPGRAM_API_KEY: it never reaches a browser, a log, a
// `NEXT_PUBLIC_*` variable or this repo. Only a presenter login gets a token
// (GET /api/presenter/captions, lib/server/writer.ts).

import type { CaptionsToken } from "../../shared/writer-api";

export interface CaptionsEnv {
  /** A Deepgram API key with at least the Member role (it grants temporary tokens). */
  DEEPGRAM_API_KEY?: string;
}

export const DEEPGRAM_GRANT_URL = "https://api.deepgram.com/v1/auth/grant";
/** A token only has to be valid when the WebSocket opens; the stream then stays open. */
export const CAPTIONS_TOKEN_TTL_S = 60;

export type CaptionsResult =
  | { ok: true; token: CaptionsToken }
  | { ok: false; code: "captions_not_configured" | "captions_unavailable"; status: number; message: string };

/** A temporary Deepgram token, or a fixed reason. Provider bodies and headers never leave this function. */
export async function grantCaptionsToken(env: CaptionsEnv, fetchImpl: typeof fetch = fetch): Promise<CaptionsResult> {
  const key = env.DEEPGRAM_API_KEY?.trim() ?? "";
  if (!key) return { ok: false, code: "captions_not_configured", status: 503, message: "Live captions are not configured: set DEEPGRAM_API_KEY." };
  const unavailable = (detail: string): CaptionsResult => ({ ok: false, code: "captions_unavailable", status: 502, message: `Deepgram did not grant a captions token (${detail}).` });
  let response: Response;
  try {
    response = await fetchImpl(DEEPGRAM_GRANT_URL, {
      method: "POST",
      headers: { authorization: `Token ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ ttl_seconds: CAPTIONS_TOKEN_TTL_S }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
  } catch {
    return unavailable("no answer");
  }
  if (!response.ok) return unavailable(`HTTP ${response.status}`);
  let body: unknown;
  try { body = await response.json(); } catch { return unavailable("unreadable answer"); }
  const accessToken = (body as { access_token?: unknown } | null)?.access_token;
  const expiresIn = Number((body as { expires_in?: unknown } | null)?.expires_in ?? CAPTIONS_TOKEN_TTL_S);
  if (typeof accessToken !== "string" || accessToken.length < 20 || /\s/.test(accessToken)) return unavailable("no token in the answer");
  return { ok: true, token: { accessToken, expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : CAPTIONS_TOKEN_TTL_S } };
}
