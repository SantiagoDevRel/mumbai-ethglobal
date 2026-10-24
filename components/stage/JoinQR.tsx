"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { useScene, useStage } from "../../lib/stage/store";

export function JoinQR() {
  const { scene } = useScene();
  const session = useStage((s) => s.session);
  const doors = useStage((s) => s.doors);
  const [qr, setQr] = useState<{ image: string; label: string; url: string } | null>(null);
  useEffect(() => {
    let stale = false;
    const url = new URL("/j", window.location.origin);
    if (session) url.searchParams.set("s", session);
    void QRCode.toDataURL(url.href, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#f6f4ef" } }).then((image) => { if (!stale) setQr({ image, label: url.host + url.pathname + url.search, url: url.href }); });
    return () => { stale = true; };
  }, [session]);
  const center = scene.qr.placement === "center" && doors === "closed";
  return <aside className={`join-qr ${center ? "join-qr-center" : "join-qr-corner"}`}><p>{scene.qr.label}</p>{qr && <a href={qr.url} target="_blank" rel="noreferrer"><Image unoptimized src={qr.image} width={center ? 320 : 140} height={center ? 320 : 140} alt="Scan to join the map" /><span>{qr.label}</span></a>}{!session && <small>Session not started</small>}</aside>;
}
