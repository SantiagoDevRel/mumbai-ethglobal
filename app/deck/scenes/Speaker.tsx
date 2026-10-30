"use client";

// ME · Who I am (Santiago, October 30): "SantiagoDevRel @ Arkiv" (Arkiv as its official wordmark), "The
// first DevRel to do a Web3 Africa tour", one row of logos of where he worked before Arkiv (no title), his
// X, LinkedIn and Telegram icons beside "@santiagodevrel" (each opens the profile in a new tab), and the
// slide's main picture: his photos from the countries he has been to (`TOUR`), each printed on a card with
// its round flag pinned to the corner. One → per photo: the next print lands on top of the pile, the ones
// under it dim and drop their name and flag, and its flag lights up on the route at the left. The → after
// the last photo lights the route's last stop, an orange "10+ countries", and stamps the same on the pile.
// Nothing moves on a timer. The globe shows behind it, dimmed, as on the title.
// Logos: official files, colors unchanged, straight on the dark stage: each brand's own white or full-color
// version (ChainSafe's wordmark comes only with dark letters, so its symbol stands alone).
//   cosmos-wordmark-white.svg · the white wordmark in the Cosmos documentation repository's brand assets,
//     unchanged ("Cosmos" is a trademark of the Interchain Foundation, https://cosmos.network/trademark):
//     https://raw.githubusercontent.com/cosmos/docs/main/assets/brand/cosmos-wordmark.svg
//   chainsafe-logo.svg · ChainSafe's brand kit (the "Brand Kit" link in chainsafe.io's footer),
//     ChainSafe_Logo.svg, viewBox cropped to the symbol:
//     https://cdn.prod.website-files.com/681b30cba1950e210362e39a/69443c6cfd26a30cecb42ed0_ChainSafe_Brand_Assets.zip
//   web3js-logo.svg · the web3.js repository's logo (assets/logo; the repository is LGPL-3.0), viewBox
//     cropped to the mark: https://raw.githubusercontent.com/web3/web3.js/4.x/assets/logo/web3js.svg
//   lisk-lockup-light.svg · the light lockup in lisk.com's own header, unchanged:
//     https://lisk.com/assets/lockup-light.svg
//   linkedin-in-white.png · LinkedIn's brand kit, "in" logo, InBug-White.png, unchanged (LinkedIn allows
//     only its own logo files, as a link to a profile: https://brand.linkedin.com/in-logo):
//     https://content.linkedin.com/content/dam/me/business/en-us/amp/xbu/linkedin-revised-brand-guidelines/logos/in-logo.zip
//   X and Telegram · simple-icons 16.36.0 paths (CC0-1.0), drawn white, in me-tour.ts:
//     https://github.com/simple-icons/simple-icons/blob/16.36.0/icons/x.svg (and icons/telegram.svg)

import { motion, MotionConfig } from "motion/react";
import type { CSSProperties } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { BLEED, EASE, FootLogo, Rise, T, Wash } from "../ui";
import {
  BEFORE_ARKIV,
  flagSrc,
  HANDLE,
  ME_STEPS,
  MORE,
  photoSrc,
  profileLabel,
  PROFILES,
  TOUR,
  type Profile,
  type TourStop,
} from "./me-tour";

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
/** The "10+ countries" stamp: its size and its center (pile px), on the top print's lower right corner. */
const STAMP = { size: 200, x: 896, y: 736, tilt: -10 };

/** The route under the text: one round flag per stop, center to center, then the "10+" stop. Seven stops
 * end left of the pile. */
const FLAG = 64;
const STEP_X = 108;

/** The profile links' hover and keyboard focus, as on the other slides' links. */
const LINK =
  "flex h-[56px] w-[56px] items-center justify-center rounded-[12px] transition-colors duration-150 hover:bg-[rgba(246,244,239,0.08)] focus-visible:bg-[rgba(246,244,239,0.08)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--arkiv-orange)]";

const landed = (stop: TourStop) => ({ opacity: 1, x: stop.x, y: stop.y, rotate: stop.tilt, scale: 1 });
const tossed = (stop: TourStop) => ({ opacity: 0, x: stop.x + 160, y: stop.y - 140, rotate: stop.tilt + 12, scale: 1.08 });

export function Speaker({ step }: SceneContentProps) {
  /** Where the route is: one stop per photo, then the "10+" stop. */
  const current = Math.max(0, Math.min(step, ME_STEPS - 1));
  /** The print on top: the last photo stays there on the "10+" step. */
  const top = Math.min(current, TOUR.length - 1);
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full text-[var(--arkiv-sand)]">
        <Wash background={BACKDROP} />
        <FootLogo />
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
            SantiagoDevRel
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
          <ul aria-label="Before Arkiv" className="mt-12 flex items-center gap-10">
            {BEFORE_ARKIV.map((logo) => (
              <li key={logo.name} className="flex-none">
                {/* eslint-disable-next-line @next/next/no-img-element -- official logo file, fixed size */}
                <img
                  src={logo.src}
                  alt={logo.name}
                  width={Math.round(logo.height * logo.ratio)}
                  height={logo.height}
                  draggable={false}
                  className="block"
                  style={{ width: logo.height * logo.ratio, height: logo.height }}
                />
              </li>
            ))}
          </ul>
          <div className="mt-7 flex items-center gap-2">
            {PROFILES.map((profile) => (
              <ProfileLink key={profile.name} profile={profile} />
            ))}
            <span className="ml-3 text-[30px] font-semibold" style={{ color: T.t84 }}>
              {HANDLE}
            </span>
          </div>
          <Route current={current} />
        </Rise>
        <Rise className="absolute" style={PILE}>
          {TOUR.map((stop, i) => (
            <Print key={stop.code} stop={stop} shown={i <= top} under={i < top} />
          ))}
          <Stamp shown={current === ME_STEPS - 1} />
        </Rise>
      </div>
    </MotionConfig>
  );
}

/** One profile: a white icon that opens it in a new tab. */
function ProfileLink({ profile }: { profile: Profile }) {
  const { icon, size } = profile;
  return (
    <a href={profile.href} target="_blank" rel="noreferrer" aria-label={profileLabel(profile)} draggable={false} className={LINK}>
      {"path" in icon ? (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="#fff" aria-hidden="true" focusable="false">
          <path d={icon.path} />
        </svg>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- LinkedIn's own logo file, fixed size
        <img
          src={icon.src}
          alt=""
          width={Math.round(size * icon.ratio)}
          height={size}
          draggable={false}
          className="block"
          style={{ width: size * icon.ratio, height: size }}
        />
      )}
    </a>
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
      {/* Only the print on top keeps its name and flag; the route at the left lists them all. */}
      <motion.figcaption
        className="flex items-center pl-2 text-[40px] font-semibold text-[var(--arkiv-ink)]"
        style={{ height: STRIP }}
        initial={false}
        animate={{ opacity: under ? 0 : 1 }}
        transition={{ duration: TOSS_TIME, ease: EASE }}
      >
        {stop.name}
      </motion.figcaption>
      {/* The prints under the top one step back. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[10px] bg-[rgb(8,9,31)]"
        initial={false}
        animate={{ opacity: under ? 0.45 : 0 }}
        transition={{ duration: TOSS_TIME, ease: EASE }}
      />
      {/* The flag, pinned to the corner like a sticker. */}
      <motion.img
        src={flagSrc(stop)}
        alt=""
        width={PIN}
        height={PIN}
        draggable={false}
        className="absolute rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.45)] ring-[6px] ring-[var(--arkiv-sand)]"
        style={{ left: -30, top: -30, width: PIN, height: PIN }}
        initial={false}
        animate={{ opacity: under ? 0 : 1, scale: under ? 0.6 : 1 }}
        transition={{ duration: TOSS_TIME, ease: EASE }}
      />
    </motion.figure>
  );
}

/** "10+ countries", stamped on the pile by the last →; the top print keeps its name and flag. The route
 * says the same, so screen readers skip it. */
function Stamp({ shown }: { shown: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute flex flex-col items-center justify-center rounded-full bg-[var(--arkiv-orange)] text-[var(--arkiv-ink)] shadow-[0_18px_44px_rgba(0,0,0,0.5)] ring-8 ring-[var(--arkiv-sand)]"
      style={{ left: STAMP.x - STAMP.size / 2, top: STAMP.y - STAMP.size / 2, width: STAMP.size, height: STAMP.size }}
      initial={false}
      animate={shown ? { opacity: 1, scale: 1, rotate: STAMP.tilt } : { opacity: 0, scale: 1.5, rotate: STAMP.tilt - 14 }}
      transition={{ duration: TOSS_TIME, ease: EASE }}
    >
      <span className="text-[92px] font-bold leading-[0.9] tracking-[-0.03em]">{MORE.badge}</span>
      <span className="mt-1.5 text-[28px] font-semibold leading-none">{MORE.label}</span>
    </motion.div>
  );
}

/** The route: every stop's flag in order, dashed between them and orange up to the current stop, then the
 * "10+" stop. */
function Route({ current }: { current: number }) {
  const span = (ME_STEPS - 1) * STEP_X;
  const at = (i: number): CSSProperties => ({ left: i * STEP_X + FLAG / 2 - STEP_X / 2, top: 0, width: STEP_X });
  return (
    <div className="relative mt-14" style={{ width: span + FLAG, height: FLAG + 44 }}>
      <div className="absolute border-t-2 border-dashed" style={{ left: FLAG / 2, top: FLAG / 2 - 1, width: span, borderColor: T.t28 }} />
      <motion.div
        aria-hidden="true"
        className="absolute h-[3px] origin-left rounded-full bg-[var(--arkiv-orange)]"
        style={{ left: FLAG / 2, top: FLAG / 2 - 1.5, width: span }}
        initial={false}
        animate={{ scaleX: current / (ME_STEPS - 1) }}
        transition={{ duration: TOSS_TIME, ease: EASE }}
      />
      {TOUR.map((stop, i) => (
        <div key={stop.code} className="absolute flex flex-col items-center" style={at(i)}>
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
      <MoreStop lit={current === ME_STEPS - 1} style={at(TOUR.length)} />
    </div>
  );
}

/** The route's last stop: an orange "10+" as big as a flag, "countries" under it. On its step a dark gap
 * sets the orange ring off the orange disc. */
function MoreStop({ lit, style }: { lit: boolean; style: CSSProperties }) {
  return (
    <div className="absolute flex flex-col items-center" style={style} data-route-stop="more" data-lit={lit}>
      <motion.div
        className="rounded-full bg-[rgb(8,9,31)]"
        style={{ width: FLAG, height: FLAG }}
        initial={false}
        animate={{
          scale: lit ? 1.16 : 1,
          boxShadow: lit ? "0 0 0 4px rgba(8,9,31,1), 0 0 0 8px rgba(254,116,70,1)" : "0 0 0 4px rgba(8,9,31,0), 0 0 0 8px rgba(254,116,70,0)",
        }}
        transition={{ duration: TOSS_TIME, ease: EASE }}
      >
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-[var(--arkiv-orange)] text-[23px] font-bold tracking-[-0.02em] text-[var(--arkiv-ink)] transition-opacity duration-300"
          style={{ opacity: lit ? 1 : 0.3 }}
        >
          {MORE.badge}
        </span>
      </motion.div>
      <span className="mt-3 whitespace-nowrap text-[18px] font-semibold" style={{ color: lit ? T.t84 : T.t42 }}>
        {MORE.label}
      </span>
    </div>
  );
}
