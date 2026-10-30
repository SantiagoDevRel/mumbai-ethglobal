"use client";

// The deck's pictures (mascot art, the memes, the logos, and ME's photos and flags), fetched and
// decoded as soon as /map or /slides opens, so no slide waits for its picture the first time it comes
// up (October 28: the first pass through the deck stuttered on the slides with a mascot).

import { useEffect } from "react";
import { MASCOT_ART } from "./mascot-art";
import { flagSrc, photoSrc, TOUR } from "./scenes/me-tour";

/** Pictures the slides use besides the mascot art: ME's photos and flags, the W2 and T2 memes and the
 * W4 and NT logos. */
const DECK_PICTURES = [
  ...TOUR.flatMap((stop) => [photoSrc(stop), flagSrc(stop)]),
  "/brand/arkiv-orange.svg",
  "/deck/memes/arkiv-meme-distracted.webp",
  "/deck/memes/arkiv-meme-mcp-happy.webp",
  "/deck/memes/arkiv-meme-mcp-sad.webp",
  "/deck/logos/ethereum-diamond-purple.svg",
  "/deck/logos/base-square-blue.svg",
  "/deck/logos/op-mainnet-symbol.svg",
  "/deck/logos/arbitrum-logomark.svg",
  "/deck/logos/swarm-logo.svg",
  "/brand/a-white.svg",
  "/brand/a-orange.svg",
];

/** Kept for the whole talk, so the decoded images stay in memory. */
const held: HTMLImageElement[] = [];

export function useDeckPreload() {
  useEffect(() => {
    if (held.length) return;
    const sources = [...Object.values(MASCOT_ART).map((art) => `/deck/mascot/${art.file}`), ...DECK_PICTURES];
    for (const src of sources) {
      const image = new Image();
      image.src = src;
      image.decode().catch(() => { /* A missing picture shows on its own slide; nothing to do here. */ });
      held.push(image);
    }
  }, []);
}
