import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { custom, defineChain, keccak256, type EIP1193Provider, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AdapterOptions } from "./adapter.ts";
import { NetworkNotConfiguredError } from "./profiles.ts";

export interface SendJournal {
  /** Persist before forwarding; a failed checkpoint must prevent broadcast. */
  beforeSend(raw: Hex, hash: Hex): Promise<void>;
}

export type RpcObserver = (event: { method: string; phase: "request" | "response" | "error"; httpStatus?: number; rpcCode?: number; viaPublic?: boolean }) => void;

// The access key has a monthly quota. Once it is used up, every keyed call answers 429
// QUOTA_EXCEEDED until the quota resets, so the server retries on the profile's public RPC and
// stays there for ten minutes before trying the key again. A plain burst limit (429 without
// QUOTA_EXCEEDED) is not retried: the public RPC's own limit is lower.
const KEY_RETRY_MS = 10 * 60_000;
let keyRetryAt = 0;
/** True while keyed calls go to the public RPC because the key's quota is used up. */
export function keyQuotaExhausted(): boolean { return Date.now() < keyRetryAt; }
async function quotaExhausted(response: Response): Promise<boolean> {
  if (response.headers.get("arkiv-quota-used-percent") === "100") return true;
  try { return (await response.json() as { error?: unknown }).error === "QUOTA_EXCEEDED"; } catch { return false; }
}
/** POSTs one JSON-RPC body with the access key, or on the public RPC while the key's quota is used up. */
export async function postKeyed(url: string, accessKey: string, publicUrl: string, body: string, signal: AbortSignal): Promise<{ response: Response; viaPublic: boolean }> {
  const init = (headers: Record<string, string>): RequestInit => ({ method: "POST", headers: { "content-type": "application/json", ...headers }, body, signal });
  if (!keyQuotaExhausted()) {
    const response = await fetch(url, init({ "X-API-KEY": accessKey }));
    if (response.status !== 429 || !await quotaExhausted(response.clone())) return { response, viaPublic: false };
    keyRetryAt = Date.now() + KEY_RETRY_MS;
  }
  return { response: await fetch(publicUrl, init({})), viaPublic: true };
}

export function createSdkClients(options: AdapterOptions, journal?: SendJournal, observe?: RpcObserver) {
  const { profile, read } = options;
  if (!profile.ready || !profile.chainId) throw new NetworkNotConfiguredError("profile is not ready");
  if ("window" in globalThis && (read.kind === "keyed" || options.wallet?.kind === "privateKey")) {
    throw new Error("Private credentials are server-side only.");
  }
  const chain = defineChain({
    id: profile.chainId,
    name: profile.name,
    nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 },
    rpcUrls: { default: { http: [profile.rpcHttp] } },
  });
  const url = read.kind === "public" ? profile.rpcHttp : read.kind === "relay" ? "" : read.url;
  let nextId = 1;
  const transport = custom({
    async request({ method, params }: { method: string; params?: unknown }) {
      if (method === "eth_sendRawTransaction" && journal) {
        const raw = (params as Hex[])[0]!;
        await journal.beforeSend(raw, keccak256(raw));
      }
      if (read.kind === "relay") {
        observe?.({ method, phase: "request" });
        try { return await read.send(method, params ?? []); } catch (error) { observe?.({ method, phase: "error" }); throw error; }
      }
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (read.kind === "proxy") headers.authorization = `Bearer ${read.presenterToken}`;
      observe?.({ method, phase: "request" });
      try {
      const payload = JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params: params ?? [] });
      const signal = AbortSignal.timeout(20_000);
      const { response, viaPublic } = read.kind === "keyed"
        ? await postKeyed(url, read.accessKey, profile.rpcHttp, payload, signal)
        : { response: await fetch(url, { method: "POST", headers, body: payload, signal }), viaPublic: false };
      if (!response.ok) {
        observe?.({ method, phase: "response", httpStatus: response.status, viaPublic });
        throw new Error(`RPC request rejected (${response.status}).`);
      }
      const body = await response.json() as { result?: unknown; error?: { code: number; message: string; data?: unknown } };
      observe?.({ method, phase: "response", httpStatus: response.status, rpcCode: body.error?.code, viaPublic });
      if (body.error) {
        const error = new Error(body.error.message) as Error & { code: number; data?: unknown };
        error.code = body.error.code;
        error.data = body.error.data;
        throw error;
      }
      return body.result;
      } catch (error) { observe?.({ method, phase: "error" }); throw error; }
    },
  }, { retryCount: 0 });
  const reader = createPublicClient({ chain, transport, cacheTime: 0, pollingInterval: 500 });
  const wallet = options.wallet;
  const writer = wallet ? createWalletClient({
    chain,
    account: wallet.kind === "privateKey" ? privateKeyToAccount(wallet.privateKey) : wallet.account,
    transport: wallet.kind === "eip1193" ? custom(wallet.provider as EIP1193Provider, { retryCount: 0 }) : transport,
    cacheTime: 0,
    pollingInterval: 500,
  }) : undefined;
  // A matching chain ID is trusted for a minute: the stage polls every block, and asking again on
  // every read tripled its RPC calls.
  let networkCheckedAt = 0;
  async function checkNetwork() {
    if (Date.now() - networkCheckedAt < 60_000) return;
    if (await reader.getChainId() !== profile.chainId) throw new NetworkNotConfiguredError("chain ID mismatch");
    networkCheckedAt = Date.now();
  }
  return { reader, writer, checkNetwork };
}
