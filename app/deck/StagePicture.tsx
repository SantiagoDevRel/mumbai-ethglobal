"use client";

// A scene drawn outside the stage engine, at a given step and scaled to its box: /outline's cards and
// zoom, and the public /slides copy. Neither follows /workshop, logs in or reads the DB-Chain.

import { useEffect, useRef, useState } from "react";
import { QrCard } from "../../components/stage/JoinQR";
import { STAGE_H, STAGE_W } from "../../components/stage/StageFrame";
import type { SceneDef } from "../../shared/scenes";
import { deck } from "./registry";
import { LiveCard } from "./scenes/LiveCard";

export const lastStep = (scene: SceneDef) => scene.steps - 1;

/** What /workshop/slides draws for a scene at a step: the slide, L9's closing lines, or the live card for
 * the other map scenes; S7 gets its big QR. */
export function StagePicture({ scene, step }: { scene: SceneDef; step: number }) {
  const entry = deck[scene.id];
  const Content = scene.kind === "slide" ? entry.Slide : scene.id === "L9" ? entry.Overlay : null;
  return (
    <>
      {Content ? <Content scene={scene} step={step} /> : <LiveCard scene={scene} step={step} />}
      {scene.qr.placement === "center" ? <QrCard center label={scene.qr.label} step={step} /> : null}
    </>
  );
}

/** A scene drawn in stage pixels and scaled to the box's width. `lazy`: drawn once the box comes
 * near the screen, so the outline opens without rendering every slide at once. `interactive`: its
 * links work and it is read aloud (/slides); otherwise it is an inert picture (/outline). */
export function StagePreview({ scene, step, lazy = false, interactive = false }: { scene: SceneDef; step: number; lazy?: boolean; interactive?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [near, setNear] = useState(!lazy);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => setScale((entry?.contentRect.width ?? 0) / STAGE_W));
    resize.observe(element);
    const seen = near ? null : new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) setNear(true); }, { rootMargin: "800px 0px" });
    seen?.observe(element);
    return () => { resize.disconnect(); seen?.disconnect(); };
  }, [near]);
  return (
    <div ref={box} data-preview className="relative aspect-video w-full overflow-hidden bg-[var(--stage-bg)]">
      {near && scale > 0 ? (
        <div
          inert={!interactive}
          aria-hidden={!interactive}
          data-stage
          className={`absolute left-0 top-0 origin-top-left text-[var(--arkiv-sand)] ${interactive ? "" : "pointer-events-none"}`}
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
        >
          <StagePicture scene={scene} step={step} />
        </div>
      ) : null}
    </div>
  );
}

export type StageAt = { index: number; step: number };

/** One → forward or ← back through `scenes`, the reveals and then the scenes, like the talk itself;
 * null past either end. */
export function stepThrough(scenes: readonly SceneDef[], { index, step }: StageAt, direction: 1 | -1): StageAt | null {
  const scene = scenes[index]!;
  if (direction === 1) {
    if (step < lastStep(scene)) return { index, step: step + 1 };
    return index < scenes.length - 1 ? { index: index + 1, step: 0 } : null;
  }
  if (step > 0) return { index, step: step - 1 };
  const before = scenes[index - 1];
  return before ? { index: index - 1, step: lastStep(before) } : null;
}
