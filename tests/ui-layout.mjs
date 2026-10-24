// Isolated read-only layout checks. Session responses here are UI fixtures; no writes are sent.
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const origin = "https://mumbai-ethglobal.vercel.app";
const root = path.resolve("out");
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });
const errors = [];
const evidence = [];
async function setup(options) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => sessionStorage.setItem("arkiv-stage-source", "mock"));
  await context.route(`${origin}/**`, async (route) => {
    let file = path.resolve(root, "." + decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(root + path.sep) && file !== root) return route.abort();
    try { if ((await stat(file)).isDirectory()) file = path.join(file, "index.html"); await route.fulfill({ status: 200, contentType: mime[path.extname(file)] ?? "application/octet-stream", body: await readFile(file) }); }
    catch { await route.fulfill({ status: 404, body: "Not found" }); }
  });
  await context.route("https://mumbai-workshop-writer.santiagotrujillozuluaga.workers.dev/api/session?*", (route) => route.fulfill({ json: { valid: true, doors: "open", phase: "talk", replay: false, network: "Tiramisu" } }));
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page };
}
async function commands(page, list) {
  await page.evaluate((items) => { const channel = new BroadcastChannel("arkiv-mumbai-stage"); for (const cmd of items) channel.postMessage({ kind: "command", cmd }); channel.close(); }, list);
}
try {
  const { context, page } = await setup({ viewport: { width: 1920, height: 1080 } });
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".qr-image img")).toBeVisible();
  await commands(page, [{ type: "goto", index: 10 }, { type: "togglePanel", panel: "filters", open: true }]);
  await expect(page.getByText("Mock data", { exact: true })).toBeVisible();
  await expect(page.locator(".filters-panel")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".query-panel").evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  for (const [width, height] of [[1920, 1080], [1536, 864], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator(".join-qr-corner").evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(Math.round(424 * width / 1920));
    const layout = await page.evaluate(() => {
      const rect = (selector) => { const element = document.querySelector(selector); const box = element.getBoundingClientRect(); const css = getComputedStyle(element); return { x: box.x, y: box.y, width: box.width, height: box.height, fontSize: css.fontSize, whiteSpace: css.whiteSpace }; };
      return { qr: rect(".join-qr-corner"), url: rect(".qr-url"), query: rect(".query-panel"), code: rect(".query-panel pre"), filters: rect(".filters-panel"), counter: rect(".stage-counter strong"), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    const scale = width / 1920;
    assert.ok(Math.abs(layout.qr.x - 1464 * scale) < 1);
    assert.ok(Math.abs(layout.qr.y - 32 * scale) < 1);
    assert.ok(Math.abs(layout.query.y - 800 * scale) < 1);
    assert.ok(layout.filters.y + layout.filters.height <= layout.query.y);
    assert.equal(layout.code.fontSize, "21px");
    assert.equal(layout.counter.fontSize, "64px");
    assert.equal(layout.url.whiteSpace, "nowrap");
    assert.equal(layout.overflow, false);
    evidence.push({ surface: "stage", viewport: `${width}x${height}`, layout });
  }
  await commands(page, [{ type: "togglePanel", panel: "filters", open: false }, { type: "goto", index: 8 }]);
  await expect(page.locator('.event-log li[data-event="created"] button').first()).toBeVisible({ timeout: 10000 });
  await page.locator('.event-log li[data-event="created"] button').first().click();
  await commands(page, [{ type: "goto", index: 11 }]);
  await expect(page.locator(".inspector-columns")).toBeVisible();
  const columns = await page.locator(".inspector-columns").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  assert.equal(columns, 2);
  await commands(page, [{ type: "goto", index: 13 }]);
  await expect(page.locator(".owner-small-print")).toContainText("Demo view");
  await expect(page.locator(".stage-counter small")).toHaveText("owner");
  await commands(page, [{ type: "goto", index: 7 }]);
  await expect(page.locator(".app-hud")).toHaveCount(0);
  await expect(page.locator(".doors-countdown")).toHaveCount(0);
  const centerQR = await page.locator(".join-qr-center").boundingBox();
  assert.ok(Math.abs(centerQR.x + centerQR.width / 2 - 660 * 1280 / 1920) < 1);
  evidence.push({ surface: "S7", centerX: centerQR.x + centerQR.width / 2, hudHidden: true, appCountdownHidden: true });
  await context.close();

  for (const width of [360, 390]) for (const colorScheme of ["light", "dark"]) {
    const { context, page } = await setup({ viewport: { width, height: 844 }, colorScheme });
    await page.goto(`${origin}/j?s=UI-LAYOUT`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, swatches: document.querySelectorAll(".color-swatch").length, header: getComputedStyle(document.querySelector(".phone-header")).height, input: getComputedStyle(document.querySelector('input[name="name"]')).height, cta: getComputedStyle(document.querySelector(".phone-submit")).height, background: getComputedStyle(document.querySelector(".phone-surface")).backgroundColor }));
    assert.equal(layout.overflow, false);
    assert.equal(layout.swatches, 12);
    assert.equal(layout.header, "60px");
    assert.equal(layout.input, "52px");
    assert.equal(layout.cta, "56px");
    assert.equal(layout.background, colorScheme === "dark" ? "rgb(17, 17, 17)" : "rgb(246, 244, 239)");
    await page.getByRole("combobox", { name: "Your country" }).click();
    await expect(page.getByRole("option").first()).toHaveText("India");
    await page.getByRole("combobox", { name: "Search countries" }).fill("Colombia");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("combobox", { name: "Your country" })).toContainText("Colombia");
    await page.getByRole("combobox", { name: "Your country" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox", { name: "Your country" })).toBeFocused();
    await page.getByRole("button", { name: "Custom hex color", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Custom hex color value" })).toBeVisible();
    evidence.push({ surface: "phone", viewport: `${width}x844`, colorScheme, layout, countryKeyboard: true, customColor: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ checks: evidence, pageErrors: errors.length }) + "\n");
} finally { await browser.close(); }
