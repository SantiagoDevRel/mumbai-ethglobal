// L7 code, rendered from the real path, never typed by hand:
// - Query it: the live adapter's `describe()` (shared/arkiv/sdk-0.8.ts), the same text the query
//   panel shows, for the session that ran today; only its line breaks change to fit the card.
// - Write it: the attributes come from `dotToCreate`, the exact function the writer's createDots
//   sends in one executeBatch.
// - Expire it, or extend it: the adapter's `describeExtend()`, kept next to its `extend`.
// - Own it: never runs on stage (the finale is a demo view), so the slide marks it "not run today".
// Every block fits 8 lines of at most MAX_LINE characters (the L7 card at mono 19).

import type { DotCreate } from "../../shared/arkiv/adapter";
import type { NetworkProfile } from "../../shared/arkiv/profiles";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { createArkivAdapter, describeExtend, dotToCreate } from "../../shared/arkiv/sdk-0.8";
import { STAGE_EXTENSION_SEC } from "../../shared/types";

export const MAX_LINE = 69;

export interface CodeBlock {
  title: string;
  verb: string;
  code: string;
  /** Not run today: shown so the room can copy it into their own app. */
  notRun?: boolean;
}

/** Sample input for the create; the values on screen are labeled as a sample. */
function sampleDot(session: string): DotCreate {
  return { session, name: "Priya", color: "#fe7446", country: "IN", lat: 19.076, lng: 72.8777, lifetimeSec: 60 };
}

/** One comment line: the network and SDK the code ran on, and where `reader` and `writer` come from. */
export function codeHeader(profile: NetworkProfile): string {
  const pkg = profile.sdk.package;
  return `// ${profile.name} · chain ${profile.chainId} · ${pkg} ${profile.sdk.version} · reader: createPublicClient · writer: createWalletClient`;
}

/** One attribute value as source: strings quoted, typed numbers as their helper call. */
function attrSource(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value && typeof value === "object" && "type" in value && "value" in value) return `${String(value.type)}(${String(value.value)})`;
  return String(value);
}

/**
 * `items` joined with ", " into lines of at most MAX_LINE characters: the first line starts with
 * `open`, the others with `indent`, and the last one ends with `close`.
 */
function pack(items: string[], open: string, indent: string, close: string): string[] {
  const lines: string[] = [];
  let line = open;
  items.forEach((item, i) => {
    const tail = i === items.length - 1 ? close : ",";
    const fresh = line === open || line === indent;
    const candidate = fresh ? line + item + tail : `${line} ${item}${tail}`;
    if (candidate.length <= MAX_LINE || fresh) line = candidate;
    else {
      lines.push(line);
      line = indent + item + tail;
    }
  });
  lines.push(line);
  return lines;
}

/** The writer's createDots for one dot: the attributes are `dotToCreate`'s own output. */
export function createDotsCode(dot: DotCreate): string {
  const create = dotToCreate(dot);
  const entries = Object.entries(create.attributes).map(([name, value]) => `${name}: ${attrSource(value)}`);
  return [
    `await writer.executeBatch({ creates: [{`,
    ...pack(entries, "  attributes: { ", "    ", " },"),
    `  payload: new Uint8Array(), contentType: "${create.contentType}",`,
    `  flags: { permissionlessExtension: ${create.flags.permissionlessExtension} },`,
    `  expires: ExpirationTime.fromSeconds(${dot.lifetimeSec}),`,
    `}] })`,
  ].join("\n");
}

/**
 * The adapter's query text with card-sized line breaks: `reader` on its own line, the selection
 * packed, `.limit().fetch()` joined, and the paging comment moved to the card's verb. Any other
 * shape is returned unchanged.
 */
export function fitQuery(code: string): string {
  const lines = code.split("\n");
  const head = lines[0]?.match(/^let page = await reader\.select\(\{ (.+) \}\)$/);
  if (!head) return code;
  const rest = lines.slice(1).filter((l) => !l.startsWith("//"));
  const limit = rest.findIndex((l) => /^\s+\.limit\(\d+\)$/.test(l));
  if (limit >= 0 && rest[limit + 1]?.trim() === ".fetch();") rest.splice(limit, 2, `${rest[limit]}.fetch()`);
  return ["let page = await reader", ...pack(head[1]!.split(", "), "  .select({ ", "    ", " })"), ...rest].join("\n");
}

/** The adapter's changeOwner(key, newOwner). */
export function changeOwnerCode(): string {
  return [`await writer.changeOwnership({`, `  entityKey,`, `  newOwner: businessWallet,`, `})`].join("\n");
}

/** Every block for L7. `session` is today's session code when one is running. */
export function codeBlocks(profile: NetworkProfile, session: string | null): CodeBlock[] {
  const reader = createArkivAdapter({ profile, creator: WRITER_ADDRESS, read: { kind: "public" } });
  const query = fitQuery(reader.describe({ kinds: ["dot"], session: session ?? undefined }).code);
  return [
    { title: "Write it", verb: "the writer's batch of creates (sample values)", code: createDotsCode(sampleDot(session ?? "demo")) },
    { title: "Expire it, or extend it", verb: "Lifetime Extension, signed in Rabby", code: describeExtend(STAGE_EXTENSION_SEC).code },
    { title: "Query it", verb: "run again every block; page.next() for more pages", code: query },
    { title: "Own it", verb: "the call for your app", code: changeOwnerCode(), notRun: true },
  ];
}
