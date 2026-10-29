"use client";

// The outline bar across the top of both presenter screens: the talk's parts (SECTIONS in
// shared/scenes.ts), how far through each one the presenter is, and which one is on now. Every →
// moves it. Hidden before the index (the title and who I am); the index (IX) introduces it. Drawn in
// stage pixels.

import { useScene } from "../../lib/stage/store";
import { SECTIONS, sceneIndex, sectionProgress } from "../../shared/scenes";

export function OutlineBar() {
  const { scene, index, step } = useScene();
  if (index < sceneIndex("IX")) return null;
  const progress = sectionProgress(index, step);
  return (
    <nav className="outline-bar" aria-label="Talk outline">
      {SECTIONS.map((section, i) => {
        const done = progress[i]!.progress;
        const state = section.id === scene.section ? "current" : done >= 1 ? "done" : "next";
        return (
          <div key={section.id} className="outline-part" data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="outline-label"><b>{i + 1}</b>{section.title}</span>
            <span className="outline-track"><i style={{ transform: `scaleX(${done})` }} /></span>
          </div>
        );
      })}
    </nav>
  );
}
