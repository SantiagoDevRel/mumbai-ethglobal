// What each scene shows, in a few short points, for /outline (Santiago, October 29: bullet points
// only, no script and no times). Change a scene's slide and you change its points here too;
// tests/outline-points.test.ts keeps every scene listed and every point short.

import type { SceneId } from "../../shared/scenes";

export const POINTS: Record<SceneId, string[]> = {
  S0: ["Arkiv, the Web3 database", "Subtitle: From zero to hero", "Write it. Query it. Own it. Expire it."],
  ME: ["santiagodevrel @ Arkiv · first DevRel to do a Web3 Africa tour", "Worked for L1s, ChainSafe, L2s like Lisk, web3.js", "One photo per →, each pinned with its country's flag"],
  IX: ["The four parts, lit one → at a time", "Build your entity: phones out"],
  W1: ["Web2 is great: fast and familiar. But…", "Account frozen · Data changed · Rules changed", "One company decides for you"],
  W2: ["Meme: you can't stop looking at web3 data", "Your web2 database is not happy about it"],
  W3: ["From web2 databases: structure, indexing, a query language", "From web3: ownership, tamper-evidence, a block explorer", "Its own: rules the data carries itself"],
  W4: ["The network: DB-Chains joined by Arkiv, bridged to Ethereum", "Live: Rabdi and Sorbet (Sourcify); Tiramisu now previous", "Your app: SDK or JSON-RPC; logic on EVM chains; files on Swarm"],
  ST: ["Testnet (Rabdi): everything is free", "SDK · wallet · faucet · free reads · RPC access key"],
  NT: ["No smart contracts: keep logic in your app or another chain", "Not for big files: those go to Swarm", "Not private by default: encrypt what's private"],
  S7: ["\"Your first entity\": big QR, everyone scans and fills the form", "Your entity: expiration 15 min, or Permanent (2**64 − 1)", "\"write!\": everyone taps Write together"],
  L1: ["Every dot is an entity the room just wrote", "One request per phone; our wallet signs"],
  B2: ["createEntity: the call behind your tap", "Select each part on screen as you explain it"],
  B3: ["category = \"cafe\" AND country = \"in\"", "One more clause: AND name = \"chai corner\"", "The same query in the SDK, one where per line"],
  L3: ["The map is one query: filter it by hand", "Name, country (the camera flies) or color", "Transfer or extend from the entity card"],
  B4: ["All fields in an entity are public", "owner_phone keeps its name; its value is encrypted", "arkiv-encryption: the skill and the npm package"],
  B5: ["The explorer: every entity, transaction and wallet", "Opens an entity from the map"],
  T1: ["Hub: faucet, access keys, AI tools", "Docs: installation, fundamentals, querying"],
  T2: ["Meme: your agent without MCP vs with MCP", "Setup steps live on the Hub: AI tools"],
  PZ: ["Mirror · Build on Arkiv · Node tooling, each with an entry tag", "Swarm bonus add-on: $500 from scratch, $500 Continuity", "Rubric and rules on ETHGlobal's prize page"],
  L9: ["The mascot says the four verbs, then builds THANK YOU", "Docs · Hub · MCP · Prizes: click to open"],
};
