// L7 code: the create, query, extend and change-ownership calls, rendered from the active network
// profile. Call shapes checked against the @arkiv-network/sdk 0.8.x typings (createWalletClient,
// executeBatch { creates, extensions }, changeOwnership, ExpirationTime, attr `i32`).
// The query text comes from the adapter's `describe` shape, the same text the query panel shows.
// TODO(orchestrator): render these from the chain adapter once it exposes its write snippets, so
// L7 can never drift from what the writer and Rabby actually sent.

import { describeFilters } from "../../shared/arkiv/mock";
import type { NetworkProfile } from "../../shared/arkiv/profiles";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import { APP_ID, STAGE_EXTENSION_SEC } from "../../shared/types";

export interface CodeBlock {
  title: string;
  verb: string;
  code: string;
}

function expiry(sec: number): string {
  if (sec % 3600 === 0) return `ExpirationTime.fromHours(${sec / 3600})`;
  if (sec % 60 === 0) return `ExpirationTime.fromMinutes(${sec / 60})`;
  return `ExpirationTime.fromSeconds(${sec})`;
}

/** A valid JS identifier for the profile's chain export (`tiramisu` today). */
function chainExport(profile: NetworkProfile): string {
  return profile.id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function codeHeader(profile: NetworkProfile): string {
  return `// ${profile.name} · chain ${profile.chainId} · ${profile.sdk.package} ${profile.sdk.version}`;
}

export function setupCode(profile: NetworkProfile): string {
  return [
    `import { createWalletClient, ExpirationTime } from "${profile.sdk.package}"`,
    `import { i32 } from "${profile.sdk.package}/attr"`,
    `import { ${chainExport(profile)} } from "${profile.sdk.package}/chains"`,
    `import { http } from "viem"`,
    ``,
    `const client = createWalletClient({ account, chain: ${chainExport(profile)}, transport: http() })`,
  ].join("\n");
}

export function codeBlocks(): CodeBlock[] {
  const query = describeFilters({ kinds: ["dot"] }, WRITER_ADDRESS).code;
  return [
    {
      title: "Write it",
      verb: "one batch of creates per block",
      code: [
        `await client.executeBatch({ creates: [{`,
        `  attributes: {`,
        `    app: "${APP_ID}", kind: "dot",`,
        `    name: "Priya", color: "#fe7446", country: "IN",`,
        `    lat: i32(19076000), lng: i32(72877700),`,
        `  },`,
        `  payload: new Uint8Array(),`,
        `  contentType: "application/octet-stream",`,
        `  expires: ${expiry(60)},`,
        `  flags: { permissionlessExtension: true },`,
        `}] })`,
      ].join("\n"),
    },
    { title: "Query it", verb: "run again every block", code: query },
    {
      title: "Expire it, or extend it",
      verb: "Lifetime Extension, signed in Rabby",
      code: [
        `await client.executeBatch({`,
        `  extensions: keys.map((entityKey) => ({`,
        `    entityKey,`,
        `    expires: ${expiry(STAGE_EXTENSION_SEC)},`,
        `  })),`,
        `})`,
      ].join("\n"),
    },
    {
      title: "Own it",
      verb: "in your app (today's finale was a demo view)",
      code: [`await client.changeOwnership({`, `  entityKey,`, `  newOwner: businessWallet,`, `})`].join("\n"),
    },
  ];
}
