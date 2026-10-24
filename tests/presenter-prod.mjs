// Production check of the presenter pages: the password gate, a shared login across /map and
// /slides, and every chain read going through the writer's keyed proxy (never the public RPC).
// Reads only; opening /map starts a writer session when none is running, as it does on stage.
// Usage: PRESENTER_PASSWORD=… node tests/presenter-prod.mjs [origin]
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const origin = process.argv[2] ?? "https://mumbai-ethglobal.vercel.app";
const writer = "https://mumbai-workshop-writer.santiagotrujillozuluaga.workers.dev";
assert.ok(process.env.PRESENTER_PASSWORD, "PRESENTER_PASSWORD must be supplied in the process environment.");
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 960, height: 1080 } });
  const reads = { proxy: 0, publicRpc: 0, hosts: new Set() };
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (url.href === `${writer}/api/rpc`) reads.proxy++;
    if (/(^|\.)rpc\..*arkiv\.network$/.test(url.host) || (/arkiv\.network$/.test(url.host) && request.method() === "POST")) { reads.publicRpc++; reads.hosts.add(url.host); }
  });
  const map = await context.newPage();
  map.on("pageerror", (error) => errors.push(error.message));
  const root = await map.goto(origin, { waitUntil: "domcontentloaded" });
  assert.equal(new URL(map.url()).pathname, "/map/", "/ opens /map.");
  assert.ok(root.ok());
  await expect(map.getByRole("heading", { name: "Presenter", exact: true })).toBeVisible({ timeout: 20000 });
  await map.getByLabel("Password").fill("not-the-password");
  await map.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(map.locator('.gate-card [role="alert"]')).toHaveText("Wrong password.");
  await map.getByLabel("Password").fill(process.env.PRESENTER_PASSWORD);
  await map.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(map.locator(".qr-image img")).toBeVisible({ timeout: 20000 });
  await expect(map.locator(".qr-url")).toHaveText("mumbai-ethglobal.vercel.app/scan");
  await expect(map.getByText("Live · Arkiv DB-Chain", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect.poll(() => reads.proxy, { timeout: 20000 }).toBeGreaterThan(0);
  const slides = await context.newPage();
  slides.on("pageerror", (error) => errors.push(error.message));
  await slides.goto(`${origin}/slides/`, { waitUntil: "domcontentloaded" });
  await expect(slides.locator('[data-screen="slides"]')).toBeVisible({ timeout: 20000 });
  await expect(slides.getByRole("heading", { name: "Presenter", exact: true })).toHaveCount(0);
  await map.waitForTimeout(8000);
  const redirects = {};
  for (const [from, to] of [["/j", "/scan/"], ["/notes", "/map/"]]) {
    const response = await fetch(origin + from, { redirect: "manual" });
    redirects[from] = { status: response.status, location: new URL(response.headers.get("location"), origin).pathname };
    assert.equal(redirects[from].location, to);
  }
  assert.equal(reads.publicRpc, 0, `Public RPC hosts were read: ${[...reads.hosts].join(", ")}`);
  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ origin, gate: "wrong password rejected, right one accepted", sharedLogin: true, proxyReads: reads.proxy, publicRpcReads: reads.publicRpc, redirects, pageErrors: errors.length }) + "\n");
} finally { await browser.close(); }
