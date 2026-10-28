// Isolated read-only layout checks of this build (served by tests/local-app.mjs). Writer responses here are UI
// fixtures (login, status, session, RPC); nothing reaches the real writer or the DB-Chain.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startApp } from "./local-app.mjs";

const origin = "https://mumbai-ethglobal.vercel.app";
const writer = origin;
const PASSWORD = "fixture-password";
const PALETTE = ["#fe7446", "#f6f4ef", "#14f195", "#9945ff", "#dc1fff", "#627eea", "#00c2ff"];
const capture = process.argv[2];
if (capture) await mkdir(capture, { recursive: true });
const app = await startApp();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });
const errors = [];
const evidence = [];
const writerCalls = { start: 0, login: 0 };
async function setup(options, { loggedIn = true } = {}) {
  const context = await browser.newContext(options);
  await context.addInitScript(([signedIn]) => {
    sessionStorage.setItem("arkiv-stage-source", "mock");
    if (signedIn && !localStorage.getItem("arkiv-presenter-login")) localStorage.setItem("arkiv-presenter-login", JSON.stringify({ token: "p.fixture", expiresAt: Date.now() + 3_600_000 }));
  }, [loggedIn]);
  await app.serve(context, origin);
  await context.route(`${writer}/api/**`, (route) => route.abort());
  await context.route(`${writer}/api/session*`, (route) => route.fulfill({ json: { valid: true, code: "UI-LAYOUT", doors: "open", phase: "talk", replay: false, network: "Tiramisu" } }));
  await context.route(`${writer}/api/rpc`, (route) => route.fulfill({ json: { jsonrpc: "2.0", id: 1, error: { code: -32000, message: "UI fixture: no chain reads" } } }));
  await context.route(`${writer}/api/login`, (route) => {
    writerCalls.login++;
    return route.request().postDataJSON().password === PASSWORD
      ? route.fulfill({ json: { token: "p.fixture", expiresAt: Date.now() + 3_600_000 } })
      : route.fulfill({ status: 401, json: { error: "unauthorized", message: "Wrong password." } });
  });
  await context.route(`${writer}/api/presenter/status`, (route) => route.fulfill({ json: { session: "UI-LAYOUT", doors: "open", phase: "talk", replay: false, held: false, queued: 0, inFlight: false, written: 0, failed: 0, lastBatch: null, balanceWei: "0", network: "Tiramisu", requestsToday: 0 } }));
  await context.route(`${writer}/api/presenter/session/start`, (route) => { writerCalls.start++; return route.fulfill({ json: { code: "RESET-01" } }); });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page };
}
async function commands(page, list) {
  await page.evaluate((items) => { const channel = new BroadcastChannel("arkiv-mumbai-stage"); for (const cmd of items) channel.postMessage({ kind: "command", cmd }); channel.close(); }, list);
}
try {
  // The presenter pages ask for the password; one login unlocks both windows of the split screen.
  {
    const { context, page } = await setup({ viewport: { width: 1280, height: 720 } }, { loggedIn: false });
    await page.goto(`${origin}/map`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Presenter", exact: true })).toBeVisible();
    await expect(page.locator(".globe-shell,.join-qr")).toHaveCount(0);
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Enter", exact: true }).click();
    await expect(page.locator('.gate-card [role="alert"]')).toHaveText("Wrong password.");
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Enter", exact: true }).click();
    await expect(page.locator(".qr-image img")).toBeVisible();
    const slides = await context.newPage();
    slides.on("pageerror", (error) => errors.push(error.message));
    await slides.goto(`${origin}/slides`, { waitUntil: "domcontentloaded" });
    await expect(slides.locator('[data-screen="slides"][data-scene="S0"]')).toBeVisible({ timeout: 20000 });
    await expect(slides.getByRole("heading", { name: "Presenter", exact: true })).toHaveCount(0);
    // The phone page has no gate.
    const phone = await context.newPage();
    await phone.goto(`${origin}/scan`, { waitUntil: "domcontentloaded" });
    await expect(phone.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    assert.equal(writerCalls.login, 2);
    evidence.push({ surface: "gate", wrongPasswordRejected: true, sharedAcrossWindows: true, phoneUngated: true });
    await context.close();
  }

  const { context, page } = await setup({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${origin}/map`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".qr-image img")).toBeVisible();
  // One screen, one thing at a time: the title slide covers the map (no HUD), the corner QR stays.
  await expect(page.getByRole("heading", { name: /From zero to hero/ })).toBeVisible();
  await expect(page.locator(".app-hud")).toHaveCount(0);
  await expect(page.locator(".globe-dots")).toHaveCount(1);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S0.png") }); }
  // S7: the big QR on the map itself; D swaps it for the 3 · 2 · 1 countdown and back.
  await commands(page, [{ type: "goto", index: 1 }]);
  await expect(page.locator(".join-qr-center")).toBeVisible();
  await expect(page.locator(".join-qr-corner")).toHaveCount(0);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S7.png") }); }
  await page.keyboard.press("d");
  await expect(page.locator(".join-qr-center")).toHaveCount(0);
  await expect(page.getByText("Everyone: tap Write my entity.")).toBeVisible();
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S7-countdown.png") }); }
  await page.keyboard.press("d");
  await expect(page.locator(".join-qr-center")).toBeVisible();
  // → from S7 lands on the map, where the room's entities arrive.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="L1"]')).toBeVisible();
  await expect(page.locator(".app-hud")).toHaveCount(1);
  await expect(page.getByText("The map is a query.")).toBeVisible();
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-L1.png") }); }
  // The agenda comes after the writing: part one is done, the rest follows. No QR, no HUD.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="AG"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where we're going" })).toBeVisible();
  await expect(page.getByLabel("Done")).toHaveCount(1);
  await expect(page.locator(".join-qr,.app-hud")).toHaveCount(0);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-AG.png") }); }
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="S1"]')).toBeVisible();
  await expect(page.locator(".join-qr,.app-hud")).toHaveCount(0);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S1.png") }); }
  await commands(page, [{ type: "goto", index: 11 }, { type: "togglePanel", panel: "filters", open: true }]);
  await expect(page.getByText("Mock data", { exact: true })).toBeVisible();
  await expect(page.locator(".filters-panel")).toBeVisible();
  await commands(page, [{ type: "next" }]);
  await expect(page.locator('pre[aria-label="Executed query text"]')).toContainText('"color"');
  await expect(page.locator(".stage-toolbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Color · Orange", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".query-scope summary code")).not.toContainText(/,\s*(?:·|$)/);
  await expect(page.locator(".qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  await expect(page.locator(".qr-url")).toHaveAttribute("href", "https://mumbai-ethglobal.vercel.app/scan");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".query-panel").evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  const measure = () => page.evaluate(() => {
    const rect = (selector) => { const element = document.querySelector(selector); const box = element.getBoundingClientRect(); const css = getComputedStyle(element); return { x: box.x, y: box.y, width: box.width, height: box.height, fontSize: css.fontSize, whiteSpace: css.whiteSpace }; };
    const url = document.querySelector(".qr-url");
    return { qr: rect(".join-qr-corner"), url: rect(".qr-url"), event: rect(".event-log"), urlFits: url.scrollWidth <= url.clientWidth, query: rect(".query-panel"), code: rect('pre[aria-label="Executed query text"]'), filters: rect(".filters-panel"), counter: rect(".stage-counter strong"), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  for (const [width, height] of [[1920, 1080], [1536, 864], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator(".join-qr-corner").evaluate((element) => Math.round(element.getBoundingClientRect().width)), { timeout: 20000 }).toBe(Math.round(424 * width / 1920));
    const layout = await measure();
    const scale = width / 1920;
    assert.ok(Math.abs(layout.qr.x - 1464 * scale) < 1);
    assert.ok(Math.abs(layout.qr.y - 32 * scale) < 1);
    assert.ok(Math.abs(layout.query.y - 800 * scale) < 1);
    assert.ok(layout.filters.y + layout.filters.height <= layout.query.y);
    assert.equal(layout.code.fontSize, "21px");
    assert.equal(layout.counter.fontSize, "64px");
    assert.equal(layout.url.whiteSpace, "nowrap");
    assert.equal(layout.url.fontSize, "20px");
    assert.equal(layout.urlFits, true);
    assert.ok(layout.url.y + layout.url.height <= layout.qr.y + layout.qr.height);
    assert.ok(layout.event.y >= layout.qr.y + layout.qr.height);
    assert.equal(layout.overflow, false);
    evidence.push({ surface: "map", viewport: `${width}x${height}`, layout });
  }
  // Half of a 1920x1080 screen: the HUD reaches the window's top and bottom instead of a letterbox.
  {
    await page.setViewportSize({ width: 960, height: 1080 });
    await expect.poll(() => page.locator(".join-qr-corner").evaluate((element) => Math.round(element.getBoundingClientRect().y)), { timeout: 20000 }).toBe(16);
    const layout = await measure();
    assert.ok(Math.abs(layout.query.y + layout.query.height - (1080 - 16)) < 1, "The query panel sits at the bottom edge.");
    assert.ok(Math.abs(layout.qr.x - 1464 * 0.5) < 1);
    assert.ok(layout.filters.y + layout.filters.height <= layout.query.y);
    assert.equal(layout.overflow, false);
    if (capture) await page.screenshot({ path: path.join(capture, "map-960x1080-L3.png") });
    evidence.push({ surface: "map", viewport: "960x1080", layout });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await commands(page, [{ type: "togglePanel", panel: "filters", open: false }, { type: "goto", index: 2 }]);
  await expect(page.locator('.event-log li[data-event="created"] button').first()).toBeVisible({ timeout: 10000 });
  await page.locator('.event-log li[data-event="created"] button').first().click();
  await commands(page, [{ type: "goto", index: 12 }]);
  await expect(page.locator(".inspector-columns")).toBeVisible();
  const columns = await page.locator(".inspector-columns").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  assert.equal(columns, 2);
  for (const field of ["$key", "$creator", "$owner", "$expiresAt"]) {
    await commands(page, [{ type: "next" }]);
    await expect(page.locator(".badge-highlight")).toHaveAttribute("data-field", field);
    const inside = await page.locator(".inspector-columns").evaluate((element) => {
      const box = element.getBoundingClientRect();
      const longitude = element.querySelector("div:first-child dl>div:last-child").getBoundingClientRect();
      return longitude.bottom <= box.bottom + 1;
    });
    assert.equal(inside, true, "All five user columns must fit beside the current badge.");
    if (capture && (field === "$key" || field === "$expiresAt")) {
      for (const [width, height] of [[1280, 720], [1920, 1080]]) {
        await page.setViewportSize({ width, height });
        await expect.poll(() => page.locator(".inspector-panel").evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(Math.round(856 * width / 1920));
        await page.locator(".inspector-panel:has(.inspector-columns)").screenshot({ path: path.join(capture, `${width}-L4-${field.slice(1)}.png`), timeout: 60000 });
      }
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await commands(page, [{ type: "goto", index: 13 }, { type: "next" }]);
  await expect(page.locator(".review-card")).toHaveCount(0);
  await commands(page, [{ type: "next" }]);
  await expect(page.locator(".review-card").first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".business-card")).toContainText("photo · bundled with the app");
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const footerFits = await page.locator(".business-card").evaluate((element) => {
      const body = element.getBoundingClientRect();
      const footer = element.querySelector(".photo-callback").getBoundingClientRect();
      return footer.top >= body.top && footer.bottom <= body.bottom + 1 && element.scrollHeight <= element.clientHeight + 1;
    });
    assert.equal(footerFits, true, "The entire callback footer must fit without scrolling the card.");
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await commands(page, [{ type: "goto", index: 14 }]);
  await expect(page.locator(".owner-small-print")).toContainText("Demo view");
  await expect(page.locator(".stage-counter small")).toHaveText("owner");
  await expect(page.locator(".owner-count,.owner-statement")).toHaveCount(0);
  await commands(page, [{ type: "next" }]);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
  await expect(page.locator(".owner-panel")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("button", { name: /Transfer ownership/ })).toBeVisible();
  await commands(page, [{ type: "goto", index: 16 }]);
  // L8 keeps the same corner QR to /scan, clear of the event log below it.
  await expect(page.locator(".join-qr-corner .qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  await expect(page.locator(".join-qr-corner .qr-url")).toHaveAttribute("href", "https://mumbai-ethglobal.vercel.app/scan");
  {
    const qr = await page.locator(".join-qr-corner").boundingBox();
    for (const panel of await page.locator(".event-log,.inspector-panel,.owner-panel").all()) assert.ok((await panel.boundingBox()).y >= qr.y + qr.height, "No panel sits behind the QR.");
  }
  await commands(page, [{ type: "goto", index: 17 }]);
  await expect(page.locator(".query-panel,.filters-panel,.inspector-panel,.event-log,.stage-toolbar")).toHaveCount(0);
  // On one screen the closing lines sit on the map.
  await expect(page.getByText("Thank you.")).toBeVisible();
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-L9.png") }); }

  // /slides follows the map, and its keys drive both windows.
  const slides = await context.newPage();
  slides.on("pageerror", (error) => errors.push(error.message));
  await slides.setViewportSize({ width: 1280, height: 720 });
  await slides.goto(`${origin}/slides`, { waitUntil: "domcontentloaded" });
  await expect(slides.locator('[data-screen="slides"][data-scene="L9"]')).toBeVisible({ timeout: 20000 });
  await expect(slides.getByText("Thank you.")).toBeVisible();
  await commands(page, [{ type: "goto", index: 1 }]);
  await expect(slides.locator('[data-scene="S7"]')).toBeVisible();
  // The big QR sits in the slide's left column (x 660 of 1920).
  await expect.poll(async () => { const box = await slides.locator(".join-qr-center").boundingBox(); return box && Math.round(box.x + box.width / 2); }, { timeout: 20000 }).toBe(Math.round(660 * 1280 / 1920));
  await expect(slides.locator(".join-qr-center .qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  await slides.keyboard.press("d");
  await expect(slides.locator(".join-qr-center")).toHaveCount(0);
  await expect(slides.getByText("Everyone: tap Write my entity.")).toBeVisible();
  await slides.keyboard.press("d");
  await expect(slides.locator(".join-qr-center")).toBeVisible();
  await slides.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="L1"]')).toBeVisible();
  await expect(slides.getByText("ON THE MAP →")).toBeVisible();
  await expect(slides.getByRole("heading", { name: "Write it", exact: true })).toBeVisible();
  // The live card explains the map in plain words, with the 3D mascot.
  await expect(slides.getByText("Your phone sent one transaction.")).toBeVisible();
  await expect(slides.getByRole("img", { name: "Arkiv mascot typing on a laptop" })).toBeVisible();
  await expect(page.getByText("The map is a query.").first()).toBeVisible();
  // Half a screen: the slide keeps 16:9 inside its window, nothing scrolls.
  await slides.setViewportSize({ width: 960, height: 1080 });
  assert.equal(await slides.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (capture) await slides.screenshot({ path: path.join(capture, "slides-960x1080-L1.png") });
  // L8: slides take clicks, and Prizes opens and closes.
  await commands(page, [{ type: "goto", index: 16 }]);
  const prizes = slides.getByRole("button", { name: "Prizes" });
  await expect(prizes).toHaveAttribute("aria-expanded", "false");
  await prizes.click();
  await expect(prizes).toHaveAttribute("aria-expanded", "true");
  await prizes.click();
  await expect(prizes).toHaveAttribute("aria-expanded", "false");
  // A second /map window follows the first instead of running the talk twice (two Rabby prompts).
  const secondMap = await context.newPage();
  secondMap.on("pageerror", (error) => errors.push(error.message));
  await secondMap.setViewportSize({ width: 1280, height: 720 });
  await secondMap.goto(`${origin}/map`, { waitUntil: "domcontentloaded" });
  await expect(secondMap.getByText("Another map window is running the talk. This one follows it.")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Another map window is running the talk.")).toHaveCount(0);
  await expect(secondMap.locator('[data-screen="map"][data-scene="L8"]')).toBeVisible();
  if (capture) { await secondMap.waitForTimeout(1200); await secondMap.screenshot({ path: path.join(capture, "map-1280-L8-follower.png") }); }
  await secondMap.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="L9"]')).toBeVisible();
  await expect(slides.locator('[data-screen="slides"][data-scene="L9"]')).toBeVisible();
  await secondMap.close();
  // Reset: two clicks start a new writer session and take both windows back to S0.
  await slides.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal(writerCalls.start, 0, "One click only arms Reset.");
  await slides.getByRole("button", { name: "Click again to reset", exact: true }).click();
  await expect.poll(() => writerCalls.start).toBe(1);
  await expect(page.locator('[data-screen="map"][data-scene="S0"]')).toBeVisible();
  await expect(slides.locator('[data-screen="slides"][data-scene="S0"]')).toBeVisible();
  // /map keeps Reset in the "?" presenter card, out of the projected picture.
  await expect(page.getByRole("button", { name: "Reset", exact: true })).toHaveCount(0);
  await page.keyboard.press("?");
  await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeVisible();
  if (capture) await page.screenshot({ path: path.join(capture, "map-controls-reset.png") });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Click again to reset", exact: true }).click();
  await expect.poll(() => writerCalls.start).toBe(2);
  // The reset closes the card (and its "Resetting…" button) along with everything else.
  await expect(page.getByRole("heading", { name: "Presenter controls", exact: true })).toHaveCount(0);
  await expect(page.locator(".presenter-bar")).toHaveCount(0);
  // The ON|OFF switch beside "?" opens and pauses phone writes; it shows what the status poll saw.
  const writingSwitch = page.getByRole("group", { name: "Phone writing" });
  await expect(writingSwitch.getByRole("button", { name: "ON", exact: true })).toHaveAttribute("aria-pressed", "true");
  const writing = [];
  await context.route(`${writer}/api/presenter/writing`, (route) => { writing.push(route.request().postDataJSON().on); return route.fulfill({ json: { code: "RESET-01" } }); });
  await writingSwitch.getByRole("button", { name: "OFF", exact: true }).click();
  await expect.poll(() => writing).toEqual([false]);
  await writingSwitch.getByRole("button", { name: "ON", exact: true }).click();
  await expect.poll(() => writing).toEqual([false, true]);
  // A presenter who can't find the ? key clicks the ? button; a Spanish keyboard's ¿ works too, Esc
  // closes, and the scene list jumps anywhere.
  const card = page.getByRole("dialog", { name: "Presenter controls" });
  await page.getByRole("button", { name: "Presenter controls" }).click();
  await expect(card).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  // Playwright has no Spanish layout: send the keys a Spanish keyboard reports (¿; ? through AltGr).
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "¿", bubbles: true })));
  await expect(card).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", ctrlKey: true, altKey: true, bubbles: true })));
  await expect(card).toBeVisible();
  if (capture) await page.screenshot({ path: path.join(capture, "map-1920-controls.png") });
  await card.getByRole("button", { name: /Agenda/ }).click();
  await expect(card).toHaveCount(0);
  await expect(page.locator('[data-screen="map"][data-scene="AG"]')).toBeVisible();
  await commands(page, [{ type: "goto", index: 0 }]);
  // The data source still switches from the map's "?" toolbar; the HUD shows on live scenes.
  await commands(page, [{ type: "goto", index: 2 }]);
  await page.keyboard.press("?");
  await page.getByRole("combobox", { name: "Data source" }).selectOption("live");
  await expect(page.getByText("Live · Arkiv DB-Chain", { exact: true })).toBeVisible({ timeout: 15000 });
  // The update blinker next to the label: this fixture rejects chain reads, so it says so.
  await expect(page.locator(".source-label")).toHaveAttribute("data-status", "error", { timeout: 15000 });
  await expect(page.locator(".source-label .refresh-detail")).toHaveText("Reconnecting…");
  // A hidden /map stops reading (every query spends the key's quota) and resumes on the next key.
  let reads = 0;
  const countRead = (request) => { if (request.url() === `${writer}/api/rpc`) reads++; };
  page.on("request", countRead);
  await expect.poll(() => reads, { timeout: 10000 }).toBeGreaterThan(0);
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.getByText("Live reads paused to save the access key’s quota. Press any key to resume.")).toBeVisible();
  await expect(page.locator(".source-label .refresh-detail")).toHaveText("Paused");
  await page.waitForTimeout(500);
  const paused = reads;
  await page.waitForTimeout(5000);
  assert.equal(reads, paused, "A hidden /map must not read the DB-Chain.");
  await page.evaluate(() => { delete document.visibilityState; });
  await page.keyboard.press("Shift");
  await expect(page.getByText("Live reads paused", { exact: false })).toHaveCount(0);
  await expect.poll(() => reads, { timeout: 10000 }).toBeGreaterThan(paused);
  page.off("request", countRead);
  await page.getByRole("combobox", { name: "Data source" }).selectOption("mock");
  await expect(page.getByText("Mock data", { exact: true })).toBeVisible();
  // A presenter notice must not stay on stage for the rest of the talk.
  await commands(page, [{ type: "select", keys: [], mode: "set" }, { type: "extend", scope: "selected" }]);
  await expect(page.locator(".presenter-notice")).toHaveText("Select an entity first.");
  await expect(page.locator(".presenter-notice")).toHaveCount(0, { timeout: 12000 });
  evidence.push({ surface: "slides", follows: true, keysDriveMap: true, countdownToggles: true, resetStartsSession: true, noticesFade: true });
  await context.close();

  for (const width of [360, 390]) for (const colorScheme of ["light", "dark"]) {
    const { context, page } = await setup({ viewport: { width, height: 844 }, colorScheme }, { loggedIn: false });
    await page.goto(`${origin}/scan`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, swatches: [...document.querySelectorAll(".color-swatch")].map((swatch) => getComputedStyle(swatch).backgroundColor), header: getComputedStyle(document.querySelector(".phone-header")).height, input: getComputedStyle(document.querySelector('input[name="name"]')).height, cta: getComputedStyle(document.querySelector(".phone-submit")).height, background: getComputedStyle(document.querySelector(".phone-surface")).backgroundColor, text: document.querySelector(".phone-main").innerText }));
    assert.equal(layout.overflow, false);
    assert.equal(layout.swatches.length, 7);
    assert.equal(layout.header, "60px");
    assert.equal(layout.input, "52px");
    assert.equal(layout.cta, "56px");
    // Dark only: a light system theme still gets the dark phone.
    assert.equal(layout.background, "rgb(17, 17, 17)");
    await expect(page.locator(".phone-header")).toHaveText("Join the map");
    await expect(page.getByText("Choose a country", { exact: true })).toBeVisible();
    await expect(page.getByText("How long should this data (entity) live?")).toBeVisible();
    for (const gone of [/hang tight/i, /doors/i, /testnet/i, /everything you write/i, /custom/i, /Where are you from/i]) assert.doesNotMatch(layout.text, gone);
    await page.getByRole("combobox", { name: "Your country" }).click();
    await expect(page.getByRole("option").first()).toHaveText("India");
    await page.getByRole("combobox", { name: "Search countries" }).fill("Colombia");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("combobox", { name: "Your country" })).toContainText("Colombia");
    await page.getByRole("combobox", { name: "Your country" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox", { name: "Your country" })).toBeFocused();
    await page.getByRole("button", { name: "Green", exact: true }).click();
    await expect(page.getByRole("button", { name: "Green", exact: true })).toHaveAttribute("aria-pressed", "true");
    evidence.push({ surface: "phone", viewport: `${width}x844`, colorScheme, layout: { ...layout, text: undefined }, countryKeyboard: true });
    await context.close();
  }
  for (const width of [360, 390]) for (const colorScheme of ["light", "dark"]) {
    const { context, page } = await setup({ viewport: { width, height: 844 }, colorScheme }, { loggedIn: false });
    const sessionReads = [];
    const submissions = [];
    await context.route(`${writer}/api/session*`, (route) => { sessionReads.push(route.request().url()); return route.fallback(); });
    await context.route(`${writer}/api/submit*`, (route) => {
      submissions.push({ body: route.request().postDataJSON(), device: route.request().headers()["x-device-token"] });
      return route.fulfill({ status: 403, json: { error: "bad_session", message: "This session has ended." } });
    });
    const snapshot = async (state) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (capture) await page.screenshot({ path: path.join(capture, `phone-${width}-${colorScheme}-${state}.png`), fullPage: true });
    };
    // No code to type and nothing to wait for: the writer puts the entity in the running session.
    await page.goto(`${origin}/scan`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Workshop code" })).toHaveCount(0);
    await snapshot("joined");
    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("Codeless join");
    await page.getByRole("button", { name: "Purple", exact: true }).click();
    await page.getByRole("button", { name: "Write my entity", exact: true }).click();
    await expect.poll(() => submissions.length).toBe(1);
    assert.equal("session" in submissions[0].body, false, "Phones send no session code.");
    assert.equal(submissions[0].body.lifetimeSec, 900, "The slider starts at the 15-minute default.");
    assert.equal(submissions[0].body.color, "#9945ff");
    assert.ok(PALETTE.includes(submissions[0].body.color));
    assert.match(submissions[0].device, /^[a-f0-9-]{36}$/i);
    // A session that ended between scan and tap: the phone says so and the button stays usable.
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveText("The map was reset. Try again.");
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    await snapshot("ended");
    assert.deepEqual(sessionReads, [], "The phone never asks for the session.");
    evidence.push({ surface: "codeless-phone", width, colorScheme, joinedWithoutCode: true, defaultLifetimeSec: 900, presetColor: true, endedSessionRetryable: true, sessionReads: sessionReads.length, interceptedSubmissions: submissions.length });
    await context.close();
  }
  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ checks: evidence, pageErrors: errors.length }) + "\n");
} finally { if (errors.length) process.stderr.write(JSON.stringify({ pageErrors: errors }) + "\n"); await browser.close(); app.stop(); }
