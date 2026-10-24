import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { custom, defineChain, keccak256, type EIP1193Provider, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AdapterOptions } from "./adapter.ts";
import { NetworkNotConfiguredError } from "./profiles.ts";

export interface SendJournal {
  /** Persist before forwarding; a failed checkpoint must prevent broadcast. */
  beforeSend(raw: Hex, hash: Hex): Promise<void>;
}

export function createSdkClients(options: AdapterOptions, journal?: SendJournal) {
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
  const url = read.kind === "public" ? profile.rpcHttp : read.url;
  let nextId = 1;
  const transport = custom({
    async request({ method, params }: { method: string; params?: unknown }) {
      if (method === "eth_sendRawTransaction" && journal) {
        const raw = (params as Hex[])[0]!;
        await journal.beforeSend(raw, keccak256(raw));
      }
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (read.kind === "keyed") headers["X-API-KEY"] = read.accessKey;
      if (read.kind === "proxy") headers.authorization = `Bearer ${read.presenterToken}`;
      const response = await fetch(url, {
        method: "POST", headers,
        body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params: params ?? [] }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`RPC request rejected (${response.status}).`);
      const body = await response.json() as { result?: unknown; error?: { code: number; message: string; data?: unknown } };
      if (body.error) {
        const error = new Error(body.error.message) as Error & { code: number; data?: unknown };
        error.code = body.error.code;
        error.data = body.error.data;
        throw error;
      }
      return body.result;
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
  async function checkNetwork() {
    if (await reader.getChainId() !== profile.chainId) throw new NetworkNotConfiguredError("chain ID mismatch");
  }
  return { reader, writer, checkNetwork };
}
