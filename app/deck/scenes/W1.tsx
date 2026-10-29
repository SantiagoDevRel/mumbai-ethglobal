"use client";

// W1 · Your data, their terms. Not a fight with web2: it works, and the room uses it every day. The
// point is who decides: one company decides for you. → steps: 0 the headline and "Web2 is great: fast
// and familiar. But…", 1 the three things one company can do to your data, and the closing line
// (copy from Santiago, October 29).

import { PencilLine, ScrollText, Snowflake, type LucideIcon } from "lucide-react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { PANEL, Reveal, Slide, T } from "../ui";

const CASES: { icon: LucideIcon; title: string; line: string }[] = [
  { icon: Snowflake, title: "Account frozen", line: "They freeze your account. Your data freezes with it." },
  { icon: PencilLine, title: "Data changed", line: "A row changes on their side. You can't prove it did." },
  { icon: ScrollText, title: "Rules changed", line: "New terms overnight. You accept or you leave." },
];

export function W1({ step }: SceneContentProps) {
  return (
    <Slide headline="Your data, their terms" under="Web2 is great: fast and familiar. But…" wash={0.84}>
      <Reveal step={step} at={1} className="absolute left-[96px] top-[360px] grid w-[1728px] grid-cols-3 gap-9">
        {CASES.map(({ icon: Icon, title, line }) => (
          <div key={title} className={`${PANEL} flex h-[360px] flex-col gap-6 p-10`}>
            <Icon size={72} strokeWidth={1.6} className="text-[var(--arkiv-orange)]" aria-hidden />
            <p className="text-[48px] font-semibold leading-[1.05]">{title}</p>
            <p className="text-[30px] leading-[1.3]" style={{ color: T.t84 }}>{line}</p>
          </div>
        ))}
      </Reveal>
      <Reveal step={step} at={1} className="absolute left-[96px] top-[800px]">
        <p className="text-[60px] font-semibold leading-[1.1]">
          One company decides <span className="text-[var(--arkiv-orange)]">for you.</span>
        </p>
      </Reveal>
    </Slide>
  );
}

export const W1_NOTES: string[] = [
  "Web2 is great: fast, familiar, and it's how most of us build. But…",
  "…your data lives on their terms. If Google freezes your account, you're frozen. A row can change on their side and you can't prove it did. The rules change overnight and you accept or leave. One company decides for you.",
];
