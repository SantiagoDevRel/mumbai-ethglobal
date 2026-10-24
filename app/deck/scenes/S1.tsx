"use client";

// S1 · Every app does two jobs (handoff board "S1 · Meme style"). Keep the stuff (glass) vs find
// the stuff (Sand), with a heavy photo album vs one index card on the right; → swaps that picture
// for the reject / approve meme.

import { Image as ImageIcon, MapPin, Search, Video } from "lucide-react";
import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { RejectApproveMeme } from "../memes";
import { EASE, PANEL, Reveal, Rise, Slide, T } from "../ui";

/** A thick photo album: pages stacked behind a cover full of photos and videos. */
function PhotoAlbum() {
  const tiles = [ImageIcon, Video, ImageIcon, ImageIcon, ImageIcon, Video, ImageIcon, Video, ImageIcon];
  return (
    <div className="relative h-[380px] w-[440px]">
      {[3, 2, 1].map((n) => (
        <div
          key={n}
          className="absolute rounded-[18px] border border-[rgba(17,17,17,0.18)] bg-[var(--arkiv-stone)]"
          style={{ left: n * 12, top: n * 12, width: 400, height: 340, opacity: 1 - n * 0.18 }}
        />
      ))}
      <div className="absolute left-0 top-0 grid h-[340px] w-[400px] grid-cols-3 gap-3 rounded-[18px] bg-[var(--arkiv-sand)] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        {tiles.map((Icon, i) => (
          <div key={i} className={`flex items-center justify-center rounded-[10px] ${i % 4 === 1 ? "bg-[var(--arkiv-ink)]" : "bg-[var(--arkiv-stone)]"}`}>
            <Icon size={40} strokeWidth={1.5} className={i % 4 === 1 ? "text-[var(--arkiv-sand)]" : "text-[var(--arkiv-ink)]"} aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}

/** One small index card: who, what, where, when, and a pin. */
function IndexCard() {
  return (
    <div className="flex h-[176px] w-[280px] flex-col gap-3 rounded-[14px] bg-[var(--arkiv-sand)] px-5 py-4 text-[var(--arkiv-ink)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2.5">
        <MapPin size={30} strokeWidth={1.75} fill="#FE7446" aria-hidden />
        <span className="text-[24px] font-semibold">Chai Corner</span>
      </div>
      {["cafe · 4.6", "Colaba, Mumbai", "7:00–22:00"].map((l) => (
        <span key={l} className="font-mono text-[18px] text-[rgba(17,17,17,0.64)]">
          {l}
        </span>
      ))}
    </div>
  );
}

function AlbumVsCard() {
  return (
    <div className="flex items-end gap-16">
      <div className="flex flex-col gap-4">
        <PhotoAlbum />
        <p className="text-[30px] font-semibold">
          Photo album <span style={{ color: T.t64 }}>· heavy</span>
        </p>
      </div>
      <div className="flex flex-col gap-4 pb-[4px]">
        <IndexCard />
        <p className="text-[30px] font-semibold">
          Index card <span style={{ color: T.t64 }}>· light</span>
        </p>
      </div>
    </div>
  );
}

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
      <motion.div
        className="absolute left-[960px] top-[330px]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: step >= 1 ? 0 : 1, y: 0 }}
        transition={{ duration: 0.5, delay: step >= 1 ? 0 : 0.45, ease: EASE }}
        aria-hidden={step >= 1}
      >
        <AlbumVsCard />
      </motion.div>
      <Reveal step={step} at={1} className="absolute left-[912px] top-[260px]">
        {step >= 1 ? (
          <RejectApproveMeme
            no={"Scroll through 4 GB of videos to find one café"}
            yes="Search a tiny card that points to it"
          />
        ) : null}
      </Reveal>
    </Slide>
  );
}
