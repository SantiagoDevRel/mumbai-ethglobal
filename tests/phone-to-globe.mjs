// Explicit live UI smoke of the deployed app (APP_ORIGIN). Uses one short-lived test entity and never
// replaces an active session.
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const ORIGIN = (process.env.APP_ORIGIN ?? "https://mumbai-ethglobal.vercel.app").replace(/\/$/, "");
const WRITER = ORIGIN;
const PROTECTION = process.env.VERCEL_OIDC_TOKEN ? { "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN } : {};
async function presenter(route, body) {
  assert.ok(process.env.WORKSHOP_PRESENTER_TOKEN, "Presenter credential is required in the process environment.");
  const response = await fetch(`${WRITER}/api/presenter/${route}`, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", ...PROTECTION, authorization: `Bearer ${process.env.WORKSHOP_PRESENTER_TOKEN}` }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
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
  }
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, extraHTTPHeaders: PROTECTION });
  const stage = await context.newPage();
  // The static presenter credential stands in for the password login (the writer accepts both).
  await stage.addInitScript((credential) => localStorage.setItem("arkiv-presenter-login", JSON.stringify({ token: credential, expiresAt: Date.now() + 3_600_000 })), process.env.WORKSHOP_PRESENTER_TOKEN);
  let proxyReads = 0;
  stage.on("request", (request) => { if (request.url() === WRITER + "/api/rpc") proxyReads++; });
  stage.on("pageerror", (error) => errors.push(error.message));
  let publicRpcReads = 0;
  stage.on("request", (request) => { if (/rpc\.[a-z0-9.-]*arkiv\.network/.test(new URL(request.url()).host)) publicRpcReads++; });
  await stage.goto(`${ORIGIN}/map`, { waitUntil: "domcontentloaded" });
  await expect(stage.locator(".qr-image img")).toBeVisible({ timeout: 20000 });
  await stage.evaluate((code) => {
    const channel = new BroadcastChannel("arkiv-mumbai-stage");
    channel.postMessage({ kind: "command", cmd: { type: "session", code } });
    channel.postMessage({ kind: "command", cmd: { type: "goto", index: 8 } });
    channel.close();
  }, session);
  await expect(stage.locator('[data-scene="L1"]')).toBeVisible();
  await expect(stage.getByText("Live · Arkiv DB-Chain", { exact: true })).toBeVisible({ timeout: 20000 });
  const phone = await context.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  const phoneWriterRequests = [];
  let phoneRpcReads = 0;
  phone.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === WRITER && url.pathname.startsWith("/api/")) phoneWriterRequests.push({ at: Date.now(), path: url.pathname });
    if (/rpc\.[a-z0-9.-]*arkiv\.network/.test(url.host)) phoneRpcReads++;
  });
  phone.on("pageerror", (error) => errors.push(error.message));
  await phone.goto(`${ORIGIN}/scan`, { waitUntil: "domcontentloaded" });
  await phone.getByPlaceholder("Name or nickname").fill("App smoke");
  await phone.getByRole("button", { name: "Green", exact: true }).click();
  await phone.getByRole("combobox", { name: "Your country" }).click();
  await phone.getByRole("option", { name: "India", exact: true }).click();
  await phone.locator('input[type="range"]').focus();
  await phone.keyboard.press("Home");
  const write = phone.getByRole("button", { name: "Write my entity", exact: true });
  await expect(write).toBeEnabled({ timeout: 15000 });
  const submittedAt = Date.now();
  await write.click();
  await expect(phone.getByText(/Written in block #\d+/)).toBeVisible({ timeout: 60000 });
  const includedAt = Date.now();
  const written = await phone.getByText(/Written in block #\d+/).textContent();
  const entityHref = await phone.getByRole("link", { name: "View in explorer" }).getAttribute("href");
  const key = entityHref?.split("/").at(-1);
  assert.match(key ?? "", /^0x[0-9a-f]{64}$/i);
  await expect(stage.locator(".event-log").getByRole("button", { name: /App smoke/ }).first()).toBeVisible({ timeout: 15000 });
  await expect.poll(() => stage.locator(".globe-dots").evaluate((canvas) => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 20 && pixels[i + 1] === 241 && pixels[i + 2] === 149 && pixels[i + 3] > 100) colored++;
    return colored;
  }), { timeout: 15000 }).toBeGreaterThan(0);
  await stage.locator(".event-log").getByRole("button", { name: /App smoke/ }).first().click();
  await expect(stage.locator(".inspector-panel")).toContainText("App smoke");
  // The slider's minimum lifetime is five minutes.
  await expect(phone.getByText(/You expired at block #\d+/)).toBeVisible({ timeout: 360000 });
  const expired = await phone.getByText(/You expired at block #\d+/).textContent();
  await expect(stage.locator(".inspector-panel")).toContainText("Select a dot on the map", { timeout: 10000 });
  const expiredAt = Date.now();
  // Once included, the phone polls only its own ticket; the writer shares one keyed query per refresh.
  const unexpected = phoneWriterRequests.filter((request) => request.at > includedAt + 500 && request.at < expiredAt - 1000 && !request.path.startsWith("/api/ticket/"));
  assert.deepEqual(unexpected, [], "The included phone must poll only its own ticket.");
  assert.equal(phoneRpcReads, 0, "Phones never call an RPC.");
  assert.deepEqual(errors, []);
  assert.ok(proxyReads > 0, "The presenter must use its authenticated writer read proxy.");
  assert.equal(publicRpcReads, 0, "The presenter map must never read the public RPC.");
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  process.stdout.write(JSON.stringify({ session, entityKey: key, written, expired, phoneToInclusionMs: includedAt - submittedAt, liveDotRendered: true, inspectorConfirmed: true, presenterProxyReads: proxyReads, presenterPublicRpcReads: publicRpcReads, onlyTicketPollsWhileIncluded: true, phoneRpcReads, viewport: "390x844", pageErrors: errors.length }) + "\n");
} finally {
  await browser?.close();
  if (ownedSession) {
    const current = await presenter("status");
    assert.equal(current.session, session, "Session changed; the check will not end someone else's session.");
    await presenter("session/end", {});
  }
}
