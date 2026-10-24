"use client";

// S1 · Every app does two jobs. Keep the stuff vs find the stuff, then the reject / approve meme.

import { Image as ImageIcon, Video } from "lucide-react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { RejectApproveMeme } from "../memes";
import { Panel, Reveal, Rise, Slide } from "../ui";

function PhotoAlbum() {
  // A fat album: stacked pages, thick spine, photo tiles on the cover.
  return (
    <div className="relative h-[230px] w-[250px]">
      {[3, 2, 1].map((i) => (
        <div
          key={i}
          className="absolute rounded-[14px] border-2 border-[var(--arkiv-stone)]/40 bg-[#1d1e3a]"
          style={{ left: i * 9, top: i * 9, width: 220, height: 200 }}
        />
      ))}
      <div className="absolute left-0 top-0 grid h-[200px] w-[220px] grid-cols-2 gap-3 rounded-[14px] border-2 border-[var(--arkiv-stone)] bg-[#24264a] p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-center rounded-[8px] bg-[rgba(246,244,239,0.12)]">
            {i % 2 === 0 ? (
              <ImageIcon size={34} strokeWidth={1.6} className="text-[var(--arkiv-stone)]" />
            ) : (
              <Video size={34} strokeWidth={1.6} className="text-[var(--arkiv-stone)]" />
            )}
          </div>
        ))}
      </div>
      <div className="absolute left-[-14px] top-[4px] h-[196px] w-[16px] rounded-l-[8px] bg-[var(--arkiv-orange)]" />
    </div>
  );
}

function IndexCard() {
  return (
    <div className="relative flex h-[230px] w-[250px] items-center justify-center">
      <div className="w-[150px] rotate-[-4deg] rounded-[8px] bg-[var(--arkiv-sand)] p-4 font-mono text-[15px] leading-[1.5] text-[var(--arkiv-ink)] shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        <div className="mb-1 h-[3px] w-full bg-[var(--arkiv-orange)]" />
        <div>who · what</div>
        <div>where · when</div>
        <div className="text-[var(--arkiv-blue)]">→ album p. 12</div>
      </div>
    </div>
  );
}

export function S1({ step }: SceneContentProps) {
  return (
    <Slide headline="Every app does two jobs">
      <div className="absolute left-[120px] top-[300px] flex w-[820px] flex-col gap-8">
        <Rise delay={0.2}>
          <Panel className="flex items-center gap-10 p-8">
            <PhotoAlbum />
            <div>
              <p className="text-[52px] font-semibold">Keep the stuff</p>
              <p className="mt-2 text-[30px] text-[var(--stage-muted)]">Photos, videos, files: heavy</p>
            </div>
          </Panel>
        </Rise>
        <Rise delay={0.35}>
          <Panel accent className="flex items-center gap-10 p-8">
            <IndexCard />
            <div>
              <p className="text-[52px] font-semibold text-[var(--arkiv-orange)]">Find the stuff</p>
              <p className="mt-2 text-[30px] text-[var(--stage-muted)]">Who, what, where, when: light</p>
            </div>
          </Panel>
        </Rise>
      </div>
      <Reveal step={step} at={1} className="absolute left-[1000px] top-[290px]">
        <RejectApproveMeme
          no="Scroll through 4 GB of videos to find one café"
          yes="Search a tiny card that points to it"
        />
      </Reveal>
    </Slide>
  );
}
