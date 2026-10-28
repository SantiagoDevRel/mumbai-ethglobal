"use client";

import { useEffect, useRef, useState } from "react";
import type { ArkivAdapter } from "../../shared/arkiv/adapter";
import type { Hex, LiveEntity } from "../../shared/types";
import { STAGE_EXTENSION_SEC } from "../../shared/types";
import { HoldResponse } from "../../shared/writer-api";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { stage } from "../stage/store";
import { WRITER_ROUTES, WRITER_URL } from "./writer-client";
import { presenterRequest, stageReadTransport, usePresenterToken } from "./presenter-auth";
import { createLiveAdapter } from "./adapter-loader";

interface Provider { request(args: { method: string; params?: unknown[] }): Promise<unknown>; isRabby?: boolean; providers?: Provider[] }
function rabbyProvider(): Provider {
  const injected = (window as unknown as { ethereum?: Provider }).ethereum;
  const provider = injected?.providers?.find((item) => item.isRabby) ?? injected;
  if (!provider?.request) throw new Error("Open Rabby to sign this transaction.");
  return provider;
}

async function connectWallet(adapter: ArkivAdapter, token: string): Promise<ArkivAdapter> {
  const provider = rabbyProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || accounts[0].toLowerCase() !== WRITER_ADDRESS.toLowerCase()) throw new Error("Select the workshop account in Rabby.");
  const profile = adapter.profile;
  const chainId = `0x${profile.chainId.toString(16)}`;
  const current = await provider.request({ method: "eth_chainId" });
  if (typeof current !== "string" || BigInt(current) !== BigInt(profile.chainId)) {
    try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] }); }
    catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== 4902) throw error;
      await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId, chainName: profile.name, rpcUrls: [profile.rpcHttp], nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 }, ...(profile.explorer ? { blockExplorerUrls: [profile.explorer] } : {}) }] });
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    }
  }
  return createLiveAdapter({ profile, creator: WRITER_ADDRESS, read: stageReadTransport(token, WRITER_URL + WRITER_ROUTES.rpc), wallet: { kind: "eip1193", provider, account: accounts[0] as Hex } });
}

export function useStageEffects(adapter: ArkivAdapter | null, source: "mock" | "live", entities: LiveEntity[]) {
  const token = usePresenterToken() ?? "";
  const latest = useRef(entities);
  const [notice, setNotice] = useState<string | null>(null);
  // "Waiting for the next query" clears when that query lands; other notices fade after a few blocks.
  const awaitingQuery = useRef(false);
  useEffect(() => {
    latest.current = entities;
    if (!awaitingQuery.current) return;
    awaitingQuery.current = false;
    setNotice(null);
  }, [entities]);
  useEffect(() => {
    if (!notice || notice === "Confirm in Rabby…") return;
    const timer = setTimeout(() => { awaitingQuery.current = false; setNotice(null); }, awaitingQuery.current ? 30_000 : 8_000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    let busy = false;
    let stopped = false;
    let wallet: ArkivAdapter | null = null;
    let lastPhase = stage.getState().phase;
    const notify = (value: string) => { if (!stopped) setNotice(value); };
    const presenter = presenterRequest;
    const disconnect = stage.onCommand(async (command, state) => {
      try {
        if (state.phase !== lastPhase && source === "live") { lastPhase = state.phase; await presenter(WRITER_ROUTES.presenter.phase, { phase: state.phase }); }
        if (command.type === "replay") {
          if (source === "live") await presenter(WRITER_ROUTES.presenter.replay, { on: state.replay });
          notify("Replay requested. A recorded rehearsal must be loaded before playback.");
        }
        if (command.type !== "extend" && command.type !== "makeBusiness" && command.type !== "transferTo") return;
        if (!adapter) throw new Error("Network not configured");
        if (busy) throw new Error("Wait for the current transaction to finish.");
        busy = true;
        let held = false;
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        try {
          let keys = command.type === "extend" ? state.selected.filter((key) => latest.current.some((entity) => entity.key === key)) : [command.key];
          if (command.type === "extend" && command.scope === "all") {
            if (source === "live" && !state.session) throw new Error("No session yet. Press Reset.");
            const everyone = await adapter.query({ kinds: ["dot", "business"], session: source === "mock" ? "MOCK" : state.session! });
            keys = everyone.entities.map((entity) => entity.key);
          }
          if (!keys.length) throw new Error("Select an entity first.");
          let writer = adapter;
          if (source === "live") {
            // Finish wallet setup before reserving the writer's bounded hold window.
            wallet ??= await connectWallet(adapter, token);
            writer = wallet;
            const hold = HoldResponse.parse(await presenter(WRITER_ROUTES.presenter.hold, {}));
            held = hold.held;
            if (!hold.idle) throw new Error("The writer is still sending. Wait for it to become idle.");
            heartbeat = setInterval(() => { void presenter(WRITER_ROUTES.presenter.hold, {}).catch(() => notify("Writer hold renewal failed. Wait a minute before another transaction.")); }, 20_000);
          }
          notify(source === "mock" ? "Mock data · applying demo action" : "Confirm in Rabby…");
          if (command.type === "extend") await writer.extend(keys, STAGE_EXTENSION_SEC);
          else if (command.type === "transferTo") await writer.changeOwner(command.key, command.newOwner);
          else {
            const entity = latest.current.find((item) => item.key === command.key);
            if (!entity || entity.attrs.kind === "review") throw new Error("Select a live dot first.");
            await writer.patch(command.key, { kind: "business", name: entity.attrs.name, category: "cafe", rating: 4.6, opens: 480, closes: 1320, city: "Mumbai" }, entity.attrs);
            stage.dispatch({ type: "setMap", map: "business" });
          }
          if (source === "live") awaitingQuery.current = true;
          notify(source === "mock" ? "Mock data · action applied" : command.type === "transferTo" ? "Ownership transferred. $owner changes on the next query." : "Transaction confirmed. Waiting for the next query…");
        } finally {
          clearInterval(heartbeat);
          if (held) {
            try { await presenter(WRITER_ROUTES.presenter.resume, {}); }
            catch { notify("Writer resume failed. It resumes on its own within a minute."); }
          }
          busy = false;
        }
      } catch (error) {
        // Rabby rejects with a plain { code, message } object, not an Error.
        const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : null;
        notify(message ?? "Presenter action failed.");
      }
    });
    return () => { stopped = true; disconnect(); };
  }, [adapter, source, token]);
  return notice;
}
