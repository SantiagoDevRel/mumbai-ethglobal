import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { custom, defineChain, keccak256, type EIP1193Provider, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AdapterOptions } from "./adapter.ts";
import { NetworkNotConfiguredError } from "./profiles.ts";

export interface SendJournal {
  /** Persist before forwarding; a failed checkpoint must prevent broadcast. */
  beforeSend(raw: Hex, hash: Hex): Promise<void>;
}

export type RpcObserver = (event: { method: string; phase: "request" | "response" | "error"; httpStatus?: number; rpcCode?: number }) => void;

// Rabdi takes the access key as the last segment of the RPC URL's path; without a key the RPC answers
// 429 almost at once, so there is no keyless fallback. The key has a monthly quota: once it is used up,
// every call answers 429 QUOTA_EXCEEDED until the quota resets. The server remembers that for ten
// minutes so the presenter's status can say so; it never retries without the key.
const KEY_RETRY_MS = 10 * 60_000;
let keyRetryAt = 0;
/** True for ten minutes after a keyed call answered that the key's quota is used up. */
export function keyQuotaExhausted(): boolean { return Date.now() < keyRetryAt; }
async function quotaExhausted(response: Response): Promise<boolean> {
  if (response.headers.get("arkiv-quota-used-percent") === "100") return true;
  try { return (await response.json() as { error?: unknown }).error === "QUOTA_EXCEEDED"; } catch { return false; }
}
/** The keyed RPC URL: the base URL with the access key as its last path segment. */
export function keyedUrl(url: string, accessKey: string): string {
  if (!accessKey) throw new NetworkNotConfiguredError("the access key is missing");
  return `${url.replace(/\/+$/, "")}/${encodeURIComponent(accessKey)}`;
}
/** POSTs one JSON-RPC body to the keyed RPC URL. */
export async function postKeyed(url: string, accessKey: string, body: string, signal: AbortSignal): Promise<{ response: Response }> {
  const response = await fetch(keyedUrl(url, accessKey), { method: "POST", headers: { "content-type": "application/json" }, body, signal });
  if (response.status === 429 && await quotaExhausted(response.clone())) keyRetryAt = Date.now() + KEY_RETRY_MS;
  return { response };
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
    nativeCurrency: { name: "Golem", symbol: "tGLM", decimals: 18 },
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
      const { response } = read.kind === "keyed"
        ? await postKeyed(url, read.accessKey, payload, signal)
        : { response: await fetch(url, { method: "POST", headers, body: payload, signal }) };
      if (!response.ok) {
        observe?.({ method, phase: "response", httpStatus: response.status });
        throw new Error(`RPC request rejected (${response.status}).`);
      }
      const body = await response.json() as { result?: unknown; error?: { code: number; message: string; data?: unknown } };
      observe?.({ method, phase: "response", httpStatus: response.status, rpcCode: body.error?.code });
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
