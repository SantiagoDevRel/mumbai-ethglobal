import { randomUUID } from "node:crypto";
import { delay, presenterRequest, writerRequest } from "./writer-http.ts";

if (!process.argv.includes("--approved")) throw new Error("The on-chain load test requires explicit gas authorization; rerun with --approved only after it is granted.");
const { code } = await presenterRequest<{ code: string }>("session/start", {});
const results: { latencyMs?: number; error?: string; txHash?: string; block?: string }[] = [];
const errors: string[] = [];
const startedAt = Date.now();
try {
  await presenterRequest("doors", { open: true });
  const phones = Array.from({ length: 200 }, (_, index) => (async () => {
    await delay(Math.max(0, startedAt + index * 150 - Date.now()));
    const submittedAt = Date.now();
    try {
      const accepted = await writerRequest<{ ticket: string }>("/api/submit", { session: code, name: `Phone ${index + 1}`, color: "#fe7446", country: "IN", lifetimeSec: 120 }, { "x-device-token": randomUUID() });
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        const ticket = await writerRequest<{ status: string; error?: string; entityKey?: string; txHash?: string; block?: string }>(`/api/ticket/${accepted.ticket}`);
        if (ticket.status === "failed") throw new Error(ticket.error ?? "Writer failed the submission.");
        if (ticket.entityKey) { results.push({ latencyMs: Date.now() - submittedAt, txHash: ticket.txHash, block: ticket.block }); return; }
        await delay(500);
      }
      throw new Error("Ticket confirmation deadline exceeded.");
    } catch (error) { const message = error instanceof Error ? error.message : "Unknown submission error"; errors.push(message); results.push({ error: message }); }
  })());
  await Promise.all(phones);
  const times = results.flatMap(result => result.latencyMs === undefined ? [] : [result.latencyMs]).sort((a, b) => a - b);
  const percentile = (p: number) => times.length ? times[Math.min(times.length - 1, Math.ceil(times.length * p) - 1)] : null;
  const status = await presenterRequest<{ balanceWei: string; requestsToday: number }>("status");
  const report = { session: code, phones: 200, submissionWindowMs: 30_000, written: times.length, dropped: errors.length,
    nonceErrors: errors.filter(error => /nonce/i.test(error)).length, medianSubmitToConfirmationMs: percentile(0.5), p95SubmitToConfirmationMs: percentile(0.95),
    measurement: "HTTP submit to first written ticket observation; an upper bound on inclusion latency.",
    txHashes: [...new Set(results.flatMap(result => result.txHash ? [result.txHash] : []))], balanceWei: status.balanceWei, requestsToday: status.requestsToday, errors };
  console.log(JSON.stringify(report));
  if (errors.length || (percentile(0.5) ?? Infinity) >= 6_000) process.exitCode = 1;
} finally { await presenterRequest("session/end", {}); }
