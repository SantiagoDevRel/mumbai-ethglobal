"use client";

// Placeholder deck so the stage runs from hour 1. The deck chat replaces this file's content
// with the real scenes (WORKSHOP.md sections 2 and 3), keeping the DeckRegistry contract.

import type { DeckRegistry, SceneContentProps } from "../../lib/stage/deck-contract";
import { SCENES } from "../../shared/scenes";

function PlaceholderSlide({ scene, step }: SceneContentProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-[var(--stage-bg)]/80">
      <p className="text-3xl text-[var(--stage-muted)]">{scene.id}</p>
      <h1 className="max-w-[1400px] text-center text-8xl font-semibold">{scene.title}</h1>
      <p className="text-2xl text-[var(--stage-muted)]">
        step {step + 1} / {scene.steps}
      </p>
    </div>
  );
}

function PlaceholderOverlay({ scene }: SceneContentProps) {
  return (
    <div className="absolute left-16 top-12 text-5xl font-semibold drop-shadow-lg">{scene.title}</div>
  );
}

export const deck = Object.fromEntries(
  SCENES.map((s) => [
    s.id,
    s.kind === "slide" ? { Slide: PlaceholderSlide, notes: [] } : { Overlay: PlaceholderOverlay, notes: [] },
  ]),
) as unknown as DeckRegistry;
