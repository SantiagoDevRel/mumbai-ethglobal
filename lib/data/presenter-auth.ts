"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "arkiv-presenter-token";
let token = "";
let channel: BroadcastChannel | null = null;
let connections = 0;
const listeners = new Set<() => void>();
function publish(value: string) { token = value; for (const listener of listeners) listener(); }
export function setPresenterToken(value: string) {
  sessionStorage.setItem(KEY, value);
  publish(value);
  channel?.postMessage({ type: "token", token: value });
}
function connect() {
  connections++;
  if (connections === 1) {
    try { publish(sessionStorage.getItem(KEY) ?? ""); } catch { publish(""); }
    channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("arkiv-mumbai-presenter-auth");
    if (channel) {
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data;
        if (!data || typeof data !== "object" || !("type" in data)) return;
        if (data.type === "request" && token) channel?.postMessage({ type: "token", token });
        if (data.type === "token" && "token" in data && typeof data.token === "string") {
          // Same-origin, ephemeral transport; no credential is put in a URL or durable cache.
          publish(data.token);
        }
      };
      channel.postMessage({ type: "request" });
    }
  }
  return () => { connections--; if (!connections) { channel?.close(); channel = null; } };
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function usePresenterToken() {
  useEffect(connect, []);
  return useSyncExternalStore(subscribe, () => token, () => "");
}
