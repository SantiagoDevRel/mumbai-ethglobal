// Explicitly authorized, real-time Tiramisu rehearsal against the deployed app (APP_ORIGIN; a protected
// preview also needs VERCEL_OIDC_TOKEN). No credentials enter the client bundle.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { decodeFunctionData, getAddress, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SCENES, TALK_LENGTH_SEC } from "../shared/scenes.ts";
import { hasNoExpiry } from "../shared/types.ts";
import { getProfile, WRITER_ADDRESS, explorerUrl } from "../shared/arkiv/profiles.ts";
import { createSdkClients } from "../shared/arkiv/clients-0.8.ts";
import { createArkivAdapter } from "../shared/arkiv/sdk-0.8.ts";

const ORIGIN = (process.env.APP_ORIGIN ?? "https://mumbai-ethglobal.vercel.app").replace(/\/$/, "");
const WRITER = ORIGIN;
const PROTECTION = process.env.VERCEL_OIDC_TOKEN ? { "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN } : {};
const FLOOR = 8n * 10n ** 18n;
// Verified against the pinned SDK's entity/operations.ts and entity/params.ts.
const EXECUTE = parseAbi(["function execute((uint8 operation, bytes operationData)[] ops) external returns (bytes32[] keys)"]);
const REGISTRY = "0x4400000000000000000000000000000000000044";
const GREEN = "#14f195";
const ORANGE = "#fe7446";
const flag = (name) => process.argv[process.argv.indexOf(name) + 1];
const preflight = process.argv.includes("--preflight");
for (const name of ["WORKSHOP_WRITER_PRIVATE_KEY", "RPC", "ACCESS_KEY", "WORKSHOP_PRESENTER_TOKEN"]) assert.ok(process.env[name], `${name} must be supplied in the Node environment.`);
const profile = getProfile(process.env.ARKIV_PROFILE);
assert.equal(profile.id, "tiramisu");
assert.equal(privateKeyToAccount(process.env.WORKSHOP_WRITER_PRIVATE_KEY).address.toLowerCase(), WRITER_ADDRESS.toLowerCase());
assert.ok(preflight || (process.argv.includes("--report") && process.argv.includes("--journal")), "Provide new --report and private --journal paths, or --preflight.");
const reportFile = preflight ? null : await open(flag("--report"), "wx", 0o644);
const journalFile = preflight ? null : await open(flag("--journal"), "wx", 0o600);
const options = { profile, creator: WRITER_ADDRESS, read: { kind: "keyed", url: process.env.RPC, accessKey: process.env.ACCESS_KEY }, wallet: { kind: "privateKey", privateKey: process.env.WORKSHOP_WRITER_PRIVATE_KEY } };
let currentScene = "setup", epoch = null, floorError = null, browser, session, stage, phone, monitor;
let proxyReads = 0, sendPending = false, uncertain = false, activeWalletOperation = null;
let checkpointTask = Promise.resolve();
const receipts = new Map();
const report = {
  schema: 1, network: profile.id, origin: ORIGIN, writerUrl: WRITER,
  sourceSnapshot: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  scriptSha256: createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex"),
  mapHtmlSha256: createHash("sha256").update(await (await fetch(`${ORIGIN}/map`, { headers: PROTECTION })).text()).digest("hex"),
  startedAt: new Date().toISOString(), plannedTalkMs: TALK_LENGTH_SEC * 1000,
  timingPolicy: "Scene starts use SCENES.at with an unscaled monotonic clock. Reveal steps run in order at scene start, 750 ms apart, with each live operation awaited. S7 submits ten synthetic phones at +0 to +1 s, ten at +31 to +32 s, and a real phone at +33 s; every phone writes a 15-minute lifetime (the phone's default and longest), so the room is still alive at L3. Every entity has an expiration: the rehearsal never writes one with no expiration. L1 opens the entity card and fills the transfer form without sending it. L3 opens unfiltered; the presenter filters by hand (name, color, country), clears the filters, then extends the selected entity and every live one, promptly. Scene starts more than 1000 ms late count as overruns.",
  writer: "the app's own /api (Vercel function)",
  scenes: [], operations: [], transactions: [], phones: [], balances: [], pageErrors: [], requestFailures: [], dataErrors: [],
  ownership: { mode: "transfer form checked, never sent", allowedWalletOperationTags: [3], onChainTransfers: 0 },
  sessionEnded: false, status: "running",
};
const now = () => epoch === null ? null : Math.round(performance.now() - epoch);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeMessage = (error) => {
  let message = error instanceof Error ? error.message : String(error);
  for (const name of ["WORKSHOP_WRITER_PRIVATE_KEY", "ACCESS_KEY", "WORKSHOP_PRESENTER_TOKEN", "RPC"]) message = message.split(process.env[name]).join(`[${name}]`);
  return message.slice(0, 1800);
};
function checkpoint() {
  checkpointTask = checkpointTask.then(writeCheckpoint);
  return checkpointTask;
}
async function writeCheckpoint() {
  if (!reportFile) return;
  const body = JSON.stringify(report, (_key, value) => typeof value === "bigint" ? value.toString() : value, 2) + "\n";
  await reportFile.write(body, 0, "utf8");
  await reportFile.truncate(Buffer.byteLength(body));
  await reportFile.sync();
}
async function presenter(route, body) {
  const response = await fetch(`${WRITER}/api/presenter/${route}`, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", ...PROTECTION, authorization: `Bearer ${process.env.WORKSHOP_PRESENTER_TOKEN}` }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  const result = await response.json();
  assert.ok(response.ok, `Presenter ${route}: HTTP ${response.status}`);
  return result;
}
async function rpc(method, params = []) {
  const response = await fetch(process.env.RPC, { method: "POST", headers: { "content-type": "application/json", "X-API-KEY": process.env.ACCESS_KEY }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(20000) });
  assert.ok(response.ok, `RPC ${method}: HTTP ${response.status}`);
  const result = await response.json();
  assert.ok(!result.error, `RPC ${method}: ${result.error?.code}`);
  return result.result;
}
const clients = createSdkClients(options, { async beforeSend(raw, hash) {
  assert.ok(journalFile && !uncertain, "Signing requires a private durable journal and a reconciled prior send.");
  await journalFile.write(JSON.stringify({ at: new Date().toISOString(), hash, raw }) + "\n");
  await journalFile.sync();
  uncertain = true;
  assert.ok(activeWalletOperation, "Send must belong to a measured presenter action.");
  activeWalletOperation.hash = hash;
} });
const adapter = createArkivAdapter({ ...options, wallet: undefined });
async function balance(reason) {
  const value = await clients.reader.getBalance({ address: WRITER_ADDRESS });
  report.balances.push({ atMs: now(), reason, wei: value.toString() });
  if (value < FLOOR) {
    floorError ??= new Error("Writer balance fell below the 8 GLM floor. Further writes stopped.");
    if (session && (await presenter("status")).session === session) {
      await presenter("doors", { open: false });
      await presenter("hold", {});
    }
    throw floorError;
  }
  return value;
}
async function until(atMs) {
  while (now() < atMs) { if (floorError) throw floorError; await sleep(Math.min(1000, atMs - now())); }
  if (floorError) throw floorError;
}
async function op(name, work) {
  const item = { scene: currentScene, name, startedAtMs: now(), status: "running" };
  report.operations.push(item);
  const start = performance.now();
  try { const result = await work(); item.status = "passed"; return result; }
  catch (error) { item.status = "failed"; item.error = safeMessage(error); throw error; }
  finally { item.latencyMs = Math.round(performance.now() - start); item.finishedAtMs = now(); await checkpoint(); }
}
async function command(cmd) {
  await stage.evaluate((value) => window.__rehearsalChannel.postMessage({ kind: "command", cmd: value }), cmd);
  await expect.poll(() => stage.evaluate(() => window.__rehearsalState), { timeout: 5000 }).not.toBeNull();
}
async function walletRequest({ method, params = [] }) {
  if (["eth_accounts", "eth_requestAccounts"].includes(method)) return [WRITER_ADDRESS];
  if (method === "eth_chainId") return `0x${profile.chainId.toString(16)}`;
  if (["wallet_switchEthereumChain", "wallet_addEthereumChain"].includes(method)) {
    assert.equal(BigInt(params[0].chainId), BigInt(profile.chainId)); return null;
  }
  if (method !== "eth_sendTransaction") {
    assert.ok(/^(eth_(call|estimateGas|getBalance|getBlockByNumber|getTransactionCount|getTransactionReceipt|getTransactionByHash|gasPrice|maxPriorityFeePerGas|feeHistory|blockNumber)|arkiv_getBlockTiming)$/.test(method), `Wallet RPC method blocked: ${method}`);
    return rpc(method, params);
  }
  assert.ok(!preflight && !floorError && !sendPending && !uncertain, "No concurrent, preflight, uncertain or floor-blocked sends.");
  const tx = params[0];
  assert.equal(tx.from.toLowerCase(), WRITER_ADDRESS.toLowerCase());
  assert.equal(tx.to.toLowerCase(), REGISTRY.toLowerCase());
  assert.equal(BigInt(tx.value ?? "0x0"), 0n);
  if (tx.chainId) assert.equal(BigInt(tx.chainId), BigInt(profile.chainId));
  const decoded = decodeFunctionData({ abi: EXECUTE, data: tx.data });
  assert.equal(decoded.functionName, "execute");
  const tags = decoded.args[0].map((item) => item.operation);
  assert.ok(tags.length > 0 && tags.every((tag) => tag === 3), "Only extend is authorized. Patch, ownership transfer and delete are blocked.");
  const held = await presenter("status");
  assert.ok(held.held && !held.inFlight && held.queued === 0, "Presenter wallet requires an idle, held writer.");
  const funds = await balance("before presenter signature");
  const gas = BigInt(tx.gas ?? await rpc("eth_estimateGas", [tx]));
  const maxFee = BigInt(tx.maxFeePerGas ?? tx.gasPrice ?? await rpc("eth_gasPrice"));
  assert.ok(funds - gas * maxFee >= FLOOR, "Estimated transaction cost would breach the 8 GLM floor.");
  const item = { scene: currentScene, operationTags: tags, operationCount: tags.length, startedAtMs: now(), status: "signing" };
  report.transactions.push(item);
  sendPending = true; activeWalletOperation = item;
  try {
    const request = { to: tx.to, data: tx.data, gas, value: 0n };
    for (const field of ["gasPrice", "maxFeePerGas", "maxPriorityFeePerGas"]) if (tx[field] !== undefined) request[field] = BigInt(tx[field]);
    if (tx.nonce !== undefined) request.nonce = Number(BigInt(tx.nonce));
    item.hash = await clients.writer.sendTransaction(request);
    item.url = explorerUrl(profile, "tx", item.hash);
    item.status = "broadcast";
    await checkpoint();
    return item.hash;
  } catch (error) { item.status = uncertain ? "uncertain" : "failed before broadcast"; item.error = safeMessage(error); throw error; }
  finally { sendPending = false; activeWalletOperation = null; }
}
async function signedAction(name, trigger, verify) {
  return op(name, async () => {
    const count = report.transactions.length;
    await trigger();
    try { await expect.poll(() => report.transactions.length, { timeout: 20000 }).toBe(count + 1); }
    catch (error) {
      const notice = await stage.locator(".presenter-notice").textContent().catch(() => "No presenter notice.");
      report.actionFailure = { scene: currentScene, name, notice: safeMessage(notice) };
      throw new Error(`${name}: ${safeMessage(notice)}. ${safeMessage(error)}`);
    }
    const item = report.transactions[count];
    await expect.poll(() => item.hash, { timeout: 30000 }).toBeTruthy();
    const receipt = await clients.reader.waitForTransactionReceipt({ hash: item.hash, timeout: 45000, retryCount: 0 });
    item.block = receipt.blockNumber.toString(); item.gasUsed = receipt.gasUsed.toString(); item.status = receipt.status;
    item.confirmedAtMs = now(); item.latencyMs = item.confirmedAtMs - item.startedAtMs;
    assert.equal(receipt.status, "success"); uncertain = false;
    await expect(stage.locator(".presenter-notice")).toContainText("Transaction confirmed", { timeout: 20000 });
    await expect.poll(async () => (await presenter("status")).held, { timeout: 10000 }).toBe(false);
    await verify();
    await balance(`after ${name}`);
    return item;
  });
}
async function entity(key) { return clients.reader.getEntity(key); }
// The writer stores text in lower case, so the card shows the typed "Rehearsal phone" as "rehearsal phone".
async function inspect(key) {
  await command({ type: "inspect", key });
  await expect(stage.locator(".inspector-panel")).toContainText("rehearsal phone", { timeout: 20000 });
}
/** The data source and its blinker sit in the "?" presenter card, never on the stage (October 29). */
async function sourceStatus() {
  const card = stage.getByRole("dialog", { name: "Presenter controls" });
  await expect(stage.locator(".source-label")).toHaveCount(0);
  await command({ type: "togglePanel", panel: "controls", open: true });
  let detail;
  try {
    await expect(card.getByText("Live · Arkiv DB-Chain", { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(card.locator(".source-label .refresh-detail")).toHaveText(/^Updated · block #\d+$/, { timeout: 20000 });
    detail = await card.locator(".source-label .refresh-detail").textContent();
  } finally { await command({ type: "togglePanel", panel: "controls", open: false }); }
  await expect(card).toHaveCount(0);
  return detail;
}
const cameraCue = () => stage.evaluate(() => window.__rehearsalState?.camera.cue);
function observe(page, label) {
  page.on("pageerror", (error) => report.pageErrors.push({ page: label, scene: currentScene, atMs: now(), message: safeMessage(error) }));
  page.on("requestfailed", (request) => report.requestFailures.push({ page: label, scene: currentScene, atMs: now(), origin: new URL(request.url()).origin, path: new URL(request.url()).pathname, reason: request.failure()?.errorText }));
  page.on("response", async (response) => {
    if (response.url() === `${WRITER}/api/rpc`) proxyReads++;
    if (response.url() === `${WRITER}/api/rpc` && !response.ok()) report.dataErrors.push({ page: label, scene: currentScene, atMs: now(), status: response.status() });
    if (label === "phone" && response.url().startsWith(`${WRITER}/api/ticket/`) && response.ok()) {
      try { const ticket = await response.json(); if (ticket.txHash) { report.realPhoneTicket = ticket; receipts.set(ticket.txHash, null); } }
      catch { /* A page can close while its final ticket response is being decoded. */ }
    }
  });
}
let phoneKey;
async function submitSynthetic(index) {
  return op(`synthetic phone ${index + 1}`, async () => {
    // Lower case, as the writer stores it; never `noExpiry`, so the testnet keeps no entity for good.
    const draft = { session, name: `rehearsal ${String(index + 1).padStart(2, "0")}`, country: index % 3 ? "in" : "co", color: index % 2 ? GREEN : ORANGE, lifetimeSec: 900 };
    const submittedAtMs = now();
    const response = await fetch(`${WRITER}/api/submit`, { method: "POST", headers: { "content-type": "application/json", ...PROTECTION, "x-device-token": crypto.randomUUID(), origin: ORIGIN }, body: JSON.stringify(draft), signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200);
    const ticket = await response.json();
    const item = { kind: "synthetic", name: draft.name, country: draft.country, color: draft.color, submittedAtMs, acceptedAtMs: now(), ticket: ticket.ticket };
    report.phones.push(item);
    const deadline = performance.now() + 45000;
    while (performance.now() < deadline) {
      const result = await fetch(`${WRITER}/api/ticket/${ticket.ticket}`, { headers: PROTECTION, signal: AbortSignal.timeout(20000) });
      assert.ok(result.ok); const state = await result.json();
      assert.notEqual(state.status, "failed", state.error);
      if (state.status === "written") {
        Object.assign(item, { entityKey: state.entityKey, txHash: state.txHash, block: state.block, expiresAtBlock: state.expiresAtBlock, confirmedAtMs: now(), latencyMs: now() - submittedAtMs });
        receipts.set(state.txHash, null); return;
      }
      await sleep(700);
    }
    throw new Error(`Phone ${index + 1} confirmation timed out.`);
  });
}
async function phoneWave() {
  // A started session is already open; there is no doors step on stage any more.
  await op("session open", async () => { assert.equal((await presenter("status")).doors, "open"); });
  const waveStart = SCENES.find((scene) => scene.id === "S7").at * 1000;
  const tasks = Array.from({ length: 20 }, (_, index) => (async () => {
    const offset = index < 10 ? index * 1000 / 9 : 31000 + (index - 10) * 1000 / 9;
    await until(waveStart + offset); await submitSynthetic(index);
  })());
  const realPhone = (async () => {
    await until(waveStart + 33000);
    await op("real /scan submit to stage visibility", async () => {
      const submittedAtMs = now();
      await phone.getByRole("button", { name: "Write my entity", exact: true }).click();
      await expect(phone.getByText(/Written in block #\d+/)).toBeVisible({ timeout: 60000 });
      const href = await phone.getByRole("link", { name: "View in explorer" }).getAttribute("href");
      phoneKey = href.split("/").at(-1); assert.match(phoneKey, /^0x[0-9a-f]{64}$/i);
      const included = await entity(phoneKey);
      const item = { kind: "browser", name: "rehearsal phone", country: "in", color: GREEN, submittedAtMs, confirmedAtMs: now(), entityKey: phoneKey, block: included.createdAt.toString(), expiresAtBlock: included.expiresAt.toString() };
      report.phones.push(item);
      assert.equal(hasNoExpiry(BigInt(included.expiresAt)), false, "The real phone wrote an entity with no expiration.");
      await expect(stage.locator(".event-log").getByRole("button", { name: /rehearsal phone/ }).first()).toBeVisible({ timeout: 20000 });
      item.visibleAtMs = now(); item.submitToVisibleMs = now() - submittedAtMs;
      // The dot is painted in its stored color: Green, #14f195.
      await expect.poll(() => stage.locator(".globe-dots").evaluate((canvas) => {
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0; for (let i = 0; i < data.length; i += 4) if (data[i] === 20 && data[i + 1] === 241 && data[i + 2] === 149 && data[i + 3] > 100) count++;
        return count;
      }), { timeout: 15000 }).toBeGreaterThan(0);
      item.paintedAtMs = now();
    });
  })();
  // Attach immediately: a late rejection must not become an unhandled rejection while L1 begins.
  return Promise.allSettled([...tasks, realPhone]).then((results) => {
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length) throw new AggregateError(failed.map((result) => result.reason), "Phone wave failed.");
  });
}
let wave, waveError;
async function sceneWork(id, step) {
  if (id === "S7") { wave = phoneWave().catch((error) => { waveError = error; }); }
  if (id === "L1") await op("all phones confirmed and rendered", async () => {
    await wave; if (waveError) throw waveError; assert.equal(report.phones.length, 21);
    const status = await presenter("status"); assert.equal(status.written, 21); assert.equal(status.failed, 0);
  });
  // The entity card: $owner (never $creator) and the attributes the phone put in, in lower case as
  // written. "0x" then Space fills the transfer form with a fresh checksummed wallet; it is cancelled,
  // so nothing is sent and the owner stays ours.
  if (id === "L1") await op("entity card and transfer form, nothing sent", async () => {
    await inspect(phoneKey);
    const card = stage.locator(".inspector-panel");
    await expect(card.locator('[data-field="$owner"] dd')).toHaveAttribute("title", new RegExp(`^${WRITER_ADDRESS}$`, "i"));
    await expect(card).not.toContainText("$creator");
    await expect(card.locator(".badge-highlight, .owner-note")).toHaveCount(0);
    const stored = Object.fromEntries(await card.locator(".stored-attributes tbody tr").evaluateAll((rows) => rows.map((row) => [row.querySelector("th").textContent, row.querySelectorAll("td")[1].textContent])));
    assert.deepEqual({ name: stored.name, color: stored.color, country: stored.country }, { name: "rehearsal phone", color: GREEN, country: "in" });
    const before = await entity(phoneKey), sends = report.transactions.length;
    await card.locator(".inspector-actions").getByRole("button", { name: "Transfer", exact: true }).click();
    const field = card.getByLabel("New owner wallet");
    await field.fill("0x"); await field.press("Space");
    await expect(field).toHaveValue(/^0x[0-9a-fA-F]{40}$/);
    const filled = await field.inputValue();
    assert.equal(getAddress(filled), filled, "The field holds a checksummed wallet address.");
    await expect(card.getByRole("button", { name: "Transfer ownership", exact: true })).toBeEnabled();
    await expect(stage.locator('[data-scene="L1"]')).toBeVisible();
    await card.getByRole("button", { name: "Cancel transfer", exact: true }).click();
    await sleep(2000); const after = await entity(phoneKey);
    assert.equal(after.owner, before.owner); assert.equal(report.transactions.length, sends);
    report.ownership = { ...report.ownership, key: phoneKey, ownerBefore: before.owner, ownerAfter: after.owner, filledNewOwner: filled, walletSendsDuringDemo: report.transactions.length - sends };
    await command({ type: "inspect", key: null });
  });
  // L3 opens on the whole globe with no filter and no QR. The presenter filters by hand (a country
  // flies the camera there), clears the filters, then extends the selected entity and every live one.
  if (id === "L3" && step === 0) {
    const bar = stage.locator(".filter-bar"), live = stage.locator(".query-panel .query-line[data-live]");
    const pickColor = async (name) => {
      await bar.getByRole("combobox", { name: "Color" }).click();
      await bar.getByRole("listbox", { name: "Colors" }).getByRole("option", { name, exact: true }).click();
    };
    await op("opens unfiltered, no QR", async () => {
      await command({ type: "inspect", key: null });
      await expect(bar).toBeVisible(); await expect(stage.locator(".query-panel")).toBeVisible();
      await expect(stage.locator(".join-qr")).toHaveCount(0);
      await expect(live).toHaveCount(0);
      await expect.poll(cameraCue).toBe("globe");
    });
    await op("filter by hand: name, color, country", async () => {
      await bar.getByPlaceholder("Starts with…").fill("rehearsal");
      await expect(live.filter({ hasText: "rehearsal" })).toHaveCount(1, { timeout: 20000 });
      await pickColor("Orange");
      await expect(live.filter({ hasText: `color = str('${ORANGE}')` })).toHaveCount(1, { timeout: 20000 });
      await bar.getByPlaceholder("Any country").fill("India");
      await expect(live.filter({ hasText: "country = str('in')" })).toHaveCount(1, { timeout: 20000 });
      await expect.poll(cameraCue, { timeout: 10000 }).toBe("country:in");
      const run = await adapter.query({ kinds: ["dot"], session, namePrefix: "rehearsal", color: ORANGE, country: "in" });
      assert.ok(run.entities.length > 0 && run.entities.every((item) => item.attrs.name.startsWith("rehearsal") && item.attrs.color === ORANGE && item.attrs.country === "in"));
      await expect(bar.locator(".filter-results strong")).toHaveText(String(run.entities.length), { timeout: 20000 });
      report.filterEvidence = { query: run.description.query, block: run.block.toString(), keys: run.entities.map((item) => item.key) };
      // Cleared by hand: the whole room again, and the camera back on the globe.
      await bar.getByPlaceholder("Starts with…").fill("");
      await bar.getByPlaceholder("Any country").fill("");
      await pickColor("Any color");
      await expect(live).toHaveCount(0, { timeout: 20000 });
      await expect.poll(cameraCue, { timeout: 10000 }).toBe("globe");
      await expect(bar.locator(".filter-results strong")).toHaveText(String(report.phones.length), { timeout: 20000 });
    });
    await signedAction("extend selected", async () => {
      await inspect(phoneKey); const before = await entity(phoneKey); report.selectedExpiryBefore = before.expiresAt.toString();
      await stage.locator(".inspector-actions").getByRole("button", { name: "Extend", exact: true }).click();
    }, async () => { const after = await entity(phoneKey); assert.ok(after.expiresAt > BigInt(report.selectedExpiryBefore)); report.selectedExpiryAfter = after.expiresAt.toString(); });
    // Extend all leaves out an entity with no expiration (nothing to extend); the rehearsal writes none.
    const before = await adapter.query({ kinds: ["dot"], session });
    report.extendAllBefore = before.entities.filter((item) => !hasNoExpiry(item.expiresAtBlock)).map((item) => ({ key: item.key, expiresAtBlock: item.expiresAtBlock.toString() }));
    await signedAction("extend all", async () => { await command({ type: "extend", scope: "all" }); }, async () => {
      const after = await adapter.query({ kinds: ["dot"], session });
      for (const item of report.extendAllBefore) assert.ok(after.entities.some((value) => value.key === item.key && value.expiresAtBlock > BigInt(item.expiresAtBlock)));
      report.extendedEntities = report.extendAllBefore.length;
    });
    await command({ type: "inspect", key: null });
  }
  // The close keeps the map quiet (no counter, list or panels) while phones can still write.
  if (id === "L9") await op("close: quiet map, writing stays open", async () => {
    for (const selector of [".stage-counter", ".event-log", ".query-panel", ".filter-bar", ".inspector-panel"]) await expect(stage.locator(selector)).toHaveCount(0);
    const status = await presenter("status");
    assert.equal(status.phase, "talk"); assert.equal(status.doors, "open");
    report.closeWritingOpen = true;
  });
  if (id === "L9") await op("closing globe remains live", async () => { report.closingSourceStatus = await sourceStatus(); assert.ok(proxyReads > 0); });
}
try {
  await clients.checkNetwork();
  await balance("preflight");
  const status = await presenter("status");
  if (!preflight) assert.equal(status.session, null, "An existing session belongs to someone else; it will not be replaced.");
  assert.ok(!status.inFlight && status.queued === 0 && !status.held && !status.replay);
  assert.equal(status.network, profile.name);
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, extraHTTPHeaders: PROTECTION });
  stage = await context.newPage(); observe(stage, "stage");
  await stage.exposeFunction("__rehearsalWallet", walletRequest);
  await stage.addInitScript((token) => {
    // The static presenter credential stands in for the password login (the writer accepts both).
    localStorage.setItem("arkiv-presenter-login", JSON.stringify({ token, expiresAt: Date.now() + 12 * 3_600_000 }));
    window.ethereum = { isRabby: true, request: (request) => window.__rehearsalWallet(request), on() {}, removeListener() {} };
    window.__rehearsalState = null;
    window.__rehearsalChannel = new BroadcastChannel("arkiv-mumbai-stage");
    window.__rehearsalChannel.onmessage = (event) => { if (event.data.kind === "state") window.__rehearsalState = event.data.state; };
  }, process.env.WORKSHOP_PRESENTER_TOKEN);
  // /map starts a writer session by itself when none is running; the rehearsal's own start below replaces it.
  await stage.goto(`${ORIGIN}/map`, { waitUntil: "domcontentloaded" });
  await stage.evaluate(() => window.__rehearsalChannel.postMessage({ kind: "hello" }));
  await expect.poll(() => stage.evaluate(() => window.__rehearsalState?.sceneIndex)).toBe(0);
  // Check the live source on a live scene (in the "?" card, never on the stage), then reset before the clock.
  await command({ type: "goto", index: SCENES.findIndex((scene) => scene.id === "L1") });
  report.setupSourceStatus = await sourceStatus();
  await command({ type: "goto", index: 0 });
  if (preflight) {
    // A separate browser profile exercises selectors and real readback only. It
    // never starts, ends or changes an existing session and cannot sign a write.
    await command({ type: "session", code: status.session });
    await command({ type: "goto", index: SCENES.findIndex((scene) => scene.id === "L3") });
    await command({ type: "togglePanel", panel: "filters", open: true });
    // The filter bar, as the presenter uses it at L3: a country by name (the camera flies there), then a color.
    const bar = stage.locator(".filter-bar");
    await bar.getByPlaceholder("Any country").fill("India");
    await expect(stage.locator(".query-panel")).toContainText("country = str('in')", { timeout: 20000 });
    await expect.poll(cameraCue, { timeout: 10000 }).toBe("country:in");
    await bar.getByRole("combobox", { name: "Color" }).click();
    await bar.getByRole("listbox", { name: "Colors" }).getByRole("option", { name: "Green", exact: true }).click();
    await expect(stage.locator(".query-panel")).toContainText(`color = str('${GREEN}')`, { timeout: 20000 });
    assert.ok(proxyReads > 0); assert.equal(report.pageErrors.length, 0);
    console.log(JSON.stringify({ preflight: "passed", chainId: profile.chainId, proxyReads, wallet: WRITER_ADDRESS, sends: 0, filters: ["in", GREEN] }));
  }
  else {
    session = (await presenter("session/start", {})).code; report.session = session;
    await command({ type: "session", code: session });
    await presenter("phase", { phase: "talk" });
    phone = await context.newPage(); observe(phone, "phone");
    await phone.setViewportSize({ width: 390, height: 844 });
    await phone.goto(`${ORIGIN}/scan`, { waitUntil: "domcontentloaded" });
    await phone.getByPlaceholder("Name or nickname").fill("Rehearsal phone");
    await phone.getByRole("button", { name: "Green", exact: true }).click();
    await phone.getByRole("combobox", { name: "Your country" }).click();
    await phone.getByRole("option", { name: "India", exact: true }).click();
    await phone.locator('input[type="range"]').focus(); await phone.keyboard.press("End");
    monitor = setInterval(() => { void balance("10 s monitor").catch((error) => { floorError ??= error; }); }, 10000);
    epoch = performance.now(); report.clockStartedAt = new Date().toISOString();
    await command({ type: "timer", action: "start" });
    for (const [index, definition] of SCENES.entries()) {
      await until(definition.at * 1000); currentScene = definition.id;
      const scene = { id: definition.id, plannedStartMs: definition.at * 1000, dispatchAtMs: now(), steps: [], status: "running" };
      report.scenes.push(scene);
      await command({ type: "goto", index });
      await expect(stage.locator(`[data-scene="${definition.id}"]`)).toBeVisible({ timeout: 10000 });
      scene.actualStartMs = now(); scene.latenessMs = scene.actualStartMs - scene.plannedStartMs;
      for (let step = 0; step < definition.steps; step++) {
        if (step) { await sleep(750); await command({ type: "next" }); }
        await expect.poll(() => stage.evaluate(() => window.__rehearsalState.step)).toBe(step);
        scene.steps.push({ step, plannedEarliestStartMs: definition.at * 1000 + step * 750, actualStartMs: now() });
        try { await sceneWork(definition.id, step); }
        catch (error) {
          scene.status = "failed";
          scene.errors ??= []; scene.errors.push({ step, atMs: now(), message: safeMessage(error) });
          // Continue the talk after a determinate UI failure; uncertain signatures
          // and the balance floor must stop the run and enter cleanup immediately.
          if (floorError || uncertain || sendPending) throw error;
        }
      }
      scene.actionsFinishedAtMs = now(); if (scene.status !== "failed") scene.status = "passed";
      await checkpoint();
      console.log(JSON.stringify({ scene: definition.id, actualStartMs: scene.actualStartMs, latenessMs: scene.latenessMs, actionsFinishedAtMs: scene.actionsFinishedAtMs }));
    }
    await until(TALK_LENGTH_SEC * 1000);
    report.talkElapsedMs = now(); report.talkOverrunMs = Math.max(0, now() - TALK_LENGTH_SEC * 1000);
    assert.equal(report.pageErrors.length, 0, "Browser page errors occurred.");
    assert.equal(report.transactions.length, 2, "Expected exactly two extensions.");
    assert.ok(report.transactions.every((item) => item.status === "success"));
    const owned = await adapter.query({ kinds: ["dot"], session });
    assert.ok(owned.entities.every((item) => item.owner.toLowerCase() === WRITER_ADDRESS.toLowerCase()));
    report.remainingEntities = owned.entities.length; report.ownership.allRemainingEntitiesStillWriterOwned = true;
    report.status = report.scenes.some((scene) => scene.status === "failed") ? "failed" : "passed";
    if (report.status === "failed") process.exitCode = 1;
  }
} catch (error) { report.status = "failed"; report.error = safeMessage(error); process.exitCode = 1; console.error(JSON.stringify({ status: "failed", scene: currentScene, message: report.error })); }
finally {
  clearInterval(monitor);
  if (wave) { await wave; if (waveError) { report.status = "failed"; report.waveError = safeMessage(waveError); process.exitCode = 1; } }
  if (session) {
    try {
      if ((await presenter("status")).session === session) {
        await presenter("doors", { open: false });
        // Hold drains any started batch. Ending our session prevents further creates.
        await presenter("hold", {});
        await presenter("session/end", {});
        if (!uncertain && !floorError) await presenter("resume", {});
        const status = await presenter("status");
        report.sessionEnded = status.session === null && status.queued === 0 && !status.inFlight;
        assert.ok(report.sessionEnded);
      } else throw new Error("The session changed externally; cleanup refused to touch it.");
    } catch (error) { report.cleanupError = safeMessage(error); report.status = "failed"; process.exitCode = 1; }
    try { await balance("final"); } catch (error) { report.balanceError = safeMessage(error); report.status = "failed"; process.exitCode = 1; }
  }
  await browser?.close();
  for (const hash of receipts.keys()) {
    try { const receipt = await clients.reader.getTransactionReceipt({ hash }); receipts.set(hash, { hash, block: receipt.blockNumber.toString(), gasUsed: receipt.gasUsed.toString(), status: receipt.status }); }
    catch (error) { report.receiptError = safeMessage(error); report.status = "failed"; process.exitCode = 1; }
  }
  report.createTransactions = [...receipts.values()].filter(Boolean);
  report.proxyReads = proxyReads;
  report.finishedAt = new Date().toISOString();
  report.elapsedAtCleanupMs = now();
  report.totalWallMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
  report.overruns = report.scenes.filter((scene) => scene.latenessMs > 1000).map(({ id, latenessMs }) => ({ scene: id, latenessMs }));
  report.maxSceneLatenessMs = Math.max(0, ...report.scenes.map((scene) => scene.latenessMs ?? 0));
  report.minimumBalanceWei = report.balances.length ? report.balances.reduce((low, item) => BigInt(item.wei) < low ? BigInt(item.wei) : low, BigInt(report.balances[0].wei)).toString() : null;
  report.gasUsed = [...report.transactions, ...report.createTransactions].reduce((sum, item) => sum + BigInt(item.gasUsed ?? 0), 0n).toString();
  await checkpoint(); await reportFile?.close(); await journalFile?.close();
  if (!preflight) console.log(JSON.stringify({ status: report.status, talkElapsedMs: report.talkElapsedMs, totalWallMs: report.totalWallMs, overruns: report.overruns, sessionEnded: report.sessionEnded, minimumBalanceWei: report.minimumBalanceWei, gasUsed: report.gasUsed }));
}
