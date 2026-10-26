import { test } from "node:test";
import assert from "node:assert/strict";
import { waitVisible } from "../lib/data/visible-poll.ts";

// A minimal document: visibility state plus the visibilitychange listeners waitVisible registers.
function fakeDocument(state: "visible" | "hidden") {
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: state,
    addEventListener: (_type: string, listener: () => void) => { listeners.add(listener); },
    removeEventListener: (_type: string, listener: () => void) => { listeners.delete(listener); },
    show() { doc.visibilityState = "visible"; for (const listener of [...listeners]) listener(); },
    listeners,
  };
  (globalThis as { document?: unknown }).document = doc;
  return doc;
}
const settled = (promise: Promise<void>) => Promise.race([promise.then(() => "resolved", () => "rejected"), new Promise(resolve => setTimeout(() => resolve("pending"), 60))]);

test("a visible page polls again after the delay", async () => {
  fakeDocument("visible");
  assert.equal(await settled(waitVisible(10, new AbortController().signal)), "resolved");
});

test("a hidden page waits until it is shown, and showing it early does not skip the delay", async () => {
  const doc = fakeDocument("hidden");
  const wait = waitVisible(10, new AbortController().signal);
  assert.equal(await settled(wait), "pending", "A hidden tab does not poll.");
  doc.show();
  assert.equal(await settled(wait), "resolved");
  assert.equal(doc.listeners.size, 0, "Listeners are removed.");

  const early = fakeDocument("hidden");
  const delayed = waitVisible(200, new AbortController().signal);
  early.show();
  assert.equal(await settled(delayed), "pending", "Becoming visible before the delay ends still waits for it.");
});

test("aborting stops the wait and removes listeners", async () => {
  const doc = fakeDocument("hidden");
  const controller = new AbortController();
  const wait = waitVisible(10, controller.signal);
  controller.abort();
  assert.equal(await settled(wait), "rejected");
  assert.equal(doc.listeners.size, 0);
});
