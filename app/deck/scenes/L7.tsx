"use client";

// L7 · Everything you saw, in a few lines. The code is rendered from the active network profile
// and the live adapter (see ../code.ts); the call that did not run today is labeled app-side.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { getProfile } from "../../../shared/arkiv/profiles";
import { codeBlocks, codeHeader, setupCode, type CodeBlock } from "../code";
import { EASE, Rise, Slide } from "../ui";

/** `wrap` soft-wraps long lines on screen only; the text itself is the adapter's, unchanged. */
function Card({ block, index, className, wrap = false }: { block: CodeBlock; index: number; className?: string; wrap?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.1, ease: EASE }}
      className={`rounded-[20px] bg-[rgba(17,17,17,0.88)] px-7 py-4 ${block.appSide ? "border-2 border-dashed border-[var(--app-side)]" : "border border-[var(--panel-border)]"} ${className ?? ""}`}
    >
      <p className="mb-2 flex items-center gap-3 text-[24px]">
        <span className="font-semibold text-[var(--arkiv-orange)]">{block.title}</span>
        {block.verb ? <span className="text-[var(--stage-muted)]">· {block.verb}</span> : null}
        {block.appSide ? (
          <span className="ml-auto font-mono text-[18px] uppercase tracking-[0.12em] text-[var(--app-side)]">app-side</span>
        ) : null}
      </p>
      <pre className={`${wrap ? "whitespace-pre-wrap" : "whitespace-pre"} font-mono text-[17px] leading-[1.4] text-[var(--stage-fg)]`}>{block.code}</pre>
    </motion.div>
  );
}

export function L7(_props: SceneContentProps) {
  const session = useStage((s) => s.session);
  let profile;
  let blocks: CodeBlock[];
  try {
    profile = getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE);
    blocks = codeBlocks(profile, session);
  } catch {
    return <Slide headline="Everything you saw, in a few lines" under="Network not configured." />;
  }
  const [write, extend, query, own] = blocks;
  return (
    <Slide headline="Everything you saw, in a few lines" wash={0.86}>
      <Rise delay={0.1} className="absolute left-[120px] top-[196px] w-[1680px]">
        <pre className="font-mono text-[17px] leading-[1.45] text-[var(--stage-muted)]">
          {codeHeader(profile)}
          {"\n"}
          <span className="text-[var(--stage-fg)]">{setupCode(profile)}</span>
        </pre>
      </Rise>
      <div className="absolute left-[120px] top-[340px] grid w-[1680px] grid-cols-2 gap-5">
        <Card block={write!} index={0} />
        <Card block={extend!} index={1} />
      </div>
      {/* Ends at x 1680 so the corner QR (bottom-right) stays clear. */}
      <div className="absolute left-[120px] top-[690px] flex w-[1560px] gap-5">
        <Card block={query!} index={2} className="min-w-0 flex-1" wrap />
        <Card block={own!} index={3} className="w-[360px] shrink-0" />
      </div>
    </Slide>
  );
}
