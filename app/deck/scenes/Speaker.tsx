"use client";

// ME · Who I am (Santiago, October 30): "santiagodevrel @ arkiv" (Arkiv as its official wordmark),
// "The first DevRel to do a Web3 Africa tour", who he worked for, and the slide's main picture: his
// photos from the countries he has been to (`TOUR`), each printed on a card with its round flag
// pinned to the corner. One → per photo: the next print lands on top of the pile, the ones under it
// dim, and its flag lights up on the route at the left. Nothing moves on a timer. The globe shows
// behind it, dimmed, as on the title.

import { motion, MotionConfig } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { BLEED, Chip, EASE, Rise, T, Wash } from "../ui";
import { flagSrc, photoSrc, TOUR, type TourStop } from "./me-tour";

const WORKED_FOR = ["L1s", "ChainSafe", "L2s like Lisk", "web3.js"];

/** Dark under the text, as on the title, and still dim on the right so the prints stand off the globe. */
const BACKDROP = `linear-gradient(90deg, rgba(8,9,31,0.96) ${BLEED}px, rgba(8,9,31,0.84) ${BLEED + 0.4 * 1920}px, rgba(8,9,31,0.58) ${BLEED + 0.62 * 1920}px)`;

/** A print: the photo (3:2) in a Sand border, with a strip under it for the country's name. */
const PHOTO = { width: 820, height: 547 };
const BORDER = 16;
const STRIP = 84;
const CARD = { width: PHOTO.width + 2 * BORDER, height: PHOTO.height + BORDER + STRIP };
/** The pile's box on the stage; each print sits at the center plus its own offset. */
const PILE = { left: 880, top: 96, width: 980, height: 900 };
const PIN = 108;
/** A print lands in about the time a reveal takes, a little longer for the toss. */
const TOSS_TIME = 0.45;

/** The route under the text: one round flag per stop, center to center. */
const FLAG = 64;
const STEP_X = 116;

const landed = (stop: TourStop) => ({ opacity: 1, x: stop.x, y: stop.y, rotate: stop.tilt, scale: 1 });
const tossed = (stop: TourStop) => ({ opacity: 0, x: stop.x + 160, y: stop.y - 140, rotate: stop.tilt + 12, scale: 1.08 });

export function Speaker({ step }: SceneContentProps) {
  const current = Math.max(0, Math.min(step, TOUR.length - 1));
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <Wash background={BACKDROP} />
        <div
          className="absolute rounded-full"
          style={{
            left: PILE.left + PILE.width / 2 - 620,
            top: PILE.top + PILE.height / 2 - 620,
            width: 1240,
            height: 1240,
            background: "radial-gradient(circle, rgba(43,50,201,0.38) 0%, rgba(24,30,169,0.18) 40%, rgba(8,9,31,0) 68%)",
          }}
        />
        <Rise className="absolute left-[96px] top-[196px] w-[720px]">
          <h1 className="text-[88px] font-semibold leading-[1.06] tracking-[-0.02em]">
            santiagodevrel
            <br />
            <span style={{ color: T.t50 }}>@</span>{" "}
            {/* eslint-disable-next-line @next/next/no-img-element -- the official wordmark, set in the line of text */}
            <img
              src="/brand/arkiv-orange.svg"
              alt="Arkiv"
              width={356}
              height={82}
              draggable={false}
              className="inline-block"
              style={{ width: 356, height: 82, verticalAlign: -14 }}
            />
          </h1>
          <p className="mt-7 text-[44px] font-semibold leading-[1.15]" style={{ color: T.t84 }}>
            The first DevRel to do
            <br />a Web3 Africa tour
          </p>
          <p className="mt-12 text-[22px] font-semibold uppercase tracking-[0.08em]" style={{ color: T.t50 }}>
            Worked for
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {WORKED_FOR.map((name) => (
              <Chip key={name} tone="sand">
                {name}
              </Chip>
            ))}
          </div>
          <Route current={current} />
        </Rise>
        <Rise className="absolute" style={PILE}>
          {TOUR.map((stop, i) => (
            <Print key={stop.code} stop={stop} shown={i <= current} under={i < current} />
          ))}
        </Rise>
      </div>
    </MotionConfig>
  );
}

/** One photo on the pile. Later prints sit on top of earlier ones. */
function Print({ stop, shown, under }: { stop: TourStop; shown: boolean; under: boolean }) {
  return (
    <motion.figure
      className="absolute m-0 rounded-[10px] bg-[var(--arkiv-sand)] shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
      style={{
        left: (PILE.width - CARD.width) / 2,
        top: (PILE.height - CARD.height) / 2,
        width: CARD.width,
        height: CARD.height,
        padding: `${BORDER}px ${BORDER}px 0`,
      }}
      initial={false}
      animate={shown ? landed(stop) : tossed(stop)}
      transition={{ duration: TOSS_TIME, ease: EASE }}
      aria-hidden={!shown}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed photo, preloaded with the deck */}
      <img
        src={photoSrc(stop)}
        alt={stop.alt}
        width={PHOTO.width}
        height={PHOTO.height}
        draggable={false}
        className="block rounded-[4px]"
        style={{ width: PHOTO.width, height: PHOTO.height }}
      />
      <figcaption className="flex items-center pl-2 text-[40px] font-semibold text-[var(--arkiv-ink)]" style={{ height: STRIP }}>
        {stop.name}
      </figcaption>
      {/* The prints under the top one step back. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[10px] bg-[rgb(8,9,31)]"
        initial={false}
        animate={{ opacity: under ? 0.45 : 0 }}
        transition={{ duration: TOSS_TIME, ease: EASE }}
      />
      {/* The flag, pinned to the corner like a sticker. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed flag art */}
      <img
        src={flagSrc(stop)}
        alt=""
        width={PIN}
        height={PIN}
        draggable={false}
        className="absolute rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.45)] ring-[6px] ring-[var(--arkiv-sand)]"
        style={{ left: -30, top: -30, width: PIN, height: PIN }}
      />
    </motion.figure>
  );
}

/** The route: every stop's flag in order, dashed between them and orange up to the photo on top. */
function Route({ current }: { current: number }) {
  const span = (TOUR.length - 1) * STEP_X;
  return (
    <div className="relative mt-16" style={{ width: span + FLAG, height: FLAG + 44 }}>
      <div className="absolute border-t-2 border-dashed" style={{ left: FLAG / 2, top: FLAG / 2 - 1, width: span, borderColor: T.t28 }} />
      <motion.div
        aria-hidden="true"
        className="absolute h-[3px] origin-left rounded-full bg-[var(--arkiv-orange)]"
        style={{ left: FLAG / 2, top: FLAG / 2 - 1.5, width: span }}
        initial={false}
        animate={{ scaleX: TOUR.length > 1 ? current / (TOUR.length - 1) : 1 }}
        transition={{ duration: TOSS_TIME, ease: EASE }}
      />
      {TOUR.map((stop, i) => (
        <div key={stop.code} className="absolute flex flex-col items-center" style={{ left: i * STEP_X + FLAG / 2 - STEP_X / 2, top: 0, width: STEP_X }}>
          <motion.div
            className="rounded-full bg-[rgb(8,9,31)]"
            style={{ width: FLAG, height: FLAG }}
            initial={false}
            animate={{
              scale: i === current ? 1.16 : 1,
              boxShadow: i === current ? "0 0 0 4px rgba(254,116,70,1)" : "0 0 0 4px rgba(254,116,70,0)",
            }}
            transition={{ duration: TOSS_TIME, ease: EASE }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed flag art */}
            <img
              src={flagSrc(stop)}
              alt=""
              width={FLAG}
              height={FLAG}
              draggable={false}
              className="block rounded-full transition-opacity duration-300"
              style={{ width: FLAG, height: FLAG, opacity: i <= current ? 1 : 0.3 }}
            />
          </motion.div>
          <span className="mt-3 whitespace-nowrap text-[18px] font-semibold" style={{ color: i <= current ? T.t84 : T.t42 }}>
            {stop.name}
          </span>
        </div>
      ))}
    </div>
  );
}
