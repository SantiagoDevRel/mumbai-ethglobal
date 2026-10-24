// Screenshots of every scene and step, /notes and /j, from the static build in out/, in mock mode.
// Read-only: the writer's session endpoint is a fixture and nothing is sent to the chain.
// Usage: npm run build && node scripts/stage-shots.mjs [outDir]   (default: shots/)
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { SCENES } from "../shared/scenes.ts";

const origin = "https://mumbai-ethglobal.vercel.app";
const writer = "https://mumbai-workshop-writer.santiagotrujillozuluaga.workers.dev";
const root = path.resolve("out");
const dir = path.resolve(process.argv[2] ?? "shots");
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".json": "application/json" };
const errors = [];

await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--renderer-process-limit=2"] });

async function open(url, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(() => sessionStorage.setItem("arkiv-stage-source", "mock"));
  await context.route(`${origin}/**`, async (route) => {
    let file = path.resolve(root, "." + decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(root + path.sep) && file !== root) return route.abort();
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      await route.fulfill({ status: 200, contentType: mime[path.extname(file)] ?? "application/octet-stream", body: await readFile(file) });
    } catch { await route.fulfill({ status: 404, body: "Not found" }); }
  });
  await context.route(`${writer}/**`, (route) => route.fulfill({ json: { valid: true, doors: "open", phase: "talk", replay: false, network: "tiramisu" } }));
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
const shot = (page, name) => page.screenshot({ path: path.join(dir, `${name}.png`), timeout: 60_000 });

for (const [width, height] of [[1920, 1080], [1280, 720]]) {
  const { context, page } = await open("/", { width, height });
  await settle(page);
  for (const [index, scene] of SCENES.entries()) {
    await send(page, [{ type: "goto", index }]);
    await settle(page);
    for (let step = 1; step <= scene.steps; step++) {
      if (step > 1) { await send(page, [{ type: "next" }]); await settle(page); }
      await shot(page, `${width}-${String(index).padStart(2, "0")}-${scene.id}-step${step}`);
    }
  }
  await context.close();
}

for (const [name, url, viewport] of [["notes-1440", "/notes/", { width: 1440, height: 900 }], ["phone-390", "/j/?s=MOCK", { width: 390, height: 844 }], ["phone-360", "/j/?s=MOCK", { width: 360, height: 780 }]]) {
  const { context, page } = await open(url, viewport);
  await settle(page);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true, timeout: 60_000 });
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ dir, pageErrors: errors }));
