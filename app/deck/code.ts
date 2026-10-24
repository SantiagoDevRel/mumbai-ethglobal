// L7 code, rendered from the real path, never typed by hand:
// - Query it: `describeFilters`, the same text the query panel shows (mock.ts today; switch to the
//   adapter's `describe()` once sdk-0.8.ts lands).
// - Write it: the writer's createDots call shape (executeBatch of creates, as proven on Tiramisu by
//   writer/src/phase-zero.ts), filled from a `DotCreate` through the shared encodings.
// - Expire it, or extend it: the adapter's `extend(keys, addSeconds)` as one executeBatch.
// - Own it: never runs on stage (the finale is a demo view), so the slide labels it app-side.
// Field names checked against the installed @arkiv-network/sdk 0.8.1 typings (CreateEntityParameters,
// ExtendEntityParameters { entityKey, expires }, ChangeOwnershipParameters { entityKey, newOwner }).
// TODO(orchestrator): take these from the adapter once it exposes its write text next to `describe()`.

import type { DotCreate } from "../../shared/arkiv/adapter";
import { describeFilters } from "../../shared/arkiv/mock";
import type { NetworkProfile } from "../../shared/arkiv/profiles";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { encodeCoord, normalizeColor } from "../../shared/encoding";
import { APP_ID, STAGE_EXTENSION_SEC } from "../../shared/types";

export interface CodeBlock {
  title: string;
  verb: string;
  code: string;
  /** Not run today: shown so the room can copy it into their own app. */
  appSide?: boolean;
}

/** Sample input for the create; the values on screen are labeled as a sample. */
const SAMPLE_DOT: DotCreate = {
  session: "demo",
  name: "Priya",
  color: "#fe7446",
  country: "IN",
  lat: 19.076,
  lng: 72.8777,
  lifetimeSec: 60,
};

export function codeHeader(profile: NetworkProfile): string {
  return `// ${profile.name} · chain ${profile.chainId} · ${profile.sdk.package} ${profile.sdk.version}`;
}

export function setupCode(profile: NetworkProfile): string {
  const pkg = profile.sdk.package;
  return [
    `import { createPublicClient, createWalletClient } from "${pkg}"`,
    `import { ExpirationTime } from "${pkg}/utils"; import { i32 } from "${pkg}/attr"`,
    `const client = createPublicClient({ chain, transport }) // chain: the ${profile.name} profile`,
    `const writer = createWalletClient({ chain, account, transport })`,
  ].join("\n");
}

/** The writer's createDots: one executeBatch of creates, one entry per dot. */
export function createDotsCode(dot: DotCreate): string {
  return [
    `await writer.executeBatch({ creates: [{`,
    `  attributes: {`,
    `    app: "${APP_ID}", kind: "dot", session: "${dot.session}",`,
    `    name: "${dot.name}", color: "${normalizeColor(dot.color) ?? dot.color}", country: "${dot.country}",`,
    `    lat: i32(${encodeCoord(dot.lat)}), lng: i32(${encodeCoord(dot.lng)}),`,
    `  },`,
    `  payload: new Uint8Array(),`,
    `  contentType: "application/octet-stream",`,
    `  flags: { permissionlessExtension: true },`,
    `  expires: ExpirationTime.fromSeconds(${dot.lifetimeSec}),`,
    `}] })`,
  ].join("\n");
}

/** The adapter's extend(keys, addSeconds): one batch, signed in Rabby. */
export function extendCode(addSeconds: number): string {
  return [
    `await writer.executeBatch({`,
    `  extensions: keys.map((entityKey) => ({`,
    `    entityKey,`,
    `    expires: ExpirationTime.fromSeconds(${addSeconds}),`,
    `  })),`,
    `})`,
  ].join("\n");
}

/** The adapter's changeOwner(key, newOwner). */
export function changeOwnerCode(): string {
  return [`await writer.changeOwnership({`, `  entityKey,`, `  newOwner: businessWallet,`, `})`].join("\n");
}

export function codeBlocks(): CodeBlock[] {
  return [
    { title: "Write it", verb: "the writer's batch of creates (sample values)", code: createDotsCode(SAMPLE_DOT) },
    { title: "Query it", verb: "run again every block", code: describeFilters({ kinds: ["dot"] }, WRITER_ADDRESS).code },
    { title: "Expire it, or extend it", verb: "Lifetime Extension, signed in Rabby", code: extendCode(STAGE_EXTENSION_SEC) },
    { title: "Own it", verb: "for your app; today's finale was a demo view", code: changeOwnerCode(), appSide: true },
  ];
}
