"use client";

import { useEffect, useSyncExternalStore } from "react";
import { writerRequest, WRITER_ROUTES } from "./writer-client";

const KEY = "arkiv-presenter-token";
let token = "";
let remoteReady = false;
let channel: BroadcastChannel | null = null;
let connections = 0;
const listeners = new Set<() => void>();
const pending = new Map<string, { resolve: (result: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const allowedRoutes: string[] = [WRITER_ROUTES.presenter.doors, WRITER_ROUTES.presenter.phase, WRITER_ROUTES.presenter.replay, WRITER_ROUTES.presenter.hold, WRITER_ROUTES.presenter.resume];
function notify() { for (const listener of listeners) listener(); }
function publish(value: string) { token = value; notify(); }
export function setPresenterToken(value: string) {
  sessionStorage.setItem(KEY, value);
  publish(value);
  channel?.postMessage({ type: "presenter-ready", ready: !!value });
}

/** Only readiness and bounded commands cross tabs. The credential stays in its own tab. */
export async function presenterRequest(path: string, body: unknown): Promise<unknown> {
  if (token) return writerRequest(path, { token, body });
  if (!allowedRoutes.includes(path) || !remoteReady || !channel) throw new Error("Connect the presenter token in /notes first.");
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("The presenter tab did not respond. Keep /notes open.")); }, 20_000);
    pending.set(id, { resolve, reject, timer });
    channel?.postMessage({ type: "presenter-request", id, path, body });
  });
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
        if (data.type === "request") channel?.postMessage({ type: "presenter-ready", ready: !!token });
        if (data.type === "presenter-ready" && "ready" in data && typeof data.ready === "boolean") { remoteReady = data.ready; notify(); }
        if (data.type === "presenter-request" && token && "id" in data && typeof data.id === "string" && "path" in data && typeof data.path === "string" && allowedRoutes.includes(data.path) && "body" in data) {
          const id = data.id;
          void writerRequest(data.path, { token, body: data.body }).then((result) => channel?.postMessage({ type: "presenter-result", id, result })).catch((error: unknown) => channel?.postMessage({ type: "presenter-result", id, error: error instanceof Error ? error.message : "Presenter request failed." }));
        }
        if (data.type === "presenter-result" && "id" in data && typeof data.id === "string") {
          const request = pending.get(data.id);
          if (!request) return;
          clearTimeout(request.timer); pending.delete(data.id);
          if ("error" in data && typeof data.error === "string") request.reject(new Error(data.error));
          else request.resolve("result" in data ? data.result : undefined);
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
export function usePresenterReady() {
  useEffect(connect, []);
  return useSyncExternalStore(subscribe, () => !!token || remoteReady, () => false);
}
