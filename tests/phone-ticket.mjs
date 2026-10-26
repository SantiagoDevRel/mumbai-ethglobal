// Full phone lifecycle against writer fixtures: wait for the session, send once, read the ticket
// until its block is in, then make no more requests. Any RPC or other external request is a failure.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startApp } from "./local-app.mjs";

const origin = "https://mumbai-ethglobal.vercel.app";
const writer = origin;
const app = await startApp();
const capture = process.argv[2];
if (capture) await mkdir(capture, { recursive: true });
const raw = "An unknown RPC error occurred. Details: RPC request rejected (429). Version: viem@2.57.11";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const results = [];
const errors = [];
try {
  for (const width of [375, 360, 390]) for (const colorScheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: width === 375 ? 667 : 844 }, colorScheme });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install();
    await page.addInitScript(() => { Math.random = () => 0.5; });
    let phase = "queued";
    let sessionLive = false;
    let sessionReads = 0;
    const rpc = [], tickets = [], submissions = [];
    const ticketId = "11111111-1111-4111-8111-111111111111";
    const baseTicket = { ticket: ticketId, status: "written", entityKey: "0x12345678", block: "100", expiresAtBlock: "130", lat: 19, lng: 72 };
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === origin && !url.pathname.startsWith("/api/")) return app.proxy(route);
      if (url.origin !== writer || url.pathname === "/api/rpc") { rpc.push({ url: request.url(), method: request.method() }); return route.abort(); }
      if (url.pathname === "/api/session") {
        sessionReads++;
        assert.equal(url.searchParams.get("s"), null);
        return route.fulfill({ json: sessionLive ? { valid: true, code: "ABCD1234", doors: "open", phase: "talk", replay: false, network: "tiramisu" } : { valid: false, code: null, doors: "closed", phase: "talk", replay: false, network: "tiramisu" } });
      }
      if (url.pathname === "/api/submit") {
        submissions.push(request.postDataJSON());
        if (phase === "submit-error") return route.fulfill({ status: 500, json: { error: "internal", message: raw } });
        return route.fulfill({ json: { ticket: ticketId, position: 0, lat: 19, lng: 72 } });
      }
      if (url.pathname === `/api/ticket/${ticketId}`) {
        tickets.push({ at: await page.evaluate(() => Date.now()), phase, device: request.headers()["x-device-token"] });
        if (phase === "error") return route.fulfill({ status: 429, json: { error: "internal", message: raw } });
        if (phase === "queued") return route.fulfill({ json: { ticket: ticketId, status: "queued", lat: 19, lng: 72 } });
        return route.fulfill({ json: { ...baseTicket, currentBlock: "100", live: true } });
      }
      throw new Error(`Unexpected writer route ${url.pathname}`);
    });
    async function tick(ms) { await page.clock.runFor(ms); await page.waitForTimeout(100); }
    async function snapshot(name) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.doesNotMatch(await page.locator("body").innerText(), /viem|RPC|429|unknown error/i);
      if (capture) await page.screenshot({ path: path.join(capture, `${width}-${colorScheme}-${name}.png`), fullPage: true });
    }
    async function statusFits(text) {
      const status = page.getByText(text, { exact: true });
      await expect(status).toBeVisible();
      const geometry = await status.evaluate((element) => {
        const box = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect(), css = getComputedStyle(element);
        return { size: parseFloat(css.fontSize), line: parseFloat(css.lineHeight), fits: box.left >= parent.left && box.right <= parent.right && element.scrollWidth <= element.clientWidth };
      });
      assert.ok(geometry.size <= 22 && geometry.line >= geometry.size * 1.3 && geometry.fits, JSON.stringify(geometry));
    }
    await page.goto(`${origin}/scan`, { waitUntil: "domcontentloaded" });
    // Waiting room: before the presenter starts, the phone asks every 3 s, and stops once it is open.
    await expect(page.getByRole("button", { name: "Not live yet", exact: true })).toBeDisabled();
    const waitingReads = sessionReads;
    await tick(3000);
    assert.equal(sessionReads, waitingReads + 1, "The waiting room asks again after 3 s.");
    sessionLive = true;
    await tick(3000);
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    const openReads = sessionReads;
    await tick(30000);
    assert.equal(sessionReads, openReads, "Once the session is open, the phone stops asking.");
    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("SE test");
    phase = "submit-error";
    await page.getByRole("button", { name: "Write my entity", exact: true }).click();
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveText("Reconnecting…");
    await snapshot("submit-error");
    phase = "queued";
    await page.getByRole("button", { name: "Write my entity", exact: true }).click();
    await expect(page.getByText("In the queue: next block", { exact: true })).toBeVisible();
    phase = "error";
    await tick(1500);
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveText("Reconnecting…");
    const beforeRetry = tickets.length;
    await tick(1000);
    assert.equal(tickets.length, beforeRetry, "No tight retry after an error.");
    phase = "written";
    await tick(2000);
    await expect(page.getByText("Written in block #100", { exact: true })).toBeVisible();
    await expect(page.getByText("Set to expire at block #130 (15 min)", { exact: true })).toBeVisible();
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveCount(0);
    await statusFits("You’re done. Watch the map.");
    await snapshot("written");
    // Done: no more requests of any kind, however long the phone stays open.
    const done = { session: sessionReads, tickets: tickets.length };
    await tick(120000);
    assert.deepEqual({ session: sessionReads, tickets: tickets.length }, done, "After written the phone makes no requests.");
    const writtenCount = await page.evaluate(() => localStorage.getItem(`arkiv-workshop-count:ABCD1234:${localStorage.getItem("arkiv-workshop-device")}`));
    assert.equal(writtenCount, "1", "The write counts once.");
    assert.deepEqual(rpc, [], "The phone must never attempt an RPC.");
    assert.equal(submissions.at(-1).session, "ABCD1234");
    assert.ok(tickets.every((item) => /^[a-f0-9-]{36}$/i.test(item.device)));
    results.push({ width, colorScheme, sessionReads, ticketRequests: tickets.length, rpcRequests: rpc.length, silentAfterWritten: true, errorBackoff: true, statusFits: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ checks: results, pageErrors: errors }) + "\n");
} finally { await browser.close(); app.stop(); }
