"use client";

// Presenter keys (WORKSHOP.md 4.9). Contract owned by the orchestrator.

import { useEffect } from "react";
import { stage, type Command } from "./store";

export const KEY_HELP: { keys: string; action: string }[] = [
  { keys: "→ / ←", action: "Next / previous scene" },
  { keys: "D", action: "3 · 2 · 1 · write! countdown (S7)" },
  { keys: "E / Shift+E", action: "Extend the selected dots / every live dot (Rabby)" },
  { keys: "B", action: "Business view" },
  { keys: "O / T", action: "Owner view / transfer animation" },
  { keys: "F, I, Q", action: "Filters, inspector, query panel" },
  { keys: "H", action: "Hide the selected dot (local)" },
  { keys: "R", action: "Reset the camera" },
  { keys: "P", action: "Plan B: replay mode" },
  { keys: "?", action: "Show or hide the controls overlay" },
];

export function commandForKey(e: Pick<KeyboardEvent, "key" | "shiftKey">): Command | null {
  switch (e.key) {
    case "ArrowRight":
    case "PageDown":
    case " ":
      return { type: "next" };
    case "ArrowLeft":
    case "PageUp":
      return { type: "prev" };
    case "d":
    case "D":
      return { type: "countdown" };
    case "e":
      return { type: "extend", scope: "selected" };
    case "E":
      return { type: "extend", scope: e.shiftKey ? "all" : "selected" };
    case "b":
    case "B":
      return { type: "setMap", map: "business" };
    case "o":
    case "O":
      return { type: "setMap", map: "owner" };
    case "t":
    case "T":
      return { type: "transfer" };
    case "f":
    case "F":
      return { type: "togglePanel", panel: "filters" };
    case "i":
    case "I":
      return { type: "togglePanel", panel: "inspector" };
    case "q":
    case "Q":
      return { type: "togglePanel", panel: "query" };
    case "h":
    case "H":
      return { type: "hideSelected" };
    case "r":
    case "R":
      return { type: "resetCamera" };
    case "p":
    case "P":
      return { type: "replay" };
    case "?":
      return { type: "togglePanel", panel: "controls" };
    default:
      return null;
  }
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Mount once on /map and on /slides. */
export function usePresenterKeys(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const cmd = commandForKey(e);
      if (!cmd) return;
      e.preventDefault();
      stage.dispatch(cmd);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
