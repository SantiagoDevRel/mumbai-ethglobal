"use client";

// Presenter notes. Placeholder: the deck chat builds the scene index, timer and notes here;
// the app chat adds the writer controls (session, doors, hold) through the shared store.

import { useEffect } from "react";
import { usePresenterKeys } from "../../lib/stage/keyboard";
import { stage, useScene } from "../../lib/stage/store";
import { SCENES } from "../../shared/scenes";
import { deck } from "../deck/registry";

export default function NotesPage() {
  useEffect(() => stage.connect("notes"), []);
  usePresenterKeys();
  const { scene, index, step } = useScene();
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">
        {scene.id} · {scene.title} <span className="text-[var(--stage-muted)]">step {step + 1}/{scene.steps}</span>
      </h1>
      <ul className="mt-4 space-y-2">
        {deck[scene.id].notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <ol className="mt-8 grid grid-cols-3 gap-2">
        {SCENES.map((s, i) => (
          <li key={s.id}>
            <button
              className={i === index ? "font-semibold text-[var(--arkiv-orange)]" : ""}
              onClick={() => stage.dispatch({ type: "goto", index: i })}
            >
              {s.id} {s.title}
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}
