// Full phone lifecycle against writer fixtures. Any RPC or other external request is a failure.
import assert from "node:assert/strict";
import { readFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const origin = "https://mumbai-ethglobal.vercel.app";
const writer = "https://mumbai-workshop-writer.santiagotrujillozuluaga.workers.dev";
const root = path.resolve("out");
const capture = process.argv[2];
if (capture) await mkdir(capture, { recursive: true });
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
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
    let sessionReads = 0;
    const rpc = [], tickets = [], submissions = [];
    const ticketId = "11111111-1111-4111-8111-111111111111";
    const baseTicket = { ticket: ticketId, status: "written", entityKey: "0x12345678", block: "100", expiresAtBlock: "130", lat: 19, lng: 72 };
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === origin) {
        let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
        if (!file.startsWith(root + path.sep) && file !== root) return route.abort();
        try {
          if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
          return route.fulfill({ contentType: mime[path.extname(file)] ?? "application/octet-stream", body: await readFile(file) });
        } catch { return route.fulfill({ status: 404, body: "Not found" }); }
      }
      if (url.origin !== writer || url.pathname === "/api/rpc") { rpc.push({ url: request.url(), method: request.method() }); return route.abort(); }
      if (url.pathname === "/api/session") {
        sessionReads++;
        assert.equal(url.searchParams.get("s"), null);
        return route.fulfill({ json: { valid: true, code: "ABCD1234", doors: "open", phase: "talk", replay: false, network: "tiramisu" } });
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
        if (phase === "loading") return route.fulfill({ json: baseTicket });
        const block = phase === "blocks" ? "110" : phase === "live" ? "113" : phase === "extended" ? "130" : phase === "boundary" ? "730" : "731";
        return route.fulfill({ json: { ...baseTicket, currentBlock: block, expiresAtBlock: ["extended", "boundary", "expired"].includes(phase) ? "730" : "130", live: phase !== "expired" } });
      }
      throw new Error(`Unexpected writer route ${url.pathname}`);
    });
    async function tick(ms) { await page.clock.runFor(ms); await page.waitForTimeout(100); }
    async function snapshot(name) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.doesNotMatch(await page.locator("body").innerText(), /viem|RPC|429|unknown error/i);
      if (capture) await page.screenshot({ path: path.join(capture, `${width}-${colorScheme}-${name}.png`), fullPage: true });
    }
    const clockSeconds = (text) => { const [m, sec] = text.split(":").map(Number); return m * 60 + sec; };
    async function statusFits(text) {
      const status = page.getByText(text, { exact: true });
      await expect(status).toBeVisible();
      const geometry = await status.evaluate((element) => {
        const box = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect(), css = getComputedStyle(element);
        return { size: parseFloat(css.fontSize), line: parseFloat(css.lineHeight), fits: box.left >= parent.left && box.right <= parent.right && element.scrollWidth <= element.clientWidth };
      });
      assert.ok(geometry.size <= 22 && geometry.line >= geometry.size * 1.3 && geometry.fits, JSON.stringify(geometry));
    }
    await page.goto(`${origin}/scan/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("SE test");
    await page.getByRole("button", { name: "Write my entity", exact: true }).click();
    await expect(page.getByText("In the queue: next block", { exact: true })).toBeVisible();
    phase = "loading";
    await tick(1500);
    await expect(page.getByText("Written in block #100", { exact: true })).toBeVisible();
    await page.waitForTimeout(250);
    assert.deepEqual(rpc, [], "The phone must never attempt an RPC, including after written.");
    await statusFits("Reading your lifetime…");
    await snapshot("loading");
    const sessionReadsAfterWritten = sessionReads;
    phase = "blocks";
    await tick(5000);
    await statusFits("20 blocks left");
    await snapshot("blocks");
    phase = "live";
    await tick(5000);
    await expect(page.locator(".phone-countdown")).toHaveText(/^\d+:\d{2}$/);
    await snapshot("live");
    const previous = clockSeconds(await page.locator(".phone-countdown").innerText());
    phase = "error";
    await tick(5000);
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveText("Reconnecting…");
    const held = clockSeconds(await page.locator(".phone-countdown").innerText());
    assert.ok(held > 0 && held <= previous);
    await snapshot("reconnecting");
    const firstError = tickets.at(-1);
    const beforeRetry = tickets.length;
    await tick(9000);
    assert.equal(tickets.length, beforeRetry, "No tight retry after an error.");
    await tick(1000);
    assert.equal(tickets.length, beforeRetry + 1);
    assert.ok(tickets.at(-1).at - firstError.at >= 10000);
    const secondError = tickets.at(-1);
    phase = "extended";
    await tick(20000);
    assert.ok(tickets.at(-1).at - secondError.at >= 20000);
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveCount(0);
    await expect(page.getByText("Santiago extended you! +20 min.", { exact: true })).toBeVisible();
    await expect(page.locator(".phone-countdown")).toHaveText(/^\d+:\d{2}$/);
    assert.equal(sessionReads, sessionReadsAfterWritten, "After written the phone reads only its ticket.");
    phase = "boundary";
    await tick(5000);
    await statusFits("Checking Entity Expiration…");
    await expect(page.getByText(/You expired at block/)).toHaveCount(0);
    await snapshot("checking");
    phase = "expired";
    await tick(5000);
    await expect(page.getByText("You expired at block #730. That’s Entity Expiration.", { exact: true })).toBeVisible();
    await snapshot("expired");
    const writtenCount = await page.evaluate(() => localStorage.getItem(`arkiv-workshop-count:ABCD1234:${localStorage.getItem("arkiv-workshop-device")}`));
    assert.equal(writtenCount, "1", "Repeated written polls must count the write only once.");
    await page.getByRole("button", { name: "Write another", exact: true }).click();
    phase = "submit-error";
    await page.getByRole("button", { name: "Write my entity", exact: true }).click();
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveText("Reconnecting…");
    await snapshot("submit-error");
    assert.deepEqual(rpc, []);
    assert.equal(submissions[0].session, "ABCD1234");
    assert.ok(tickets.every((item) => /^[a-f0-9-]{36}$/i.test(item.device)));
    results.push({ width, colorScheme, rpcRequests: rpc.length, ticketRequests: tickets.length, errorBackoff: true, extension: true, expirationAuthoritative: true, statusFits: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ checks: results, pageErrors: errors }) + "\n");
} finally { await browser.close(); }
