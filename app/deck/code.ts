// L7 code, rendered from the real path, never typed by hand:
// - Query it: the live adapter's `describe()` (shared/arkiv/sdk-0.8.ts), the same text the query
//   panel shows, for the session that ran today.
// - Write it: the attributes come from `dotToCreate`, the exact function the writer's createDots
//   sends in one executeBatch.
// - Expire it, or extend it: mirrors the adapter's `extend` (read each entity, then one batch with
//   ExpirationTime.atBlock). The adapter has no text for writes yet, so this one is kept in step by
//   hand; see the TODO below.
// - Own it: never runs on stage (the finale is a demo view), so the slide labels it app-side.
// TODO(orchestrator): take the write text from the adapter once it exposes it next to `describe()`.

import type { DotCreate } from "../../shared/arkiv/adapter";
import type { NetworkProfile } from "../../shared/arkiv/profiles";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { createArkivAdapter, dotToCreate } from "../../shared/arkiv/sdk-0.8";
import { STAGE_EXTENSION_SEC } from "../../shared/types";

export interface CodeBlock {
  title: string;
  verb: string;
  code: string;
  /** Not run today: shown so the room can copy it into their own app. */
  appSide?: boolean;
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

/** The writer's createDots for one dot: the attributes are `dotToCreate`'s own output. */
export function createDotsCode(dot: DotCreate): string {
  const create = dotToCreate(dot);
  const entries = Object.entries(create.attributes).map(([name, value]) => `${name}: ${attrSource(value)}`);
  const rows: string[] = [];
  for (let i = 0; i < entries.length; i += 3) rows.push(`    ${entries.slice(i, i + 3).join(", ")},`);
  return [
    `await writer.executeBatch({ creates: [{`,
    `  attributes: {`,
    ...rows,
    `  },`,
    `  payload: new Uint8Array(),`,
    `  contentType: "${create.contentType}",`,
    `  flags: { permissionlessExtension: ${create.flags.permissionlessExtension} },`,
    `  expires: ExpirationTime.fromSeconds(${dot.lifetimeSec}),`,
    `}] })`,
  ].join("\n");
}

/** The adapter's extend(keys, addSeconds): new deadline = current deadline + the added blocks. */
export function extendCode(addSeconds: number): string {
  return [
    `const extraBlocks = BigInt(Math.ceil(${addSeconds * 1000} / blockTimeMs))`,
    `const entities = await Promise.all(`,
    `  keys.map((key) => reader.getEntity(key)))`,
    `await writer.executeBatch({`,
    `  extensions: entities.map((entity) => ({`,
    `    entityKey: entity.key,`,
    `    expires: ExpirationTime.atBlock(`,
    `      entity.expiresAt + extraBlocks),`,
    `  })),`,
    `})`,
  ].join("\n");
}

/** The adapter's changeOwner(key, newOwner). */
export function changeOwnerCode(): string {
  return [`await writer.changeOwnership({`, `  entityKey,`, `  newOwner: businessWallet,`, `})`].join("\n");
}

/** Every block for L7. `session` is today's session code when one is running. */
export function codeBlocks(profile: NetworkProfile, session: string | null): CodeBlock[] {
  const reader = createArkivAdapter({ profile, creator: WRITER_ADDRESS, read: { kind: "public" } });
  const query = reader.describe({ kinds: ["dot"], session: session ?? undefined }).code;
  return [
    { title: "Write it", verb: "the writer's batch of creates (sample values)", code: createDotsCode(sampleDot(session ?? "demo")) },
    { title: "Expire it, or extend it", verb: "Lifetime Extension, signed in Rabby", code: extendCode(STAGE_EXTENSION_SEC) },
    { title: "Query it", verb: "run again every block, every page", code: query },
    { title: "Own it", verb: "", code: changeOwnerCode(), appSide: true },
  ];
}
