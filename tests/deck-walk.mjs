// Walks every scene and every reveal step on /map (1920x1080, mock data, writer fixtures):
// no page errors, the step dots match the scene's step count, nothing scrolls sideways, and every
// slide draws the logo at the bottom center with no text or picture crossing it (Santiago, October
// 30: the logo must never get in the way of a slide's text).
// With a directory argument it saves the last step of each scene as a PNG for a visual pass (the globe
// canvas hidden, so software rendering stays fast), plus the first view of a scene whose → swaps the
// whole view (W2, W4); a second argument starts the captures at that scene.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startApp } from "./local-app.mjs";
import { SCENES } from "../shared/scenes.ts";

const origin = "https://mumbai-ethglobal.vercel.app";
/** Scenes whose → swaps one whole view for another: the last step alone would hide the first. */
const FIRST_VIEW = new Set(["W2", "W4"]);
const capture = process.argv[2];
const captureFrom = Number(process.argv[3] ?? 0);
if (capture) await mkdir(capture, { recursive: true });
const app = await startApp();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });
const errors = [];
/** Every slide step whose logo is missing or crossed, so one run lists them all. */
const logoProblems = [];
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
  // The logo's box grown by 16 stage px (FOOT_LOGO in app/deck/ui.tsx), and every visible text or
  // picture of the scene that crosses it. Faded-out reveals (opacity under 0.05) don't count.
  const logoCheck = () => page.evaluate(() => {
    const logos = [...document.querySelectorAll("[data-foot-logo]")].filter((element) => element.getBoundingClientRect().width > 0);
    if (logos.length !== 1) return { logos: logos.length, hits: [] };
    const logo = logos[0];
    const box = logo.getBoundingClientRect();
    const pad = (16 * box.height) / 28;
    const zone = { left: box.left - pad, right: box.right + pad, top: box.top - pad, bottom: box.bottom + pad };
    const crosses = (r) => r.width > 0 && r.height > 0 && r.left < zone.right && r.right > zone.left && r.top < zone.bottom && r.bottom > zone.top;
    const seen = (element) => {
      for (let e = element; e; e = e.parentElement) {
        const css = getComputedStyle(e);
        if (css.display === "none" || css.visibility === "hidden" || Number(css.opacity) < 0.05) return false;
      }
      return true;
    };
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.trim();
      const parent = node.parentElement;
      if (!text || !parent || parent.closest("[data-foot-logo]") || !seen(parent)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()];
      if ((rects.length ? rects : [parent.getBoundingClientRect()]).some(crosses)) hits.push(`"${text.slice(0, 48)}"`);
    }
    for (const img of document.querySelectorAll("img")) {
      if (img.closest("[data-foot-logo]") || !seen(img)) continue;
      if (crosses(img.getBoundingClientRect())) hits.push(`img ${img.getAttribute("src")?.slice(0, 64)}`);
    }
    return { logos: 1, hits };
  });
  for (const [index, scene] of SCENES.entries()) {
    const shot = capture && index >= captureFrom;
    const prefix = `${String(index).padStart(2, "0")}-${scene.id}`;
    await send({ type: "goto", index });
    await expect(page.locator(`[data-screen="map"][data-scene="${scene.id}"]`)).toBeVisible();
    if (shot && FIRST_VIEW.has(scene.id)) await shoot(`${prefix}-first.png`);
    for (let step = 0; step < scene.steps; step++) {
      if (step > 0) await send({ type: "next" });
      if (scene.steps > 1) await expect(page.getByRole("img", { name: `Step ${step + 1} of ${scene.steps}` })).toBeVisible();
      if (scene.kind !== "slide") continue;
      // Let the reveal and the slide change settle (REVEAL_TIME 0.3 s, the print toss on ME 0.45 s). A
      // busy runner can still be crossfading the scene before, so a missing or crossed logo is retried
      // for up to 3 s before it counts.
      await page.waitForTimeout(700);
      let { logos, hits } = await logoCheck();
      for (let retry = 0; retry < 10 && (logos !== 1 || hits.length > 0); retry++) {
        await page.waitForTimeout(300);
        ({ logos, hits } = await logoCheck());
      }
      if (logos !== 1) logoProblems.push(`${scene.id} step ${step + 1}: ${logos} logos at the bottom center, not 1`);
      for (const hit of hits) logoProblems.push(`${scene.id} step ${step + 1}: ${hit} crosses the logo at the bottom center`);
    }
    await expect(page.locator(`[data-screen="map"][data-scene="${scene.id}"]`)).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, scene.id);
    if (shot) await shoot(`${prefix}.png`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(logoProblems, [], "Every slide keeps one logo at the bottom center, with no text or picture on it.");
  console.log(JSON.stringify({ scenes: SCENES.length, errors: errors.length }));
} finally {
  await browser.close();
  app.stop();
}
