import { createWalletClient } from "@arkiv-network/sdk";
import { randomSalt } from "@arkiv-network/sdk/entity";
import { custom, toHex, type Chain, type Hex } from "viem";

export type WriteBatch = Parameters<ReturnType<typeof createWalletClient>["executeBatch"]>[0];
export interface EstimateReader {
  chain?: Chain;
  request: unknown;
}
export class WritePreparationError extends Error {
  readonly code: "WRITE_ESTIMATE_FAILED" | "WRITE_GAS_LIMIT";
  constructor(code: "WRITE_ESTIMATE_FAILED" | "WRITE_GAS_LIMIT") {
    super(code === "WRITE_GAS_LIMIT" ? "[WRITE_GAS_LIMIT] This batch exceeds half the latest block gas limit. Nothing was sent." : "[WRITE_ESTIMATE_FAILED] The unsigned write could not be estimated. Nothing was sent.");
    this.code = code;
  }
}

/** The public SDK builds the exact unsigned call in memory. This transport cannot sign or send.
 * Retain each newly generated salt on the caller's batch, so estimate and send encode identical bytes.
 * Duration/block expiries used by the workshop are independent of the encoding-time block height. */
export async function estimatedGas(reader: EstimateReader, address: Hex, batch: WriteBatch, operations: number, nonce: number, gasPrice: bigint, attempt = 0): Promise<bigint> {
  try {
    if (!reader.chain || !batch || !Number.isSafeInteger(operations) || operations < 1) throw new Error();
    const count = Object.values(batch).reduce((sum, items) => sum + (items?.length ?? 0), 0);
    if (count !== operations) throw new Error();
    for (const create of batch.creates ?? []) if (create.salt === undefined) Object.assign(create, { salt: randomSalt() });
    const request = reader.request as (call: { method: string; params?: unknown[] }) => Promise<unknown>;
    let captured: { to: Hex; data: Hex } | undefined;
    const encoder = createWalletClient({ chain: reader.chain, account: address, transport: custom({
      async request({ method, params }) {
        if (method === "eth_chainId") return toHex(reader.chain!.id);
        if (method === "eth_blockNumber") return request({ method });
        if (method === "eth_sendTransaction") {
          captured = (params as [{ to: Hex; data: Hex }])[0];
          throw new Error("Unsigned call captured.");
        }
        throw new Error("Unsigned encoder refused an unexpected method.");
      },
    }, { retryCount: 0 }) });
    try { await encoder.executeBatch(batch, { nonce, gasPrice, gas: 1n }); } catch { /* Capture refuses every send. */ }
    if (!captured) throw new Error();
    const [estimateRaw, block] = await Promise.all([
      request({ method: "eth_estimateGas", params: [{ from: address, to: captured.to, data: captured.data, nonce: toHex(nonce), gasPrice: toHex(gasPrice) }, "latest"] }),
      request({ method: "eth_getBlockByNumber", params: ["latest", false] }),
    ]);
    const estimate = BigInt(estimateRaw as string);
    const limit = BigInt((block as { gasLimit: string }).gasLimit);
    if (estimate <= 0n || limit <= 0n) throw new Error();
    const floor = (1_000_000n + 400_000n * BigInt(operations - 1)) * (attempt > 0 ? 2n : 1n);
    const gas = floor > 2n * estimate ? floor : 2n * estimate;
    if (gas > limit / 2n) throw new WritePreparationError("WRITE_GAS_LIMIT");
    return gas;
  } catch (error) {
    if (error instanceof WritePreparationError) throw error;
    throw new WritePreparationError("WRITE_ESTIMATE_FAILED");
  }
}
