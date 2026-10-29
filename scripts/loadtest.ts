import { randomUUID } from "node:crypto";
import { open } from "node:fs/promises";
import { decodeEventLog } from "viem";
import { ENTITY_EVENTS_ABI } from "@arkiv-network/sdk/entity";
import { createArkivAdapter } from "../shared/arkiv/sdk-0.8.ts";
import { createSdkClients } from "../shared/arkiv/clients-0.8.ts";
import { getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import type { Hex } from "../shared/types.ts";
import { delay, presenterRequest, writerRequest } from "./writer-http.ts";
import { writerUrl } from "./writer-http.ts";

if (!process.argv.includes("--approved")) throw new Error("The on-chain load test requires explicit gas authorization; rerun with --approved only after it is granted.");
if (!process.env.WORKSHOP_PRESENTER_TOKEN) throw new Error("A presenter token is required.");
const MINIMUM_BALANCE = 8n * 10n ** 18n;
const reportIndex = process.argv.indexOf("--report");
const reportFile = reportIndex >= 0 ? await open(process.argv[reportIndex + 1]!, "wx", 0o600) : undefined;
const profile = getProfile(process.env.ARKIV_PROFILE);
const { reader } = createSdkClients({ profile, creator: WRITER_ADDRESS, read: { kind: "public" } });
const observer = createArkivAdapter({ profile, creator: WRITER_ADDRESS, read: { kind: "proxy", url: `${writerUrl}/api/rpc`, presenterToken: process.env.WORKSHOP_PRESENTER_TOKEN } });
interface Phone { index: number; submittedAt?: number; acceptedAt?: number; confirmedAt?: number; visibleAt?: number; ticket?: string; entityKey?: Hex; txHash?: Hex; block?: string; error?: string }
const phones: Phone[] = Array.from({ length: 200 }, (_, index) => ({ index }));
const visible = new Map<Hex, number>();
const queryErrors: string[] = [];
let code: string | undefined;
let stopped: string | undefined;
let stopPromise: Promise<void> | undefined;
let done = false;
let observerTask: Promise<void> | undefined;
let guardTask: Promise<void> | undefined;
let startedAt = 0;
let balanceBefore = 0n;
let minimumObservedBalance = 0n;
let observationQuery = "";
const checkpoint = async (value: unknown) => {
  if (!reportFile) return;
  const content = Buffer.from(JSON.stringify(value, null, 2));
  await reportFile.write(content, 0, content.length, 0);
  await reportFile.truncate(content.length);
  await reportFile.sync();
};
const stop = async (reason: string) => {
  stopped ??= reason;
  stopPromise ??= (async () => {
    await presenterRequest("hold", {});
    await presenterRequest("doors", { open: false });
  })();
  await stopPromise;
};

try {
  await checkpoint({ state: "preflight", requestedPhones: 200, submissionWindowMs: 30_000, minimumBalanceWei: String(MINIMUM_BALANCE) });
  balanceBefore = await reader.getBalance({ address: WRITER_ADDRESS });
  minimumObservedBalance = balanceBefore;
  if (balanceBefore < MINIMUM_BALANCE) throw new Error("Writer balance is below the authorized 8 GLM floor.");
  const initial = await presenterRequest<{ queued: number; inFlight: boolean }>("status");
  if (initial.queued || initial.inFlight) throw new Error("The writer must be idle before starting a dedicated load-test session.");
  ({ code } = await presenterRequest<{ code: string }>("session/start", {}));
  await presenterRequest("doors", { open: true });
  startedAt = Date.now();
  await checkpoint({ state: "running", session: code, startedAt, requestedPhones: 200, minimumBalanceWei: String(MINIMUM_BALANCE), balanceBeforeWei: String(balanceBefore) });
  console.log(JSON.stringify({ state: "started", session: code, phones: 200, balanceBeforeWei: String(balanceBefore), minimumBalanceWei: String(MINIMUM_BALANCE) }));
  observerTask = (async () => {
    let lastBlock: bigint | undefined;
    while (!done && !stopped) {
      try {
        const block = await observer.getBlock();
        if (block.number !== lastBlock) {
          const run = await observer.query({ kinds: ["dot"], session: code });
          const observedAt = Date.now();
          observationQuery = run.description.query;
          for (const entity of run.entities) if (!visible.has(entity.key)) visible.set(entity.key, observedAt);
          lastBlock = block.number;
        }
      } catch (error) { queryErrors.push(error instanceof Error ? error.message : "Query observation failed."); }
      await delay(700);
    }
  })();
  guardTask = (async () => {
    while (!done && !stopped) {
      try {
        const balance = await reader.getBalance({ address: WRITER_ADDRESS });
        if (balance < minimumObservedBalance) minimumObservedBalance = balance;
        if (balance < MINIMUM_BALANCE) await stop("Writer balance dropped below 8 GLM.");
      } catch { await stop("Balance monitoring failed; stopping rather than spending without the guard."); }
      await delay(1_000);
    }
  })().catch(error => { stopped ??= error instanceof Error ? error.message : "Balance guard failed."; });
  await Promise.all(phones.map(async phone => {
    await delay(Math.max(0, startedAt + phone.index * 150 - Date.now()));
    if (stopped) { phone.error = "Not submitted: balance guard stopped the campaign."; return; }
    phone.submittedAt = Date.now();
    try {
      const accepted = await writerRequest<{ ticket: string }>("/api/submit", { session: code, name: `phone ${phone.index + 1}`, color: "#fe7446", country: "in", lifetimeSec: 300 }, { "x-device-token": randomUUID() });
      phone.acceptedAt = Date.now(); phone.ticket = accepted.ticket;
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline && !stopped) {
        const ticket = await writerRequest<{ status: string; error?: string; entityKey?: Hex; txHash?: Hex; block?: string }>(`/api/ticket/${accepted.ticket}`);
        if (ticket.status === "failed") throw new Error(ticket.error ?? "Writer failed the submission.");
        if (ticket.entityKey) { phone.confirmedAt = Date.now(); phone.entityKey = ticket.entityKey; phone.txHash = ticket.txHash; phone.block = ticket.block; return; }
        await delay(500);
      }
      throw new Error(stopped ?? "Ticket confirmation deadline exceeded.");
    } catch (error) { phone.error = error instanceof Error ? error.message : "Unknown submission error"; }
  }));
  const visibilityDeadline = Date.now() + 30_000;
  while (!stopped && phones.some(phone => phone.entityKey && !visible.has(phone.entityKey)) && Date.now() < visibilityDeadline) await delay(200);
  done = true;
  await Promise.allSettled([observerTask, guardTask]);
  for (const phone of phones) if (phone.entityKey) phone.visibleAt = visible.get(phone.entityKey);
  const percentile = (values: number[], p: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]! : null;
  };
  const confirmationTimes = phones.flatMap(phone => phone.confirmedAt && phone.submittedAt ? [phone.confirmedAt - phone.submittedAt] : []);
  const visibleTimes = phones.flatMap(phone => phone.visibleAt && phone.submittedAt ? [phone.visibleAt - phone.submittedAt] : []);
  const hashes = [...new Set(phones.flatMap(phone => phone.txHash ? [phone.txHash] : []))];
  const batches = [];
  for (const hash of hashes) {
    const receipt = await reader.getTransactionReceipt({ hash });
    if (receipt.status !== "success" || receipt.from.toLowerCase() !== WRITER_ADDRESS.toLowerCase()) throw new Error("A reported load-test transaction did not succeed from the writer.");
    let size = 0;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== "0x4400000000000000000000000000000000000044") continue;
      const event = decodeEventLog({ abi: ENTITY_EVENTS_ABI, topics: log.topics, data: log.data });
      if (event.eventName === "EntityCreated") size++;
    }
    batches.push({ txHash: hash, block: String(receipt.blockNumber), size, gasUsed: String(receipt.gasUsed), gasCostWei: String(receipt.gasUsed * receipt.effectiveGasPrice) });
  }
  const status = await presenterRequest<{ balanceWei: string; requestsToday: number }>("status");
  const balanceAfter = await reader.getBalance({ address: WRITER_ADDRESS });
  if (balanceAfter < minimumObservedBalance) minimumObservedBalance = balanceAfter;
  const lastVisibleAt = Math.max(startedAt, ...phones.flatMap(phone => phone.visibleAt ? [phone.visibleAt] : []));
  const errors = phones.flatMap(phone => phone.error ? [phone.error] : []);
  const summary = { session: code, requestedPhones: 200, submitted: phones.filter(phone => phone.submittedAt).length,
    accepted: phones.filter(phone => phone.ticket).length, written: confirmationTimes.length, visible: visibleTimes.length,
    submissionWindowMs: 30_000, observedSubmissionSpanMs: Math.max(startedAt, ...phones.flatMap(phone => phone.submittedAt ? [phone.submittedAt] : [])) - startedAt,
    offeredEntitiesPerSecond: 200 / 30, entitiesPerSecond: visibleTimes.length / ((lastVisibleAt - startedAt) / 1000),
    throughputDefinition: "Entities first visible in the stage-equivalent query, divided by elapsed time since the first scheduled submission.",
    dropped: errors.length, nonceErrors: errors.filter(error => /nonce/i.test(error)).length,
    medianSubmitToConfirmationMs: percentile(confirmationTimes, 0.5), p95SubmitToConfirmationMs: percentile(confirmationTimes, 0.95),
    medianSubmitToVisibleMs: percentile(visibleTimes, 0.5), p95SubmitToVisibleMs: percentile(visibleTimes, 0.95),
    visibilityMeasurement: "First keyed query response containing the entity; same per-block polling and 700 ms cadence as the stage. Browser paint is not measured.",
    batchSizes: batches.map(batch => batch.size), gasUsed: String(batches.reduce((total, batch) => total + BigInt(batch.gasUsed), 0n)),
    gasCostWei: String(batches.reduce((total, batch) => total + BigInt(batch.gasCostWei), 0n)),
    balanceBeforeWei: String(balanceBefore), balanceAfterWei: String(balanceAfter), minimumObservedBalanceWei: String(minimumObservedBalance),
    minimumAllowedBalanceWei: String(MINIMUM_BALANCE), stopped: stopped ?? null, requestsToday: status.requestsToday, queryErrors, errors };
  const report = { ...summary, startedAt, finishedAt: Date.now(), query: observationQuery, batches, phones };
  await checkpoint(report);
  console.log(JSON.stringify(summary));
  if (errors.length || visibleTimes.length !== 200 || (percentile(confirmationTimes, 0.5) ?? Infinity) >= 6_000 || stopped) process.exitCode = 1;
} catch (error) {
  done = true;
  await checkpoint({ state: "failed", session: code, error: error instanceof Error ? error.message : "Unknown load-test error", phones });
  throw error;
} finally {
  done = true;
  await Promise.allSettled([observerTask, guardTask]);
  if (code) await presenterRequest("session/end", {});
  if (stopped) await presenterRequest("resume", {}).catch(() => undefined);
  await reportFile?.close();
}
