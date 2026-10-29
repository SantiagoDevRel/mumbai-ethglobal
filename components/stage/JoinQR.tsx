"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useScene, useStage } from "../../lib/stage/store";
import type { QrLabel } from "../../shared/scenes";
import { LIFETIME_MAX_SEC, LIFETIME_MIN_SEC } from "../../shared/types";
import { SCENE_FADE, usePrefersReducedMotion } from "./StageFrame";
import "./join-qr.css";

/** The QR to /scan. Each scene places it (shared/scenes.ts): in the corner, large on S7 until the
 * 3 · 2 · 1 countdown, or not at all on slides that need the whole screen. /slides shows only the
 * large one. On S7 it is the scan column (Santiago, October 29): no card, the QR on its own sand
 * square, centered, with the URL and the form's two lines under it. S7's → moves the column left so
 * the entity card fits beside it and the pair stays centered; S7.tsx places the card from SCAN. */
const SCAN_URL = new URL("/scan", "https://mumbai-ethglobal.vercel.app");

/** S7's scan column, in stage pixels. It is placed from the stage box's center, so it lands on the
 * same spot in /map's stretched box as on the slide's 1920x1080 one. */
export const SCAN = {
  /** Column width: the widest line under the QR (the lifetime line, 629 px). */
  width: 640,
  /** Column top, from the box's vertical center: 160 in a 1920x1080 box. */
  top: -380,
  /** The label block above the QR's square, so the square's top is `top + label` (250). */
  label: 90,
  /** The QR image, drawn at its own pixels; its sand square adds 24 px around it (528). */
  qr: 480,
  /** The entity card S7 adds at step 1, as wide as the column, and the gap between them: the pair
   * is two equal halves around the middle. */
  card: 640,
  gap: 56,
} as const;

/** How far the column moves at a step: at step 1 it and the entity card are centered as a pair. */
export function scanShift(step: number): number {
  return step >= 1 ? -(SCAN.gap + SCAN.card) / 2 : 0;
}

/** Seconds the scan column (and S7's frames) take to fade: a slide change's. */
export function useScanFade(): number {
  return usePrefersReducedMotion() ? 0 : SCENE_FADE;
}

/** The move to the side on S7's →, with the deck's reveal timing (REVEAL_TIME and EASE in app/deck/ui.tsx). */
const SCAN_MOVE = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

export function JoinQR({ screen }: { screen: "map" | "slides" }) {
  const { scene, step } = useScene();
  const counting = useStage((s) => s.countdownAt !== null);
  const fade = useScanFade();
  const corner = scene.qr.placement === "corner" && screen === "map";
  const scan = scene.qr.placement === "center" && !counting;
  return (
    <>
      {corner ? <QrCard center={false} label={scene.qr.label} /> : null}
      {/* It fades with S7's slide and with the countdown frame, so it never pops over them. */}
      <AnimatePresence initial={false}>
        {scan ? (
          <motion.div key="scan" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: fade, ease: SCAN_MOVE.ease }}>
            <QrCard center label={scene.qr.label} step={step} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** The QR image, drawn once per page: a card that mounts on a later scene shows it at once. */
let qrImage: string | null = null;
let qrDrawing: Promise<string> | null = null;

function useQrImage(): string | null {
  const [image, setImage] = useState(qrImage);
  // No session code in the link: the phone joins whatever session is running.
  useEffect(() => {
    if (image) return;
    let stale = false;
    const drawing = (qrDrawing ??= QRCode.toDataURL(SCAN_URL.href, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#f6f4ef" } }).then((data: string) => (qrImage = data)));
    void drawing.then((data: string) => { if (!stale) setImage(data); });
    return () => { stale = true; };
  }, [image]);
  return image;
}

type QrCardProps = { center: false; label: QrLabel } | { center: true; label: QrLabel; step: number };

/** The QR itself, in stage pixels: the corner card, or S7's scan column at a step. /outline draws the
 * scan column on its S7 preview too. */
export function QrCard(props: QrCardProps) {
  const image = useQrImage();
  if (props.center) return <ScanColumn image={image} label={props.label} step={props.step} />;
  const { label } = props;
  return <aside className="join-qr panel join-qr-corner">{image && <a className="qr-image" href={SCAN_URL.href} target="_blank" rel="noreferrer"><Image unoptimized src={image} width={140} height={140} alt="Scan to join the map" /></a>}<div className="qr-copy"><p>{label}</p></div>{image && <div className="qr-target"><a className="qr-url" href={SCAN_URL.href} title={SCAN_URL.href} target="_blank" rel="noreferrer">{SCAN_URL.host + SCAN_URL.pathname}</a></div>}</aside>;
}

/** S7's column: the label, the QR on its sand square, the URL, then what the form asks. The square
 * holds its place while the image draws, so nothing under it moves when it appears. */
function ScanColumn({ image, label, step }: { image: string | null; label: QrLabel; step: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.aside
        className="join-qr join-qr-scan"
        style={{ left: `calc(50% - ${SCAN.width / 2}px)`, top: `calc(50% - ${-SCAN.top}px)`, width: SCAN.width }}
        initial={false}
        animate={{ x: scanShift(step) }}
        transition={SCAN_MOVE}
      >
        <p className="qr-scan-label" style={{ height: SCAN.label }}>{label}</p>
        {image ? (
          <a className="qr-image" href={SCAN_URL.href} target="_blank" rel="noreferrer">
            <Image unoptimized src={image} width={SCAN.qr} height={SCAN.qr} alt="Scan to join the map" />
          </a>
        ) : (
          <span className="qr-image" aria-hidden="true" />
        )}
        <a className="qr-url" href={SCAN_URL.href} title={SCAN_URL.href} target="_blank" rel="noreferrer">{SCAN_URL.host + SCAN_URL.pathname}</a>
        <div className="qr-scan-form">
          <p>Name. Color. Country.</p>
          <p>
            <span>Lifetime: {LIFETIME_MIN_SEC / 60} to {LIFETIME_MAX_SEC / 60} minutes.</span>
          </p>
        </div>
      </motion.aside>
    </MotionConfig>
  );
}
