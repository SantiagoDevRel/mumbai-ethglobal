// Isolated read-only layout checks of this build (served by tests/local-app.mjs). Writer responses here are UI
// fixtures (login, status, session, RPC); nothing reaches the real writer or the DB-Chain.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { getAddress } from "viem";
import { SCENES, SECTIONS, sceneIndex } from "../shared/scenes.ts";
import { NO_EXPIRY_BLOCK } from "../shared/types.ts";
import { NOTHING_TO_EXTEND } from "../shared/arkiv/adapter.ts";
import { startApp } from "./local-app.mjs";
import { encodes, qrModules, SCAN_URL } from "./scan-qr.mjs";

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
/** The leading /map's stage state: the store answers a hello on its channel. */
async function stageState(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const channel = new BroadcastChannel("arkiv-mumbai-stage");
    const done = (state) => { clearTimeout(timer); channel.close(); resolve(state); };
    const timer = setTimeout(() => done(null), 2000);
    channel.onmessage = (event) => { if (event.data?.kind === "state") done(event.data.state); };
    channel.postMessage({ kind: "hello" });
  }));
}
const BUILD = SECTIONS.find((section) => section.id === "build").title;
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
    await expect(page.getByText("From zero to hero", { exact: true })).toBeVisible();
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
  // outline bar yet. The room scans later, in "Build your entity". The title is "Arkiv, the Web3
  // database" and only the title slide carries the subtitle "From zero to hero" (October 29).
  await expect(page.getByRole("heading", { name: /Arkiv,\s*the Web3 database/, level: 1 })).toBeVisible();
  await expect(page.getByText("From zero to hero", { exact: true })).toBeVisible();
  await expect(page.locator(".app-hud")).toHaveCount(0);
  await expect(page.locator(".globe-dots")).toHaveCount(1);
  await expect(page.locator(".join-qr,.outline-bar")).toHaveCount(0);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S0.png") }); }
  // Who I am (an empty slide for now) still has no QR and no outline bar.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="ME"]')).toBeVisible();
  await expect(page.locator(".join-qr,.outline-bar,.app-hud")).toHaveCount(0);
  // The index lists the talk's parts; from here on the outline bar across the top follows them.
  await commands(page, [go("IX")]);
  await expect(page.locator('[data-screen="map"][data-scene="IX"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "What we'll do" })).toBeVisible();
  const bar = page.getByRole("navigation", { name: "Talk outline" });
  await expect(bar.locator(".outline-part")).toHaveCount(SECTIONS.length);
  for (const section of SECTIONS) await expect(bar).toContainText(section.title);
  await expect(bar.locator('[aria-current="step"]')).toHaveCount(0);
  await expect(page.locator(".join-qr,.app-hud")).toHaveCount(0);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-IX.png") }); }
  // Each → moves the current part's bar; a finished part stays full. The index lights its four parts
  // one → at a time first.
  const fill = (part) => part.locator(".outline-track i").evaluate((element) => Number(/scaleX\(([\d.]+)\)/.exec(element.style.transform)?.[1] ?? NaN));
  for (let i = 1; i < SCENES[sceneIndex("IX")].steps; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("img", { name: `Step ${SCENES[sceneIndex("IX")].steps} of ${SCENES[sceneIndex("IX")].steps}` })).toBeVisible();
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
  // S7, in "Build your entity": the scan column (the QR on its own sand square) on the map itself; D
  // swaps it for the 3 · 2 · 1 countdown and back. Slide 10 (Santiago, October 30): "Your first
  // entity" over the QR, nothing under the URL, and the column midway between the outline bar (y 56)
  // and the logo (y 1028).
  await commands(page, [go("S7")]);
  const scan = page.locator(".join-qr-scan");
  await expect(scan).toBeVisible();
  await expect(page.locator(".join-qr-corner")).toHaveCount(0);
  await expect(current).toContainText(BUILD);
  await expect(scan.locator(".qr-scan-label")).toHaveText("Your first entity");
  await expect(scan).not.toContainText(/Name\. Color|Lifetime|expiration/);
  // The QR and both links carry the production /scan URL, read back from the QR's own modules.
  for (const link of [scan.locator("a.qr-image"), scan.locator(".qr-url")]) await expect(link).toHaveAttribute("href", SCAN_URL);
  await expect(scan.locator(".qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  assert.ok(encodes(await qrModules(scan.locator(".qr-image img")), SCAN_URL), `S7's QR encodes ${SCAN_URL}.`);
  {
    const column = await scan.boundingBox();
    assert.ok(Math.abs(column.y - 56 - (1028 - column.y - column.height)) <= 2, `S7's column sits midway between the outline bar and the logo: ${JSON.stringify(column)}`);
  }
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S7.png") }); }
  await page.keyboard.press("d");
  await expect(page.locator(".join-qr-scan")).toHaveCount(0);
  await expect(page.getByText("Everyone: tap Write my entity.")).toBeVisible();
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S7-countdown.png") }); }
  await page.keyboard.press("d");
  await expect(page.locator(".join-qr-scan")).toBeVisible();
  // → brings "Your entity" beside the QR: the same table with one more row, its expiration, and no
  // eyebrow or Entity Expiration box (October 30). The card is centered on the QR's square and the
  // pair on the slide. The next → lands on the map, where the room's entities arrive.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="S7"]')).toBeVisible();
  const s7Card = page.locator("[data-entity-card]");
  await expect(s7Card.getByText("Your entity", { exact: true })).toBeVisible();
  await expect(s7Card.locator("[data-row] span:first-child")).toHaveText(["name", "color", "country", "expiration"]);
  await expect(s7Card.locator("[data-row] span:last-child")).toHaveText(['"priya"', '"#fe7446"', '"in"', "15 min"]);
  await expect(page.getByText("YOUR FORM = ONE ENTITY")).toHaveCount(0);
  await expect(s7Card).not.toContainText("Entity Expiration");
  await expect.poll(() => page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const column = box(".join-qr-scan"), square = box(".join-qr-scan .qr-image"), card = box("[data-entity-card]");
    // Rounded to whole pixels (+ 0 turns a -0 into 0): the pair's middle, and the card's middle less the square's.
    return [Math.round((column.left + card.right) / 2) + 0, Math.round(card.top + card.height / 2 - (square.top + square.height / 2)) + 0];
  }), { timeout: 5000 }).toEqual([960, 0]);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-S7-entity.png") }); }
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="L1"]')).toBeVisible();
  await expect(page.locator(".app-hud")).toHaveCount(1);
  // No caption, logo or status line on the stage (October 29): the counter, the list of writes and
  // the corner QR. The data source and its status sit in the presenter's "?" card.
  await expect(page.getByText("Write it. Every dot is an entity you just wrote.")).toHaveCount(0);
  await expect(page.locator(".stage-logo,.source-label")).toHaveCount(0);
  await expect(page.getByText(/Mock data|Live · Arkiv DB-Chain/)).toHaveCount(0);
  await expect(page.locator(".stage-counter")).toBeVisible();
  await expect(page.locator(".event-log")).toBeVisible();
  await expect(page.locator(".join-qr-corner .qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  await expect(page.locator(".join-qr-corner .qr-url")).toHaveAttribute("href", "https://mumbai-ethglobal.vercel.app/scan");
  assert.ok(encodes(await qrModules(page.locator(".join-qr-corner .qr-image img")), SCAN_URL), `The corner QR encodes ${SCAN_URL}.`);
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-L1.png") }); }
  await page.evaluate(() => document.fonts.ready);
  const measure = () => page.evaluate(() => {
    const rect = (selector) => { const element = document.querySelector(selector); if (!element) return null; const box = element.getBoundingClientRect(); const css = getComputedStyle(element); return { x: box.x, y: box.y, width: box.width, height: box.height, fontSize: css.fontSize, whiteSpace: css.whiteSpace }; };
    const url = document.querySelector(".join-qr-corner .qr-url");
    return { qr: rect(".join-qr-corner"), url: rect(".join-qr-corner .qr-url"), urlFits: url ? url.scrollWidth <= url.clientWidth : null, counter: rect(".stage-counter"), counterValue: rect(".stage-counter strong"), events: rect(".event-log"), query: rect(".query-panel"), code: rect('pre[aria-label="Executed query text"]'), filters: rect(".filter-bar"), track: rect(".outline-track"), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  // The outline bar's labels and tracks end above the HUD's top row (counter, filter bar, QR card).
  const clearOfBar = (layout) => {
    for (const box of [layout.counter, layout.filters, layout.qr]) if (box) assert.ok(layout.track.y + layout.track.height <= box.y, "The outline bar sits above the HUD.");
  };
  // The counter moved to the top-left corner (top 56); the QR card and the list of writes share the
  // right column. 960x1080 is half of a 1920x1080 screen: the HUD reaches the window's top.
  for (const [width, height] of [[1920, 1080], [1536, 864], [1280, 720], [960, 1080]]) {
    await page.setViewportSize({ width, height });
    const scale = Math.min(width / 1920, height / 1080);
    await expect.poll(() => page.locator(".join-qr-corner").evaluate((element) => Math.round(element.getBoundingClientRect().width)), { timeout: 20000 }).toBe(Math.round(424 * scale));
    const layout = await measure();
    assert.ok(Math.abs(layout.qr.x - 1464 * scale) < 1 && Math.abs(layout.qr.y - 56 * scale) < 1, "The QR card sits at the top right.");
    assert.ok(Math.abs(layout.counter.x - 32 * scale) < 1 && Math.abs(layout.counter.y - 56 * scale) < 1, "The counter sits at the top left.");
    assert.ok(layout.events.y >= layout.qr.y + layout.qr.height, "The list of writes sits under the QR.");
    clearOfBar(layout);
    assert.equal(layout.counterValue.fontSize, "64px");
    assert.equal(layout.url.whiteSpace, "nowrap");
    assert.equal(layout.url.fontSize, "20px");
    assert.equal(layout.urlFits, true);
    assert.ok(layout.url.y + layout.url.height <= layout.qr.y + layout.qr.height);
    assert.equal(layout.overflow, false);
    evidence.push({ surface: "map", scene: "L1", viewport: `${width}x${height}`, layout });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  // The SDK call is a slide: the map's QR and HUD step aside.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="B2"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Write it", exact: true })).toBeVisible();
  await expect(page.locator(".join-qr,.app-hud")).toHaveCount(0);
  // L3 (October 29): the whole globe with no QR, no caption and no scripted filters. The presenter
  // filters by hand (name, color, country); each filter is its own marked line of the query and a
  // country flies the camera there. The query panel and the filter bar open with the scene.
  await commands(page, [go("L3")]);
  await expect(page.locator('[data-screen="map"][data-scene="L3"]')).toBeVisible();
  const filterBar = page.locator(".filter-bar");
  await expect(filterBar).toBeVisible();
  await expect(page.locator(".join-qr,.event-log")).toHaveCount(0);
  await expect(page.getByText("Same query, on your entities.")).toHaveCount(0);
  await expect(page.getByText(/Mock data|Live · Arkiv DB-Chain/)).toHaveCount(0);
  await expect(filterBar).not.toContainText(/owner/i);
  await expect(page.locator(".filter-results")).toContainText(/\d+ results?/);
  assert.equal((await stageState(page))?.camera.cue, "globe", "L3 opens on the whole globe.");
  const queryText = page.locator('pre[aria-label="Executed query text"]');
  const queryLines = page.locator(".query-panel .query-line");
  const liveLines = page.locator(".query-panel .query-line[data-live]");
  // The Query tab by default: the scope (app, kind, session), one predicate per line, nothing marked,
  // and $owner, never $creator.
  await expect(page.getByRole("tab", { name: "Query", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(queryLines).toHaveCount(3);
  await expect(liveLines).toHaveCount(0);
  await expect(page.locator(".query-panel")).not.toContainText(/\$creator|createdBy/);
  // A name: Arkiv compares strings exactly and every stored string is lower case, so the field is too.
  const nameField = filterBar.getByPlaceholder("Starts with…");
  await nameField.fill("PRI");
  await expect(nameField).toHaveValue("pri");
  await expect(queryText).toContainText('AND name STARTSWITH str("pri")');
  // A color from the list: "Any color", then the phone's colors, each with its swatch.
  const colorField = filterBar.getByRole("combobox", { name: "Color", exact: true });
  await expect(colorField).toContainText("Any color");
  await colorField.click();
  const colorList = page.getByRole("listbox", { name: "Colors" });
  await expect(colorList.getByRole("option")).toHaveCount(1 + PALETTE.length);
  await expect(colorList.locator(".filter-swatch")).toHaveCount(1 + PALETTE.length);
  if (capture) await page.screenshot({ path: path.join(capture, "map-1920-L3-colors.png") });
  await colorList.getByRole("option", { name: "Orange", exact: true }).click();
  await expect(colorList).toHaveCount(0);
  await expect(colorField).toContainText("Orange");
  await expect(queryText).toContainText("AND color = str('#fe7446')");
  // A country: its stored lower-case code, and the camera flies there.
  const countryField = filterBar.getByPlaceholder("Any country");
  await countryField.fill("India");
  await expect(queryText).toContainText("AND country = str('in')");
  await expect(queryLines).toHaveCount(6);
  await expect(liveLines).toHaveCount(3);
  await expect.poll(async () => (await stageState(page))?.camera.cue).toBe("country:in");
  // The Code tab: the same predicates as the SDK's builder calls, marked the same way, no createdBy.
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(queryText).toContainText('startsWith("name", "pri")');
  await expect(liveLines).toHaveCount(3);
  await expect(page.locator(".query-panel")).not.toContainText(/\$creator|createdBy/);
  await page.getByRole("tab", { name: "Query", exact: true }).click();
  await page.locator(".query-panel").evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  if (capture) { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(capture, "map-1920-L3.png") }); }
  // Every line fits without scrolling, in both tabs, on a full screen and on a 1920x960 one.
  for (const [width, height] of [[1920, 1080], [1920, 960], [1536, 864], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    const scale = Math.min(width / 1920, height / 1080);
    await expect.poll(() => page.locator(".query-panel").evaluate((element) => Math.round(element.getBoundingClientRect().width)), { timeout: 20000 }).toBe(Math.round(984 * scale));
    const layout = await measure();
    // /map keeps the stage 1920 wide: a window wider than 16:9 centers it, with the globe at the sides.
    const left = (width - 1920 * scale) / 2;
    assert.ok(Math.abs(layout.query.x - (left + 32 * scale)) < 1 && Math.abs(layout.query.y + layout.query.height - (height - 32 * scale)) < 1, "The query panel sits at the bottom left.");
    assert.ok(Math.abs(layout.counter.y - 56 * scale) < 1 && Math.abs(layout.filters.y - 56 * scale) < 1, "The counter and the filter bar share the top row.");
    assert.ok(layout.counter.x + layout.counter.width <= layout.filters.x);
    assert.ok(layout.filters.y + layout.filters.height <= layout.query.y);
    clearOfBar(layout);
    assert.equal(layout.code.fontSize, "24px");
    assert.equal(layout.counterValue.fontSize, "64px");
    assert.equal(layout.qr, null, "No QR on L3.");
    assert.equal(layout.events, null, "L3 hides the list of writes.");
    assert.equal(layout.overflow, false);
    const scrolls = {};
    for (const tab of ["Code", "Query"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      scrolls[tab] = await queryText.evaluate((element) => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1);
      assert.equal(scrolls[tab], false, `The ${tab} tab needs no scroll at ${width}x${height}.`);
    }
    evidence.push({ surface: "map", scene: "L3", viewport: `${width}x${height}`, layout, scrolls });
  }
  // Half of a 1920x1080 screen: the HUD reaches the window's top and bottom instead of a letterbox.
  {
    await page.setViewportSize({ width: 960, height: 1080 });
    await expect.poll(() => page.locator(".stage-counter").evaluate((element) => Math.round(element.getBoundingClientRect().y)), { timeout: 20000 }).toBe(28);
    const layout = await measure();
    assert.ok(Math.abs(layout.query.y + layout.query.height - (1080 - 16)) < 1, "The query panel sits at the bottom edge.");
    assert.ok(layout.filters.y + layout.filters.height <= layout.query.y);
    clearOfBar(layout);
    assert.equal(layout.overflow, false);
    if (capture) await page.screenshot({ path: path.join(capture, "map-960x1080-L3.png") });
    evidence.push({ surface: "map", scene: "L3", viewport: "960x1080", layout });
  }
  // Clearing the country flies the camera back to the whole globe.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await countryField.fill("");
  await expect(queryText).not.toContainText("country");
  await expect(liveLines).toHaveCount(2);
  await expect.poll(async () => (await stageState(page))?.camera.cue).toBe("globe");
  // The entity card, on any live scene (October 29: the Own it and Expire it scenes are gone): every
  // attribute the entity stores in one table, $owner and never $creator, and the actions.
  await commands(page, [go("L1")]);
  await expect(page.locator(".filter-bar,.query-panel")).toHaveCount(0);
  const entityCard = page.locator(".inspector-panel");
  const timed = page.locator('.event-log li[data-event="created"] button').filter({ hasNotText: "no expiration" });
  await expect(timed.first()).toBeVisible({ timeout: 10000 });
  await timed.first().click();
  await expect(entityCard.locator(".inspector-columns")).toBeVisible();
  assert.equal(await entityCard.locator(".inspector-columns").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length), 2);
  await expect(entityCard.locator(".stored-attributes thead th")).toHaveText(["name", "type", "value"]);
  await expect(entityCard.locator(".stored-attributes tbody th")).toHaveText(["app", "kind", "session", "name", "color", "country", "category", "lat", "lng"]);
  await expect(entityCard.locator('[data-field="$creator"]')).toHaveCount(0);
  await expect(entityCard).not.toContainText("$creator");
  await expect(entityCard.locator(".badge-highlight,.owner-note")).toHaveCount(0);
  await expect(entityCard.locator('[data-field="$expiresAt"] small')).toHaveText("can be extended");
  await expect(entityCard.locator(".inspector-actions").getByRole("button", { name: "Extend", exact: true })).toBeEnabled();
  await expect(entityCard.locator(".explorer-link")).toHaveAttribute("href", /\/entity\/0x[0-9a-f]+$/i);
  await expect(page.getByRole("button", { name: /Make it a business/ })).toHaveCount(0);
  // Nothing in the card scrolls and nothing spills out of it.
  const fits = () => entityCard.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const inside = (selector) => [...element.querySelectorAll(selector)].every((item) => { const rect = item.getBoundingClientRect(); return rect.bottom <= box.bottom + 1 && rect.right <= box.right + 1; });
    const scrolling = [element, ...element.querySelectorAll("*")].filter((item) => /auto|scroll/.test(getComputedStyle(item).overflowY) && item.scrollHeight > item.clientHeight + 1).length;
    return { rows: inside(".stored-attributes tr"), fields: inside(".inspector-columns dl > div"), actions: inside(".inspector-actions, .transfer-form"), scrolling };
  });
  const FITS = { rows: true, fields: true, actions: true, scrolling: 0 };
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => entityCard.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(Math.round(856 * width / 1920));
    assert.deepEqual(await fits(), FITS, `The entity card fits at ${width}x${height}.`);
    if (capture) await entityCard.screenshot({ path: path.join(capture, `${width}-L1-entity-card.png`), timeout: 60000 });
  }
  // Transfer: "0x" then Space fills in a fresh checksummed wallet, so nobody pastes one on stage. Mock
  // data applies the transfer at once; the read-back $owner is marked and the card says what it means.
  await entityCard.locator(".inspector-actions").getByRole("button", { name: "Transfer ownership", exact: true }).click();
  const transferForm = entityCard.locator(".transfer-form");
  await expect(transferForm).toBeVisible();
  const transfer = transferForm.getByRole("button", { name: "Transfer ownership", exact: true });
  const wallet = transferForm.getByLabel("New owner wallet");
  await expect(transfer).toBeDisabled();
  await wallet.fill("0x1234");
  await expect(transfer).toBeDisabled();
  await wallet.fill("0x");
  await wallet.press("Space");
  const newOwner = await wallet.inputValue();
  assert.match(newOwner, /^0x[0-9a-fA-F]{40}$/);
  assert.equal(getAddress(newOwner), newOwner, "A checksummed wallet, as a wallet app shows it.");
  assert.equal((await stageState(page))?.sceneIndex, sceneIndex("L1"), "Space in the field never moves the talk.");
  await expect(transfer).toBeEnabled();
  assert.deepEqual(await fits(), FITS, "The transfer form keeps the card's height.");
  await transfer.click();
  await expect(entityCard.locator(".badge-highlight")).toHaveAttribute("data-field", "$owner", { timeout: 10000 });
  await expect(entityCard.locator('[data-field="$owner"] dd')).toHaveAttribute("title", newOwner);
  await expect(entityCard.locator(".owner-note")).toHaveText("Only this wallet can now update, transfer or delete it.");
  await expect(entityCard.locator(".inspector-actions").getByRole("button", { name: "Transfer ownership", exact: true })).toBeDisabled();
  // These dots allow permissionless extension: a new owner doesn't stop anyone extending them.
  await expect(entityCard.locator(".inspector-actions").getByRole("button", { name: "Extend", exact: true })).toBeEnabled();
  assert.deepEqual(await fits(), FITS, "The marked $owner and its note still fit.");
  if (capture) await entityCard.screenshot({ path: path.join(capture, "1920-L1-entity-card-transferred.png"), timeout: 60000 });
  evidence.push({ surface: "entity-card", scene: "L1", storedRows: 9, creatorShown: false, randomWalletChecksummed: true, transferMarksOwner: true, extendAfterTransfer: true });
  // A click on the globe away from any dot closes the entity card.
  await page.mouse.click(200, 250);
  await expect(entityCard).toHaveCount(0);
  // The close (L9): the closing card has the screen. The map stays quiet behind it: no counter, no list
  // of writes, no panel and no QR, nothing from the HUD in the card's column (x ≥ 1400), and no
  // entity card opens there. The closing card itself belongs to the finale (app/deck/scenes/finale).
  await page.setViewportSize({ width: 1920, height: 1080 });
  await commands(page, [go("L9")]);
  await expect(page.locator('[data-screen="map"][data-scene="L9"]')).toBeVisible();
  // The finale: the mascot says the four verbs (the first one holds 1.5 s), THANK YOU in bricks, and
  // real links that open in a new tab.
  await expect(page.getByText("Write it.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Thank you" })).toBeVisible();
  for (const href of ["https://docs.arkiv.network", "https://hub.arkiv.network", "https://mcp.arkiv.network", "https://ethglobal.com/events/mumbai/prizes/arkiv"])
    await expect(page.locator(`a[href="${href}"][target="_blank"][rel="noreferrer"]`)).toBeVisible();
  {
    // A click on a link reaches the link, not the globe under it.
    const box = await page.locator('a[href="https://hub.arkiv.network"]').boundingBox();
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href") ?? null, [box.x + box.width / 2, box.y + box.height / 2]);
    assert.equal(hit, "https://hub.arkiv.network");
  }
  await expect(page.locator(".stage-counter,.event-log,.query-panel,.filter-bar,.inspector-panel,.join-qr,.stage-toolbar")).toHaveCount(0);
  await commands(page, [{ type: "inspect", key: "0x01" }]);
  await page.waitForTimeout(500);
  await expect(page.locator(".inspector-panel")).toHaveCount(0);
  assert.equal(await page.locator(".app-hud *").evaluateAll((elements, edge) => elements.filter((element) => element.getBoundingClientRect().right > edge).length, 1400), 0, "Nothing from the HUD reaches x 1400 on L9.");
  await commands(page, [{ type: "inspect", key: null }]);
  // The show ends on the bricks and the small mascot waving, under the links.
  await expect(page.locator('[data-finale="done"]')).toHaveCount(1, { timeout: 30000 });
  {
    const links = await page.getByText("START BUILDING").locator("..").boundingBox();
    const mascot = await page.getByRole("img", { name: "Arkiv mascot waving" }).boundingBox();
    assert.ok(links.y + links.height <= mascot.y + 1, "The links end above the mascot.");
  }
  if (capture) { await page.waitForTimeout(1200); await page.screenshot({ path: path.join(capture, "map-1920-L9.png") }); }

  // /slides follows the map, and its keys drive both windows.
  const slides = await context.newPage();
  slides.on("pageerror", (error) => errors.push(error.message));
  await slides.setViewportSize({ width: 1280, height: 720 });
  await slides.goto(`${origin}/slides`, { waitUntil: "domcontentloaded" });
  await expect(slides.locator('[data-screen="slides"][data-scene="L9"]')).toBeVisible({ timeout: 20000 });
  await commands(page, [go("S7")]);
  // The follower changes scene once the leader, still drawing the 1920 px globe in software WebGL,
  // handles the command: as long as the other waits in this block.
  await expect(slides.locator('[data-scene="S7"]')).toBeVisible({ timeout: 20000 });
  // The scan column sits in the middle of the slide (x 960 of 1920) until S7's → moves it aside.
  await expect.poll(async () => { const box = await slides.locator(".join-qr-scan").boundingBox(); return box && Math.round(box.x + box.width / 2); }, { timeout: 20000 }).toBe(Math.round(960 * 1280 / 1920));
  await expect(slides.locator(".join-qr-scan .qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  await expect(slides.locator(".join-qr-scan .qr-scan-label")).toHaveText("Your first entity");
  await slides.keyboard.press("d");
  await expect(slides.locator(".join-qr-scan")).toHaveCount(0);
  await expect(slides.getByText("Everyone: tap Write my entity.")).toBeVisible();
  await slides.keyboard.press("d");
  await expect(slides.locator(".join-qr-scan")).toBeVisible();
  await slides.keyboard.press("ArrowRight");
  await slides.keyboard.press("ArrowRight");
  await expect(page.locator('[data-screen="map"][data-scene="L1"]')).toBeVisible();
  await expect(slides.getByText("ON THE MAP →")).toBeVisible();
  await expect(slides.getByRole("heading", { name: "Write it: your entities, live", exact: true })).toBeVisible();
  // The live card explains the map in plain words, with the 3D mascot; the map itself has no caption.
  await expect(slides.getByText("Your phone sends one request.")).toBeVisible();
  await expect(slides.getByRole("img", { name: "Arkiv mascot typing on a laptop" })).toBeVisible();
  await expect(page.getByText("Write it. Every dot is an entity you just wrote.")).toHaveCount(0);
  // /slides shows the same outline bar, on the same part.
  await expect(slides.getByRole("navigation", { name: "Talk outline" }).locator('[aria-current="step"]')).toContainText(BUILD);
  // Half a screen: the slide keeps 16:9 inside its window, nothing scrolls.
  await slides.setViewportSize({ width: 960, height: 1080 });
  assert.equal(await slides.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (capture) await slides.screenshot({ path: path.join(capture, "slides-960x1080-L1.png") });
  // L3's card says how the presenter filters by hand.
  await commands(page, [go("L3")]);
  await expect(slides.getByText("The map is one query.")).toBeVisible({ timeout: 20000 });
  await expect(slides.getByText("Filter it live: name, country or color.")).toBeVisible();
  await expect(slides.getByRole("img", { name: "Arkiv mascot with a magnifying glass" })).toBeVisible();
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
  // The data source and its status sit in the map's "?" card, never on the stage (October 29).
  await commands(page, [go("L1")]);
  await page.keyboard.press("?");
  await page.getByRole("combobox", { name: "Data source" }).selectOption("live");
  await expect(card.getByText("Live · Arkiv DB-Chain", { exact: true })).toBeVisible({ timeout: 15000 });
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
  await expect(card.getByText("Mock data", { exact: true })).toBeVisible();
  await commands(page, [{ type: "togglePanel", panel: "controls", open: false }]);
  await expect(card).toHaveCount(0);
  await expect(page.getByText(/Mock data|Live · Arkiv DB-Chain/)).toHaveCount(0);
  // No expiration: the fresh mock writes two such entities in its first block. Their card shows
  // $expiresAt = 2**64 − 1, counts nothing down and has nothing to extend; extending one alone says so.
  const endless = page.locator('.event-log li[data-event="created"] button').filter({ hasText: "no expiration" });
  await expect(endless).toHaveCount(2, { timeout: 15000 });
  await endless.first().click();
  await expect(entityCard.locator(".field-countdown")).toHaveText("2**64 − 1 · no expiration");
  await expect(entityCard.locator('[data-field="$expiresAt"] dd')).toContainText(`block ${NO_EXPIRY_BLOCK}`);
  await expect(entityCard.locator('[data-field="$expiresAt"] small')).toHaveText("no expiration");
  await expect(entityCard.locator(".extend-suggestion")).toHaveCount(0);
  await expect(entityCard).not.toContainText(/can be extended|min left|under a minute|Less than 60 s/);
  await expect(entityCard.locator(".inspector-actions").getByRole("button", { name: "Extend", exact: true })).toBeDisabled();
  const endlessKey = await entityCard.locator('[data-field="$key"] dd').getAttribute("title");
  await commands(page, [{ type: "select", keys: [endlessKey], mode: "set" }, { type: "extend", scope: "selected" }]);
  await expect(page.locator(".presenter-notice")).toHaveText(NOTHING_TO_EXTEND);
  if (capture) await entityCard.screenshot({ path: path.join(capture, "1920-L1-entity-card-no-expiration.png"), timeout: 60000 });
  await entityCard.getByRole("button", { name: "Close inspector" }).click();
  await expect(entityCard).toHaveCount(0);
  evidence.push({ surface: "entity-card", scene: "L1", noExpiry: true, extendDisabled: true, extendSelectedSkipsIt: true });
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
    // next → leaves for "What Arkiv DB-Chain is not". Hidden rows are aria-hidden, so the role count is what the room sees.
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
      for (const target of [page, slides]) await expect(target.locator('[data-scene="NT"]')).toBeVisible();
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
    for (const [target, from, to] of [[slides, "B5", "T1"], [page, "W2", "W3"]]) {
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
    // /outline (October 29): every part folds and all start folded, every scene shows its slide and
    // a few short points, with no script and no times; a slide zooms in and steps through its
    // reveals; the scene on screen is marked; a link to a scene opens its part.
    const outline = await context.newPage();
    outline.on("pageerror", (error) => errors.push(error.message));
    await outline.setViewportSize({ width: 1440, height: 900 });
    await outline.goto(`${origin}/outline`, { waitUntil: "domcontentloaded" });
    await expect(outline.getByRole("heading", { name: "Arkiv, the Web3 database", level: 1, exact: true })).toBeVisible({ timeout: 20000 });
    await expect(outline.getByRole("heading", { level: 2 })).toHaveCount(SECTIONS.length + 1);
    for (const section of SECTIONS) await expect(outline.getByRole("heading", { name: section.title, level: 2, exact: true })).toBeVisible();
    const partButtons = outline.locator("button[aria-controls^='part-']");
    await expect(partButtons).toHaveCount(SECTIONS.length + 1);
    for (const button of await partButtons.all()) await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(outline.locator("[id^='part-'][id$='-scenes'][inert]")).toHaveCount(SECTIONS.length + 1);
    if (capture) await outline.screenshot({ path: path.join(capture, "outline-1440-start.png") });
    await outline.getByRole("button", { name: "Expand all", exact: true }).click();
    for (const button of await partButtons.all()) await expect(button).toHaveAttribute("aria-expanded", "true");
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
    const build = outline.getByRole("button", { name: BUILD, exact: true });
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
    // A link to a scene opens only that scene's part and lands on it.
    const linked = await context.newPage();
    linked.on("pageerror", (error) => errors.push(error.message));
    await linked.setViewportSize({ width: 1440, height: 900 });
    await linked.goto(`${origin}/outline#scene-W2`, { waitUntil: "domcontentloaded" });
    const why = SECTIONS.find((section) => section.id === "why").title;
    await expect(linked.getByRole("button", { name: why, exact: true })).toHaveAttribute("aria-expanded", "true", { timeout: 20000 });
    for (const section of SECTIONS.filter((section) => section.id !== "why")) await expect(linked.getByRole("button", { name: section.title, exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect(linked.locator("#scene-W2")).toBeInViewport();
    await linked.close();
    evidence.push({ surface: "outline", parts: SECTIONS.length + 1, scenes: SCENES.length, startsFolded: true, linkOpensPart: true, marksSceneOnScreen: true, noTimesOrScript: true, folds: true, zoomSteps: true, noOverflow: [390, 768, 1440] });
    await context.close();
  }

  // A preview deployment, or a laptop, still sends phones to production (Santiago, October 30: never
  // a Vercel preview). The deck served under a preview host draws the same QR: production's /scan,
  // read back from the QR's modules, and not its own host's.
  {
    const preview = "https://mumbai-ethglobal-git-preview.vercel.app";
    const { context, page } = await setup({ viewport: { width: 1440, height: 900 } });
    await app.serve(context, preview);
    await context.route(`${preview}/api/**`, (route) => route.abort());
    await page.goto(`${preview}/outline#scene-S7`, { waitUntil: "domcontentloaded" });
    const column = page.locator("#scene-S7 .join-qr-scan");
    await expect(column.locator(".qr-scan-label")).toHaveText("Your first entity", { timeout: 20000 });
    for (const link of [column.locator("a.qr-image"), column.locator(".qr-url")]) await expect(link).toHaveAttribute("href", SCAN_URL);
    const grid = await qrModules(column.locator(".qr-image img"));
    assert.ok(encodes(grid, SCAN_URL), `Served from ${preview}, S7's QR still encodes ${SCAN_URL}.`);
    assert.equal(encodes(grid, `${preview}/scan`), false, "The QR never carries the preview's own host.");
    evidence.push({ surface: "qr", servedFrom: preview, encodes: SCAN_URL });
    await context.close();
  }

  // The phone from a small phone (320 px) to a tablet (768 px): nothing overflows or is cut.
  for (const width of [320, 360, 390, 768]) for (const colorScheme of ["light", "dark"]) {
    const height = width === 320 ? 568 : width === 768 ? 1024 : 844;
    const { context, page } = await setup({ viewport: { width, height }, colorScheme }, { loggedIn: false });
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
    // The phone's header matches slide 10's label (Santiago, October 30); /map's corner card keeps "Join the map".
    await expect(page.locator(".phone-header")).toHaveText("Your first entity");
    await expect(page.getByText("Choose a country", { exact: true })).toBeVisible();
    await expect(page.getByText("How long should this data (entity) live?")).toBeVisible();
    for (const gone of [/hang tight/i, /doors/i, /testnet/i, /everything you write/i, /custom/i, /Where are you from/i, /no expiration/i, /Join the map/]) assert.doesNotMatch(layout.text, gone);
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
    // Permanent (October 30; "No expiration" until then) is ExpirationTime.permanent(). The brand never
    // says an unqualified "permanent": wherever the phone says it, its deadline 2**64 − 1 is in the same
    // element or right beside it, on the toggle, the readout, the written entity and the list.
    const permanentMentions = () => page.locator(".phone-main").evaluate((main) => {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      const mentions = { found: 0, alone: [] };
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!/permanent/i.test(node.data)) continue;
        mentions.found++;
        const parent = node.parentElement;
        if (![parent, parent.parentElement].some((element) => element.textContent.includes("2**64 − 1"))) mentions.alone.push(parent.outerHTML);
      }
      return mentions;
    });
    const fitsMain = (selector) => page.locator(selector).first().evaluate((element) => {
      const box = element.getBoundingClientRect(), main = document.querySelector(".phone-main").getBoundingClientRect();
      return box.left >= main.left && box.right <= main.right && element.scrollWidth <= element.clientWidth;
    });
    const permanent = page.getByRole("button", { name: "Permanent 2**64 − 1", exact: true });
    await expect(permanent).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".lifetime-value")).toHaveText("15 min");
    await permanent.click();
    await expect(permanent).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".lifetime-value")).toHaveText("Permanent 2**64 − 1");
    for (const selector of [".lifetime-forever", ".lifetime-value"]) assert.ok(await fitsMain(selector), `${selector} fits at ${width}px`);
    // The toggle's label, the word and its deadline, stays on one line.
    assert.ok(await permanent.locator("span").first().evaluate((element) => element.getBoundingClientRect().height < 2 * parseFloat(getComputedStyle(element).fontSize)), `The toggle's label is one line at ${width}px`);
    {
      const mentions = await permanentMentions();
      assert.equal(mentions.found, 2, "The toggle and the readout say Permanent.");
      assert.deepEqual(mentions.alone, []);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (capture) await page.screenshot({ path: path.join(capture, `phone-${width}-${colorScheme}-permanent.png`), fullPage: true });
    // Written with Permanent: the word, $expiresAt = 2**64 − 1 and the block number on one line; the
    // list under it says the same. The fixture answers as the writer does once the block is in.
    await context.route(`${writer}/api/submit*`, (route) => route.fulfill({ json: { ticket: "11111111-1111-4111-8111-111111111111", position: 0, lat: 19, lng: 72, session: "UI-LAYOUT", status: "written", entityKey: `0x${"34".repeat(32)}`, block: "100", expiresAtBlock: NO_EXPIRY_BLOCK.toString() } }));
    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("ada");
    await page.getByRole("button", { name: "Write my entity", exact: true }).click();
    await expect(page.getByText("Written in block #100", { exact: true })).toBeVisible();
    await expect(page.locator(".phone-entity .phone-lifetime-status")).toHaveText("Permanent");
    await expect(page.locator(".phone-expires-at span")).toHaveText("$expiresAt = 2**64 − 1");
    await expect(page.locator(".phone-expires-at")).toContainText(NO_EXPIRY_BLOCK.toString());
    await expect(page.locator(".phone-mine-time")).toHaveText("permanent 2**64 − 1");
    for (const selector of [".phone-expires-at", ".phone-mine-time"]) assert.ok(await fitsMain(selector), `${selector} fits at ${width}px`);
    assert.equal(await page.locator(".phone-expires-at").evaluate((element) => { const range = document.createRange(); range.selectNodeContents(element.lastChild); return range.getClientRects().length; }), 1, `The block number is one line at ${width}px`);
    {
      const mentions = await permanentMentions();
      assert.equal(mentions.found, 2, "The written entity and the list say Permanent.");
      assert.deepEqual(mentions.alone, []);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (capture) await page.screenshot({ path: path.join(capture, `phone-${width}-${colorScheme}-permanent-written.png`), fullPage: true });
    evidence.push({ surface: "phone", viewport: `${width}x${height}`, colorScheme, layout: { ...layout, text: undefined }, countryKeyboard: true, permanentWithDeadline: true });
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
