"use client";

// Presenter login for /map and /slides. The password goes to the Worker once, which answers with a
// signed 12-hour token. The token sits in localStorage so both windows of a split screen share it;
// the RPC access key never leaves the Worker.

import { useSyncExternalStore } from "react";
import { writerRequest, WriterRequestError, WRITER_ROUTES } from "./writer-client";
import { LoginResponse } from "../../shared/writer-api";
import type { ReadTransport } from "../../shared/arkiv/adapter";

const KEY = "arkiv-presenter-login";
const listeners = new Set<() => void>();
let cached: { raw: string | null; token: string } = { raw: null, token: "" };
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function notify() { for (const listener of listeners) listener(); }
function read(): string {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* Without storage the gate asks again. */ }
  if (raw === cached.raw) return cached.token;
  let token = "";
  try {
    const stored = LoginResponse.safeParse(JSON.parse(raw ?? "null"));
    if (stored.success && stored.data.expiresAt > Date.now()) {
      token = stored.data.token;
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(() => { cached = { raw: null, token: "" }; notify(); }, Math.min(stored.data.expiresAt - Date.now(), 2 ** 31 - 1));
    }
  } catch { /* A damaged entry counts as logged out. */ }
  cached = { raw, token };
  return token;
}

export async function presenterLogin(password: string): Promise<void> {
  const login = LoginResponse.parse(await writerRequest(WRITER_ROUTES.login, { body: { password } }));
  localStorage.setItem(KEY, JSON.stringify(login));
  notify();
}
export function presenterLogout() {
  try { localStorage.removeItem(KEY); } catch { /* Nothing stored. */ }
  notify();
}

/** A presenter call. A rejected token logs this browser out, so the password form comes back. */
export async function presenterRequest(path: string, body?: unknown): Promise<unknown> {
  const token = read();
  if (!token) throw new Error("Enter the presenter password.");
  try { return await writerRequest(path, { token, body }); }
  catch (error) {
    if (error instanceof WriterRequestError && error.code === "unauthorized") presenterLogout();
    throw error;
  }
}

/** How the presenter pages read the DB-Chain: the Worker's keyed proxy, never the public RPC (a
 * venue shares one IP). Without a token, reads fail instead of falling back. */
export function stageReadTransport(token: string, url: string): ReadTransport {
  if (token) return { kind: "proxy", url, presenterToken: token };
  return { kind: "relay", send: () => Promise.reject(new Error("Enter the presenter password.")) };
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
};
/** The presenter token, "" when logged out, null before hydration. */
export function usePresenterToken(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
