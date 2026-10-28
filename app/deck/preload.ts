"use client";

// The deck's mascot art, fetched and decoded as soon as /map or /slides opens, so no slide waits for
// its picture the first time it comes up (October 28: the first pass through the deck stuttered on
// the slides with a mascot).

import { useEffect } from "react";
import { MASCOT_ART } from "./mascot-art";

/** Kept for the whole talk, so the decoded images stay in memory. */
const held: HTMLImageElement[] = [];

export function useDeckPreload() {
  useEffect(() => {
    if (held.length) return;
    for (const art of Object.values(MASCOT_ART)) {
      const image = new Image();
      image.src = `/deck/mascot/${art.file}`;
      image.decode().catch(() => { /* A missing picture shows on its own slide; nothing to do here. */ });
      held.push(image);
    }
  }, []);
}
