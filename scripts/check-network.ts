import { createRequire } from "node:module";
import { getProfile, WRITER_ADDRESS, assertChainId } from "../shared/arkiv/profiles.ts";

const require = createRequire(import.meta.url);
const profile = getProfile(process.env.ARKIV_PROFILE);
const sdkVersion = (require("@arkiv-network/sdk/package.json") as { version: string }).version;
if (sdkVersion !== profile.sdk.version) throw new Error(`SDK ${sdkVersion} differs from pinned ${profile.sdk.version}.`);
const url = process.env.RPC ?? profile.rpcHttp;
const headers: Record<string, string> = { "content-type": "application/json" };
if (process.env.ACCESS_KEY) headers["X-API-KEY"] = process.env.ACCESS_KEY;
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
