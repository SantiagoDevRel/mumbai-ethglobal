"use client";

// Overlays for the live scenes L1 and L3 (L9, the close, is the finale: ./finale/Finale.tsx). The
// map, counter, QR card, event log, filters, entity card and the query panel (with its app-side row)
// belong to the app. October 29 (Santiago): L1 and L3 have no caption, so their overlays draw nothing
// and the map keeps the whole stage; the Own it (L6) and Expire it (L2) scenes are gone, and transfer
// and extension stay in the entity card.

import type { SceneContentProps } from "../../../lib/stage/deck-contract";

/** Write it, live: no caption. The room's dots, the counter and the corner QR say it. */
export function L1(_props: SceneContentProps) {
  return null;
}

/** Query it, live: no caption. The presenter filters by hand and the query panel shows the query. */
export function L3(_props: SceneContentProps) {
  return null;
}
