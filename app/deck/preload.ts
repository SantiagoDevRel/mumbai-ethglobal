"use client";

// The deck's pictures (mascot art, the memes, the logos, and ME's photos and flags), fetched and
// decoded as soon as /workshop or /workshop/slides opens, so no slide waits for its picture the first time it comes
// up (October 28: the first pass through the deck stuttered on the slides with a mascot).

import { useEffect } from "react";
import { MASCOT_ART } from "./mascot-art";
import { TEAM, teamPhoto } from "./scenes/Booth";
import { SANTI_WITH_ARKIV } from "./scenes/finale/Finale";
import { BEFORE_ARKIV, flagSrc, photoSrc, TOUR } from "./scenes/me-tour";

/** Pictures the slides use besides the mascot art: ME's photos, flags and logos, the W2
 * and T2 memes, and the W4, ST, NT, T2 and PZ logos. */
const DECK_PICTURES = [
  ...TOUR.flatMap((stop) => [photoSrc(stop), flagSrc(stop)]),
  ...BEFORE_ARKIV.map((logo) => logo.src),
  "/brand/arkiv-orange.svg",
  "/deck/memes/arkiv-meme-distracted.webp",
  "/deck/memes/arkiv-meme-hug.webp",
  "/deck/memes/arkiv-meme-mcp-happy.webp",
  "/deck/memes/arkiv-meme-plugin-sad.webp",
  "/deck/logos/ethereum-diamond-purple.svg",
  "/deck/logos/ethereum-diamond-color.svg",
  "/deck/logos/base-square-blue.svg",
  "/deck/logos/op-mainnet-symbol.svg",
  "/deck/logos/arbitrum-logomark.svg",
  "/deck/logos/solana-logomark.svg",
  "/deck/logos/swarm-logo.svg",
  "/deck/logos/swarm-logo-lockup.svg",
  "/deck/logos/ipfs-logo-text.svg",
  "/deck/logos/metamask-fox.svg",
  "/deck/logos/rabby-symbol.svg",
  "/deck/logos/claude-code-ivory.svg",
  "/deck/logos/openai-blossom-white.svg",
  "/brand/a-white.svg",
  "/brand/a-orange.svg",
  ...TEAM.map((person) => teamPhoto(person.file)),
  SANTI_WITH_ARKIV,
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
