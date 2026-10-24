import { ErrorResponse, WRITER_ROUTES, type ErrorCode } from "../../shared/writer-api";

export const WRITER_URL = process.env.NEXT_PUBLIC_WRITER_URL?.replace(/\/$/, "") ?? "";
export { WRITER_ROUTES };

export class WriterRequestError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) { super(message); this.name = "WriterRequestError"; this.code = code; }
}

export async function writerRequest(path: string, options: { token?: string; body?: unknown; signal?: AbortSignal; device?: string } = {}): Promise<unknown> {
  if (!WRITER_URL) throw new Error("The workshop writer is not connected yet.");
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

/** Only the random device identity is durable; presenter credentials never enter localStorage. */
export function deviceToken(): string {
  const key = "arkiv-workshop-device";
  let value = localStorage.getItem(key);
  if (!value || !/^[a-f0-9-]{36}$/i.test(value)) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=2592000${location.protocol === "https:" ? "; Secure" : ""}`;
  return value;
}
