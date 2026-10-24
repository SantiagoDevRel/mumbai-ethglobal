"use client";

import { useEffect, useState } from "react";
export function DoorsCountdown({ startedAt }: { startedAt: number | null }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    let frame = 0;
    const tick = () => { const time = Date.now(); setNow(time); if (time < startedAt + 3400) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startedAt]);
  if (!startedAt || !now || now >= startedAt + 3400) return null;
  const step = Math.ceil((startedAt + 3000 - now) / 1000);
  return <div className="doors-countdown" role="status" aria-live="assertive">{step > 0 ? step : "Write!"}</div>;
}
