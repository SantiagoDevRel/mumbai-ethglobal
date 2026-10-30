// The script for each scene, one paragraph per item (outline v3, MUMBAI-ETHGLOBAL/OUTLINE.md), and
// what each → reveals inside a scene (lib/stage/choreography.ts and the scene files). Never on the
// projector: /outline shows them to the presenter.

import type { SceneId } from "../../shared/scenes";
import { A1_NOTES } from "./scenes/ai/A1";
import { PRIZES_NOTES } from "./scenes/ai/Prizes";
import { B5_NOTES } from "./scenes/B5";
import { D6_NOTES } from "./scenes/data/D6";
import { TOUR } from "./scenes/me-tour";
import { NT_NOTES } from "./scenes/NT";
import { ST_NOTES } from "./scenes/ST";
import { T1_NOTES } from "./scenes/T1";
import { W1_NOTES } from "./scenes/W1";
import { W2_NOTES } from "./scenes/W2";
import { W3_NOTES } from "./scenes/W3";
import { W4_NOTES } from "./scenes/W4";

export const NOTES: Record<SceneId, string[]> = {
  S0: [
    "Hi, I'm Santiago from Arkiv. In twenty minutes you'll write your own entity from your phone, and we'll query it, transfer it and extend it live on the map. Keep your phone in your pocket for a moment.",
    "Start the session first (presenter controls, ?). → starts the timer.",
  ],
  ME: [
    "I'm santiagodevrel, at Arkiv: the first DevRel to do a Web3 Africa tour. Before Arkiv I worked for L1s, ChainSafe, L2s like Lisk and web3.js.",
    `Each → drops the next photo on the pile and lights its flag on the route: ${TOUR.map((stop) => stop.name).join(", ")}.`,
  ],
  IX: [
    "Four parts, one per →. Why Arkiv. The five steps before your first write, and what Arkiv DB-Chain is not. Then you build your entity with me, live, from your phone. And the resources and prizes for this weekend. The bar at the top shows where we are.",
  ],
  W1: W1_NOTES,
  W2: W2_NOTES,
  W3: W3_NOTES,
  W4: W4_NOTES,
  ST: ST_NOTES,
  NT: NT_NOTES,
  S7: [
    "Switch Writing ON on /map before this scene: phones only write while it is on. Phones out: this is your first entity. Scan the code and fill the form: a name, a color, a country, and how long it lives, 5 to 15 minutes, or Permanent, which the phone shows with its deadline, 2**64 − 1. Everything is saved in lowercase. Don't press Write yet: we write together.",
    "→ shows your entity: name, color and country are attributes anyone can query by, and expiration is its Entity Expiration, 15 minutes unless you moved the slider. Press D for the write! frame: everyone taps Write my entity together. Then → to the map.",
  ],
  L1: [
    "Every dot is an entity you just wrote: your phone sent one request, our wallet signed for the room. The list on the right shows every write as it lands; click a dot for its entity card (no expiration shows $expiresAt = 2**64 − 1). Click Write it: the call your phone triggered, createEntity. Select each part as you name it: attributes (your form plus a category our app picked, what anyone can query by), expires (Entity Expiration, the lifetime you chose), entityKey (the entity's address on the DB-Chain). In your app, your user's wallet or your server signs. Click Query it: Arkiv has a query language, like a database. Every cafe AND only the ones in India; in the SDK, one where per clause. It also has OR, NOT and comparisons. Click + AND name: one more clause narrows it to one place. Values match exactly, which is why everything you wrote is in lower case. Esc closes the code; → runs queries like it on your entities.",
  ],
  L3: [
    "The same kind of query, on your entities. No filter yet: every entity in this session, on the whole globe. Filter by hand in the bar at the top: a name, a country (the camera flies there) or a color. The query panel shows each clause on its own line, joined by AND.",
    "Own it: click a dot, press Transfer ownership, type 0x and a space for a fresh random wallet (or paste one), then sign once in Rabby (the MUMBAI account, the writer wallet). $owner changes on the next query, and only that wallet can update or delete the entity now. Extend: press Extend in the card (or select dots and E), sign in Rabby, and the ring refills: we switched on permissionless extension, so anyone can extend these.",
  ],
  B4: D6_NOTES,
  B5: B5_NOTES,
  T1: T1_NOTES,
  T2: A1_NOTES,
  PZ: PRIZES_NOTES,
  L9: [
    "The mascot says the four verbs, one pose each: Write it. Query it. Own it. Expire it. Then it comes apart into bricks that build THANK YOU, and a small copy waves. A click on the bricks plays it again. Thank you. The START BUILDING links (docs, Hub, MCP, prizes) open in a new tab.",
  ],
};

/** What → reveals from each step, for every step but the last (the last → goes to the next scene). */
export const REVEALS: Record<SceneId, string[]> = {
  S0: [],
  ME: TOUR.slice(1).map((stop) => `photo · ${stop.name}`),
  IX: ["part 2 · Five steps", "part 3 · Build your entity", "part 4 · Resources and prizes"],
  W1: ["the three cards and \"One company decides for you.\""],
  W2: ["the hug: all three robots together"],
  W3: ["column: from web3", "column: of its own, and the closing line"],
  W4: ["your app: SDK or JSON-RPC into the DB-Chain", "your logic: chain logos or a web2 backend", "storage: Swarm and IPFS"],
  ST: ["step 2 · a wallet, with Add network", "step 3 · test funds", "step 4 · free reads, with Get balance", "step 5 · an RPC access key"],
  NT: ["not built for big files", "not private by default"],
  S7: ["your entity: name, color, country and its expiration"],
  L1: [],
  L3: [],
  B4: ["owner_phone, encrypted", "the arkiv-encryption skill and npm package"],
  B5: [],
  T1: ["Docs", "AI tools"],
  T2: [],
  PZ: ["Build on Arkiv from scratch", "Build on Arkiv, Continuity", "Node tooling", "the Arkiv + Swarm bonus add-on"],
  L9: [],
};
