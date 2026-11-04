"use client";

// PA · Picturing Arkiv (Santiago, November 4), right after the room has written and queried its own
// entities: one wallet at the top and its entities hanging below it, one box each, as two projects
// that an attribute keeps apart (a Google Maps-style app and a videos app). → runs one query that
// picks out one project's reviews, like a table in its own database. → hands each map entity to its
// own owner (the cafe owns its listing, the reviewer owns the review) while the videos stay in the
// first wallet: the app still finds every map entity with one query, whoever owns it. → the room's
// own entity: today this site's key signed it; with their own wallet and test GLM they sign, and it is
// theirs, or we transfer it to them (L3's entity card does that live).
// The diagram zooms and pans: the wheel or a pinch zooms where the pointer is, a drag pans, and the
// buttons beside the line zoom in, out and back to the whole picture.
// Query text follows the query language L1's popup shows (QueryCode.tsx): `name = str('value')`,
// clauses joined by AND, values in lower case. $owner is the entity's current owner, the one wallet
// that may update, transfer or delete it; the creator stays recorded.

import { motion } from "motion/react";
import { ArrowRight, KeyRound, Minus, Plus, Scan, Wallet } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, FOCUS, PANEL, Reveal, REVEAL_TIME, Slide, T } from "../ui";

/** The diagram's own size, in stage pixels, and where it sits on the slide. */
const VIEW = { left: 96, top: 316, width: 1728, height: 590 } as const;
const ORANGE = "#FE7446";

type Box = { id: string; x: number; y: number; w: number; kind: string; title: string; line: string; owner?: { name: string; address: string; hue: string } };

const ROW = [248, 426] as const;
const BOX_H = 120;
const MAPS = { x: 0, w: 1090, title: "Google Maps project", tag: "maps" } as const;
const VIDEOS = { x: 1150, w: 578, title: "Videos project", tag: "videos" } as const;
const FRAME = { top: 150, bottom: 580 } as const;

const mapCol = (i: number) => MAPS.x + 15 + i * 360;
const videoCol = (i: number) => VIDEOS.x + 15 + i * 282;

/** The map entities: places owned by their business, reviews by whoever wrote them. */
const MAP_BOXES: Box[] = [
  { id: "p1", x: mapCol(0), y: ROW[0], w: 340, kind: "place", title: "Café Mondegar", line: "area: colaba", owner: { name: "Mondegar", address: "0x51…c2", hue: "#3FB37F" } },
  { id: "p2", x: mapCol(1), y: ROW[0], w: 340, kind: "place", title: "Leopold Cafe", line: "area: colaba", owner: { name: "Leopold", address: "0x8d…4a", hue: "#4C8DF6" } },
  { id: "p3", x: mapCol(2), y: ROW[0], w: 340, kind: "place", title: "Bademiya", line: "area: colaba", owner: { name: "Bademiya", address: "0xe0…17", hue: "#B07CF7" } },
  { id: "r1", x: mapCol(0), y: ROW[1], w: 340, kind: "review", title: "★★★★★ Best chai", line: "place: mondegar", owner: { name: "Aarav", address: "0x3c…9e", hue: "#F2C14E" } },
  { id: "r2", x: mapCol(1), y: ROW[1], w: 340, kind: "review", title: "★★★★ Worth the wait", line: "place: leopold", owner: { name: "Meera", address: "0x7f…02", hue: "#F47FB0" } },
  { id: "r3", x: mapCol(2), y: ROW[1], w: 340, kind: "review", title: "★★★★★ Late kebabs", line: "place: bademiya", owner: { name: "Kabir", address: "0xa4…b8", hue: "#5CD3E0" } },
];

const VIDEO_BOXES: Box[] = [
  { id: "v1", x: videoCol(0), y: ROW[0], w: 266, kind: "video", title: "Devcon talk", line: "length: 18 min" },
  { id: "v2", x: videoCol(1), y: ROW[0], w: 266, kind: "video", title: "Africa tour", line: "length: 9 min" },
  { id: "v3", x: videoCol(0), y: ROW[1], w: 266, kind: "video", title: "Arkiv in 60 s", line: "length: 1 min" },
  { id: "v4", x: videoCol(1), y: ROW[1], w: 266, kind: "video", title: "Mumbai workshop", line: "length: 20 min" },
];

/** The wallet at the top: Santiago's, over the gap between the two projects (the query bar takes the left). */
const ME = { x: 970, y: 8, w: 300, h: 80 } as const;

const UNDER = [
  "One wallet, two projects. Every box is an entity.",
  "One attribute keeps them apart: query each project like its own database.",
  "Each entity in its owner's wallet. One query still finds them all.",
  "Each entity in its owner's wallet. One query still finds them all.",
];

/** What the query bar shows from step 1, and which boxes it picks. */
function queryFor(step: number): { text: ReactNode; picks: (box: Box) => boolean } | null {
  if (step < 1) return null;
  if (step === 1) {
    return {
      text: (
        <>
          project = str(&apos;maps&apos;) <span className="text-[var(--arkiv-orange)]">AND</span> kind = str(&apos;review&apos;)
        </>
      ),
      picks: (box) => box.kind === "review",
    };
  }
  return { text: <>project = str(&apos;maps&apos;)</>, picks: (box) => box.kind !== "video" };
}

export function PA({ step }: SceneContentProps) {
  const owned = step >= 2;
  const query = queryFor(step);
  return (
    <Slide headline="Picturing Arkiv" under={UNDER[Math.min(step, UNDER.length - 1)]} wash={0.82}>
      <ZoomPan>
        <Diagram step={step} owned={owned} query={query} />
      </ZoomPan>
      <Reveal step={step} at={3} className="absolute left-[96px] top-[918px] flex w-[1728px] items-center gap-4" y={10}>
        <YourEntity />
      </Reveal>
    </Slide>
  );
}

function Diagram({ step, owned, query }: { step: number; owned: boolean; query: ReturnType<typeof queryFor> }) {
  const dim = (box: Box) => (step === 1 && query && !query.picks(box) ? 0.3 : 1);
  return (
    <div className="relative" style={{ width: VIEW.width, height: VIEW.height }}>
      <svg width={VIEW.width} height={VIEW.height} className="pointer-events-none absolute left-0 top-0" aria-hidden>
        {/* Santiago's wallet to each project: the map edge fades once its entities have their own owners. */}
        <motion.path
          d={`M ${ME.x + ME.w / 2} ${ME.y + ME.h} C ${ME.x + ME.w / 2} ${FRAME.top - 10}, ${MAPS.x + MAPS.w / 2} ${ME.y + ME.h + 20}, ${MAPS.x + MAPS.w / 2} ${FRAME.top}`}
          fill="none"
          stroke={ORANGE}
          strokeWidth={3}
          initial={false}
          animate={{ opacity: owned ? 0.22 : 1, strokeDasharray: owned ? "8 10" : "0 0" }}
          transition={{ duration: REVEAL_TIME, ease: EASE }}
        />
        <path
          d={`M ${ME.x + ME.w / 2} ${ME.y + ME.h} C ${ME.x + ME.w / 2} ${FRAME.top - 10}, ${VIDEOS.x + VIDEOS.w / 2} ${ME.y + ME.h + 20}, ${VIDEOS.x + VIDEOS.w / 2} ${FRAME.top}`}
          fill="none"
          stroke={ORANGE}
          strokeWidth={3}
        />
      </svg>

      <WalletNode />

      {query ? (
        <motion.div
          key={step === 1 ? "review" : "maps"}
          className="absolute left-[16px] top-[22px] flex h-[52px] items-center gap-3 rounded-[12px] border-[1.5px] border-[rgba(246,244,239,0.2)] bg-[rgba(8,9,31,0.8)] px-4"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: REVEAL_TIME, ease: EASE }}
        >
          <span className="text-[16px] font-bold tracking-[0.1em]" style={{ color: T.t64 }}>
            QUERY
          </span>
          <span className="whitespace-nowrap font-mono text-[22px] font-medium">{query.text}</span>
        </motion.div>
      ) : null}

      <ProjectFrame project={MAPS} faded={false} />
      <ProjectFrame project={VIDEOS} faded={step === 1} />

      {[...MAP_BOXES, ...VIDEO_BOXES].map((box) => (
        <EntityBox key={box.id} box={box} opacity={dim(box)} picked={step === 1 && !!query?.picks(box)} owned={owned && !!box.owner} />
      ))}
    </div>
  );
}

function WalletNode() {
  return (
    <div className="absolute flex items-center gap-4 rounded-[18px] border-2 bg-[rgba(17,17,17,0.9)] px-5" style={{ left: ME.x, top: ME.y, width: ME.w, height: ME.h, borderColor: ORANGE, boxShadow: "0 10px 28px rgba(254,116,70,0.25)" }}>
      <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full" style={{ background: ORANGE }}>
        <Wallet size={28} strokeWidth={2.2} color="#111111" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[26px] font-semibold leading-[1.15]">Santiago&apos;s wallet</span>
        <span className="font-mono text-[20px] leading-[1.2]" style={{ color: T.t64 }}>
          0x5a…d3v
        </span>
      </span>
    </div>
  );
}

function ProjectFrame({ project, faded }: { project: typeof MAPS | typeof VIDEOS; faded: boolean }) {
  return (
    <motion.div
      className="absolute rounded-[18px] border-[1.5px] border-dashed"
      style={{ left: project.x, top: FRAME.top, width: project.w, height: FRAME.bottom - FRAME.top, borderColor: T.t28 }}
      initial={false}
      animate={{ opacity: faded ? 0.35 : 1 }}
      transition={{ duration: REVEAL_TIME, ease: EASE }}
    >
      <div className="flex items-center gap-4 px-5 pt-3">
        <span className="text-[28px] font-semibold">{project.title}</span>
        <span className="rounded-[8px] border-2 px-2.5 py-[1px] font-mono text-[20px] font-semibold" style={{ borderColor: ORANGE, color: ORANGE }}>
          project: {project.tag}
        </span>
      </div>
    </motion.div>
  );
}

function EntityBox({ box, opacity, picked, owned }: { box: Box; opacity: number; picked: boolean; owned: boolean }) {
  return (
    <>
      {box.owner ? (
        <motion.div
          className="absolute flex h-[32px] items-center gap-2 whitespace-nowrap"
          style={{ left: box.x + 4, top: box.y - 40 }}
          initial={false}
          animate={{ opacity: owned ? 1 : 0, y: owned ? 0 : -8 }}
          transition={{ duration: REVEAL_TIME, ease: EASE }}
          aria-hidden={!owned}
        >
          <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full" style={{ background: box.owner.hue }}>
            <Wallet size={16} strokeWidth={2.4} color="#111111" aria-hidden />
          </span>
          <span className="text-[20px] font-semibold">{box.owner.name}</span>
          <span className="font-mono text-[18px]" style={{ color: T.t64 }}>
            {box.owner.address}
          </span>
        </motion.div>
      ) : null}
      <motion.div
        className={`${PANEL} absolute flex flex-col justify-center gap-1 px-4`}
        style={{ left: box.x, top: box.y, width: box.w, height: BOX_H }}
        initial={false}
        animate={{
          opacity,
          borderColor: picked ? ORANGE : owned ? box.owner!.hue : "rgba(246,244,239,0.12)",
          boxShadow: picked ? "0 0 0 3px rgba(254,116,70,0.35), 0 12px 40px rgba(0,0,0,0.45)" : "0 12px 40px rgba(0,0,0,0.45)",
        }}
        transition={{ duration: REVEAL_TIME, ease: EASE }}
      >
        <span className="self-start rounded-[6px] px-2 font-mono text-[18px] font-semibold" style={{ background: "rgba(24,30,169,0.55)", color: "#F6F4EF" }}>
          kind: {box.kind}
        </span>
        <span className="truncate text-[27px] font-semibold leading-[1.2]">{box.title}</span>
        <span className="font-mono text-[18px]" style={{ color: T.t64 }}>
          {box.line}
        </span>
      </motion.div>
    </>
  );
}

/** Step 3: the room's own entity, three ways to own it. */
function YourEntity() {
  const cards: { icon: ReactNode; title: string; line: string; accent?: boolean }[] = [
    { icon: <Scan size={30} strokeWidth={2.2} aria-hidden />, title: "Today", line: "This site's key signed your entity" },
    { icon: <Wallet size={30} strokeWidth={2.2} aria-hidden />, title: "Your wallet + test GLM", line: "You sign it: the entity is yours", accent: true },
    { icon: <KeyRound size={30} strokeWidth={2.2} aria-hidden />, title: "Or we hand it over", line: "transferOwnership: $owner is you" },
  ];
  return (
    <>
      {cards.map((card, i) => (
        <div key={card.title} className="contents">
          {i > 0 ? <ArrowRight size={34} strokeWidth={2.4} className="shrink-0" style={{ color: T.t64 }} aria-hidden /> : null}
          <div className={`${PANEL} flex h-[86px] min-w-0 flex-1 items-center gap-4 px-5`} style={card.accent ? { borderColor: ORANGE } : undefined}>
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full" style={{ background: card.accent ? ORANGE : "rgba(246,244,239,0.12)", color: card.accent ? "#111111" : "#F6F4EF" }}>
              {card.icon}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[26px] font-semibold leading-[1.2]">{card.title}</span>
              <span className="truncate text-[22px] leading-[1.3]" style={{ color: T.t84 }}>
                {card.line}
              </span>
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

// Zoom and pan.

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;
type View = { k: number; x: number; y: number };
const FIT: View = { k: 1, x: 0, y: 0 };
const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

/** Zooms `view` by `factor` around (px, py), in the diagram's own pixels. */
function zoomAt(view: View, factor: number, px: number, py: number): View {
  const k = clampZoom(view.k * factor);
  const ratio = k / view.k;
  return { k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio };
}

/** Screen pixels per diagram pixel: the stage is scaled to the window. */
function screenScale(element: HTMLElement | null): number {
  const rect = element?.getBoundingClientRect();
  return rect && rect.width ? rect.width / VIEW.width : 1;
}

/** A point on screen, in the viewport's own (unzoomed) pixels. */
function toLocal(element: HTMLElement | null, clientX: number, clientY: number) {
  if (!element) return { x: VIEW.width / 2, y: VIEW.height / 2 };
  const rect = element.getBoundingClientRect();
  const s = screenScale(element);
  return { x: (clientX - rect.left) / s, y: (clientY - rect.top) / s };
}

function ZoomPan({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(FIT);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef(new Map<number, { x: number; y: number }>());
  const local = (clientX: number, clientY: number) => toLocal(box.current, clientX, clientY);
  const scale = () => screenScale(box.current);

  // The wheel zooms where the pointer is. A native listener, so the page itself doesn't scroll or zoom.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = toLocal(element, event.clientX, event.clientY);
      setView((now) => zoomAt(now, Math.exp(-event.deltaY * 0.0015), point.x, point.y));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const points = pinch.current;
    if (!points.has(event.pointerId)) return;
    const before = [...points.values()];
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size === 2) {
      // Two fingers: zoom by how far apart they moved, around their middle.
      const after = [...points.values()];
      const gap = (p: { x: number; y: number }[]) => Math.hypot(p[0]!.x - p[1]!.x, p[0]!.y - p[1]!.y) || 1;
      const middle = local((after[0]!.x + after[1]!.x) / 2, (after[0]!.y + after[1]!.y) / 2);
      setView((now) => zoomAt(now, gap(after) / gap(before), middle.x, middle.y));
      return;
    }
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const s = scale();
    const dx = (event.clientX - start.x) / s;
    const dy = (event.clientY - start.y) / s;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setView((now) => ({ ...now, x: now.x + dx, y: now.y + dy }));
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pinch.current.delete(event.pointerId);
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  const button = (factor: number) => setView((now) => zoomAt(now, factor, VIEW.width / 2, VIEW.height / 2));
  const zoomed = view.k !== 1 || view.x !== 0 || view.y !== 0;

  return (
    <>
      <div
        ref={box}
        data-zoom-pan=""
        className="absolute cursor-grab touch-none select-none overflow-hidden rounded-[16px] active:cursor-grabbing"
        style={{ left: VIEW.left, top: VIEW.top, width: VIEW.width, height: VIEW.height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDoubleClick={(event) => {
          const point = local(event.clientX, event.clientY);
          setView((now) => zoomAt(now, 1.6, point.x, point.y));
        }}
        // /slides steps with a swipe; a drag on the diagram pans it instead.
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0", width: VIEW.width, height: VIEW.height }}>{children}</div>
      </div>
      <div className="absolute flex items-center gap-2" style={{ right: 96, top: 250 }}>
        <ZoomButton label="Zoom out" onClick={() => button(1 / 1.4)}>
          <Minus size={24} strokeWidth={2.4} aria-hidden />
        </ZoomButton>
        <ZoomButton label="Zoom in" onClick={() => button(1.4)}>
          <Plus size={24} strokeWidth={2.4} aria-hidden />
        </ZoomButton>
        <button
          type="button"
          onClick={() => setView(FIT)}
          disabled={!zoomed}
          onMouseDown={(event) => event.preventDefault()}
          className={`h-[44px] rounded-[12px] border-[1.5px] px-4 text-[18px] font-semibold transition-colors disabled:opacity-40 ${FOCUS}`}
          style={{ borderColor: T.t28, color: T.t84 }}
        >
          Whole picture
        </button>
      </div>
    </>
  );
}

function ZoomButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      // Keeps the keyboard on the talk: Space and the arrows still move it after a click.
      onMouseDown={(event) => event.preventDefault()}
      className={`flex h-[44px] w-[44px] items-center justify-center rounded-[12px] border-[1.5px] transition-colors hover:border-[var(--arkiv-orange)] hover:text-[var(--arkiv-orange)] ${FOCUS}`}
      style={{ borderColor: T.t28, color: T.t84 }}
    >
      {children}
    </button>
  );
}

export const PA_NOTES: string[] = [
  "Let's picture what you just did. One wallet at the top: mine. Every box under it is an entity. Here I run two projects from the same wallet: a Google Maps-style app, with places and reviews, and a videos app. Zoom in on any box: an entity is a few attributes, like kind: place or kind: review.",
  "How do two projects live in one wallet? One attribute keeps them apart: project is maps or videos. So I query each project like its own database: project is maps AND kind is review gives me only the reviews.",
  "Now the part web2 can't do. In a real maps app, the cafe owns its listing and you own your review: each entity sits in its owner's wallet, not mine. Only that wallet can update, transfer or delete it. And the app still finds every one of them with a single query, project is maps, whoever owns them. My videos stay mine.",
  "And your entity? Today this site's key signed it for you, so it sits in our wallet. With your own wallet and test GLM from the faucet, you sign it yourself and it's yours from the start. Or we hand it over: transferOwnership, and $owner is you. That's the Transfer ownership button you saw on the map.",
];
