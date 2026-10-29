"use client";

// B2 · Write it: the SDK call behind each phone's tap, right after the dots landed (L1). The call is
// the one the writer makes for every phone (shared/arkiv/sdk-0.8.ts `dotToCreate`), trimmed to the
// form's fields plus the category the writer picks (B3 queries it); the values are an example, in
// lower case like everything the phones write. Only the code, large and centered: the presenter
// selects each part with the left button as he names it (Santiago, October 29), so nothing here
// blocks text selection. One step.

import type { SceneContentProps } from "../../../lib/stage/deck-contract";
import { PANEL, Slide, T } from "../ui";

type Line = { text: string; quiet?: boolean };

// SDK 0.8.1: every entity declares its contents; an attributes-only entity sends empty bytes. Those two
// lines are required but not the lesson, so they stay dim.
const CODE: Line[] = [
  { text: "const { entityKey } = await walletClient.createEntity({" },
  { text: "  attributes: {" },
  { text: '    name: "chai corner",' },
  { text: '    color: "#fe7446",' },
  { text: '    country: "in",' },
  { text: '    category: "cafe",' },
  { text: "  }," },
  { text: "  payload: new Uint8Array(),", quiet: true },
  { text: '  contentType: "application/octet-stream",', quiet: true },
  { text: "  expires: ExpirationTime.fromSeconds(15 * 60)," },
  { text: "});" },
];

/** String literals in Orange, the rest as is. */
function Tinted({ text }: { text: string }) {
  return text.split(/("[^"]*")/).map((part, i) =>
    part.startsWith('"') ? (
      <span key={i} className="text-[var(--arkiv-orange)]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function B2(_props: SceneContentProps) {
  return (
    <Slide headline="Write it" under="The call behind your tap. Our wallet signed it for you.">
      <div className="absolute left-0 top-[336px] flex w-full justify-center">
        <pre
          className={`${PANEL} cursor-text select-text px-16 py-9 font-mono text-[36px] leading-[1.5] selection:bg-[rgba(254,116,70,0.4)] selection:text-[var(--arkiv-sand)]`}
          aria-label="createEntity call"
        >
          {CODE.map((line) => (
            <span key={line.text} className="block" style={line.quiet ? { color: T.t42 } : undefined}>
              {line.quiet ? line.text : <Tinted text={line.text} />}
            </span>
          ))}
        </pre>
      </div>
    </Slide>
  );
}

export const B2_NOTES: string[] = [
  "That's the call your phone just triggered: createEntity. Select each part as you name it. attributes: your form, what anyone can query by, plus a category our app picked for your dot. expires: Entity Expiration, the lifetime you chose; after that it's gone. entityKey: what comes back, the entity's address on the DB-Chain. Our wallet signed it for the whole room; in your app, your user's wallet or your server signs.",
];
