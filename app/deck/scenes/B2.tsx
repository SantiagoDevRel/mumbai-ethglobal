"use client";

// B2 · Write it: the SDK call behind each phone's tap, right after the dots landed (L1). The call is
// the one the writer makes for every phone (shared/arkiv/sdk-0.8.ts `dotToCreate`), trimmed to the
// form's fields; the values are an example. → steps: 0 the call, 1 what each part is.

import { motion } from "motion/react";
import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { EASE, PANEL, REVEAL_TIME, Reveal, Slide, T } from "../ui";

type Line = { text: string; mark?: "attributes" | "expires" | "result"; quiet?: boolean };

// SDK 0.8.1: every entity declares its contents; an attributes-only entity sends empty bytes. Those two
// lines are required but not the lesson, so they stay dim.
const CODE: Line[] = [
  { text: "const { entityKey } = await walletClient.createEntity({", mark: "result" },
  { text: '  attributes: { name: "Priya", color: "#fe7446", country: "IN" },', mark: "attributes" },
  { text: "  payload: new Uint8Array(),", quiet: true },
  { text: '  contentType: "application/octet-stream",', quiet: true },
  { text: "  expires: ExpirationTime.fromSeconds(5 * 60),", mark: "expires" },
  { text: "});" },
];

const NOTES: { mark: NonNullable<Line["mark"]>; name: string; line: string }[] = [
  { mark: "attributes", name: "attributes", line: "Your form. What anyone can query by." },
  { mark: "expires", name: "expires", line: "Entity Expiration: your lifetime, then it's gone." },
  { mark: "result", name: "entityKey", line: "Its address on the DB-Chain." },
];

export function B2({ step }: SceneContentProps) {
  const marked = step >= 1;
  return (
    <Slide headline="Write it" under="The call behind your tap. Our wallet signed it for you.">
      <div className={`${PANEL} absolute left-[96px] top-[340px] w-[1180px] overflow-hidden py-6`}>
        <pre className="font-mono text-[26px] leading-[1.75]" aria-label="createEntity call">
          {CODE.map((line) => (
            <motion.span
              key={line.text}
              className="block px-8"
              style={line.quiet ? { color: T.t42 } : undefined}
              initial={false}
              animate={{ backgroundColor: marked && line.mark ? "rgba(254,116,70,0.18)" : "rgba(0,0,0,0)", boxShadow: marked && line.mark ? "inset 5px 0 0 #FE7446" : "inset 0 0 0 rgba(0,0,0,0)" }}
              transition={{ duration: REVEAL_TIME, ease: EASE }}
            >
              {line.text}
            </motion.span>
          ))}
        </pre>
      </div>
      <Reveal step={step} at={1} className="absolute left-[1316px] top-[340px] flex w-[508px] flex-col gap-5">
        {NOTES.map((note) => (
          <div key={note.mark} className="rounded-[16px] border-[2px] border-[var(--arkiv-orange)] bg-[rgba(254,116,70,0.1)] px-7 py-5">
            <p className="font-mono text-[28px] font-semibold text-[var(--arkiv-orange)]">{note.name}</p>
            <p className="mt-1 text-[28px] leading-[1.3]" style={{ color: T.t84 }}>{note.line}</p>
          </div>
        ))}
      </Reveal>
    </Slide>
  );
}

export const B2_NOTES: string[] = [
  "That's the call your phone just triggered: createEntity, with your form as attributes and your lifetime as the expiration. Our wallet signed it for the whole room.",
  "Three parts to remember: attributes are what anyone can query by, expires is when it's gone, and entityKey is its address on the DB-Chain. In your app, the wallet that signs is your user's or your server's.",
];
