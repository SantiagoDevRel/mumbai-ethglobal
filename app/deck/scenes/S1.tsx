"use client";

// S1 · Every app does two jobs. Keep the stuff (storage) vs find the stuff (indexing). Step 0:
// storage is a strip of heavy videos scrolling one by one; indexing is a timeline of small cards
// sorted by date, with one card picked out. → swaps that picture for the thumbs down / thumbs up
// meme on the Google Maps example: scroll through a thousand places vs ask for the one you want.

import { Clock, MapPin, Play, Search, Star, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { ThumbsMeme } from "../memes";
import { EASE, PANEL, Rise, Slide, T } from "../ui";

const VIDEOS = [
  { title: "Street food tour", size: "1.8 GB", length: "12:40", tint: "linear-gradient(135deg,#fe7446 0%,#7a2d14 100%)" },
  { title: "Chai Corner, inside", size: "940 MB", length: "6:05", tint: "linear-gradient(135deg,#181ea9 0%,#08091f 100%)" },
  { title: "Marine Drive at night", size: "2.3 GB", length: "15:22", tint: "linear-gradient(135deg,#627eea 0%,#1c1f4a 100%)" },
];

/** Storage: one big video at a time slides past, the way files sit in a bucket. */
function VideoStrip() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % VIDEOS.length), 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative h-[250px] w-[860px] overflow-hidden rounded-[16px]">
      <motion.div className="flex gap-5" animate={{ x: -index * 440 }} transition={{ duration: 0.7, ease: EASE }}>
        {[...VIDEOS, ...VIDEOS].map((v, i) => (
          <div key={i} className="relative h-[250px] w-[420px] shrink-0 overflow-hidden rounded-[16px]" style={{ background: v.tint }}>
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
      </motion.div>
    </div>
  );
}

const DAYS = [
  { day: "Today", count: 9, pick: -1 },
  { day: "Yesterday", count: 9, pick: 6 },
  { day: "Oct 12", count: 9, pick: -1 },
];

/** Indexing: many small entries sorted by date; one of them is the card you were looking for. */
function DateIndex() {
  return (
    <div className="relative flex w-[860px] flex-col gap-4">
      {DAYS.map(({ day, count, pick }, row) => (
        <div key={day} className="flex items-center gap-4">
          <span className="w-[136px] shrink-0 text-[22px] font-semibold" style={{ color: T.t64 }}>
            {day}
          </span>
          <div className="flex gap-[8px]">
            {Array.from({ length: count }, (_, i) => (
              <motion.span
                key={i}
                className={`block h-[38px] w-[38px] rounded-[6px] ${i === pick ? "bg-[var(--arkiv-orange)]" : i % 5 === 2 ? "bg-[rgba(98,126,234,0.55)]" : "bg-[rgba(246,244,239,0.22)]"}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + row * 0.15 + i * 0.02, ease: EASE }}
              />
            ))}
          </div>
        </div>
      ))}
      {/* the picked entry, opened as its index card */}
      <motion.span
        className="absolute left-[460px] top-[72px] block h-[3px] w-[100px] origin-left bg-[var(--arkiv-orange)]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 1.1, ease: EASE }}
      />
      <motion.div
        className="absolute right-0 top-[14px] flex w-[300px] flex-col gap-1.5 rounded-[14px] bg-[var(--arkiv-sand)] px-5 py-4 text-[var(--arkiv-ink)] shadow-[0_18px_48px_rgba(0,0,0,0.55)]"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.3, ease: EASE }}
      >
        <span className="flex items-center gap-2 text-[22px] font-semibold">
          <MapPin size={22} fill="#FE7446" aria-hidden /> Chai Corner
        </span>
        <span className="font-mono text-[18px] text-[rgba(17,17,17,0.64)]">yesterday · Colaba</span>
        <span className="flex items-center gap-2 font-mono text-[18px] text-[rgba(17,17,17,0.64)]">
          <Video size={18} aria-hidden /> video #2 →
        </span>
      </motion.div>
    </div>
  );
}

function TwoJobs() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-[24px] font-semibold" style={{ color: T.t64 }}>
          Storage · heavy, one file at a time
        </p>
        <VideoStrip />
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-[24px] font-semibold" style={{ color: T.t64 }}>
          Indexing · tiny cards, sorted so you can find things
        </p>
        <DateIndex />
      </div>
    </div>
  );
}

/** Thumbs down: the endless list of places, scrolling past forever. */
const PLACES = ["Masala Box", "Page Turner", "Bombay Brew", "Koli Fish Fry", "Spice Route", "Chowpatty Juice", "Irani Bakery", "Dosa Point", "Kala Ghoda Café", "Bandstand Grill", "Vada Pav Co.", "Colaba Books"];

function EndlessList() {
  return (
    <div className="relative h-[176px] overflow-hidden rounded-[10px] border-[2px] border-[rgba(17,17,17,0.2)] bg-[rgba(255,255,255,0.5)]">
      <motion.div
        className="flex flex-col"
        animate={{ y: [0, -PLACES.length * 44] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        {[...PLACES, ...PLACES].map((p, i) => (
          <span key={i} className="flex h-[44px] items-center justify-between border-b border-[rgba(17,17,17,0.1)] px-4 text-[22px] text-[rgba(17,17,17,0.72)]">
            {p} <span className="font-mono text-[18px]">#{(i % PLACES.length) * 83 + 17}</span>
          </span>
        ))}
      </motion.div>
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
      <motion.div
        className="flex items-center gap-3 rounded-[12px] bg-[var(--arkiv-ink)] px-5 py-3 text-[var(--arkiv-sand)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.1, ease: EASE }}
      >
        <MapPin size={26} fill="#FE7446" aria-hidden />
        <span className="text-[24px] font-semibold">Chai Corner</span>
        <span className="ml-auto flex items-center gap-1 text-[20px]">
          4.6 <Star size={18} fill="#FE7446" className="text-[var(--arkiv-orange)]" aria-hidden />
        </span>
        <span className="flex items-center gap-1 text-[20px]" style={{ color: T.t84 }}>
          <Clock size={18} aria-hidden /> open
        </span>
      </motion.div>
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
      wash={0.8}
    >
      <div className="absolute left-[96px] top-[384px] flex w-[700px] flex-col gap-5">
        <Rise delay={0.2}>
          <div className={`${PANEL} flex flex-col gap-2.5 px-8 py-7`}>
            <span className="text-[40px] font-semibold">
              Keep the stuff <span className="text-[var(--arkiv-orange)]">(storage)</span>
            </span>
            <span className="text-[26px]" style={{ color: T.t64 }}>
              Photos, videos, files: heavy
            </span>
          </div>
        </Rise>
        <Rise delay={0.35}>
          <div className="flex flex-col gap-2.5 rounded-[16px] bg-[var(--arkiv-sand)] px-8 py-7 text-[var(--arkiv-ink)]">
            <span className="text-[40px] font-semibold">
              Find the stuff <span className="text-[var(--arkiv-blue)]">(indexing)</span>
            </span>
            <span className="text-[26px] text-[rgba(17,17,17,0.72)]">Who, what, where, when: light</span>
          </div>
        </Rise>
      </div>
      <AnimatePresence mode="wait">
        {step >= 1 ? (
          <motion.div
            key="meme"
            className="absolute left-[884px] top-[250px]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <ThumbsMeme
              no={{ text: "Scroll a thousand places to find one café", visual: <EndlessList /> }}
              yes={{ text: "Ask for it: one query, one answer", visual: <OneQuery /> }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="jobs"
            className="absolute left-[912px] top-[384px]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
          >
            <TwoJobs />
          </motion.div>
        )}
      </AnimatePresence>
    </Slide>
  );
}
