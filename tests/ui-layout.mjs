// Isolated read-only layout checks of this build (served by tests/local-app.mjs). Writer responses here are UI
// fixtures (login, status, session, RPC); nothing reaches the real writer or the DB-Chain.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { SCENES, SECTIONS, sceneIndex } from "../shared/scenes.ts";
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
const go = (id) => ({ type: "goto", index: sceneIndex(id) });
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
    await expect(page.getByRole("heading", { name: /From zero to hero/ })).toBeVisible();
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
  // One screen, one thing at a time: the title slide covers the map (no HUD), with no QR and no
  // outline bar yet. The room scans later, in "Build it, live".
  await expect(page.getByRole("heading", { name: /From zero to hero/ })).toBeVisible();
  await expect(page.locator(".app-hud")).toHaveCount(0);
  await expect(page.locator(".globe-dots")).toHaveCount(1);
  await expect(page.locator(".join-qr,.outline-bar")).toHaveCount(0);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S0.png") }); }
  // The index lists the talk's parts; from here on the outline bar across the top follows them.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="IX"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "What we'll do" })).toBeVisible();
  const bar = page.getByRole("navigation", { name: "Talk outline" });
  await expect(bar.locator(".outline-part")).toHaveCount(SECTIONS.length);
  for (const section of SECTIONS) await expect(bar).toContainText(section.title);
  await expect(bar.locator('[aria-current="step"]')).toHaveCount(0);
  await expect(page.locator(".join-qr,.app-hud")).toHaveCount(0);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-IX.png") }); }
  // Each → moves the current part's bar; a finished part stays full.
  const fill = (part) => part.locator(".outline-track i").evaluate((element) => Number(/scaleX\(([\d.]+)\)/.exec(element.style.transform)?.[1] ?? NaN));
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="W1"]')).toBeVisible();
  const current = bar.locator('[aria-current="step"]');
  await expect(current).toContainText("Why Arkiv");
  const first = await fill(current);
  assert.ok(first > 0 && first < 1, `W1 fills part of "Why Arkiv" (${first})`);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => fill(current)).toBeGreaterThan(first);
  await commands(page, [go("ST")]);
  await expect(current).toContainText("Five steps");
  await expect(bar.locator('[data-state="done"]')).toContainText("Why Arkiv");
  assert.equal(await fill(bar.locator('[data-state="done"]')), 1);
  // S7, in "Build it, live": the big QR on the map itself; D swaps it for the 3 · 2 · 1 countdown and back.
  await commands(page, [go("S7")]);
  await expect(page.locator(".join-qr-center")).toBeVisible();
  await expect(page.locator(".join-qr-corner")).toHaveCount(0);
  await expect(current).toContainText("Build it, live");
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S7.png") }); }
  await page.keyboard.press("d");
  await expect(page.locator(".join-qr-center")).toHaveCount(0);
  await expect(page.getByText("Everyone: tap Write my entity.")).toBeVisible();
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S7-countdown.png") }); }
  await page.keyboard.press("d");
  await expect(page.locator(".join-qr-center")).toBeVisible();
  // → reads the form as one entity; the next → lands on the map, where the room's entities arrive.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="S7"]')).toBeVisible();
  await expect(page.getByText("YOUR FORM = ONE ENTITY")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="L1"]')).toBeVisible();
  await expect(page.locator(".app-hud")).toHaveCount(1);
  await expect(page.getByText("Write it. Every dot is an entity you just wrote.")).toBeVisible();
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-L1.png") }); }
  // The SDK call is a slide: the map's QR and HUD step aside.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="B2"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Write it", exact: true })).toBeVisible();
  await expect(page.locator(".join-qr,.app-hud")).toHaveCount(0);
  // L3 runs the B3 query (color is orange AND country is India), one filter per →.
  await commands(page, [go("L3"), { type: "togglePanel", panel: "filters", open: true }]);
  await expect(page.getByText("Mock data", { exact: true })).toBeVisible();
  await expect(page.getByText("Same query, on your entities.")).toBeVisible();
  await expect(page.locator(".filter-bar")).toBeVisible();
  await expect(page.locator(".filter-results")).toContainText(/\d+ results?/);
  await commands(page, [{ type: "next" }]);
  // The Query tab by default: the query text with AND, scope and filters only ($owner, never $creator).
  await expect(page.locator('pre[aria-label="Executed query text"]')).toContainText("color = str('#fe7446')");
  await expect(page.locator(".query-panel")).not.toContainText(/\$creator|createdBy/);
  await expect(page.locator(".query-expand")).toHaveCount(0);
  await expect(page.locator(".event-log")).toHaveCount(0);
  await commands(page, [{ type: "next" }]);
  await expect(page.locator('pre[aria-label="Executed query text"]')).toContainText("AND country = str('IN')");
  await commands(page, [{ type: "prev" }]);
  await expect(page.locator(".stage-toolbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Color · Orange", exact: true })).toBeVisible();
  await expect(page.locator(".query-scope code")).not.toContainText(/,\s*(?:·|$)/);
  await expect(page.locator(".qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  await expect(page.locator(".qr-url")).toHaveAttribute("href", "https://mumbai-ethglobal.vercel.app/scan");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".query-panel").evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  const measure = () => page.evaluate(() => {
    const rect = (selector) => { const element = document.querySelector(selector); const box = element.getBoundingClientRect(); const css = getComputedStyle(element); return { x: box.x, y: box.y, width: box.width, height: box.height, fontSize: css.fontSize, whiteSpace: css.whiteSpace }; };
    const url = document.querySelector(".qr-url");
    return { qr: rect(".join-qr-corner"), url: rect(".qr-url"), events: document.querySelectorAll(".event-log").length, urlFits: url.scrollWidth <= url.clientWidth, query: rect(".query-panel"), code: rect('pre[aria-label="Executed query text"]'), filters: rect(".filter-bar"), counter: rect(".stage-counter strong"), logo: rect(".stage-logo"), track: rect(".outline-track"), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  // The outline bar's labels and tracks end above the HUD's top row (logo, source label, QR card).
  const clearOfBar = (layout) => {
    for (const box of [layout.qr, layout.logo, layout.filters]) assert.ok(layout.track.y + layout.track.height <= box.y, "The outline bar sits above the HUD.");
  };
  for (const [width, height] of [[1920, 1080], [1536, 864], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator(".join-qr-corner").evaluate((element) => Math.round(element.getBoundingClientRect().width)), { timeout: 20000 }).toBe(Math.round(424 * width / 1920));
    const layout = await measure();
    const scale = width / 1920;
    assert.ok(Math.abs(layout.qr.x - 1464 * scale) < 1);
    assert.ok(Math.abs(layout.qr.y - 56 * scale) < 1);
    assert.ok(Math.abs(layout.query.y - (1080 - 32 - 216) * scale) < 1);
    assert.ok(layout.filters.y + layout.filters.height <= layout.query.y);
    clearOfBar(layout);
    assert.equal(layout.code.fontSize, "24px");
    assert.equal(layout.counter.fontSize, "64px");
    assert.equal(layout.url.whiteSpace, "nowrap");
    assert.equal(layout.url.fontSize, "20px");
    assert.equal(layout.urlFits, true);
    assert.ok(layout.url.y + layout.url.height <= layout.qr.y + layout.qr.height);
    assert.equal(layout.events, 0, "L3 hides the list of writes.");
    assert.equal(layout.overflow, false);
    evidence.push({ surface: "map", viewport: `${width}x${height}`, layout });
  }
  // Half of a 1920x1080 screen: the HUD reaches the window's top and bottom instead of a letterbox.
  {
    await page.setViewportSize({ width: 960, height: 1080 });
    await expect.poll(() => page.locator(".join-qr-corner").evaluate((element) => Math.round(element.getBoundingClientRect().y)), { timeout: 20000 }).toBe(28);
    const layout = await measure();
    assert.ok(Math.abs(layout.query.y + layout.query.height - (1080 - 16)) < 1, "The query panel sits at the bottom edge.");
    assert.ok(Math.abs(layout.qr.x - 1464 * 0.5) < 1);
    assert.ok(layout.filters.y + layout.filters.height <= layout.query.y);
    clearOfBar(layout);
    assert.equal(layout.overflow, false);
    if (capture) await page.screenshot({ path: path.join(capture, "map-960x1080-L3.png") });
    evidence.push({ surface: "map", viewport: "960x1080", layout });
  }
  // Own it: the entity card shows $owner (highlighted) and no $creator.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await commands(page, [{ type: "togglePanel", panel: "filters", open: false }, go("L1")]);
  await expect(page.locator('.event-log li[data-event="created"] button').first()).toBeVisible({ timeout: 10000 });
  await page.locator('.event-log li[data-event="created"] button').first().click();
  await commands(page, [go("L6")]);
  await expect(page.locator(".inspector-columns")).toBeVisible();
  const columns = await page.locator(".inspector-columns").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  assert.equal(columns, 2);
  await expect(page.locator(".badge-highlight")).toHaveAttribute("data-field", "$owner");
  await expect(page.locator('.inspector-panel [data-field="$creator"]')).toHaveCount(0);
  await expect(page.locator(".inspector-panel")).not.toContainText("$creator");
  await expect(page.getByText("One wallet, ours, owns every entity on this map.")).toBeVisible();
  {
    const inside = await page.locator(".inspector-columns").evaluate((element) => {
      const box = element.getBoundingClientRect();
      const longitude = element.querySelector("div:first-child dl>div:last-child").getBoundingClientRect();
      return longitude.bottom <= box.bottom + 1;
    });
    assert.equal(inside, true, "All five user columns must fit beside the highlighted badge.");
  }
  if (capture) {
    for (const [width, height] of [[1280, 720], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(() => page.locator(".inspector-panel").evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(Math.round(856 * width / 1920));
      await page.locator(".inspector-panel:has(.inspector-columns)").screenshot({ path: path.join(capture, `${width}-L6-owner.png`), timeout: 60000 });
    }
  }
  // The real transfer: a wallet address and Transfer ownership (Rabby), from the same card.
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator(".inspector-actions")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".explorer-link")).toHaveAttribute("href", /\/entity\/0x[0-9a-f]+$/i);
  await page.locator(".inspector-actions").getByRole("button", { name: "Transfer ownership", exact: true }).click();
  await expect(page.locator(".transfer-form")).toBeVisible();
  await expect(page.locator(".owner-panel,.owner-small-print")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Make it a business/ })).toHaveCount(0);
  const transfer = page.getByRole("button", { name: "Transfer ownership", exact: true });
  await expect(transfer).toBeDisabled();
  await page.getByLabel("New owner wallet").fill("0x1234");
  await expect(transfer).toBeDisabled();
  await page.getByLabel("New owner wallet").fill("0x2F6E6aDB6bc8F79799CB479FB5Cb237fa3Caa690");
  await expect(transfer).toBeEnabled();
  await commands(page, [{ type: "next" }]);
  await expect(page.getByText("Transfer it: paste a wallet, sign once.")).toBeVisible();
  // A click on the globe away from any dot closes the entity card.
  await page.mouse.click(200, 250);
  await expect(page.locator(".inspector-panel")).toHaveCount(0);
  // L2 keeps the same corner QR to /scan, clear of the event log below it.
  await commands(page, [go("L2")]);
  await expect(page.locator(".join-qr-corner .qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  await expect(page.locator(".join-qr-corner .qr-url")).toHaveAttribute("href", "https://mumbai-ethglobal.vercel.app/scan");
  {
    const qr = await page.locator(".join-qr-corner").boundingBox();
    for (const panel of await page.locator(".event-log,.inspector-panel,.owner-panel").all()) assert.ok((await panel.boundingBox()).y >= qr.y + qr.height, "No panel sits behind the QR.");
  }
  // The close: no panels, the closing lines on the map and the links under the QR.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await commands(page, [go("L9")]);
  await expect(page.locator(".query-panel,.filters-panel,.inspector-panel,.event-log,.stage-toolbar")).toHaveCount(0);
  await expect(page.getByText("Thank you.")).toBeVisible();
  await expect(page.getByText("docs.arkiv.network")).toBeVisible();
  await page.waitForTimeout(1500);
  {
    const qr = await page.locator(".join-qr-corner").boundingBox();
    const links = await page.getByText("START BUILDING").locator("..").boundingBox();
    const mascot = await page.getByRole("img", { name: "Arkiv mascot waving" }).boundingBox();
    assert.ok(links.y >= qr.y + qr.height, "The links sit under the QR.");
    assert.ok(links.y + links.height <= mascot.y + 1, "The links end above the mascot.");
  }
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-L9.png") }); }

  // /slides follows the map, and its keys drive both windows.
  const slides = await context.newPage();
  slides.on("pageerror", (error) => errors.push(error.message));
  await slides.setViewportSize({ width: 1280, height: 720 });
  await slides.goto(`${origin}/slides`, { waitUntil: "domcontentloaded" });
  await expect(slides.locator('[data-screen="slides"][data-scene="L9"]')).toBeVisible({ timeout: 20000 });
  await expect(slides.getByText("Thank you.")).toBeVisible();
  await commands(page, [go("S7")]);
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
  await slides.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="L1"]')).toBeVisible();
  await expect(slides.getByText("ON THE MAP →")).toBeVisible();
  await expect(slides.getByRole("heading", { name: "Write it: your entities, live", exact: true })).toBeVisible();
  // The live card explains the map in plain words, with the 3D mascot.
  await expect(slides.getByText("Your phone sends one request.")).toBeVisible();
  await expect(slides.getByRole("img", { name: "Arkiv mascot typing on a laptop" })).toBeVisible();
  await expect(page.getByText("Write it. Every dot is an entity you just wrote.").first()).toBeVisible();
  // /slides shows the same outline bar, on the same part.
  await expect(slides.getByRole("navigation", { name: "Talk outline" }).locator('[aria-current="step"]')).toContainText("Build it, live");
  // Half a screen: the slide keeps 16:9 inside its window, nothing scrolls.
  await slides.setViewportSize({ width: 960, height: 1080 });
  assert.equal(await slides.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (capture) await slides.screenshot({ path: path.join(capture, "slides-960x1080-L1.png") });
  // A second /map window follows the first instead of running the talk twice (two Rabby prompts).
  await commands(page, [go("B5")]);
  const secondMap = await context.newPage();
  secondMap.on("pageerror", (error) => errors.push(error.message));
  await secondMap.setViewportSize({ width: 1280, height: 720 });
  await secondMap.goto(`${origin}/map`, { waitUntil: "domcontentloaded" });
  await expect(secondMap.getByText("Another map window is running the talk. This one follows it.")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Another map window is running the talk.")).toHaveCount(0);
  await expect(secondMap.locator('[data-screen="map"][data-scene="B5"]')).toBeVisible();
  if (capture) { await secondMap.waitForTimeout(1200); await secondMap.screenshot({ path: path.join(capture, "map-1280-B5-follower.png") }); }
  await secondMap.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="T1"]')).toBeVisible();
  await expect(slides.locator('[data-screen="slides"][data-scene="T1"]')).toBeVisible();
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
  await card.getByRole("button", { name: /What we'll do/ }).click();
  await expect(card).toHaveCount(0);
  await expect(page.locator('[data-screen="map"][data-scene="IX"]')).toBeVisible();
  await commands(page, [{ type: "goto", index: 0 }]);
  // The data source still switches from the map's "?" toolbar; the HUD shows on live scenes.
  await commands(page, [go("L1")]);
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
  evidence.push({ surface: "slides", follows: true, keysDriveMap: true, countdownToggles: true, resetStartsSession: true, noticesFade: true, outlineBar: true });
  await context.close();

  // October 28, evening: five fast → on "Five steps", quick scene changes, right-drag boxes, /outline.
  {
    const { context, page } = await setup({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${origin}/map`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-screen="map"][data-scene="S0"]')).toBeVisible({ timeout: 20000 });
    const slides = await context.newPage();
    slides.on("pageerror", (error) => errors.push(error.message));
    await slides.setViewportSize({ width: 1280, height: 720 });
    await slides.goto(`${origin}/slides`, { waitUntil: "domcontentloaded" });
    await expect(slides.locator('[data-screen="slides"][data-scene="S0"]')).toBeVisible({ timeout: 20000 });
    // Every → shows one more of the five rows, even pressed without a pause, from either window; the
    // next → leaves for the QR. Hidden rows are aria-hidden, so the role count is what the room sees.
    const rows = (target) => target.getByRole("listitem");
    for (const [driver, name] of [[slides, "slides"], [page, "map"]]) {
      await commands(page, [go("ST")]);
      for (const target of [page, slides]) await expect(rows(target)).toHaveCount(1);
      for (let i = 0; i < 4; i++) await driver.keyboard.press("ArrowRight");
      for (const target of [page, slides]) {
        await expect(rows(target)).toHaveCount(5);
        await expect(target.getByRole("img", { name: "Step 5 of 5" })).toBeVisible();
        await expect.poll(() => rows(target).last().evaluate((element) => Number(getComputedStyle(element.parentElement).opacity))).toBe(1);
      }
      if (capture && name === "slides") await slides.screenshot({ path: path.join(capture, "slides-1280-ST-5.png") });
      await driver.keyboard.press("ArrowRight");
      for (const target of [page, slides]) await expect(target.locator('[data-scene="S7"]')).toBeVisible();
      evidence.push({ surface: "five-steps", driver: name, rowsShown: 5, leavesOnSixth: true });
    }
    // A scene change: the new scene fades in over 0.22 s while the old one waits under it and goes in
    // 0.11 s (0.33 s in all; it was 0.45 s plus a 0.23 s exit). The fades run as Web Animations, so
    // the test reads their timings from the browser, and checks on the clock only that one layer is
    // left within 3 s. A clock threshold could not hold on the shared runner: with the other window
    // drawing the globe in software, three changes in one run took 347, 788 and 1507 ms, while on a
    // laptop against production six changes per window took 337-383 ms (October 29). The clock times
    // are kept in the evidence. Both from-scenes have one step, so the → changes the scene.
    const sample = async (target, from, to) => {
      await commands(page, [go(from)]);
      await expect(target.locator(`[data-scene-layer="${from}"]`)).toHaveCount(1);
      await expect(target.locator("[data-scene-layer]")).toHaveCount(1);
      await target.waitForTimeout(800);
      return target.evaluate(([oldId, id]) => new Promise((resolve) => {
        const begin = performance.now();
        let mounted = null;
        // Every opacity animation started on a scene layer, recorded as it starts, so a slow frame
        // can't miss one.
        const fades = {};
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (keyframes, options) {
          const layer = this.getAttribute?.("data-scene-layer");
          const frames = Array.isArray(keyframes) ? keyframes : [keyframes];
          if (layer && frames.some((frame) => frame && "opacity" in frame)) fades[layer] = { duration: Number(options?.duration ?? 0), delay: Number(options?.delay ?? 0) };
          return animate.call(this, keyframes, options);
        };
        const done = (result) => { Element.prototype.animate = animate; resolve(result); };
        const check = () => {
          const now = performance.now();
          const layers = [...document.querySelectorAll("[data-scene-layer]")];
          if (mounted === null && layers.some((layer) => layer.getAttribute("data-scene-layer") === id)) mounted = now;
          if (layers.length === 1 && layers[0].getAttribute("data-scene-layer") === id && Number(getComputedStyle(layers[0]).opacity) === 1) done({ total: now - begin, change: now - mounted, enter: fades[id] ?? null, exit: fades[oldId] ?? null });
          else if (now - begin > 5000) done({ total: Infinity, change: Infinity, enter: fades[id] ?? null, exit: fades[oldId] ?? null });
          else requestAnimationFrame(check);
        };
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        requestAnimationFrame(check);
      }), [from, to]);
    };
    for (const [target, from, to] of [[slides, "IX", "W1"], [page, "W2", "W3"]]) {
      assert.equal(SCENES[sceneIndex(from)].steps, 1);
      const samples = [];
      for (let i = 0; i < 3; i++) samples.push(await sample(target, from, to));
      for (const timing of samples) {
        assert.ok(timing.total < 3000, `${from} → ${to} settles in ${Math.round(timing.total)} ms`);
        assert.ok(timing.enter && timing.enter.delay === 0 && timing.enter.duration <= 250, `${to} fades in within 0.25 s: ${JSON.stringify(timing.enter)}`);
        assert.ok(timing.exit && timing.exit.delay + timing.exit.duration <= 400, `${from} is gone within 0.4 s: ${JSON.stringify(timing.exit)}`);
      }
      evidence.push({ surface: "scene-change", screen: target === page ? "map" : "slides", from, to, enter: samples[0].enter, exit: samples[0].exit, clockChangeMs: samples.map((timing) => Math.round(timing.change)), clockTotalMs: samples.map((timing) => Math.round(timing.total)) });
    }
    // Boxes: only a right-drag draws one, on a slide and on the map; a right-click clears them; a
    // left-drag selects text or moves the globe and draws nothing.
    const boxes = (target) => target.locator(".annotations span");
    const drag = async (target, button, [x0, y0], [x1, y1]) => {
      await target.mouse.move(x0, y0);
      await target.mouse.down({ button });
      await target.mouse.move(x1, y1, { steps: 6 });
      await target.mouse.up({ button });
    };
    await commands(page, [go("W3")]);
    // On the map the drags start on the globe, clear of the HUD's panels.
    for (const [target, scene, first, second, click] of [[slides, "W3", [[300, 300], [520, 460]], [[700, 320], [820, 420]], [900, 600]], [page, "L1", [[560, 300], [700, 400]], [[720, 320], [800, 380]], [640, 300]]]) {
      if (scene !== "W3") await commands(page, [go(scene)]);
      await expect(target.locator(`[data-scene="${scene}"]`)).toBeVisible();
      await drag(target, "left", ...first);
      await expect(boxes(target)).toHaveCount(0);
      await drag(target, "right", ...first);
      await expect(boxes(target)).toHaveCount(1);
      await drag(target, "right", ...second);
      await expect(boxes(target)).toHaveCount(2);
      // A box can start on a panel too: the QR card's "Join the map" (not its links, which keep the menu).
      const card = scene === "L1" ? await target.locator(".join-qr .qr-copy p").boundingBox() : null;
      if (card) {
        await drag(target, "right", [card.x + 10, card.y + card.height / 2], [card.x + 90, card.y + card.height / 2 + 60]);
        await expect(boxes(target)).toHaveCount(3);
      }
      if (capture) await target.screenshot({ path: path.join(capture, `${target === page ? "map" : "slides"}-1280-${scene}-boxes.png`) });
      const menuBlocked = await target.evaluate(() => { const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); document.querySelector(".stage-root").dispatchEvent(event); return event.defaultPrevented; });
      assert.equal(menuBlocked, true, "The browser menu stays closed so the right button can draw.");
      await target.mouse.click(...click, { button: "right" });
      await expect(boxes(target)).toHaveCount(0);
      evidence.push({ surface: "boxes", screen: target === page ? "map" : "slides", scene, leftDragDraws: false, rightDragDraws: true, rightClickClears: true });
    }
    // /outline (October 29): every part folds, every scene shows its slide and a few short points,
    // with no script and no times; a slide zooms in and steps through its reveals; the scene on
    // screen is marked.
    const outline = await context.newPage();
    outline.on("pageerror", (error) => errors.push(error.message));
    await outline.setViewportSize({ width: 1440, height: 900 });
    await outline.goto(`${origin}/outline`, { waitUntil: "domcontentloaded" });
    await expect(outline.getByRole("heading", { name: "From zero to hero with Arkiv", level: 1 })).toBeVisible({ timeout: 20000 });
    await expect(outline.getByRole("heading", { level: 2 })).toHaveCount(SECTIONS.length + 1);
    for (const section of SECTIONS) await expect(outline.getByRole("heading", { name: section.title, level: 2, exact: true })).toBeVisible();
    await expect(outline.getByRole("heading", { level: 3 })).toHaveCount(SCENES.length);
    const outlineText = () => outline.evaluate(() => { const main = document.querySelector("main").cloneNode(true); main.querySelectorAll("[data-preview]").forEach((preview) => preview.remove()); return main.innerText; });
    const listed = await outlineText();
    assert.doesNotMatch(listed, /\b\d{1,2}:\d{2}\b|\bminutes\b|Script/, "/outline shows no times and no script");
    await expect(outline.locator("[data-preview] [data-stage]").first()).toBeAttached({ timeout: 20000 });
    await commands(page, [go("ST")]);
    const now = outline.locator('li[aria-current="step"]');
    await expect(now).toHaveCount(1);
    await expect(now).toContainText("Five steps to get started");
    await expect(now).toContainText("On screen now");
    await commands(page, [go("S7")]);
    await expect(now.getByRole("heading", { level: 3 })).toHaveText(SCENES[sceneIndex("S7")].title);
    // Fold one part, then all, then open them again.
    const build = outline.getByRole("button", { name: "Build it, live", exact: true });
    await build.click();
    await expect(build).toHaveAttribute("aria-expanded", "false");
    await expect(outline.locator("#part-build-scenes")).toHaveAttribute("inert", "");
    await outline.getByRole("button", { name: "Expand all", exact: true }).click();
    await expect(build).toHaveAttribute("aria-expanded", "true");
    await outline.getByRole("button", { name: "Collapse all", exact: true }).click();
    for (const section of SECTIONS) await expect(outline.getByRole("button", { name: section.title, exact: true })).toHaveAttribute("aria-expanded", "false");
    if (capture) await outline.screenshot({ path: path.join(capture, "outline-1440-collapsed.png") });
    await outline.getByRole("button", { name: "Expand all", exact: true }).click();
    // Zoom: Five steps opens on its last reveal, ← and → step through, Esc closes.
    const st = SCENES[sceneIndex("ST")];
    await outline.getByRole("button", { name: `Zoom into ${st.title}`, exact: true }).click();
    const zoom = outline.getByRole("dialog", { name: st.title });
    await expect(zoom).toBeVisible();
    await expect(zoom.getByRole("button", { name: `Reveal ${st.steps} of ${st.steps}`, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(zoom.locator("[data-preview] [data-stage]")).toContainText("An RPC access key");
    if (capture) await outline.screenshot({ path: path.join(capture, "outline-1440-zoom-ST.png") });
    await outline.keyboard.press("ArrowLeft");
    await expect(zoom.getByRole("button", { name: `Reveal ${st.steps - 1} of ${st.steps}`, exact: true })).toHaveAttribute("aria-pressed", "true");
    await outline.keyboard.press("ArrowRight");
    await outline.keyboard.press("ArrowRight");
    await expect(outline.getByRole("dialog", { name: SCENES[sceneIndex("ST") + 1].title })).toBeVisible();
    await outline.keyboard.press("Escape");
    await expect(outline.getByRole("dialog")).toHaveCount(0);
    for (const width of [390, 768, 1440]) {
      await outline.setViewportSize({ width, height: 900 });
      assert.equal(await outline.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `/outline at ${width}px`);
      if (capture) await outline.screenshot({ path: path.join(capture, `outline-${width}.png`), fullPage: true });
    }
    evidence.push({ surface: "outline", parts: SECTIONS.length + 1, scenes: SCENES.length, marksSceneOnScreen: true, noTimesOrScript: true, folds: true, zoomSteps: true, noOverflow: [390, 768, 1440] });
    await context.close();
  }

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
