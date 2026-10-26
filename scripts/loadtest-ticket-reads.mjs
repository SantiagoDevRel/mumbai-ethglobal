// Read-only load: existing written tickets plus the join page's session polls, no session changes or gas.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const arg = name => process.argv[process.argv.indexOf(name) + 1];
assert.ok(process.argv.includes("--tickets") && process.argv.includes("--report"), "Provide an existing campaign --tickets file and a new --report path.");
assert.ok(process.env.WORKSHOP_PRESENTER_TOKEN, "WORKSHOP_PRESENTER_TOKEN is required for upstream counters.");
const writer = (process.env.APP_ORIGIN ?? process.env.WRITER_URL ?? "https://mumbai-ethglobal.vercel.app").replace(/\/$/, "");
// A protected preview accepts the local Vercel OIDC token (`vercel env run -- …`).
const PROTECTION = process.env.VERCEL_OIDC_TOKEN ? { "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN } : {};
const input = await readFile(arg("--tickets"));
const campaign = JSON.parse(input.toString());
const tickets = campaign.phones.map(phone => phone.ticket);
assert.equal(tickets.length, 200); assert.equal(new Set(tickets).size, 200);
assert.ok(tickets.every(ticket => /^[0-9a-f-]{36}$/i.test(ticket)));
const file = await open(arg("--report"), "wx", 0o644);
const durationMs = 180000, intervalMs = 5000, rounds = durationMs / intervalMs;
const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
async function metrics() {
  const response = await fetch(`${writer}/api/presenter/read-metrics`, { headers: { ...PROTECTION, authorization: `Bearer ${process.env.WORKSHOP_PRESENTER_TOKEN}` }, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, "Presenter metrics unavailable."); return response.json();
}
const before = await metrics();
assert.ok(before.requestsToday + 7202 < 95000, "This campaign would consume the reserved daily Worker request budget.");
const samples = [], errors = [];
const report = { schema: 1, writerUrl: writer, inputSha256: createHash("sha256").update(input).digest("hex"),
  session: campaign.session, phones: 200, durationMs, intervalMs, expectedRequests: 7200,
  workload: "200 distinct historical written tickets from one session; each polls the writer every five seconds with evenly staggered phases. No RPC calls from the clients, creates, signatures or session changes.",
  startedAt: new Date().toISOString(), status: "running", before, samples, errors };
async function checkpoint() { const text = JSON.stringify(report, null, 2) + "\n"; await file.write(text, 0, "utf8"); await file.truncate(Buffer.byteLength(text)); await file.sync(); }
const epoch = performance.now();
let progress;
try {
  progress = setInterval(() => console.log(JSON.stringify({ elapsedMs: Math.round(performance.now() - epoch), completed: samples.length, errors: errors.length })), 30000);
  // Each phone also asks for the session every three seconds, as the join page does; the CDN answers most.
  const sessionPolls = report.sessionPolls = { requests: 0, cache: {}, errors: 0 };
  const pollingSessions = Promise.all(tickets.map(async (_ticket, index) => {
    for (let round = 0; round < durationMs / 3000; round++) {
      await sleep(epoch + round * 3000 + index * 3000 / tickets.length - performance.now());
      try {
        const response = await fetch(`${writer}/api/session`, { headers: PROTECTION, signal: AbortSignal.timeout(10000) });
        const cache = response.headers.get("x-vercel-cache") ?? "none";
        sessionPolls.cache[cache] = (sessionPolls.cache[cache] ?? 0) + 1;
        if (response.status !== 200) sessionPolls.errors++;
        await response.arrayBuffer();
      } catch { sessionPolls.errors++; }
      sessionPolls.requests++;
    }
  }));
  await Promise.all(tickets.map(async (ticket, index) => {
    let previousBlock = 0n;
    for (let round = 0; round < rounds; round++) {
      const plannedMs = round * intervalMs + index * intervalMs / tickets.length;
      await sleep(epoch + plannedMs - performance.now());
      const start = performance.now();
      let status = 0, live, block;
      try {
        const response = await fetch(`${writer}/api/ticket/${ticket}`, { headers: { ...PROTECTION, origin: writer }, signal: AbortSignal.timeout(10000) });
        status = response.status; const body = await response.json();
        assert.equal(status, 200); assert.equal(body.status, "written");
        assert.equal(typeof body.live, "boolean"); assert.match(body.currentBlock ?? "", /^\d+$/);
        assert.match(body.expiresAtBlock ?? "", /^\d+$/);
        block = body.currentBlock; live = body.live;
        assert.ok(BigInt(block) >= previousBlock); previousBlock = BigInt(block);
      } catch (error) { errors.push({ phone: index, round, status, message: error instanceof Error ? error.message.slice(0, 400) : "Ticket read failed." }); }
      samples.push({ phone: index, round, plannedMs, startedMs: Math.round(start - epoch), latencyMs: Math.round(performance.now() - start), status, live, block });
    }
  }));
  await pollingSessions;
  await sleep(epoch + durationMs - performance.now());
  report.after = await metrics();
  const delta = name => report.after[name] - before[name];
  report.upstream = { calls: delta("calls"), ticketQueries: delta("ticketQueries"), http429: delta("http429"), rpc429: delta("rpc429"), errors: delta("errors"),
    byMethod: Object.fromEntries(Object.entries(report.after.byMethod).map(([method, count]) => [method, count - (before.byMethod[method] ?? 0)]).filter(([, count]) => count)) };
  const latencies = samples.map(sample => sample.latencyMs).sort((a, b) => a - b);
  report.p50Ms = latencies[Math.ceil(latencies.length * 0.50) - 1]; report.p95Ms = latencies[Math.ceil(latencies.length * 0.95) - 1]; report.maxMs = latencies.at(-1);
  report.workerRequests = delta("requestsToday"); report.client429 = samples.filter(sample => sample.status === 429).length;
  report.completedRequests = samples.length;
  report.observedBlocks = new Set(samples.map(sample => sample.block).filter(Boolean)).size;
  report.status = errors.length || report.client429 || report.upstream.http429 || report.upstream.rpc429 || report.upstream.errors || samples.length !== 7200 || report.sessionPolls.errors ? "failed" : "passed";
  // The window is bounded independently of the number of phones. Network checks
  // are counted separately from session queries, rather than hidden in the total.
  assert.ok(report.upstream.ticketQueries <= 92, "More than one session query per roughly two-second refresh window.");
  if (report.status !== "passed") process.exitCode = 1;
} catch (error) { report.status = "failed"; report.error = error instanceof Error ? error.message : "Load run failed."; process.exitCode = 1; }
finally {
  clearInterval(progress); report.elapsedMs = Math.round(performance.now() - epoch); report.finishedAt = new Date().toISOString();
  await checkpoint(); await file.close();
  console.log(JSON.stringify({ status: report.status, requests: samples.length, p95Ms: report.p95Ms, upstream: report.upstream, client429: report.client429, sessionPolls: report.sessionPolls }));
}
