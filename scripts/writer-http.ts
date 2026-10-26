// The writer is the app's own /api (APP_ORIGIN; WRITER_URL is the older name).
export const writerUrl = (process.env.APP_ORIGIN ?? process.env.WRITER_URL ?? "https://mumbai-ethglobal.vercel.app").replace(/\/$/, "");
// A protected preview accepts the local Vercel OIDC token (`vercel env run -- …`). Every request to
// the app carries it, including the SDK's reads through /api/rpc; other hosts never see it.
const protection = process.env.VERCEL_OIDC_TOKEN;
if (protection) {
  const base = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(`${writerUrl}/`)) return base(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("x-vercel-trusted-oidc-idp-token", protection);
    return base(input, { ...init, headers });
  };
}
export async function writerRequest<T>(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${writerUrl}${path}`, { method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
  const data = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(`Writer ${response.status}: ${data.message ?? "request failed"}`);
  return data;
}
export function presenterRequest<T>(path: string, body?: unknown): Promise<T> {
  if (!process.env.WORKSHOP_PRESENTER_TOKEN) throw new Error("WORKSHOP_PRESENTER_TOKEN is required.");
  return writerRequest<T>(`/api/presenter/${path}`, body, { authorization: `Bearer ${process.env.WORKSHOP_PRESENTER_TOKEN}` });
}
export const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
