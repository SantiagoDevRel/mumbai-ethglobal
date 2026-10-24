"use client";

import { useSyncExternalStore } from "react";
import { blockFeed } from "./block-feed";
import type { BlockInfo } from "../../shared/types";

/** One feed for the stage and deck; mock blocks remain labeled as mock data. */
export function useLiveBlock(): BlockInfo | null {
  return useSyncExternalStore(blockFeed.subscribe, blockFeed.get, blockFeed.server);
}
