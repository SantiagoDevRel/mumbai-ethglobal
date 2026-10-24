"use client";

import { useEffect, useRef, useState } from "react";
import type { ArkivAdapter } from "../../shared/arkiv/adapter";
import type { Hex, LiveEntity } from "../../shared/types";
import { STAGE_EXTENSION_SEC } from "../../shared/types";
import { HoldResponse } from "../../shared/writer-api";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { stage } from "../stage/store";
import { writerRequest, WRITER_ROUTES, WRITER_URL } from "./writer-client";
import { usePresenterToken } from "./presenter-auth";
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
  return createLiveAdapter({ profile, creator: WRITER_ADDRESS, read: { kind: "proxy", url: WRITER_URL + WRITER_ROUTES.rpc, presenterToken: token }, wallet: { kind: "eip1193", provider, account: accounts[0] as Hex } });
}

export function useStageEffects(adapter: ArkivAdapter | null, source: "mock" | "live", entities: LiveEntity[]) {
  const token = usePresenterToken();
  const latest = useRef(entities);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { latest.current = entities; }, [entities]);
  useEffect(() => {
    let busy = false;
    let stopped = false;
    let wallet: ArkivAdapter | null = null;
    let lastPhase = stage.getState().phase;
    const notify = (value: string) => { if (!stopped) setNotice(value); };
    const presenter = async (path: string, body: unknown) => {
      if (!token) throw new Error("Connect the presenter token in /notes first.");
      return writerRequest(path, { token, body });
    };
    const disconnect = stage.onCommand(async (command, state) => {
      try {
        if (state.phase !== lastPhase && source === "live") { lastPhase = state.phase; await presenter(WRITER_ROUTES.presenter.phase, { phase: state.phase }); }
        if (command.type === "doors") {
          if (source === "live") await presenter(WRITER_ROUTES.presenter.doors, { open: state.doors === "open" });
          notify(source === "mock" ? "Mock data · doors changed locally" : `Doors ${state.doors}`);
        }
        if (command.type === "replay") {
          if (source === "live") await presenter(WRITER_ROUTES.presenter.replay, { on: state.replay });
          notify("Replay requested. A recorded rehearsal must be loaded before playback.");
        }
        if (command.type !== "extend" && command.type !== "makeBusiness") return;
        if (!adapter) throw new Error("Network not configured");
        if (busy) throw new Error("Wait for the current transaction to finish.");
        busy = true;
        let held = false;
        try {
          const keys = command.type === "extend" ? command.scope === "all" ? latest.current.map((entity) => entity.key) : state.selected : [command.key];
          if (!keys.length) throw new Error("Select an entity first.");
          let writer = adapter;
          if (source === "live") {
            // Finish wallet setup before reserving the writer's bounded hold window.
            wallet ??= await connectWallet(adapter, token);
            writer = wallet;
            const hold = HoldResponse.parse(await presenter(WRITER_ROUTES.presenter.hold, {}));
            held = hold.held;
            if (!hold.idle) throw new Error("The writer is still sending. Wait for it to become idle.");
          }
          notify(source === "mock" ? "Mock data · applying demo action" : "Confirm in Rabby…");
          if (command.type === "extend") await writer.extend(keys, STAGE_EXTENSION_SEC);
          else {
            const entity = latest.current.find((item) => item.key === command.key);
            if (!entity || entity.attrs.kind === "review") throw new Error("Select a live dot first.");
            await writer.patch(command.key, { kind: "business", name: entity.attrs.name, category: "cafe", rating: 4.6, opens: 480, closes: 1320, city: "Mumbai" }, entity.attrs);
          }
          notify(source === "mock" ? "Mock data · action applied" : "Transaction confirmed. Waiting for the next query…");
        } finally {
          if (held) {
            try { await presenter(WRITER_ROUTES.presenter.resume, {}); }
            catch { notify("Writer resume failed. Use Resume writer in /notes."); }
          }
          busy = false;
        }
      } catch (error) { notify(error instanceof Error ? error.message : "Presenter action failed."); }
    });
    return () => { stopped = true; disconnect(); };
  }, [adapter, source, token]);
  return notice;
}
