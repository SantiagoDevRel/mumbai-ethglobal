"use client";

// L7 · Everything you saw, in a few lines. The code is rendered from the active network profile
// and the live adapter (see ../code.ts); the call that did not run today is labeled app-side.
// Code at mono 21 (handoff type scale) on a 1.4 line height so all four calls fit one screen.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { getProfile } from "../../../shared/arkiv/profiles";
import { codeBlocks, codeHeader, type CodeBlock } from "../code";
import { AppSide, EASE, PANEL, Rise, Slide, T } from "../ui";

/** One call as a glass card; long lines soft-wrap on screen only, the text itself is unchanged. */
function Card({ block, index, className }: { block: CodeBlock; index: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 + index * 0.1, ease: EASE }}
      className={`${PANEL} px-7 py-3 ${block.appSide ? "!border-[1.5px] !border-dashed !border-[rgba(246,244,239,0.5)]" : ""} ${className ?? ""}`}
    >
      <p className="mb-1.5 flex items-center gap-3 text-[20px]">
        <span className="font-semibold text-[var(--arkiv-orange)]">{block.title}</span>
        {block.verb ? <span style={{ color: T.t64 }}>· {block.verb}</span> : null}
        {block.appSide ? <AppSide className="ml-auto" /> : null}
      </p>
      <pre className="whitespace-pre-wrap font-mono text-[21px] leading-[1.4] text-[var(--arkiv-sand)]">{block.code}</pre>
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
    return <Slide size={72} headline="Everything you saw, in a few lines" under="Network not configured." wash={0.86} />;
  }
  const [write, extend, query, own] = blocks;
  return (
    <Slide size={72} headline="Everything you saw, in a few lines" wash={0.86}>
      <Rise delay={0.1} className="absolute left-[96px] top-[250px] w-[1728px]">
        <p className="font-mono text-[20px]" style={{ color: T.t56 }}>
          {codeHeader(profile)}
        </p>
      </Rise>
      <div className="absolute left-[96px] top-[296px] grid w-[1728px] grid-cols-2 items-start gap-4">
        <Card block={write!} index={0} />
        <Card block={extend!} index={1} />
      </div>
      <div className="absolute bottom-[32px] left-[96px] flex w-[1728px] items-end gap-4">
        <Card block={query!} index={2} className="min-w-0 flex-1" />
        <Card block={own!} index={3} className="w-[440px] shrink-0" />
      </div>
    </Slide>
  );
}
