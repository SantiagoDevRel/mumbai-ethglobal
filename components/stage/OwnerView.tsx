"use client";

import { useEffect, useState } from "react";
import { stage } from "../../lib/stage/store";

export function OwnerView({ transferred, count }: { transferred: boolean; count: number }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const progress = reduced ? 1 : Math.min(1, (now - start) / 1400);
      setAnimated(transferred ? Math.round(count * progress) : Math.min(1, count));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [transferred, count]);
  return <section className="owner-view pointer-events-auto"><div className="owner-badge">{transferred ? "Each business owns its own data." : "santiago"}</div><p className="owner-count">{animated} {animated === 1 ? "owner" : "owners"}</p><button onClick={() => stage.dispatch({ type: transferred ? "undoTransfer" : "transfer" })}>{transferred ? "Undo" : "Transfer ownership"}</button><p className="owner-small-print">Demo view. In your app: changeOwnership for each entity, or one executeBatch. The creator still says santiago: history doesn’t change.</p></section>;
}
