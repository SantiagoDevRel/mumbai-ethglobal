"use client";

// Presenter keys (WORKSHOP.md 4.9). Contract owned by the orchestrator.

import { useEffect } from "react";
import { stage, type Command } from "./store";

export const KEY_HELP: { keys: string; action: string }[] = [
  { keys: "→ / ←", action: "Next / previous scene" },
  { keys: "D", action: "Show or hide the write! frame (S7)" },
  { keys: "E / Shift+E", action: "Extend the selected dots / every live dot (Rabby)" },
  { keys: "F, I, Q", action: "Filters, inspector, query panel" },
  { keys: "H", action: "Hide the selected dot (local)" },
  { keys: "0x, Space", action: "New owner field: fill in a random wallet address" },
  { keys: "R", action: "Reset the camera" },
  { keys: "P", action: "Plan B: replay mode" },
  { keys: "Right-drag", action: "Draw a box to point at something (a right-click clears them)" },
  { keys: "? or /", action: "Show or hide these controls (or the ? button, bottom left)" },
  { keys: "Esc", action: "Close these controls" },
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
    // Spanish keyboards: "?" can come through as "¿", and AltGr reports Ctrl+Alt.
    case "?":
    case "¿":
    case "/":
      return { type: "togglePanel", panel: "controls" };
    case "Escape":
      return { type: "togglePanel", panel: "controls", open: false };
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
      if (e.metaKey || isTyping(e.target)) return;
      const cmd = commandForKey(e);
      if (!cmd) return;
      if ((e.ctrlKey || e.altKey) && !(cmd.type === "togglePanel" && cmd.panel === "controls")) return;
      e.preventDefault();
      stage.dispatch(cmd);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
