// Isolated read-only layout checks. Session responses here are UI fixtures; no writes are sent.
import assert from "node:assert/strict";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const origin = "https://mumbai-ethglobal.vercel.app";
const writer = "https://mumbai-workshop-writer.santiagotrujillozuluaga.workers.dev";
const root = path.resolve("out");
const capture = process.argv[2];
if (capture) await mkdir(capture, { recursive: true });
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
  await commands(page, [{ type: "next" }]);
  await expect(page.locator('pre[aria-label="Executed query text"]')).toContainText('"color"');
  await expect(page.locator(".stage-toolbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Color · Orange", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".query-scope summary code")).not.toContainText(/,\s*(?:·|$)/);
  await expect(page.locator(".qr-url")).toHaveText("mumbai-ethglobal.vercel.app/j");
  await expect(page.locator(".qr-code")).toHaveText("code MOCK");
  await expect(page.locator(".qr-url")).toHaveAttribute("href", /[?&]s=MOCK$/);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".query-panel").evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  for (const [width, height] of [[1920, 1080], [1536, 864], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator(".join-qr-corner").evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(Math.round(424 * width / 1920));
    const layout = await page.evaluate(() => {
      const rect = (selector) => { const element = document.querySelector(selector); const box = element.getBoundingClientRect(); const css = getComputedStyle(element); return { x: box.x, y: box.y, width: box.width, height: box.height, fontSize: css.fontSize, whiteSpace: css.whiteSpace }; };
      const url = document.querySelector(".qr-url");
      return { qr: rect(".join-qr-corner"), url: rect(".qr-url"), roomCode: rect(".qr-code"), event: rect(".event-log"), urlFits: url.scrollWidth <= url.clientWidth, query: rect(".query-panel"), code: rect('pre[aria-label="Executed query text"]'), filters: rect(".filters-panel"), counter: rect(".stage-counter strong"), overflow: document.documentElement.scrollWidth > innerWidth };
    });
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
    assert.ok(layout.roomCode.y >= layout.url.y + layout.url.height - 1);
    assert.ok(layout.roomCode.y + layout.roomCode.height <= layout.qr.y + layout.qr.height);
    assert.ok(layout.event.y >= layout.qr.y + layout.qr.height);
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
      await page.setViewportSize({ width: 1280, height: 720 });
    }
  }
  await commands(page, [{ type: "goto", index: 12 }, { type: "next" }]);
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
  await commands(page, [{ type: "goto", index: 13 }]);
  await expect(page.locator(".owner-small-print")).toContainText("Demo view");
  await expect(page.locator(".stage-counter small")).toHaveText("owner");
  await expect(page.locator(".owner-count,.owner-statement")).toHaveCount(0);
  await commands(page, [{ type: "next" }]);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
  await expect(page.locator(".owner-panel")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("button", { name: /Transfer ownership/ })).toBeVisible();
  await commands(page, [{ type: "goto", index: 7 }]);
  await expect(page.locator(".app-hud")).toHaveCount(0);
  await expect(page.locator(".doors-countdown")).toHaveCount(0);
  const centerQR = await page.locator(".join-qr-center").boundingBox();
  assert.ok(Math.abs(centerQR.x + centerQR.width / 2 - 660 * 1280 / 1920) < 1);
  evidence.push({ surface: "S7", centerX: centerQR.x + centerQR.width / 2, hudHidden: true, appCountdownHidden: true });
  await expect(page.locator(".globe-dots")).toHaveCount(0);
  await expect(page.locator(".join-qr-center .qr-code")).toHaveText("code MOCK");
  await commands(page, [{ type: "goto", index: 15 }]);
  await expect(page.locator(".join-qr-build .qr-image img")).toHaveAttribute("width", "320");
  await expect(page.locator(".join-qr-build .qr-url")).toHaveText("mumbai-ethglobal.vercel.app/j");
  await expect(page.locator(".join-qr-build .qr-code")).toHaveText("code MOCK");
  assert.ok((await page.locator(".join-qr-build").boundingBox()).y + (await page.locator(".join-qr-build").boundingBox()).height <= 782 * 1280 / 1920, "The L8 card must stay above the mascot.");
  assert.equal(await page.locator(".join-qr-build .qr-url").evaluate((element) => getComputedStyle(element).whiteSpace === "nowrap" && element.scrollWidth <= element.clientWidth), true);
  await commands(page, [{ type: "goto", index: 16 }]);
  await expect(page.locator(".query-panel,.filters-panel,.inspector-panel,.event-log,.stage-toolbar")).toHaveCount(0);
  const notes = await context.newPage();
  notes.on("pageerror", (error) => errors.push(error.message));
  await notes.goto(`${origin}/notes/`, { waitUntil: "domcontentloaded" });
  await expect(notes.getByRole("combobox", { name: "Stage data source" })).toHaveValue("mock");
  await expect(notes.locator("header")).toContainText(/#\d+/, { timeout: 10000 });
  await notes.getByRole("combobox", { name: "Stage data source" }).selectOption("live");
  await expect(page.getByText("Live · Arkiv DB-Chain", { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".qr-code")).toHaveCount(0);
  await commands(page, [{ type: "session", code: "ABCD1234" }]);
  await expect(page.locator(".qr-code")).toHaveText("code ABCD1234");
  await expect(page.locator(".qr-url")).toHaveAttribute("href", /[?&]s=ABCD1234$/);
  await notes.getByRole("combobox", { name: "Stage data source" }).selectOption("mock");
  await expect(page.getByText("Mock data", { exact: true })).toBeVisible();
  await expect(page.locator(".qr-code")).toHaveText("code MOCK");
  await commands(page, [{ type: "session", code: null }]);
  await commands(page, [{ type: "goto", index: 13 }, { type: "next" }]);
  await expect(page.locator(".owner-panel")).toHaveCount(0);
  await notes.getByRole("button", { name: "· Undo transfer", exact: true }).click();
  await expect(page.getByRole("button", { name: /Transfer ownership/ })).toBeVisible();
  evidence.push({ surface: "notes", blockSynchronized: true, sourceSynchronized: true, transferUndoSynchronized: true });
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
  for (const width of [360, 390]) for (const colorScheme of ["light", "dark"]) {
    const { context, page } = await setup({ viewport: { width, height: 844 }, colorScheme });
    let ended = false;
    const sessionReads = [];
    const submissions = [];
    await context.route(`${writer}/**`, (route) => route.abort());
    await context.route(`${writer}/api/session?*`, (route) => {
      const code = new URL(route.request().url()).searchParams.get("s");
      sessionReads.push({ code, method: route.request().method() });
      return route.fulfill({ json: { valid: code === "ZXCV5678" || (code === "ABCD1234" && !ended), doors: "open", phase: "talk", replay: false, network: "tiramisu" } });
    });
    await context.route(`${writer}/api/submit`, (route) => {
      submissions.push({ body: route.request().postDataJSON(), device: route.request().headers()["x-device-token"] });
      ended = true;
      return route.fulfill({ status: 403, json: { error: "bad_session", message: "This session has ended." } });
    });
    const snapshot = async (state) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (capture) await page.screenshot({ path: path.join(capture, `phone-${width}-${colorScheme}-${state}.png`), fullPage: true });
    };
    await page.goto(`${origin}/j/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Enter the code on the screen", exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Your name" })).toHaveCount(0);
    const historyBeforeJoin = await page.evaluate(() => history.length);
    assert.equal(sessionReads.length, 0, "No session discovery request is allowed.");
    await snapshot("entry");
    const code = page.getByRole("textbox", { name: "Workshop code", exact: true });
    await code.fill("abc");
    await page.getByRole("button", { name: "Join the map", exact: true }).click();
    await expect(page.locator("#code-error")).toHaveText("Enter the 8-character code on the screen.");
    assert.equal(sessionReads.length, 0);
    await code.fill("wrong123");
    await page.getByRole("button", { name: "Join the map", exact: true }).click();
    await expect(page.locator("#code-error")).toContainText("That code is not active.");
    assert.equal(new URL(page.url()).searchParams.has("s"), false);
    assert.equal(submissions.length, 0);
    await snapshot("wrong");
    await page.evaluate(() => localStorage.setItem(`arkiv-workshop-count:ABCD1234:${localStorage.getItem("arkiv-workshop-device")}`, "2"));
    await code.fill(" abcd1234 ");
    await expect(code).toHaveValue("ABCD1234");
    await page.getByRole("button", { name: "Join the map", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/j/?s=ABCD1234`);
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    assert.equal(await page.evaluate(() => history.length), historyBeforeJoin, "Entering a code replaces the URL instead of adding a navigation.");
    await snapshot("joined");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("Typed join");
    await page.getByRole("button", { name: "Write my entity", exact: true }).click();
    await expect.poll(() => submissions.length).toBe(1);
    assert.equal(submissions[0].body.session, "ABCD1234");
    assert.equal(submissions[0].body.name, "Typed join");
    assert.match(submissions[0].device, /^[a-f0-9-]{36}$/i);
    await expect(page.getByRole("heading", { name: "Enter the code on the screen", exact: true })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("This session is no longer active.");
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toHaveCount(0);
    await snapshot("ended");
    await code.fill("zxcv5678");
    await page.getByRole("button", { name: "Join the map", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/j/?s=ZXCV5678`);
    await expect(page.getByRole("button", { name: "Write my entity", exact: true })).toBeEnabled();
    assert.ok(sessionReads.every((request) => request.code && request.method === "GET"));
    evidence.push({ surface: "typed-phone", width, colorScheme, wrongCodeRejected: true, urlReplaced: true, reloadResumes: true, endedSessionRejected: true, nextSessionAccepted: true, interceptedSubmissions: submissions.length });
    await context.close();
  }
  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ checks: evidence, pageErrors: errors.length }) + "\n");
} finally { if (errors.length) process.stderr.write(JSON.stringify({ pageErrors: errors }) + "\n"); await browser.close(); }
