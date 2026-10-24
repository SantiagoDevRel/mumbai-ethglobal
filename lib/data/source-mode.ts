"use client";

import { useEffect, useSyncExternalStore } from "react";

export type SourceMode = "auto" | "mock" | "live";
let mode: SourceMode = "auto";
const listeners = new Set<() => void>();
function notify() { for (const listener of listeners) listener(); }
export function setSourceMode(next: SourceMode) {
  mode = next;
  try { sessionStorage.setItem("arkiv-stage-source", next); } catch { /* The selector still works without persistence. */ }
  notify();
  const channel = new BroadcastChannel("arkiv-mumbai-source");
  channel.postMessage(next); channel.close();
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useSourceMode(): SourceMode {
  useEffect(() => {
    const channel = new BroadcastChannel("arkiv-mumbai-source");
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === "auto" || event.data === "mock" || event.data === "live") {
        mode = event.data;
        try { sessionStorage.setItem("arkiv-stage-source", mode); } catch { /* Tab-local persistence is optional. */ }
        notify();
      }
    };
    try {
      const stored = sessionStorage.getItem("arkiv-stage-source");
      if (stored === "auto" || stored === "mock" || stored === "live") { mode = stored; notify(); }
    } catch { /* Auto follows the configured writer. */ }
    return () => channel.close();
  }, []);
  return useSyncExternalStore(subscribe, () => mode, () => "auto");
}
