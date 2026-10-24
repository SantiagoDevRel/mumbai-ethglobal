// Explicit live UI smoke. Uses one short-lived test entity and never replaces an active session.
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const ORIGIN = "https://mumbai-ethglobal.vercel.app";
const WRITER = "https://mumbai-workshop-writer.santiagotrujillozuluaga.workers.dev";
const root = path.resolve("out");
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
async function presenter(route, body) {
  assert.ok(process.env.WORKSHOP_PRESENTER_TOKEN, "Presenter credential is required in the process environment.");
  const response = await fetch(`${WRITER}/api/presenter/${route}`, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.WORKSHOP_PRESENTER_TOKEN}` }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  assert.ok(response.ok, `Presenter ${route} failed (${response.status}): ${result.message ?? "request failed"}`);
  return result;
}
const status = await presenter("status");
if (process.argv.includes("--status")) {
  process.stdout.write(JSON.stringify({ session: status.session, doors: status.doors, phase: status.phase, replay: status.replay, inFlight: status.inFlight, queued: status.queued }) + "\n");
  process.exit(0);
}
let session = status.session;
let ownedSession = false;
let browser;
const errors = [];
try {
  if (session) {
    assert.equal(status.doors, "open", "An existing session has closed doors; this check will not replace it.");
    assert.equal(status.phase, "talk");
    assert.equal(status.replay, false);
  } else {
    assert.equal(status.inFlight, false);
    assert.equal(status.queued, 0);
    session = (await presenter("session/start", {})).code;
    ownedSession = true;
    await presenter("doors", { open: true });
  }
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  // Serve this exact build under the authorized production origin. All Worker/RPC requests are real.
  await context.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep) && file !== root) return route.abort();
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      const body = await readFile(file);
      await route.fulfill({ status: 200, contentType: mime[path.extname(file)] ?? "application/octet-stream", body });
    } catch { await route.fulfill({ status: 404, body: "Not found" }); }
  });
  const stage = await context.newPage();
  await stage.addInitScript((credential) => sessionStorage.setItem("arkiv-presenter-token", credential), process.env.WORKSHOP_PRESENTER_TOKEN);
  let proxyReads = 0;
  stage.on("request", (request) => { if (request.url() === WRITER + "/api/rpc") proxyReads++; });
  stage.on("pageerror", (error) => errors.push(error.message));
  await stage.goto(ORIGIN, { waitUntil: "domcontentloaded" });
  await expect(stage.getByText("Live · Arkiv DB-Chain", { exact: true })).toBeVisible({ timeout: 20000 });
  await stage.evaluate((code) => {
    const channel = new BroadcastChannel("arkiv-mumbai-stage");
    channel.postMessage({ kind: "command", cmd: { type: "session", code } });
    channel.postMessage({ kind: "command", cmd: { type: "goto", index: 8 } });
    channel.close();
  }, session);
  await expect(stage.locator('[data-scene="L1"]')).toBeVisible();
  const phone = await context.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  const phoneWriterRequests = [];
  phone.on("request", (request) => { if (request.url().startsWith(WRITER)) phoneWriterRequests.push({ at: Date.now(), path: new URL(request.url()).pathname }); });
  phone.on("pageerror", (error) => errors.push(error.message));
  await phone.goto(`${ORIGIN}/j?s=${session}`, { waitUntil: "domcontentloaded" });
  await phone.getByPlaceholder("Name or nickname").fill("App smoke");
  await phone.getByRole("button", { name: "Color #3ddc97", exact: true }).click();
  await phone.getByRole("combobox", { name: "Your country" }).selectOption("IN");
  await phone.locator('input[type="range"]').focus();
  await phone.keyboard.press("Home");
  const write = phone.getByRole("button", { name: "Write my entity", exact: true });
  await expect(write).toBeEnabled({ timeout: 15000 });
  const submittedAt = Date.now();
  await write.click();
  await expect(phone.getByText(/Written in block #\d+/)).toBeVisible({ timeout: 60000 });
  const includedAt = Date.now();
  const written = await phone.getByText(/Written in block #\d+/).textContent();
  const entityHref = await phone.getByRole("link", { name: "View your entity" }).getAttribute("href");
  const key = entityHref?.split("/").at(-1);
  assert.match(key ?? "", /^0x[0-9a-f]{64}$/i);
  await expect(stage.locator(".event-log").getByRole("button", { name: /App smoke/ }).first()).toBeVisible({ timeout: 15000 });
  await expect.poll(() => stage.locator(".globe-dots").evaluate((canvas) => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 61 && pixels[i + 1] === 220 && pixels[i + 2] === 151 && pixels[i + 3] > 100) colored++;
    return colored;
  }), { timeout: 15000 }).toBeGreaterThan(0);
  await stage.locator(".event-log").getByRole("button", { name: /App smoke/ }).first().click();
  await expect(stage.locator(".inspector-panel")).toContainText("App smoke");
  await expect(phone.getByText(/You expired at block #\d+/)).toBeVisible({ timeout: 45000 });
  const expired = await phone.getByText(/You expired at block #\d+/).textContent();
  await expect(stage.locator(".inspector-panel")).toContainText("Select a dot on the map", { timeout: 10000 });
  const expiredAt = Date.now();
  const unexpected = phoneWriterRequests.filter((request) => request.at > includedAt + 500 && request.at < expiredAt - 1000);
  assert.deepEqual(unexpected, [], "The included phone must read the public RPC, not poll the writer.");
  assert.deepEqual(errors, []);
  assert.ok(proxyReads > 0, "The presenter must use its authenticated Worker read proxy.");
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  process.stdout.write(JSON.stringify({ session, entityKey: key, written, expired, phoneToInclusionMs: includedAt - submittedAt, liveDotRendered: true, inspectorConfirmed: true, presenterProxyReads: proxyReads, noWriterPollingWhileIncluded: true, viewport: "390x844", pageErrors: errors.length }) + "\n");
} finally {
  await browser?.close();
  if (ownedSession) {
    const current = await presenter("status");
    assert.equal(current.session, session, "Session changed; the check will not end someone else's session.");
    await presenter("session/end", {});
  }
}
