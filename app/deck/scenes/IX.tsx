"use client";

// IX · The index, right after the title: the talk's parts, one row each, read from SECTIONS
// (shared/scenes.ts) so the outline bar across the top and this list never disagree. "Build it,
// live" is the part where the room scans, so it carries the accent. One step: everything enters
// together once.

import { Smartphone } from "lucide-react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { SECTIONS } from "../../../shared/scenes";
import { Mascot } from "../Mascot";
import { Rise, Slide, T } from "../ui";

export function IX(_props: SceneContentProps) {
  return (
    <Slide headline="What we'll do" wash={0.9}>
      <Rise className="absolute left-[96px] top-[340px] w-[1180px]">
        <ol className="flex flex-col gap-4">
          {SECTIONS.map((section, i) => {
            const live = section.id === "build";
            return (
              <li
                key={section.id}
                className="flex h-[132px] items-center gap-8 rounded-[20px] border px-8"
                style={{ borderColor: live ? "var(--arkiv-orange)" : T.t14, background: live ? "rgba(254,116,70,0.12)" : "rgba(17,17,17,0.72)" }}
              >
                <span
                  className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border-2 text-[34px] font-semibold"
                  style={{ borderColor: live ? "var(--arkiv-orange)" : T.t28, color: live ? "var(--arkiv-orange)" : T.t84 }}
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="text-[42px] font-semibold leading-[1.05]">{section.title}</span>
                  <span className="text-[26px] leading-[1.25]" style={{ color: T.t64 }}>{section.line}</span>
                </span>
                {live ? <Smartphone size={52} strokeWidth={1.8} className="shrink-0 text-[var(--arkiv-orange)]" aria-label="Phones out" role="img" /> : null}
              </li>
            );
          })}
        </ol>
      </Rise>
      <Rise className="absolute left-[1380px] top-[360px]">
        <Mascot pose="laptop" height={560} />
      </Rise>
    </Slide>
  );
}
