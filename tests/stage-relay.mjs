// Production check of the presenter setup as it runs on the day: /notes holds the presenter token,
// the projected stage tab does not. The stage must read the DB-Chain through /notes and the Worker's
// keyed proxy, never the public RPC. Read-only: no session, door or write changes.
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const ORIGIN = process.env.ORIGIN ?? "https://mumbai-ethglobal.vercel.app";
const PUBLIC_RPC = "rpc.tiramisu.db-chain.testnet.arkiv.network";
assert.ok(process.env.WORKSHOP_PRESENTER_TOKEN, "Presenter credential is required in the process environment.");

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const requests = { stage: [], notes: [], stageWorkerPaths: [] };
  const notes = await context.newPage();
  await notes.addInitScript((credential) => sessionStorage.setItem("arkiv-presenter-token", credential), process.env.WORKSHOP_PRESENTER_TOKEN);
  notes.on("request", (request) => requests.notes.push(new URL(request.url()).host));
  await notes.goto(`${ORIGIN}/notes/`, { waitUntil: "domcontentloaded" });

  const stage = await context.newPage();
  stage.on("request", (request) => { const url = new URL(request.url()); requests.stage.push(url.host); if (url.host.endsWith("workers.dev")) requests.stageWorkerPaths.push(url.pathname); });
  await stage.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await stage.evaluate(() => sessionStorage.getItem("arkiv-presenter-token")), null, "The stage tab holds no credential.");
  await expect(stage.locator(".qr-image img")).toBeVisible({ timeout: 20000 });
  await notes.getByRole("combobox", { name: "Stage data source" }).selectOption("live");
  // L1: a live scene, where the HUD and the query panel show.
  await stage.evaluate(() => { const channel = new BroadcastChannel("arkiv-mumbai-stage"); channel.postMessage({ kind: "command", cmd: { type: "goto", index: 8 } }); channel.close(); });
  await expect(stage.getByText("Live · Arkiv DB-Chain", { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(stage.locator(".data-error")).toHaveCount(0, { timeout: 20000 });
  await stage.waitForTimeout(15000);
  const block = await stage.locator(".query-panel").innerText().then((text) => text.match(/#(\d+)/)?.[1] ?? null).catch(() => null);

  // Closing /notes must stop the stage's reads with a clear message, not fall back to the public RPC.
  await notes.close();
  await stage.waitForTimeout(25000);
  const orphanError = await stage.locator(".data-error").innerText().catch(() => null);

  const count = (hosts, host) => hosts.filter((value) => value === host).length;
  const result = {
    stagePublicRpc: count(requests.stage, PUBLIC_RPC),
    notesPublicRpc: count(requests.notes, PUBLIC_RPC),
    stageWorkerRpc: requests.stageWorkerPaths.filter((path) => path === "/api/rpc").length,
    notesWorker: requests.notes.filter((host) => host.endsWith("workers.dev")).length,
    stageBlock: block,
    orphanError,
  };
  assert.equal(result.stagePublicRpc, 0);
  assert.equal(result.notesPublicRpc, 0);
  assert.equal(result.stageWorkerRpc, 0, "The stage tab holds no token, so its reads go through /notes.");
  assert.ok(result.notesWorker > 10, "Stage reads are relayed through /notes.");
  assert.ok(result.stageBlock, "The stage shows a live block.");
  assert.ok(orphanError, "Without /notes the stage says so.");
  process.stdout.write(JSON.stringify(result) + "\n");
} finally { await browser.close(); }
