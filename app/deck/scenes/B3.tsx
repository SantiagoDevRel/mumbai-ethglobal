"use client";

// B3 · Query it like a database. One filter, category is cafe AND country is India, in the query
// language (the text the SDK sends: the SDK builder's toString(), as the map's Query tab shows it) and
// as the SDK call (one where per clause, as the map's Code tab prints them). Values are lower case,
// like everything the phones write. Then L3 runs queries like it on the room's entities.
// → steps: 0 both panels, 1 one more clause in both, AND name is "chai corner" (it slides in between,
// marked).

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, PANEL, REVEAL_TIME, Slide, T } from "../ui";

const FONT = 32;
const LINE = Math.round(FONT * 1.6);

const O = ({ children }: { children: ReactNode }) => <span className="text-[var(--arkiv-orange)]">{children}</span>;

/** One code line. An `added` line takes no room until `shown`, then opens and stays marked. */
function Row({ children, added = false, shown = true }: { children: ReactNode; added?: boolean; shown?: boolean }) {
  const reduced = useReducedMotion();
  if (!added) return <div className="whitespace-pre px-9">{children}</div>;
  return (
    <motion.div
      className="overflow-hidden whitespace-pre px-9"
      initial={false}
      animate={{
        height: shown ? LINE : 0,
        opacity: shown ? 1 : 0,
        backgroundColor: shown ? "rgba(254,116,70,0.16)" : "rgba(254,116,70,0)",
        boxShadow: shown ? "inset 5px 0 0 #FE7446" : "inset 0 0 0 rgba(254,116,70,0)",
      }}
      transition={{ duration: reduced ? 0 : REVEAL_TIME, ease: EASE }}
      aria-hidden={!shown}
    >
      {children}
    </motion.div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[24px] font-bold tracking-[0.1em]" style={{ color: T.t64 }}>
      {children}
    </p>
  );
}

export function B3({ step }: SceneContentProps) {
  const named = step >= 1;
  return (
    <Slide headline="Query it like a database" under="Cafes in India, two ways." size={72}>
      <div className="absolute left-[96px] top-[330px] grid w-[1728px] grid-cols-[680px_1000px] grid-rows-[auto_auto] gap-x-12 gap-y-5">
        <Label>QUERY LANGUAGE</Label>
        <Label>THE SAME QUERY IN THE SDK</Label>
        <div className={`${PANEL} py-7 font-mono`} style={{ fontSize: FONT, lineHeight: `${LINE}px` }}>
          <Row>category = str(&apos;cafe&apos;)</Row>
          <Row>
            <O>AND</O> country = str(&apos;in&apos;)
          </Row>
          <Row added shown={named}>
            <O>AND</O> name = str(&apos;chai corner&apos;)
          </Row>
        </div>
        <div className={`${PANEL} py-7 font-mono`} style={{ fontSize: FONT, lineHeight: `${LINE}px` }}>
          <Row>await publicClient.select(&#123; attributes: true &#125;)</Row>
          <Row>
            {"  "}.where(<O>eq</O>(&quot;category&quot;, &quot;cafe&quot;))
          </Row>
          <Row>
            {"  "}.where(<O>eq</O>(&quot;country&quot;, &quot;in&quot;))
          </Row>
          <Row added shown={named}>
            {"  "}.where(<O>eq</O>(&quot;name&quot;, &quot;chai corner&quot;))
          </Row>
          <Row>{"  "}.fetch();</Row>
        </div>
      </div>
    </Slide>
  );
}

export const B3_NOTES: string[] = [
  "Arkiv has a query language, like a database. Show me every cafe AND only the ones in India: category equals cafe, and country equals in. In the SDK it's the same filter, one where per clause. It also has OR, NOT and comparisons.",
  "One more AND narrows it to one place: name equals chai corner. One more clause in the query language, one more where in the SDK. Values match exactly, which is why everything you wrote is in lower case. Now let's run it on your entities.",
];
