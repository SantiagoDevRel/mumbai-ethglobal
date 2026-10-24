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
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useSourceMode(): SourceMode {
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("arkiv-stage-source");
      if (stored === "auto" || stored === "mock" || stored === "live") { mode = stored; notify(); }
    } catch { /* Default to the mock-first auto mode. */ }
  }, []);
  return useSyncExternalStore(subscribe, () => mode, () => "auto");
}
