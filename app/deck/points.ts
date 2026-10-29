// What each scene shows, in a few short points, for /outline (Santiago, October 29: bullet points
// only, no script and no times). Change a scene's slide and you change its points here too;
// tests/outline-points.test.ts keeps every scene listed and every point short.

import type { SceneId } from "../../shared/scenes";

export const POINTS: Record<SceneId, string[]> = {
  S0: ["From zero to hero with Arkiv, the Web3 database"],
  ME: ["Who I am in 15 seconds", "Slide to come"],
  IX: ["The four parts of the talk", "Build it, live: phones out"],
  W1: ["Web2 is great: we're not here to fight it", "Account frozen · Data changed · Rules changed", "One company decides. Alone."],
  W2: ["You turn to look at web3 data", "Your app's database: \"Hey. Eyes over here.\""],
  W3: ["From web2 databases: structure, indexing, a query language", "From web3: ownership, tamper-evidence, permissionless access", "Its own: rules the data carries itself"],
  W4: ["Your app → SDK → DB-Chain (live block) → Ethereum", "Small, searchable data on Arkiv; big files on Swarm"],
  ST: ["Testnet: everything is free", "SDK · wallet · faucet · free reads · RPC access key"],
  S7: ["Big QR: everyone scans and fills the form", "Your form as one entity: attributes + Entity Expiration", "\"write!\": everyone taps Write together"],
  L1: ["Every dot is an entity the room just wrote", "One request per phone; our wallet signs"],
  B2: ["createEntity: the call behind your tap", "attributes · expires · entityKey"],
  B3: ["color = orange AND country = India", "The same query in the SDK; your app sorts"],
  L3: ["The map is one query: each → adds a filter", "color is orange, then AND country is India", "The camera flies to India on the last filter"],
  L6: ["The entity card shows its $owner", "Transfer it: paste a wallet, sign once in Rabby"],
  L2: ["Entity Expiration: no cron job, no cleanup script", "Extend a few in Rabby; the rest expire"],
  B4: ["Attributes are public: never a phone number", "Encrypt it into the payload before you write", "With the key you read it; without it, only bytes"],
  B5: ["The explorer: every entity, transaction and wallet", "Opens the entity transferred in Own it"],
  T1: ["Hub: faucet, access keys, try it out", "Docs: installation, fundamentals, querying"],
  T2: ["Without MCP: an out-of-date answer", "With MCP: network_status, today's network", "One command for Claude Code or Codex CLI"],
  PZ: ["Mirror · Build from scratch · Continuity · Node tooling", "Arkiv + Swarm bonus for from-scratch projects", "One track prize per team, plus the bonus"],
  L9: ["Write it. Query it. Own it. Expire it. Thank you.", "Docs · Hub · MCP · Prizes"],
};
