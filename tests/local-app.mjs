// Serves this build to browser checks under the production origin: page requests are fetched from a
// local `next start`, and every /api request is left to each harness's fixtures. Build first with
// NEXT_PUBLIC_WRITER_URL=same-origin. The server gets no database or keys; fixtures answer /api.
import { spawn } from "node:child_process";
import { createServer } from "node:net";

/** The deployed app, optionally a protected preview (APP_ORIGIN plus VERCEL_OIDC_TOKEN from `vercel env run`). */
export const APP_ORIGIN = (process.env.APP_ORIGIN ?? "https://mumbai-ethglobal.vercel.app").replace(/\/$/, "");
export const protectionHeaders = () => process.env.VERCEL_OIDC_TOKEN ? { "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN } : {};

export async function startApp() {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
  });
  const env = { ...process.env, PORT: String(port) };
  for (const name of ["DATABASE_URL", "WORKSHOP_WRITER_PRIVATE_KEY", "RPC", "ACCESS_KEY", "WORKSHOP_PRESENTER_TOKEN", "PRESENTER_PASSWORD"]) delete env[name];
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], { stdio: ["ignore", "pipe", "pipe"], env });
  let log = "";
  child.stdout.on("data", (chunk) => { log = (log + chunk).slice(-2000); });
  child.stderr.on("data", (chunk) => { log = (log + chunk).slice(-2000); });
  const local = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    if (child.exitCode !== null) throw new Error(`next start exited: ${log}`);
    try { if ((await fetch(`${local}/scan`)).ok) break; } catch { /* still starting */ }
    if (attempt > 120) { child.kill(); throw new Error(`next start did not answer: ${log}`); }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return {
    /** Routes `origin` page requests (not /api) to the local server. Register before the /api fixtures. */
    serve: (context, origin) => context.route((url) => url.origin === origin && !url.pathname.startsWith("/api/"), async (route) => {
      const url = new URL(route.request().url());
      await route.fulfill({ response: await route.fetch({ url: local + url.pathname + url.search }) });
    }),
    proxy: async (route) => {
      const url = new URL(route.request().url());
      return route.fulfill({ response: await route.fetch({ url: local + url.pathname + url.search }) });
    },
    stop: () => { child.kill(); },
  };
}
