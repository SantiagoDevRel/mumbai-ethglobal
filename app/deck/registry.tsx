"use client";

// The deck: every scene's slide or overlay plus its speaker notes (WORKSHOP.md sections 2 and 3),
// behind the DeckRegistry contract (lib/stage/deck-contract.ts).

import type { DeckRegistry } from "../../lib/stage/deck-contract";
import { NOTES } from "./notes";
import { AG } from "./scenes/AG";
import { L7 } from "./scenes/L7";
import { L8 } from "./scenes/L8";
import { A1 } from "./scenes/ai/A1";
import { A1b } from "./scenes/ai/A1b";
import { A2 } from "./scenes/ai/A2";
import { A2b } from "./scenes/ai/A2b";
import { A3 } from "./scenes/ai/A3";
import { A3b } from "./scenes/ai/A3b";
import { A3c } from "./scenes/ai/A3c";
import { A4 } from "./scenes/ai/A4";
import { Prizes } from "./scenes/ai/Prizes";
import { D1 } from "./scenes/data/D1";
import { D2 } from "./scenes/data/D2";
import { D3 } from "./scenes/data/D3";
import { D4 } from "./scenes/data/D4";
import { D5 } from "./scenes/data/D5";
import { D6 } from "./scenes/data/D6";
import { D7 } from "./scenes/data/D7";
import { D8 } from "./scenes/data/D8";
import { L1, L2, L3, L4, L5, L6, L9, LM } from "./scenes/live";
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
  AG: { Slide: AG, notes: NOTES.AG },
  L1: { Overlay: L1, notes: NOTES.L1 },
  L2: { Overlay: L2, notes: NOTES.L2 },
  L3: { Overlay: L3, notes: NOTES.L3 },
  L4: { Overlay: L4, notes: NOTES.L4 },
  L5: { Overlay: L5, notes: NOTES.L5 },
  L6: { Overlay: L6, notes: NOTES.L6 },
  L7: { Slide: L7, notes: NOTES.L7 },
  D1: { Slide: D1, notes: NOTES.D1 },
  D2: { Slide: D2, notes: NOTES.D2 },
  D3: { Slide: D3, notes: NOTES.D3 },
  D4: { Slide: D4, notes: NOTES.D4 },
  D5: { Slide: D5, notes: NOTES.D5 },
  D6: { Slide: D6, notes: NOTES.D6 },
  D7: { Slide: D7, notes: NOTES.D7 },
  D8: { Slide: D8, notes: NOTES.D8 },
  LM: { Overlay: LM, notes: NOTES.LM },
  A1: { Slide: A1, notes: NOTES.A1 },
  A1b: { Slide: A1b, notes: NOTES.A1b },
  A2: { Slide: A2, notes: NOTES.A2 },
  A2b: { Slide: A2b, notes: NOTES.A2b },
  A3: { Slide: A3, notes: NOTES.A3 },
  A3b: { Slide: A3b, notes: NOTES.A3b },
  A3c: { Slide: A3c, notes: NOTES.A3c },
  A4: { Slide: A4, notes: NOTES.A4 },
  L8: { Slide: L8, notes: NOTES.L8 },
  PZ: { Slide: Prizes, notes: NOTES.PZ },
  L9: { Overlay: L9, notes: NOTES.L9 },
};
