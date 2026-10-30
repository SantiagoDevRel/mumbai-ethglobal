"use client";

import { useEffect, useRef, useState } from "react";
import type { ArkivAdapter } from "../../shared/arkiv/adapter";
import type { Hex, LiveEntity } from "../../shared/types";
import { HoldResponse } from "../../shared/writer-api";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { stage } from "../stage/store";
import { WRITER_ROUTES, WRITER_URL } from "./writer-client";
import { presenterRequest, stageReadTransport, usePresenterToken } from "./presenter-auth";
import { createLiveAdapter } from "./adapter-loader";
import { createStageEffects } from "./stage-effects";
import { deletions } from "./deleted-entities";

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
    let stopped = false;
    const presenter = presenterRequest;
    // Extend, Transfer and Delete (and the writer's phase and replay) live in stage-effects.ts.
    const disconnect = stage.onCommand(createStageEffects({
      adapter, source,
      entities: () => latest.current,
      connect: (reader) => connectWallet(reader, token),
      writer: {
        phase: (phase) => presenter(WRITER_ROUTES.presenter.phase, { phase }),
        replay: (on) => presenter(WRITER_ROUTES.presenter.replay, { on }),
        hold: async () => HoldResponse.parse(await presenter(WRITER_ROUTES.presenter.hold, {})),
        resume: () => presenter(WRITER_ROUTES.presenter.resume, {}),
      },
      notify: (value) => { if (!stopped) setNotice(value); },
      awaitQuery: () => { awaitingQuery.current = true; },
      dispatch: stage.dispatch,
      getState: stage.getState,
      deletions,
      initialPhase: stage.getState().phase,
    }));
    return () => { stopped = true; disconnect(); };
  }, [adapter, source, token]);
  return notice;
}
