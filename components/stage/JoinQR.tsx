"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { useScene, useStage } from "../../lib/stage/store";
import { qrLabel } from "../../shared/scenes";

export function JoinQR() {
  const { scene } = useScene();
  const session = useStage((s) => s.session);
  const doors = useStage((s) => s.doors);
  const [qr, setQr] = useState<{ image: string; label: string; url: string } | null>(null);
  useEffect(() => {
    let stale = false;
    const url = new URL("/j", "https://mumbai-ethglobal.vercel.app");
    if (session) url.searchParams.set("s", session);
    void QRCode.toDataURL(url.href, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#f6f4ef" } }).then((image) => { if (!stale) setQr({ image, label: url.host + url.pathname + url.search, url: url.href }); });
    return () => { stale = true; };
  }, [session]);
  const center = scene.qr.placement === "center" && doors === "closed";
  const build = scene.id === "L8";
  const target = qr ? new URL(qr.url) : null;
  return <aside className={`join-qr panel ${center ? "join-qr-center" : build ? "join-qr-build" : "join-qr-corner"}`}>{qr && <a className="qr-image" href={qr.url} target="_blank" rel="noreferrer"><Image unoptimized src={qr.image} width={center ? 360 : build ? 320 : 140} height={center ? 360 : build ? 320 : 140} alt="Scan to join the map" /></a>}<div className="qr-copy"><p>{qrLabel(scene, doors)}</p>{center && <span>Join the map</span>}</div>{qr && target && <a className="qr-url" href={qr.url} title={qr.url} target="_blank" rel="noreferrer">{center ? qr.label : build ? <><span>{target.host}</span><span>{target.pathname + target.search}</span></> : target.pathname + target.search}</a>}</aside>;
}
