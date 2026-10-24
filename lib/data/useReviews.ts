"use client";

import { useEffect, useState } from "react";
import type { ArkivAdapter } from "../../shared/arkiv/adapter";
import type { Hex, QueryRun } from "../../shared/types";

export function useReviews(adapter: ArkivAdapter | null, key: Hex | null, block: bigint | undefined) {
  const [result, setResult] = useState<{ key: Hex; run: QueryRun } | null>(null);
  useEffect(() => {
    if (!adapter || !key) return;
    let stopped = false;
    void adapter.query({ kinds: ["review"], business: key }).then((run) => { if (!stopped) setResult({ key, run }); }).catch(() => { if (!stopped) setResult(null); });
    return () => { stopped = true; };
  }, [adapter, key, block]);
  return result?.key === key ? result.run.entities : [];
}
