// The script for each scene, one paragraph per item (outline v3, MUMBAI-ETHGLOBAL/OUTLINE.md), and
// what each → reveals inside a scene (lib/stage/choreography.ts and the scene files). Never on the
// projector: /outline shows them to the presenter.

import type { SceneId } from "../../shared/scenes";
import { A1_NOTES } from "./scenes/ai/A1";
import { PRIZES_NOTES } from "./scenes/ai/Prizes";
import { B2_NOTES } from "./scenes/B2";
import { B3_NOTES } from "./scenes/B3";
import { B5_NOTES } from "./scenes/B5";
import { D6_NOTES } from "./scenes/data/D6";
import { ST_NOTES } from "./scenes/ST";
import { T1_NOTES } from "./scenes/T1";
import { W1_NOTES } from "./scenes/W1";
import { W2_NOTES } from "./scenes/W2";
import { W3_NOTES } from "./scenes/W3";
import { W4_NOTES } from "./scenes/W4";

export const NOTES: Record<SceneId, string[]> = {
  S0: [
    "Hi, I'm Santiago from Arkiv. In twenty minutes you'll write, query, own and expire your own entities, from your phone. Keep it in your pocket for a moment.",
    "Start the session first (presenter controls, ?). → starts the timer.",
  ],
  IX: [
    "Four parts. Why Arkiv. The five steps before your first write. Then you build it with me, live, from your phone. And the tools and prizes for this weekend. The bar at the top shows where we are.",
  ],
  W1: W1_NOTES,
  W2: W2_NOTES,
  W3: W3_NOTES,
  W4: W4_NOTES,
  ST: ST_NOTES,
  S7: [
    "Switch Writing ON on /map before this scene: phones only write while it is on. Phones out. Scan the code and fill the form: name, color, country and a lifetime from 5 to 15 minutes. Don't press Write yet.",
    "→ shows what your form becomes: one entity. Three attributes anyone can query by, and an Entity Expiration. Press D for the write! frame: everyone taps Write my entity together. Then → to the map.",
  ],
  L1: [
    "Every dot is an entity you just wrote. Your phone sent one request; our wallet signed for the room. Find yourself on the map: the list on the right shows every write as it lands.",
  ],
  B2: B2_NOTES,
  B3: B3_NOTES,
  L3: [
    "Same query, on your entities. Step 1 · no filter yet: every entity in this session, and the camera flies to India.",
    "Step 2 · color is orange.",
    "Step 3 · AND country is India. The query panel at the bottom shows the query text, with AND.",
  ],
  L6: [
    "Step 1 · \"One wallet, ours, owns every entity on this map: we signed for the room.\" The entity card shows its $owner.",
    "Step 2 · The real transfer: in the entity card, paste a wallet address and press Transfer ownership. Rabby (the MUMBAI account, the writer wallet) asks to sign. $owner changes on the next query. In your app, each user can own their own entities. And anyone can write any attribute, so when you only trust your own writes, filter by $owner too.",
  ],
  L2: [
    "Entity Expiration: no cron job, no cleanup script. The DB-Chain forgets on time.",
    "Select three dots → E → Rabby → rings refill. \"Anyone can extend these. We switched on permissionless extension.\"",
    "Step 2 · the caption \"Expire it. Or extend it.\" \"The ones nobody extended drop out of every query.\"",
  ],
  B4: D6_NOTES,
  B5: B5_NOTES,
  T1: T1_NOTES,
  T2: A1_NOTES,
  PZ: PRIZES_NOTES,
  L9: [
    "Write it. Query it. Own it. Expire it. Thank you. The links are on the right.",
    "The corner QR still opens the form: anyone who arrives late can still write an entity.",
  ],
};

/** What → reveals from each step, for every step but the last (the last → goes to the next scene). */
export const REVEALS: Record<SceneId, string[]> = {
  S0: [],
  IX: [],
  W1: ["the three cards and \"One company decides. Alone.\""],
  W2: [],
  W3: ["column: from web3", "column: of its own, and the closing line"],
  W4: ["where your data goes: Arkiv and Swarm"],
  ST: ["step 2 · a wallet", "step 3 · test funds", "step 4 · free reads", "step 5 · an RPC access key"],
  S7: ["your form as an entity"],
  L1: [],
  B2: ["what each part is"],
  B3: ["the same query in the SDK"],
  L3: ["filter: color is orange", "filter: country is India"],
  L6: ["the caption: Transfer it: paste a wallet, sign once."],
  L2: ["the caption: Expire it. Or extend it."],
  B4: ["encrypt into the payload", "decrypt, or only bytes, and the closing line"],
  B5: [],
  T1: ["Docs"],
  T2: ["out of date", "With MCP: network_status, and how to add it"],
  PZ: ["Build on Arkiv from scratch", "Continuity", "Node tooling", "Arkiv + Swarm bonus", "the total"],
  L9: [],
};
