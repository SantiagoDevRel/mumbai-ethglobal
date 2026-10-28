"use client";

// B3 · Query it like a database. One filter, color is orange AND country is India, in the query
// language (the text the SDK sends, as the map's Query tab shows it) and as the SDK call (the map's
// Code tab). Then L3 runs the same filter on the room's entities. → steps: 0 the query language, 1
// the SDK call and the honest limit.

import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { AppSide, PANEL, Reveal, Slide, T } from "../ui";

const O = ({ children }: { children: ReactNode }) => <span className="text-[var(--arkiv-orange)]">{children}</span>;

export function B3({ step }: SceneContentProps) {
  return (
    <Slide headline="Query it like a database" under="Orange entities from India, two ways." size={72}>
      <div className="absolute left-[96px] top-[330px] flex w-[840px] flex-col gap-5">
        <p className="text-[24px] font-bold tracking-[0.1em]" style={{ color: T.t64 }}>QUERY LANGUAGE</p>
        <div className={`${PANEL} whitespace-pre px-9 py-8 font-mono text-[34px] leading-[1.6]`}>
          color = str(&apos;#fe7446&apos;)
          <br />
          <O>AND</O> country = str(&apos;IN&apos;)
        </div>
      </div>
      <Reveal step={step} at={1} className="absolute left-[984px] top-[330px] flex w-[840px] flex-col gap-5">
        <p className="text-[24px] font-bold tracking-[0.1em]" style={{ color: T.t64 }}>THE SAME QUERY IN THE SDK</p>
        <div className={`${PANEL} whitespace-pre px-9 py-8 font-mono text-[26px] leading-[1.75]`}>
          await publicClient.select(&#123; attributes: true &#125;)
          <br />
          {"  "}.where(<O>eq</O>(&quot;color&quot;, &quot;#fe7446&quot;))
          <br />
          {"  "}.where(<O>eq</O>(&quot;country&quot;, &quot;IN&quot;))
          <br />
          {"  "}.fetch();
        </div>
        <p className="flex items-center gap-4 text-[28px]" style={{ color: T.t84 }}>
          <AppSide /> No ORDER BY: your app sorts.
        </p>
      </Reveal>
    </Slide>
  );
}

export const B3_NOTES: string[] = [
  "Arkiv has a query language, like a database. Show me the orange entities AND only the ones from India. It also has OR, NOT and comparisons.",
  "In the SDK it's the same filter, one where per condition. One honest limit: there's no ORDER BY, so your app sorts. Now let's run it on your entities.",
];
