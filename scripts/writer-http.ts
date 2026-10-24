export const writerUrl = (process.env.WRITER_URL ?? "https://mumbai-workshop-writer.santiagotrujillozuluaga.workers.dev").replace(/\/$/, "");
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
