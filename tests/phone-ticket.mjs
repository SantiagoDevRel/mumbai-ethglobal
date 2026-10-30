// Full phone lifecycle against writer fixtures: nothing on load, one submit that answers once the
// block is in, then a countdown on the phone's own clock with no more requests. The name is lower
// case as you type, and the longest choice (6 months, Rabdi's maximum) shows no countdown. From a 320 px phone up. Any RPC or other external request is
// a failure.
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
const key = `0x${"12".repeat(32)}`;
const foreverKey = `0x${"34".repeat(32)}`;
// A deadline as the writer answers for the longest choice: block 100 + 7,883,970.
const NO_EXPIRY_BLOCK = "7884070";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const results = [];
const errors = [];
try {
  for (const width of [320, 375, 360, 390]) for (const colorScheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : width === 375 ? 667 : 844 }, colorScheme });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install();
    await page.addInitScript(() => { Math.random = () => 0.5; });
    let phase = "closed";
    const rpc = [], api = [], submissions = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === origin && !url.pathname.startsWith("/api/")) return app.proxy(route);
      if (url.origin !== writer || url.pathname === "/api/rpc") { rpc.push({ url: request.url(), method: request.method() }); return route.abort(); }
      api.push({ path: url.pathname, query: url.search, phase });
      if (url.pathname !== "/api/submit") throw new Error(`Unexpected writer route ${url.pathname}`);
      assert.equal(url.searchParams.get("wait"), "1", "The phone asks the writer to answer once the block is in.");
      submissions.push({ body: request.postDataJSON(), device: request.headers()["x-device-token"] });
      const accepted = { ticket: "11111111-1111-4111-8111-111111111111", position: 0, lat: 19, lng: 72, session: "ABCD1234" };
      if (phase === "closed") return route.fulfill({ status: 409, json: { error: "doors_closed", message: "Not open yet." } });
      if (phase === "error") return route.fulfill({ status: 500, json: { error: "internal", message: raw } });
      if (phase === "queued") return route.fulfill({ json: { ...accepted, status: "queued" } });
      if (phase === "forever") return route.fulfill({ json: { ...accepted, status: "written", entityKey: foreverKey, block: "100", expiresAtBlock: NO_EXPIRY_BLOCK } });
      return route.fulfill({ json: { ...accepted, status: "written", entityKey: key, block: "100", expiresAtBlock: "250" } });
    });
    async function tick(ms) { await page.clock.runFor(ms); await page.waitForTimeout(100); }
    async function snapshot(name) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.doesNotMatch(await page.locator("body").innerText(), /viem|RPC|429|unknown error/i);
      if (capture) await page.screenshot({ path: path.join(capture, `${width}-${colorScheme}-${name}.png`), fullPage: true });
    }
    async function fits(locator) {
      await expect(locator).toBeVisible();
      const geometry = await locator.evaluate((element) => {
        const box = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
        return { fits: box.left >= parent.left && box.right <= parent.right && element.scrollWidth <= element.clientWidth };
      });
      assert.ok(geometry.fits, JSON.stringify(geometry));
    }
    const write = page.getByRole("button", { name: "Write my entity", exact: true });
    await page.goto(`${origin}/scan`, { waitUntil: "domcontentloaded" });
    // Opening the page asks nothing: the form is ready at once.
    await expect(write).toBeEnabled();
    await tick(30000);
    assert.deepEqual(api, [], "Opening the phone page makes no writer requests.");
    // No entity without a name you can see: empty, spaces or a zero-width character stay on the
    // phone, with the reason next to the field.
    const nameField = page.getByRole("textbox", { name: "Your name", exact: true });
    for (const blank of ["", "   ", "​"]) {
      await nameField.fill(blank);
      await write.click();
      await expect(page.locator("#name-missing")).toHaveText("Add a name or nickname: it shows next to your dot.");
      await expect(nameField).toHaveAttribute("aria-invalid", "true");
      await expect(nameField).toBeFocused();
    }
    assert.deepEqual(api, [], "A blank name sends nothing.");
    // Lower case as you type or paste (October 29), with the caret staying where you type.
    await expect(nameField).toHaveAttribute("autocapitalize", "none");
    await nameField.fill("se test");
    await nameField.press("Home");
    await page.keyboard.type("AB");
    await expect(nameField).toHaveValue("abse test");
    await nameField.fill("SE test");
    await expect(nameField).toHaveValue("se test");
    await expect(page.locator("#name-missing")).toHaveCount(0);
    await page.locator('input[type="range"]').focus();
    await page.keyboard.press("Home");
    // Before the presenter opens writing, the one request says so and the button stays usable.
    await write.click();
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveText("Not open yet. Try again in a moment.");
    await expect(write).toBeEnabled();
    phase = "error";
    await write.click();
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveText("Something went wrong. Try again.");
    await snapshot("submit-error");
    phase = "written";
    const before = api.length;
    await write.click();
    await expect(page.getByText("Written in block #100", { exact: true })).toBeVisible();
    await expect(page.locator('.phone-notice[role="alert"]')).toHaveCount(0);
    await expect(page.locator(".phone-entity h2")).toHaveText("se test");
    assert.equal(submissions.at(-1).body.name, "se test");
    assert.equal(submissions.at(-1).body.country, "in", "Country codes are stored in lower case.");
    const clock = page.getByLabel("Time left");
    await expect(clock).toHaveText("5:00");
    await fits(clock);
    await snapshot("written");
    await tick(61000);
    await expect(clock).toHaveText("3:59");
    await tick(240000);
    const over = page.getByText("Time’s up. Unless someone extended it, your entity has expired: that’s Entity Expiration.", { exact: true });
    await fits(over);
    await expect(page.getByRole("button", { name: "Create new entity", exact: true })).toBeVisible();
    await expect(page.locator(".phone-mine li")).toHaveCount(1);
    await expect(page.locator(".phone-mine h2")).toContainText("1 of 10");
    await expect(page.locator(".phone-mine-time")).toHaveText("expired");
    await snapshot("expired");
    assert.equal(api.length, before + 1, "Writing the entity is one request.");
    // Done: no more requests of any kind, however long the phone stays open.
    await tick(120000);
    assert.equal(api.length, before + 1, "After written the phone makes no requests.");
    // An answer that comes back before the block is in still ends the phone's part.
    await page.getByRole("button", { name: "Create new entity", exact: true }).click();
    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("SE again");
    phase = "queued";
    await write.click();
    await expect(page.getByText("Your dot is on its way. Watch the map.", { exact: true })).toBeVisible();
    await expect(page.locator(".phone-mine li")).toHaveCount(2);
    // A refresh keeps the list and the phone can write again.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(write).toBeEnabled();
    await expect(page.locator(".phone-mine li")).toHaveCount(2);
    await tick(60000);
    assert.equal(api.length, before + 2, "A queued answer is not followed by polling.");
    // The longest choice (October 31; Permanent on the previous testnet): one tap under the slider
    // switches it off; the toggle, the readout, the written entity and the list say 6 months, the
    // longest lifetime Rabdi allows, and it never counts down.
    const forever = page.getByRole("button", { name: "6 months the longest", exact: true });
    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("Ada FOREVER");
    await expect(page.getByRole("textbox", { name: "Your name", exact: true })).toHaveValue("ada forever");
    await expect(forever).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".lifetime-value")).toHaveText("15 min");
    const type = (selector) => page.locator(selector).first().evaluate((element) => { const style = getComputedStyle(element); return `${style.fontFamily}|${style.fontSize}|${style.fontWeight}`; });
    const readout = await type(".lifetime-value");
    // Same type roles as the rest of the phone: the toggle is a field like the country picker.
    assert.equal(await type(".lifetime-forever"), await type(".country-trigger"));
    assert.equal(await forever.evaluate((element) => getComputedStyle(element).height), "52px");
    await forever.click();
    await expect(forever).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("slider", { name: "How long should this data (entity) live?" })).toBeDisabled();
    await expect(page.locator(".lifetime-value")).toHaveText("6 months max");
    assert.equal(await type(".lifetime-value"), readout, "The readout keeps its type when it says 6 months.");
    await fits(forever);
    await snapshot("permanent-form");
    phase = "forever";
    await write.click();
    await expect(page.getByText("Written in block #100", { exact: true })).toBeVisible();
    await expect(page.locator(".phone-entity h2")).toHaveText("ada forever");
    const status = page.locator(".phone-entity .phone-lifetime-status");
    await expect(status).toHaveText("6 months");
    await expect(page.locator(".phone-expires-at")).toHaveText("The longest lifetime Rabdi allows");
    assert.equal(await type(".phone-expires-at"), readout, "The line reads like the lifetime it replaces.");
    await expect(page.getByLabel("Time left")).toHaveCount(0);
    await fits(page.locator(".phone-expires-at"));
    await snapshot("permanent-written");
    await tick(20 * 60_000);
    await expect(status).toHaveText("6 months");
    await expect(page.getByText(/Time’s up/)).toHaveCount(0);
    await expect(page.locator(".phone-mine li")).toHaveCount(3);
    await expect(page.locator(".phone-mine-time").first()).toHaveText("6 months");
    assert.equal(submissions.at(-1).body.noExpiry, true);
    assert.equal(submissions.at(-1).body.name, "ada forever");
    assert.equal(api.length, before + 3, "The longest choice is still one request.");
    assert.deepEqual(rpc, [], "The phone must never attempt an RPC.");
    assert.ok(submissions.every((item) => !("session" in item.body)), "Phones send no session code.");
    assert.ok(submissions.every((item) => /^[a-f0-9-]{36}$/i.test(item.device)));
    results.push({ width, colorScheme, requests: api.length, rpcRequests: rpc.length, quietOnLoad: true, oneRequestPerWrite: true, localCountdown: true, lowerCaseName: true, permanent: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  process.stdout.write(JSON.stringify({ checks: results, pageErrors: errors }) + "\n");
} finally { await browser.close(); app.stop(); }
