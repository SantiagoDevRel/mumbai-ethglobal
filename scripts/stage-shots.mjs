// Screenshots of every scene and step on /map and /slides, and of /scan, from this build (served by
// tests/local-app.mjs), in mock mode.
// Read-only: the writer's session endpoint is a fixture and nothing is sent to the chain.
// Usage: npm run build && node scripts/stage-shots.mjs [outDir] [only]   (default: shots/, every surface)
// `only` is a comma list of surfaces such as slides-1920x1080,map-1920x1080.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { SCENES } from "../shared/scenes.ts";
import { startApp } from "../tests/local-app.mjs";

const origin = "https://mumbai-ethglobal.vercel.app";
const writer = origin;
const app = await startApp();
const dir = path.resolve(process.argv[2] ?? "shots");
const errors = [];
const only = process.argv[3]?.split(",");

await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });

async function open(url, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    sessionStorage.setItem("arkiv-stage-source", "mock");
    localStorage.setItem("arkiv-presenter-login", JSON.stringify({ token: "p.fixture", expiresAt: Date.now() + 3_600_000 }));
  });
  await app.serve(context, origin);
  await context.route(`${writer}/api/**`, (route) => route.fulfill({ json: { valid: true, code: "MOCK", doors: "open", phase: "talk", replay: false, network: "rabdi" } }));
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${url}: ${error.message}`));
  await page.goto(`${origin}${url}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

const send = (page, cmds) => page.evaluate((items) => {
  const channel = new BroadcastChannel("arkiv-mumbai-stage");
  for (const cmd of items) channel.postMessage({ kind: "command", cmd });
  channel.close();
}, cmds);
// Camera flights take 2.4 s (Globe.tsx); settle past them so the globe is where the talk leaves it.
const settle = (page) => page.waitForTimeout(3500);
// A slow software-rendered globe can time out one screenshot; record it and keep going.
const shot = (page, name) => page.screenshot({ path: path.join(dir, `${name}.png`), timeout: 60_000 }).catch((error) => errors.push(`${name}: ${error.name}`));

for (const [screen, width, height] of [["map", 1920, 1080], ["map", 1280, 720], ["map", 960, 1080], ["slides", 1920, 1080], ["slides", 960, 1080]]) {
  if (only && !only.includes(`${screen}-${width}x${height}`)) continue;
  const { context, page } = await open(`/${screen}`, { width, height });
  await settle(page);
  // /slides on its own drives itself from the keyboard (a follower ignores channel commands), so it
  // walks the talk with → from the first slide; /map takes channel commands as the leader.
  const next = () => (screen === "slides" ? page.keyboard.press("ArrowRight") : send(page, [{ type: "next" }]));
  for (const [index, scene] of SCENES.entries()) {
    if (screen === "slides") { if (index > 0) { await next(); await settle(page); } }
    else { await send(page, [{ type: "goto", index }]); await settle(page); }
    for (let step = 1; step <= scene.steps; step++) {
      if (step > 1) { await next(); await settle(page); }
      await shot(page, `${screen}-${width}x${height}-${String(index).padStart(2, "0")}-${scene.id}-step${step}`);
    }
  }
  await context.close();
}

for (const [name, url, viewport] of [["phone-390", "/scan", { width: 390, height: 844 }], ["phone-360", "/scan", { width: 360, height: 780 }]]) {
  const { context, page } = await open(url, viewport);
  await settle(page);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true, timeout: 60_000 });
  await context.close();
}

await browser.close();
app.stop();
console.log(JSON.stringify({ dir, pageErrors: errors }));
