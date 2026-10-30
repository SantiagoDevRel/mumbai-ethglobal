"use client";

// B5 · Explore it: the DB-Chain's explorer. Its address on the slide is a link that opens it in a new
// tab (Santiago, October 30). Its /entity/<key> page (checked October 28) shows the entity's status,
// when it expires and its operation history (create, extend, transfer). When an entity card is open
// on the map (for example the entity the presenter just transferred or extended from it), the slide
// links straight to that entity, so the presenter opens one of the room's entities live. One step.

import { ArrowUpRight, ExternalLink } from "lucide-react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { explorerUrl, getProfile } from "../../../shared/arkiv/profiles";
import { shortKey } from "../../../shared/encoding";
import { Mascot } from "../Mascot";
import { PANEL, Rise, Slide, T } from "../ui";

const FOCUS = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[var(--arkiv-orange)]";

function explorer(target: "entity" | null, id?: string): string | null {
  try {
    const profile = getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE);
    return target && id ? explorerUrl(profile, target, id) : profile.explorer;
  } catch {
    return null;
  }
}

export function B5(_props: SceneContentProps) {
  const inspected = useStage((s) => s.inspected);
  const home = explorer(null);
  const entity = inspected ? explorer("entity", inspected) : null;
  return (
    <Slide headline="Explore it" under="Every entity, transaction and wallet on the DB-Chain, in your browser.">
      <Rise className="absolute left-[96px] top-[360px] flex w-[1180px] flex-col gap-7">
        <div className={`${PANEL} px-10 py-9`}>
          <p className="text-[24px] font-bold tracking-[0.1em]" style={{ color: T.t64 }}>THE EXPLORER</p>
          {home ? (
            <a
              href={home}
              target="_blank"
              rel="noreferrer"
              className={`mt-3 flex w-fit items-center gap-4 rounded-[8px] font-mono text-[44px] text-[var(--arkiv-orange)] decoration-2 underline-offset-8 hover:underline ${FOCUS}`}
            >
              {new URL(home).host}
              <ArrowUpRight size={44} strokeWidth={2.2} aria-hidden />
            </a>
          ) : (
            <p className="mt-3 font-mono text-[44px] text-[var(--arkiv-orange)]">not configured</p>
          )}
          <p className="mt-4 text-[30px] leading-[1.35]" style={{ color: T.t84 }}>Paste an entity key: see when it expires and every change to it.</p>
        </div>
        {entity && inspected ? (
          <a href={entity} target="_blank" rel="noreferrer" className="flex items-center gap-5 self-start rounded-[16px] bg-[var(--arkiv-orange)] px-9 py-5 text-[34px] font-semibold text-[var(--arkiv-ink)]">
            Open one of your entities <span className="font-mono text-[28px] font-medium">{shortKey(inspected)}</span>
            <ExternalLink size={34} strokeWidth={2.2} aria-hidden />
          </a>
        ) : null}
      </Rise>
      <Rise className="absolute left-[1420px] top-[380px]">
        <Mascot pose="magnifier" height={560} />
      </Rise>
    </Slide>
  );
}

export const B5_NOTES: string[] = [
  "Explore your data in the browser: the explorer shows every entity, transaction and wallet, and its address on the slide opens it. Click the orange button to open the entity from the card: its status, when it expires, and its history. If you transferred it on the map, the history shows the transfer and the new owner; an extension shows there too.",
];
