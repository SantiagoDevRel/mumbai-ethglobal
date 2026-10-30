"use client";

// Write it: the SDK call behind each phone's tap. It was the B2 slide; since October 30 (Santiago) the
// Write it button on L1's map opens it in a popup (./live.tsx), so the room's dots stay on screen. The
// call is the one the writer makes for every phone (shared/arkiv/sdk-1.0.ts `dotToCreate`), trimmed to
// the form's fields plus the category the writer picks (Query it filters by it); the values are an
// example, in lower case like everything the phones write; the country is stored by its full name
// (Santiago, October 30). The presenter selects each part with the
// left button as he names it (Santiago, October 29), so nothing here blocks text selection.

import { T, WELL } from "../ui";

/** The popup's heading and the line under it. */
export const WRITE_IT = { title: "Write it", under: "The call behind your tap. Our wallet signed it for you." } as const;

type Line = { text: string; quiet?: boolean };

// SDK 1.0: an entity's columns come from a schema, and only indexed columns can be filtered (Query it
// filters by country and category). The call names the schema, the values and the lifetime.
const CODE: Line[] = [
  { text: "const Place = defineSchema({" },
  { text: "  name: str().indexed()," },
  { text: "  color: str().indexed()," },
  { text: "  country: str().indexed()," },
  { text: "  category: str().indexed()," },
  { text: "});" },
  { text: "const { entityKey } = await walletClient.createEntity(" },
  { text: "  Place," },
  { text: '  { name: "chai corner", color: "#fe7446",' },
  { text: '    country: "india", category: "cafe" },' },
  { text: "  { expiration: ExpirationTime.fromMinutes(15) }," },
  { text: ");" },
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

/** The createEntity call. 18 px mono: its longest line (54 characters) fits the popup's 600 px well. */
export function WriteCode() {
  return (
    <pre
      className={`${WELL} cursor-text select-text px-3 py-3 font-mono text-[18px] leading-[1.5] selection:bg-[rgba(254,116,70,0.4)] selection:text-[var(--arkiv-sand)]`}
      aria-label="createEntity call"
    >
      {CODE.map((line) => (
        <span key={line.text} className="block" style={line.quiet ? { color: T.t42 } : undefined}>
          {line.quiet ? line.text : <Tinted text={line.text} />}
        </span>
      ))}
    </pre>
  );
}
