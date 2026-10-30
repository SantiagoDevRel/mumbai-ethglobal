"use client";

// Query it like a database. One filter, category is cafe AND country is India, in the query language
// (the text the SDK sends: the SDK builder's toString(), as the map's Query tab shows it) and as the
// SDK call (one where per clause, as the map's Code tab prints them). Values are lower case, like
// everything the phones write. It was the B3 slide; since October 30 (Santiago) the Query it button on
// L1's map opens it in a popup (./live.tsx), and its + AND name button adds one more clause to both,
// name is "chai corner" (it slides in between, marked). Then L3 runs queries like it on the room's
// entities.

import { motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { EASE, FOCUS, REVEAL_TIME, T, WELL } from "../ui";

/** The popup's heading and the line under it. */
export const QUERY_IT = { title: "Query it like a database", under: "Cafes in India, two ways." } as const;

const FONT = 20;
const LINE = Math.round(FONT * 1.6);

const O = ({ children }: { children: ReactNode }) => <span className="text-[var(--arkiv-orange)]">{children}</span>;

/** One code line. An `added` line takes no room until `shown`, then opens and stays marked. */
function Row({ children, added = false, shown = true }: { children: ReactNode; added?: boolean; shown?: boolean }) {
  const reduced = useReducedMotion();
  if (!added) return <div className="whitespace-pre px-4">{children}</div>;
  return (
    <motion.div
      className="overflow-hidden whitespace-pre px-4"
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
    <p className="mb-1.5 text-[15px] font-bold tracking-[0.1em]" style={{ color: T.t64 }}>
      {children}
    </p>
  );
}

const WELL_STYLE = { fontSize: FONT, lineHeight: `${LINE}px` };

/** Both forms of the query, and the button that adds AND name to both (the slide's second step). Its
 * longest line (47 characters at 20 px mono) fits the popup's well. */
export function QueryCode() {
  const [named, setNamed] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>QUERY LANGUAGE</Label>
        <div className={`${WELL} cursor-text select-text py-2.5 font-mono`} style={WELL_STYLE}>
          <Row>category = str(&apos;cafe&apos;)</Row>
          <Row>
            <O>AND</O> country = str(&apos;india&apos;)
          </Row>
          <Row added shown={named}>
            <O>AND</O> name = str(&apos;chai corner&apos;)
          </Row>
        </div>
      </div>
      <div>
        <Label>THE SAME QUERY IN THE SDK</Label>
        <div className={`${WELL} cursor-text select-text py-2.5 font-mono`} style={WELL_STYLE}>
          <Row>await publicClient.select(&#123; attributes: true &#125;)</Row>
          <Row>
            {"  "}.where(<O>eq</O>(&quot;category&quot;, &quot;cafe&quot;))
          </Row>
          <Row>
            {"  "}.where(<O>eq</O>(&quot;country&quot;, &quot;india&quot;))
          </Row>
          <Row added shown={named}>
            {"  "}.where(<O>eq</O>(&quot;name&quot;, &quot;chai corner&quot;))
          </Row>
          <Row>{"  "}.fetch();</Row>
        </div>
      </div>
      {/* The label says what a click does: add the clause, or take it out again. */}
      <button
        type="button"
        onClick={() => setNamed((on) => !on)}
        className={`h-11 self-start rounded-[12px] border-[1.5px] px-4 font-mono text-[18px] font-semibold transition-colors ${
          named
            ? "border-[rgba(246,244,239,0.28)] text-[rgba(246,244,239,0.84)] hover:border-[rgba(246,244,239,0.56)]"
            : "border-[var(--arkiv-orange)] text-[var(--arkiv-orange)] hover:bg-[rgba(254,116,70,0.12)]"
        } ${FOCUS}`}
      >
        {named ? "− AND name" : "+ AND name"}
      </button>
    </div>
  );
}
