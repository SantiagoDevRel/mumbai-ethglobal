"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { useScene, useStage } from "../../lib/stage/store";

/** The QR to /scan. /map keeps it in the corner (large beside L8); /slides shows it large on S7
 * until the 3 · 2 · 1 countdown. */
export function JoinQR({ screen }: { screen: "map" | "slides" }) {
  const { scene } = useScene();
  const counting = useStage((s) => s.countdownAt !== null);
  const [qr, setQr] = useState<{ image: string; label: string; url: string } | null>(null);
  // No session code in the link: the phone joins whatever session is running.
  useEffect(() => {
    let stale = false;
    const url = new URL("/scan", "https://mumbai-ethglobal.vercel.app");
    void QRCode.toDataURL(url.href, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#f6f4ef" } }).then((image) => { if (!stale) setQr({ image, label: url.host + url.pathname, url: url.href }); });
    return () => { stale = true; };
  }, []);
  const center = screen === "slides";
  if (center && (scene.qr.placement !== "center" || counting)) return null;
  const build = !center && scene.id === "L8";
  return <aside className={`join-qr panel ${center ? "join-qr-center" : build ? "join-qr-build" : "join-qr-corner"}`}>{qr && <a className="qr-image" href={qr.url} target="_blank" rel="noreferrer"><Image unoptimized src={qr.image} width={center ? 360 : build ? 320 : 140} height={center ? 360 : build ? 320 : 140} alt="Scan to join the map" /></a>}<div className="qr-copy"><p>{scene.qr.label}</p></div>{qr && <div className="qr-target"><a className="qr-url" href={qr.url} title={qr.url} target="_blank" rel="noreferrer">{qr.label}</a></div>}</aside>;
}
