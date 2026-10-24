"use client";

// S1 · Every app does two jobs (handoff board "S1 · Meme style"). Keep the stuff (glass) vs find
// the stuff (Sand), then → reveals the reject / approve meme on the right.

import { Image as ImageIcon, Search } from "lucide-react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { RejectApproveMeme } from "../memes";
import { PANEL, Reveal, Rise, Slide, T } from "../ui";

export function S1({ step }: SceneContentProps) {
  return (
    <Slide
      headline={
        <>
          Every app
          <br />
          does two jobs
        </>
      }
      wash={0.78}
    >
      <div className="absolute left-[96px] top-[384px] flex w-[720px] flex-col gap-5">
        <Rise delay={0.2}>
          <div className={`${PANEL} flex flex-col gap-2.5 px-8 py-7`}>
            <div className="flex items-center gap-3.5">
              <ImageIcon size={36} strokeWidth={1.75} aria-hidden />
              <span className="text-[40px] font-semibold">Keep the stuff</span>
            </div>
            <span className="text-[26px]" style={{ color: T.t64 }}>
              Photos, videos, files: heavy
            </span>
          </div>
        </Rise>
        <Rise delay={0.35}>
          <div className="flex flex-col gap-2.5 rounded-[16px] bg-[var(--arkiv-sand)] px-8 py-7 text-[var(--arkiv-ink)]">
            <div className="flex items-center gap-3.5">
              <Search size={36} strokeWidth={1.75} aria-hidden />
              <span className="text-[40px] font-semibold">Find the stuff</span>
            </div>
            <span className="text-[26px] text-[rgba(17,17,17,0.72)]">Who, what, where, when: light</span>
          </div>
        </Rise>
      </div>
      <Reveal step={step} at={1} className="absolute left-[912px] top-[236px]">
        {step >= 1 ? (
          <RejectApproveMeme
            no="Scroll through 4 GB of videos to find one café"
            yes="Search a tiny card that points to it"
          />
        ) : null}
      </Reveal>
    </Slide>
  );
}
