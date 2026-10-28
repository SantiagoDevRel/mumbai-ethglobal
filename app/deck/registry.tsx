"use client";

// The deck: every scene's slide or overlay plus its speaker notes (outline v3,
// MUMBAI-ETHGLOBAL/OUTLINE.md), behind the DeckRegistry contract (lib/stage/deck-contract.ts).

import type { DeckRegistry } from "../../lib/stage/deck-contract";
import { NOTES } from "./notes";
import { A1 } from "./scenes/ai/A1";
import { Prizes } from "./scenes/ai/Prizes";
import { B2 } from "./scenes/B2";
import { B3 } from "./scenes/B3";
import { B5 } from "./scenes/B5";
import { D6 } from "./scenes/data/D6";
import { IX } from "./scenes/IX";
import { L1, L2, L3, L6, L9 } from "./scenes/live";
import { S0 } from "./scenes/S0";
import { S7 } from "./scenes/S7";
import { ST } from "./scenes/ST";
import { T1 } from "./scenes/T1";
import { W1 } from "./scenes/W1";
import { W2 } from "./scenes/W2";
import { W3 } from "./scenes/W3";
import { W4 } from "./scenes/W4";

export const deck: DeckRegistry = {
  S0: { Slide: S0, notes: NOTES.S0 },
  IX: { Slide: IX, notes: NOTES.IX },
  W1: { Slide: W1, notes: NOTES.W1 },
  W2: { Slide: W2, notes: NOTES.W2 },
  W3: { Slide: W3, notes: NOTES.W3 },
  W4: { Slide: W4, notes: NOTES.W4 },
  ST: { Slide: ST, notes: NOTES.ST },
  S7: { Slide: S7, notes: NOTES.S7 },
  L1: { Overlay: L1, notes: NOTES.L1 },
  B2: { Slide: B2, notes: NOTES.B2 },
  B3: { Slide: B3, notes: NOTES.B3 },
  L3: { Overlay: L3, notes: NOTES.L3 },
  L6: { Overlay: L6, notes: NOTES.L6 },
  L2: { Overlay: L2, notes: NOTES.L2 },
  B4: { Slide: D6, notes: NOTES.B4 },
  B5: { Slide: B5, notes: NOTES.B5 },
  T1: { Slide: T1, notes: NOTES.T1 },
  T2: { Slide: A1, notes: NOTES.T2 },
  PZ: { Slide: Prizes, notes: NOTES.PZ },
  L9: { Overlay: L9, notes: NOTES.L9 },
};
