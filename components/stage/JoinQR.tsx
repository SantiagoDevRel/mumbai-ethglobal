"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { useScene, useStage } from "../../lib/stage/store";
import { qrLabel } from "../../shared/scenes";
import { useIsMock } from "../../lib/data/source-mode";

export function JoinQR() {
  const { scene } = useScene();
  const session = useStage((s) => s.session);
  const doors = useStage((s) => s.doors);
  const mock = useIsMock();
  const code = mock ? "MOCK" : session;
  const [qr, setQr] = useState<{ image: string; label: string; url: string } | null>(null);
  useEffect(() => {
    let stale = false;
    const url = new URL("/j", "https://mumbai-ethglobal.vercel.app");
    if (code) url.searchParams.set("s", code);
    void QRCode.toDataURL(url.href, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#f6f4ef" } }).then((image) => { if (!stale) setQr({ image, label: url.host + url.pathname, url: url.href }); });
    return () => { stale = true; };
  }, [code]);
  const center = scene.qr.placement === "center" && doors === "closed";
  const build = scene.id === "L8";
  return <aside className={`join-qr panel ${center ? "join-qr-center" : build ? "join-qr-build" : "join-qr-corner"}`}>{qr && <a className="qr-image" href={qr.url} target="_blank" rel="noreferrer"><Image unoptimized src={qr.image} width={center ? 360 : build ? 320 : 140} height={center ? 360 : build ? 320 : 140} alt="Scan to join the map" /></a>}<div className="qr-copy"><p>{qrLabel(scene, doors)}</p>{center && <span>Join the map</span>}</div>{qr && <div className="qr-target"><a className="qr-url" href={qr.url} title={qr.url} target="_blank" rel="noreferrer">{qr.label}</a>{code && <p className="qr-code">code <b>{code}</b></p>}</div>}</aside>;
}
