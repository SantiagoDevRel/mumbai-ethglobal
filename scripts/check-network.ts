import { createRequire } from "node:module";
import { getProfile, WRITER_ADDRESS, assertChainId } from "../shared/arkiv/profiles.ts";
import { keyedUrl } from "../shared/arkiv/clients-1.0.ts";

const require = createRequire(import.meta.url);
const profile = getProfile(process.env.ARKIV_PROFILE);
const sdkVersion = (require("@arkiv-network/sdk/package.json") as { version: string }).version;
if (sdkVersion !== profile.sdk.version) throw new Error(`SDK ${sdkVersion} differs from pinned ${profile.sdk.version}.`);
// The access key is the RPC URL's last path segment; without one the RPC answers 429.
if (!process.env.ACCESS_KEY) throw new Error("Set ACCESS_KEY: an access key from https://hub.arkiv.network/access-keys.");
const url = keyedUrl(process.env.RPC ?? profile.rpcHttp, process.env.ACCESS_KEY);
const headers: Record<string, string> = { "content-type": "application/json" };
async function rpc(method: string, params: unknown[] = []) {
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`RPC rejected (${res.status}).`);
  const data = await res.json() as { result: string; error?: unknown };
  if (data.error) throw new Error(`RPC failed: ${method}`);
  return data.result;
}
const chainId = await rpc("eth_chainId");
assertChainId(profile, chainId);
const block = await rpc("eth_blockNumber");
const balance = await rpc("eth_getBalance", [WRITER_ADDRESS, "latest"]);
console.log(JSON.stringify({ profile: profile.id, chainId: Number.parseInt(chainId, 16), latestBlock: String(BigInt(block)), sdkVersion, keyed: Boolean(process.env.ACCESS_KEY), writerBalanceWei: String(BigInt(balance)) }));
