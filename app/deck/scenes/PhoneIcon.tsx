"use client";

// A phone drawn for the stage (IX's "Build your entity" row, Santiago, October 29): a metal frame with
// side buttons, a black bezel, the camera island and a screen with the join QR and the orange write
// button, under a soft glare. Inline SVG, so it stays crisp at any projector size. Deck palette: Arkiv
// Blue screen, Sand QR card, Orange button, Ink bezel.

import { useId } from "react";

/** `height` in stage px; the width follows the drawing (64 x 120). */
export function PhoneIcon({ height = 104, className, label }: { height?: number; className?: string; label?: string }) {
  // useId's characters aren't all valid in an SVG url(#…) reference.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const width = Math.round((height * 64) / 120);
  const ink = "#111111";
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 120"
      className={className}
      style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.55))" }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9E6DE" />
          <stop offset="0.3" stopColor="#A9A6B4" />
          <stop offset="0.62" stopColor="#4F4D60" />
          <stop offset="1" stopColor="#C9C6D2" />
        </linearGradient>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2329C4" />
          <stop offset="0.55" stopColor="#181EA9" />
          <stop offset="1" stopColor="#0E1270" />
        </linearGradient>
        <linearGradient id={`${id}-glare`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="7" y="5" width="50" height="110" rx="8.4" />
        </clipPath>
      </defs>
      {/* Side buttons, behind the frame: action and volume on the left, power on the right. */}
      <rect x="1" y="20" width="3.4" height="6" rx="1.2" fill={`url(#${id}-metal)`} />
      <rect x="1" y="31" width="3.4" height="11" rx="1.2" fill={`url(#${id}-metal)`} />
      <rect x="1" y="45" width="3.4" height="11" rx="1.2" fill={`url(#${id}-metal)`} />
      <rect x="59.6" y="34" width="3.4" height="17" rx="1.2" fill={`url(#${id}-metal)`} />
      {/* Frame, bezel and screen. */}
      <rect x="3" y="1" width="58" height="118" rx="12" fill={`url(#${id}-metal)`} />
      <rect x="3.5" y="1.5" width="57" height="117" rx="11.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="0.6" />
      <rect x="4.6" y="2.6" width="54.8" height="114.8" rx="10.6" fill="#0A0A12" />
      <rect x="7" y="5" width="50" height="110" rx="8.4" fill={`url(#${id}-screen)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* Title lines, the QR card and the write button. */}
        <rect x="14" y="21" width="22" height="3" rx="1.5" fill="#F6F4EF" fillOpacity="0.85" />
        <rect x="14" y="27" width="15" height="2.4" rx="1.2" fill="#F6F4EF" fillOpacity="0.45" />
        <rect x="13" y="36" width="38" height="38" rx="4.5" fill="#F6F4EF" />
        <g fill={ink}>
          <rect x="17" y="40" width="9" height="9" rx="1.2" />
          <rect x="38" y="40" width="9" height="9" rx="1.2" />
          <rect x="17" y="61" width="9" height="9" rx="1.2" />
        </g>
        <g fill="#F6F4EF">
          <rect x="18.8" y="41.8" width="5.4" height="5.4" rx="0.6" />
          <rect x="39.8" y="41.8" width="5.4" height="5.4" rx="0.6" />
          <rect x="18.8" y="62.8" width="5.4" height="5.4" rx="0.6" />
        </g>
        <g fill={ink}>
          <rect x="20.2" y="43.2" width="2.6" height="2.6" />
          <rect x="41.2" y="43.2" width="2.6" height="2.6" />
          <rect x="20.2" y="64.2" width="2.6" height="2.6" />
          <rect x="29" y="40" width="3" height="3" />
          <rect x="33" y="44" width="3" height="3" />
          <rect x="29" y="48" width="3" height="3" />
          <rect x="17" y="52" width="3" height="3" />
          <rect x="22" y="56" width="3" height="3" />
          <rect x="38" y="53" width="3" height="3" />
          <rect x="44" y="57" width="3" height="3" />
          <rect x="29" y="62" width="3" height="3" />
          <rect x="33" y="66" width="3" height="3" />
          <rect x="40" y="63" width="3" height="3" />
          <rect x="44" y="67" width="3" height="3" />
        </g>
        <circle cx="32" cy="55" r="3.4" fill="#FE7446" />
        <rect x="13" y="82" width="38" height="9" rx="4.5" fill="#FE7446" />
        <rect x="23" y="85.6" width="18" height="1.8" rx="0.9" fill={ink} fillOpacity="0.75" />
        <rect x="24" y="108.5" width="16" height="1.6" rx="0.8" fill="#F6F4EF" fillOpacity="0.55" />
        <path d="M7 5 H40 L7 72 Z" fill={`url(#${id}-glare)`} />
      </g>
      {/* Camera island. */}
      <rect x="23" y="8.4" width="18" height="5.2" rx="2.6" fill="#030306" />
      <circle cx="37.2" cy="11" r="1.2" fill="#1D2A6E" />
    </svg>
  );
}
