import { ErrorResponse, WRITER_ROUTES, type ErrorCode } from "../../shared/writer-api";

const configured = process.env.NEXT_PUBLIC_WRITER_URL?.replace(/\/$/, "") ?? "";
/** "same-origin": the writer is this app's own /api on Vercel. Any other value is the writer's base URL. */
export const WRITER_CONNECTED = configured !== "";
export const WRITER_URL = configured === "same-origin" ? "" : configured;
export { WRITER_ROUTES };

export class WriterRequestError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) { super(message); this.name = "WriterRequestError"; this.code = code; }
}

export async function writerRequest(path: string, options: { token?: string; body?: unknown; signal?: AbortSignal; device?: string } = {}): Promise<unknown> {
  if (!WRITER_CONNECTED) throw new Error("The workshop writer is not connected yet.");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.device) headers["x-device-token"] = options.device;
  const response = await fetch(WRITER_URL + path, { method: options.body === undefined ? "GET" : "POST", headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000), cache: "no-store" });
  const json: unknown = await response.json();
  if (!response.ok) {
    const error = ErrorResponse.safeParse(json);
    if (error.success) throw new WriterRequestError(error.data.error, error.data.message);
    throw new Error(`Writer request failed (${response.status}).`);
  }
  return json;
}

/** The phone's random device identity. (The presenter's 12-hour login token is kept by presenter-auth.) */
export function deviceToken(): string {
  const key = "arkiv-workshop-device";
  let value = localStorage.getItem(key);
  if (!value || !/^[a-f0-9-]{36}$/i.test(value)) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=2592000${location.protocol === "https:" ? "; Secure" : ""}`;
  return value;
}
