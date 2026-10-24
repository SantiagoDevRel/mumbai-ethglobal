"use client";

// L7 · Everything you saw, in a few lines. The code is rendered from the active network profile
// and the live adapter (see ../code.ts); the call that did not run today is marked so. A 2x2 grid
// of equal cards; each block is at most 8 lines that fit without wrapping at mono 19.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { useStage } from "../../../lib/stage/store";
import { getProfile } from "../../../shared/arkiv/profiles";
import { codeBlocks, codeHeader, type CodeBlock } from "../code";
import { AppSide, EASE, PANEL, Rise, Slide, T } from "../ui";

function Card({ block, index }: { block: CodeBlock; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 + index * 0.1, ease: EASE }}
      className={`${PANEL} min-w-0 px-6 py-4 ${block.notRun ? "!border-[1.5px] !border-dashed !border-[rgba(246,244,239,0.5)]" : ""}`}
    >
      <p className="mb-2 flex items-center gap-3 text-[20px]">
        <span className="font-semibold text-[var(--arkiv-orange)]">{block.title}</span>
        {block.verb ? <span style={{ color: T.t64 }}>· {block.verb}</span> : null}
        {block.notRun ? <AppSide label="not run today" className="ml-auto" /> : null}
      </p>
      <pre className="whitespace-pre font-mono text-[19px] leading-[1.45] text-[var(--arkiv-sand)]">{block.code}</pre>
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
  return (
    <Slide size={72} headline="Everything you saw, in a few lines" wash={0.86}>
      <Rise delay={0.1} className="absolute left-[96px] top-[250px] w-[1728px]">
        <p className="truncate font-mono text-[20px]" style={{ color: T.t56 }}>
          {codeHeader(profile)}
        </p>
      </Rise>
      <div className="absolute left-[96px] top-[296px] grid h-[752px] w-[1728px] grid-cols-2 grid-rows-2 gap-4">
        {blocks.map((block, i) => (
          <Card key={block.title} block={block} index={i} />
        ))}
      </div>
    </Slide>
  );
}
