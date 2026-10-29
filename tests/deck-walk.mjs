// Walks every scene and every reveal step on /map (1920x1080, mock data, writer fixtures):
// no page errors, the step dots match the scene's step count, and nothing scrolls sideways.
// With a directory argument it saves the last step of each scene as a PNG for a visual pass (the globe
// canvas hidden, so software rendering stays fast), plus the first view of a scene whose → swaps the
// whole view (W4); a second argument starts the captures at that scene.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startApp } from "./local-app.mjs";
import { SCENES } from "../shared/scenes.ts";

const origin = "https://mumbai-ethglobal.vercel.app";
/** Scenes whose → swaps one whole view for another: the last step alone would hide the first. */
const FIRST_VIEW = new Set(["W4"]);
const capture = process.argv[2];
const captureFrom = Number(process.argv[3] ?? 0);
if (capture) await mkdir(capture, { recursive: true });
const app = await startApp();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript(() => {
    sessionStorage.setItem("arkiv-stage-source", "mock");
    localStorage.setItem("arkiv-presenter-login", JSON.stringify({ token: "p.fixture", expiresAt: Date.now() + 3_600_000 }));
  });
  await app.serve(context, origin);
  await context.route(`${origin}/api/**`, (route) => route.abort());
  await context.route(`${origin}/api/session*`, (route) => route.fulfill({ json: { valid: true, code: "DECK-WALK", doors: "open", phase: "talk", replay: false, network: "Tiramisu" } }));
  await context.route(`${origin}/api/rpc`, (route) => route.fulfill({ json: { jsonrpc: "2.0", id: 1, error: { code: -32000, message: "UI fixture: no chain reads" } } }));
  await context.route(`${origin}/api/presenter/status`, (route) => route.fulfill({ json: { session: "DECK-WALK", doors: "open", phase: "talk", replay: false, held: false, queued: 0, inFlight: false, written: 0, failed: 0, lastBatch: null, balanceWei: "0", network: "Tiramisu", requestsToday: 0 } }));
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/map`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-screen="map"][data-scene="S0"]')).toBeVisible({ timeout: 20000 });
  if (capture) await page.addStyleTag({ content: ".globe-shell{display:none}" });
  const send = (cmd) => page.evaluate((item) => { const channel = new BroadcastChannel("arkiv-mumbai-stage"); channel.postMessage({ kind: "command", cmd: item }); channel.close(); }, cmd);
  const shoot = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: path.join(capture, name), timeout: 120000 }); };
  for (const [index, scene] of SCENES.entries()) {
    const shot = capture && index >= captureFrom;
    const prefix = `${String(index).padStart(2, "0")}-${scene.id}`;
    await send({ type: "goto", index });
    await expect(page.locator(`[data-screen="map"][data-scene="${scene.id}"]`)).toBeVisible();
    if (shot && FIRST_VIEW.has(scene.id)) await shoot(`${prefix}-first.png`);
    for (let step = 1; step < scene.steps; step++) await send({ type: "next" });
    await expect(page.locator(`[data-screen="map"][data-scene="${scene.id}"]`)).toBeVisible();
    if (scene.steps > 1) await expect(page.getByRole("img", { name: `Step ${scene.steps} of ${scene.steps}` })).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, scene.id);
    if (shot) await shoot(`${prefix}.png`);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ scenes: SCENES.length, errors: errors.length }));
} finally {
  await browser.close();
  app.stop();
}
