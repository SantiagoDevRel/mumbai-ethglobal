"use client";

// Latest block and the measured block time (S5 live block counter, countdowns).
// Contract: `useLiveBlock(): BlockInfo | null`. This first version polls the profile's public
// RPC; the app chat may move the stage to the Worker read proxy without changing the signature.

import { useEffect, useState } from "react";
import { getProfile } from "../../shared/arkiv/profiles";
import type { BlockInfo } from "../../shared/types";

const POLL_MS = 2000;

async function latestBlock(rpc: string): Promise<{ number: bigint; timestampMs: number }> {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false] }),
  });
  const json = (await res.json()) as { result?: { number: string; timestamp: string } };
  if (!json.result) throw new Error("no block");
  return { number: BigInt(json.result.number), timestampMs: Number(BigInt(json.result.timestamp)) * 1000 };
}

export function useLiveBlock(): BlockInfo | null {
  const [info, setInfo] = useState<BlockInfo | null>(null);
  useEffect(() => {
    const profile = getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE);
    let stopped = false;
    let first: { number: bigint; timestampMs: number } | null = null;
    const tick = async () => {
      try {
        const b = await latestBlock(profile.rpcHttp);
        if (stopped) return;
        if (!first) first = b;
        const blocks = Number(b.number - first.number);
        // Until two blocks were seen, use the last block-to-block gap we can measure (fallback 2 s).
        const blockTimeMs = blocks > 0 ? (b.timestampMs - first.timestampMs) / blocks : (info?.blockTimeMs ?? 2000);
        setInfo({ number: b.number, timestampMs: b.timestampMs, blockTimeMs });
      } catch {
        // keep the last value; the UI shows it as stale after a while
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return info;
}
