"use client";

// S1 · Every app does two jobs, in two columns: find the stuff (indexing) on the left, keep the
// stuff (storage) on the right. Every reveal is one →, and nothing moves on its own:
//   step 0 · the headline
//   step 1 · the Indexing column: tiny cards sorted by date, one of them opened as its index card
//   step 2 · the Storage column: heavy videos side by side, a still picture (no scrolling strip)
//   step 3 · the punchline replaces the columns: the thumbs-down row of the meme on the Google Maps
//            example (scroll a thousand places), with the two jobs recapped on the left
//   step 4 · the thumbs-up row: ask for it, one query, one answer

import { Clock, MapPin, Play, Search, Star, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { ThumbsMeme } from "../memes";
import { EASE, PANEL, Reveal, Slide, T } from "../ui";

const COLUMN_W = 816;

const VIDEOS = [
  { title: "Street food tour", size: "1.8 GB", length: "12:40", tint: "linear-gradient(135deg,#fe7446 0%,#7a2d14 100%)" },
  { title: "Chai Corner, inside", size: "940 MB", length: "6:05", tint: "linear-gradient(135deg,#181ea9 0%,#08091f 100%)" },
  { title: "Marine Drive at night", size: "2.3 GB", length: "15:22", tint: "linear-gradient(135deg,#627eea 0%,#1c1f4a 100%)" },
];

/** Storage: big video files side by side, the way files sit in a bucket. A still picture. */
function VideoRow() {
  return (
    <div className="relative h-[250px] overflow-hidden rounded-[16px]" style={{ width: COLUMN_W }}>
      <div className="flex gap-5">
        {VIDEOS.map((v) => (
          <div key={v.title} className="relative h-[250px] w-[370px] shrink-0 overflow-hidden rounded-[16px]" style={{ background: v.tint }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[rgba(246,244,239,0.9)]">
                <Play size={40} fill="#111111" className="ml-1 text-[var(--arkiv-ink)]" aria-hidden />
              </span>
            </div>
            <p className="absolute left-5 top-4 text-[24px] font-semibold">{v.title}</p>
            <p className="absolute bottom-4 left-5 font-mono text-[22px]" style={{ color: T.t84 }}>
              {v.length}
            </p>
            <p className="absolute bottom-4 right-5 rounded-full bg-[rgba(17,17,17,0.7)] px-3 py-1 font-mono text-[22px] font-semibold">{v.size}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const DAYS = [
  { day: "Today", count: 8, pick: -1 },
  { day: "Yesterday", count: 8, pick: 6 },
  { day: "Oct 12", count: 8, pick: -1 },
];

/** Indexing: many small entries sorted by date; one of them is the card you were looking for. Still. */
function DateIndex() {
  return (
    <div className="relative flex flex-col gap-4" style={{ width: COLUMN_W }}>
      {DAYS.map(({ day, count, pick }) => (
        <div key={day} className="flex items-center gap-4">
          <span className="w-[136px] shrink-0 text-[22px] font-semibold" style={{ color: T.t64 }}>
            {day}
          </span>
          <div className="flex gap-[8px]">
            {Array.from({ length: count }, (_, i) => (
              <span
                key={i}
                className={`block h-[38px] w-[38px] rounded-[6px] ${i === pick ? "bg-[var(--arkiv-orange)]" : i % 5 === 2 ? "bg-[rgba(98,126,234,0.55)]" : "bg-[rgba(246,244,239,0.22)]"}`}
              />
            ))}
          </div>
        </div>
      ))}
      {/* the picked entry, opened as its index card */}
      <span className="absolute left-[470px] top-[72px] block h-[3px] w-[66px] bg-[var(--arkiv-orange)]" />
      <div className="absolute right-0 top-[14px] flex w-[280px] flex-col gap-1.5 rounded-[14px] bg-[var(--arkiv-sand)] px-5 py-4 text-[var(--arkiv-ink)] shadow-[0_18px_48px_rgba(0,0,0,0.55)]">
        <span className="flex items-center gap-2 text-[22px] font-semibold">
          <MapPin size={22} fill="#FE7446" aria-hidden /> Chai Corner
        </span>
        <span className="font-mono text-[18px] text-[rgba(17,17,17,0.64)]">yesterday · Colaba</span>
        <span className="flex items-center gap-2 font-mono text-[18px] text-[rgba(17,17,17,0.64)]">
          <Video size={18} aria-hidden /> video #2 →
        </span>
      </div>
    </div>
  );
}

function IndexingCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col gap-2.5 rounded-[16px] bg-[var(--arkiv-sand)] text-[var(--arkiv-ink)] ${compact ? "px-8 py-7" : "px-8 py-6"}`}>
      <span className="text-[40px] font-semibold">
        Find the stuff <span className="text-[var(--arkiv-blue)]">(indexing)</span>
      </span>
      <span className="text-[26px] text-[rgba(17,17,17,0.72)]">Who, what, where, when: light</span>
    </div>
  );
}

function StorageCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${PANEL} flex flex-col gap-2.5 ${compact ? "px-8 py-7" : "px-8 py-6"}`}>
      <span className="text-[40px] font-semibold">
        Keep the stuff <span className="text-[var(--arkiv-orange)]">(storage)</span>
      </span>
      <span className="text-[26px]" style={{ color: T.t64 }}>
        Photos, videos, files: heavy
      </span>
    </div>
  );
}

function Caption({ children }: { children: string }) {
  return (
    <p className="text-[24px] font-semibold" style={{ color: T.t64 }}>
      {children}
    </p>
  );
}

/** Thumbs down: the long list of places, a still picture (no scrolling). */
const PLACES = ["Masala Box", "Page Turner", "Bombay Brew", "Koli Fish Fry"];

function LongList() {
  return (
    <div className="relative h-[176px] overflow-hidden rounded-[10px] border-[2px] border-[rgba(17,17,17,0.2)] bg-[rgba(255,255,255,0.5)]">
      <div className="flex flex-col">
        {PLACES.map((p, i) => (
          <span key={p} className="flex h-[44px] items-center justify-between border-b border-[rgba(17,17,17,0.1)] px-4 text-[22px] text-[rgba(17,17,17,0.72)]">
            {p} <span className="font-mono text-[18px]">#{i * 83 + 17}</span>
          </span>
        ))}
      </div>
      <span className="absolute bottom-2 right-3 rounded-full bg-[var(--arkiv-ink)] px-3 py-0.5 font-mono text-[18px] text-[var(--arkiv-sand)]">1 of 1,000</span>
    </div>
  );
}

/** Thumbs up: one question, one answer. */
function OneQuery() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-full border-[2px] border-[var(--arkiv-ink)] bg-white px-5 py-2.5 text-[22px] font-semibold text-[var(--arkiv-ink)]">
        <Search size={22} aria-hidden /> cafe · open now · 4.5★ or more
      </div>
      <div className="flex items-center gap-3 rounded-[12px] bg-[var(--arkiv-ink)] px-5 py-3 text-[var(--arkiv-sand)]">
        <MapPin size={26} fill="#FE7446" aria-hidden />
        <span className="text-[24px] font-semibold">Chai Corner</span>
        <span className="ml-auto flex items-center gap-1 text-[20px]">
          4.6 <Star size={18} fill="#FE7446" className="text-[var(--arkiv-orange)]" aria-hidden />
        </span>
        <span className="flex items-center gap-1 text-[20px]" style={{ color: T.t84 }}>
          <Clock size={18} aria-hidden /> open
        </span>
      </div>
    </div>
  );
}

export function S1({ step }: SceneContentProps) {
  const meme = step >= 3;
  return (
    <Slide
      headline={
        <>
          Every app
          <br />
          does two jobs
        </>
      }
      wash={0.8}
    >
      <AnimatePresence mode="wait">
        {meme ? (
          <motion.div key="meme" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <div className="absolute left-[96px] top-[384px] flex w-[700px] flex-col gap-5">
              <IndexingCard compact />
              <StorageCard compact />
            </div>
            <div className="absolute left-[884px] top-[250px]">
              <ThumbsMeme
                rows={step >= 4 ? 2 : 1}
                no={{ text: "Scroll a thousand places to find one café", visual: <LongList /> }}
                yes={{ text: "Ask for it: one query, one answer", visual: <OneQuery /> }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div key="columns" className="absolute inset-0" initial={false} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <Reveal step={step} at={1} className="absolute left-[96px] top-[384px] flex flex-col gap-8" style={{ width: COLUMN_W }}>
              <IndexingCard />
              <div className="flex flex-col gap-4">
                <Caption>Indexing · tiny cards, sorted so you can find things</Caption>
                <DateIndex />
              </div>
            </Reveal>
            <Reveal step={step} at={2} className="absolute left-[1008px] top-[384px] flex flex-col gap-8" style={{ width: COLUMN_W }}>
              <StorageCard />
              <div className="flex flex-col gap-4">
                <Caption>Storage · heavy, one file at a time</Caption>
                <VideoRow />
              </div>
            </Reveal>
          </motion.div>
        )}
      </AnimatePresence>
    </Slide>
  );
}
