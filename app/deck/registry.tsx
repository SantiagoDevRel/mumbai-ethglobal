"use client";

// The deck: every scene's slide or overlay plus its speaker notes (WORKSHOP.md sections 2 and 3),
// behind the DeckRegistry contract (lib/stage/deck-contract.ts).

import type { DeckRegistry } from "../../lib/stage/deck-contract";
import { NOTES } from "./notes";
import { L7 } from "./scenes/L7";
import { L8 } from "./scenes/L8";
import { L1, L2, L3, L4, L5, L6, L9 } from "./scenes/live";
import { S0 } from "./scenes/S0";
import { S1 } from "./scenes/S1";
import { S2 } from "./scenes/S2";
import { S3 } from "./scenes/S3";
import { S4 } from "./scenes/S4";
import { S5 } from "./scenes/S5";
import { S6 } from "./scenes/S6";
import { S7 } from "./scenes/S7";

export const deck: DeckRegistry = {
  S0: { Slide: S0, notes: NOTES.S0 },
  S1: { Slide: S1, notes: NOTES.S1 },
  S2: { Slide: S2, notes: NOTES.S2 },
  S3: { Slide: S3, notes: NOTES.S3 },
  S4: { Slide: S4, notes: NOTES.S4 },
  S5: { Slide: S5, notes: NOTES.S5 },
  S6: { Slide: S6, notes: NOTES.S6 },
  S7: { Slide: S7, notes: NOTES.S7 },
  L1: { Overlay: L1, notes: NOTES.L1 },
  L2: { Overlay: L2, notes: NOTES.L2 },
  L3: { Overlay: L3, notes: NOTES.L3 },
  L4: { Overlay: L4, notes: NOTES.L4 },
  L5: { Overlay: L5, notes: NOTES.L5 },
  L6: { Overlay: L6, notes: NOTES.L6 },
  L7: { Slide: L7, notes: NOTES.L7 },
  L8: { Slide: L8, notes: NOTES.L8 },
  L9: { Overlay: L9, notes: NOTES.L9 },
};
