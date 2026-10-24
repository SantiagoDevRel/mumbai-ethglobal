"use client";

import { useEffect, useState } from "react";
import { stage } from "../../lib/stage/store";
import { Wallet } from "lucide-react";
import { shortKey } from "../../shared/encoding";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";

export function OwnerView({ transferred, count }: { transferred: boolean; count: number }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const progress = reduced ? 1 : Math.min(1, (now - start) / 1400);
      setAnimated(transferred ? count ? 1 + Math.round((count - 1) * progress) : 0 : Math.min(1, count));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [transferred, count]);
  return <section className="owner-view">{!transferred && <div className="owner-badge"><Wallet aria-hidden="true" /><div>santiago<small>{shortKey(WRITER_ADDRESS)}</small></div></div>}<div className="owner-panel panel"><p className="owner-count">{animated}</p><p>{animated === 1 ? "owner" : "owners"} · demo view</p><button className={transferred ? "owner-undo" : ""} onClick={() => stage.dispatch({ type: transferred ? "undoTransfer" : "transfer" })}>{transferred ? "Undo" : <>Transfer ownership <kbd>T</kbd></>}</button><p className="owner-statement">{transferred ? "Each business owns its own data." : "Santiago owns all the businesses’ data."}</p></div><p className="owner-small-print"><b>Demo view</b> In your app: changeOwnership for each entity, or one executeBatch. The creator still says santiago: history doesn’t change.</p></section>;
}
