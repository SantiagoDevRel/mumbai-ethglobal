"use client";

// L7 · Everything you saw, in a few lines. The code rendered from the active network profile.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { getProfile } from "../../../shared/arkiv/profiles";
import { codeBlocks, codeHeader, setupCode } from "../code";
import { EASE, Rise, Slide } from "../ui";

export function L7(_props: SceneContentProps) {
  let profile;
  try {
    profile = getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE);
  } catch {
    return (
      <Slide headline="Everything you saw, in a few lines" under="Network not configured." />
    );
  }
  const blocks = codeBlocks();
  return (
    <Slide headline="Everything you saw, in a few lines" wash={0.86}>
      <Rise delay={0.1} className="absolute left-[120px] top-[200px] w-[1680px]">
        <pre className="font-mono text-[19px] leading-[1.45] text-[var(--stage-muted)]">
          {codeHeader(profile)}
          {"\n"}
          <span className="text-[var(--stage-fg)]">{setupCode(profile)}</span>
        </pre>
      </Rise>
      <div className="absolute left-[120px] top-[372px] grid w-[1680px] grid-cols-2 gap-5">
        {blocks.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: EASE }}
            className={`rounded-[20px] bg-[rgba(17,17,17,0.88)] px-7 py-4 ${b.appSide ? "border-2 border-dashed border-[var(--app-side)]" : "border border-[var(--panel-border)]"}`}
          >
            <p className="mb-2 flex items-center gap-3 text-[24px]">
              <span className="font-semibold text-[var(--arkiv-orange)]">{b.title}</span>
              <span className="text-[var(--stage-muted)]">· {b.verb}</span>
              {b.appSide ? (
                <span className="ml-auto font-mono text-[18px] uppercase tracking-[0.12em] text-[var(--app-side)]">app-side</span>
              ) : null}
            </p>
            <pre className="whitespace-pre font-mono text-[19px] leading-[1.4] text-[var(--stage-fg)]">{b.code}</pre>
          </motion.div>
        ))}
      </div>
    </Slide>
  );
}
