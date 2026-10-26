/** Waits `ms`, then until the page is visible: hidden tabs and locked phones stop polling the
 * writer, and the next poll runs as soon as they are shown again. Rejects when `signal` aborts. */
export function waitVisible(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = () => { cleanup(); resolve(); };
    const check = () => { if (timer === undefined && document.visibilityState === "visible") done(); };
    const abort = () => { cleanup(); reject(signal.reason); };
    const cleanup = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
      signal.removeEventListener("abort", abort);
    };
    signal.addEventListener("abort", abort, { once: true });
    document.addEventListener("visibilitychange", check);
    timer = setTimeout(() => { timer = undefined; check(); }, ms);
  });
}
