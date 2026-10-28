"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { useScene, useStage } from "../../lib/stage/store";

/** The QR to /scan. Each scene places it (shared/scenes.ts): in the corner, large on S7 until the
 * 3 · 2 · 1 countdown, or not at all on slides that need the whole screen. /slides shows only the
 * large one. */
const SCAN_URL = new URL("/scan", "https://mumbai-ethglobal.vercel.app");

export function JoinQR({ screen }: { screen: "map" | "slides" }) {
  const { scene } = useScene();
  const counting = useStage((s) => s.countdownAt !== null);
  const [image, setImage] = useState<string | null>(null);
  // No session code in the link: the phone joins whatever session is running.
  useEffect(() => {
    let stale = false;
    void QRCode.toDataURL(SCAN_URL.href, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#f6f4ef" } }).then((data) => { if (!stale) setImage(data); });
    return () => { stale = true; };
  }, []);
  const center = scene.qr.placement === "center";
  if (scene.qr.placement === "none" || (center && counting) || (screen === "slides" && !center)) return null;
  return <aside className={`join-qr panel ${center ? "join-qr-center" : "join-qr-corner"}`}>{image && <a className="qr-image" href={SCAN_URL.href} target="_blank" rel="noreferrer"><Image unoptimized src={image} width={center ? 360 : 140} height={center ? 360 : 140} alt="Scan to join the map" /></a>}<div className="qr-copy"><p>{scene.qr.label}</p></div>{image && <div className="qr-target"><a className="qr-url" href={SCAN_URL.href} title={SCAN_URL.href} target="_blank" rel="noreferrer">{SCAN_URL.host + SCAN_URL.pathname}</a></div>}</aside>;
}
