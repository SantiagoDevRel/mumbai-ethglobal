// What each scene shows, in a few short points, for /outline (Santiago, October 29: bullet points
// only, no script and no times). Change a scene's slide and you change its points here too;
// tests/outline-points.test.ts keeps every scene listed and every point short.

import type { SceneId } from "../../shared/scenes";

export const POINTS: Record<SceneId, string[]> = {
  S0: ["Arkiv, the Web3 database", "Subtitle: From zero to hero", "Write it. Query it. Own it. Expire it."],
  ME: ["SantiagoDevRel @ Arkiv · first DevRel to do a Web3 Africa tour", "Cosmos, ChainSafe, web3.js, Lisk logos; @santiagodevrel links", "One photo per →, each with its flag; then 10+ countries"],
  IX: ["The four parts, lit one → at a time", "Build your entity: phones out"],
  W1: ["Web2 is great: fast and familiar. But…", "Account frozen · Data changed · Rules changed", "One company decides for you"],
  W2: ["Meme: you can't stop looking at web3 data", "Your web2 database is not happy about it", "→ The hug: what if you could keep the best of both?"],
  W3: ["From web2 databases: structure, indexing, a query language", "From web3: ownership, tamper-evidence, a block explorer", "Its own: a lifetime, who may extend it, who may edit it"],
  W4: ["The network: DB-Chains joined by Arkiv, bridged to Ethereum", "Live: Rabdi and Sorbet (Sourcify); Tiramisu now previous", "Your app, one → each: DB-Chain, logic anywhere, Swarm or IPFS"],
  ST: ["Use Rabdi testnet: everything is free", "SDK · wallet · faucet · free reads · RPC access key", "Live: Add network, then Get balance; the tags are links"],
  NT: ["Not a smart-contract chain", "Not built for big files: 128 KB per entity", "Not private by default: you can encrypt values yourself"],
  S7: ["\"Your first entity\": big QR, everyone scans and fills the form", "Your entity: expiration 15 min, or Permanent (2**64 − 1)", "\"write!\": everyone taps Write together"],
  L1: ["Every dot is an entity the room just wrote", "One request per phone; our wallet signs", "Buttons: Write it (createEntity) · Query it (+ AND name)"],
  L3: ["The map is one query: filter it by hand", "Name, country (the camera flies) or color", "Transfer or extend from the entity card"],
  B4: ["All fields in an entity are public", "owner_phone keeps its name; its value is encrypted", "arkiv-encryption: the skill and the npm package"],
  B5: ["The explorer: every entity, transaction and wallet", "Opens an entity from the map"],
  T1: ["Hub: faucet, access keys", "Docs: installation, fundamentals, querying", "AI tools: plugin, MCP and skills for your agent"],
  T2: ["Meme: your agent without the plugin vs with it", "Arkiv AI plugin for Claude Code and Codex", "Setup steps live on the Hub: AI tools"],
  PZ: ["Mirror · Build on Arkiv · Node tooling, each with an entry tag", "Swarm bonus add-on: $500 from scratch, $500 Continuity", "(i) on each prize: its rubric; full rules on ETHGlobal"],
  L9: ["The mascot says the four verbs, then builds THANK YOU", "Docs · Hub · MCP · Prizes: click to open"],
};
