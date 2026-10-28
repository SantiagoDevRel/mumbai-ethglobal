// The script for each scene, one paragraph per item (WORKSHOP.md sections 2 and 3), and what each
// → reveals inside a scene (lib/stage/choreography.ts and the scene files). Not shown on screen:
// the talk runs from /map and /slides only.

import type { SceneId } from "../../shared/scenes";
import { A1_NOTES } from "./scenes/ai/A1";
import { A1B_NOTES } from "./scenes/ai/A1b";
import { A2_NOTES } from "./scenes/ai/A2";
import { A2B_NOTES } from "./scenes/ai/A2b";
import { A3_NOTES } from "./scenes/ai/A3";
import { A3B_NOTES } from "./scenes/ai/A3b";
import { A3C_NOTES } from "./scenes/ai/A3c";
import { A4_NOTES } from "./scenes/ai/A4";
import { PRIZES_NOTES } from "./scenes/ai/Prizes";
import { D1_NOTES } from "./scenes/data/D1";
import { D2_NOTES } from "./scenes/data/D2";
import { D3_NOTES } from "./scenes/data/D3";
import { D4_NOTES } from "./scenes/data/D4";
import { D5_NOTES } from "./scenes/data/D5";
import { D6_NOTES } from "./scenes/data/D6";
import { D7_NOTES } from "./scenes/data/D7";
import { D8_NOTES } from "./scenes/data/D8";

export const NOTES: Record<SceneId, string[]> = {
  S0: [
    "Phones out. Scan the code and fill the form. Hold the button: we write together in a moment.",
    "Start the session first (presenter controls, ?). Phones can write as soon as it runs. → starts the timer.",
  ],
  S1: [
    "Every app does two jobs. → Indexing on the left: tiny cards, sorted, so you can find things.",
    "→ Storage on the right: the heavy files, one at a time. They stay still until you say so.",
    "→ The meme on Google Maps: scroll a thousand places. → Or ask once, \"cafe, open now, 4.5 stars or more\", one answer.",
  ],
  S2: [
    "Open a place on Google Maps: photos and a video on top, name, rating and hours under them. When you filter, you search the small part, never the photos.",
    "→ The small fields move to Arkiv (indexing data). → The photos and video move to Swarm (storage).",
  ],
  S3: [
    "One pin, one entity. → Arkiv's fields: its key, its owner and creator (both wallets) and when it expires.",
    "→ Then your attributes underneath: whatever your app needs. You already wrote one of these: name, color, country and lifetime.",
  ],
  S4: [
    "The problem first: your data sits on one company's server. → Server down, rules changed, data gone.",
    "→ The answer: query Arkiv like a database. → The table. → The query runs: filter here, sort in your app.",
    "→ The table lives on a DB-Chain: every write is a transaction, anyone can query, owners are wallets.",
  ],
  S5: [
    "You don't write Solidity. You write entities, query them, and decide who owns them.",
    "One layer per →: Ethereum, the Arkiv DB-Chain (the dot blinks with the real latest block), your app.",
    "→ Own it: your app's wallet owns all four. → Give it to every user: each entity gets its own owner.",
  ],
  S6: [
    "One tile per →: write it, query it, own it, expire it, each with a still example under it.",
    "→ \"You did the first one. The other three, live.\" Then back to the map.",
  ],
  S7: [
    "Name. Color. Country. Lifetime: 5 to 15 minutes, 15 by default. → shows the lifetime card. Give them a few seconds to fill the form.",
    "Press D: 3 · 2 · 1 · write! Everyone taps Write my entity together. Then → to the map.",
  ],
  AG: [
    "Here is the rest of the talk, one part per →. Part one is done: your entity is on the map.",
    "Next, why it works. Then back to the map, how to model your data, and how to build it this weekend.",
  ],
  L1: [
    "Every dot is an entity you just wrote. This map has no backend database. It's one query, run again every block.",
    "Find yourself on the map. Point at the event log and the query panel.",
  ],
  L2: [
    "No cron job. No cleanup script. The DB-Chain forgets on time.",
    "Select three dots → E → Rabby → rings refill. \"Anyone can extend these. We switched on permissionless extension.\"",
    "Then Shift+E: save everyone still alive, one batch extension in Rabby (+20 minutes).",
    "Step 2 · the caption \"Expire it. Or extend it.\" \"The ones I didn't save are gone for good.\"",
  ],
  L3: [
    "Step 1 · India, no filter yet: dots spread across the whole country. \"Same country, different spots.\"",
    "Step 2 · color is orange: \"show me the orange ones\".",
    "Step 3 · country is India.",
    "Step 4 · inside this map view: \"what's on my screen right now\".",
    "Step 5 · owner is santiago: \"Hold that thought.\"",
    "Honest limit, on the query panel's app-side line: No ORDER BY. Your app sorts.",
  ],
  L4: [
    "Step 1 · Pick a dot and extend it first: \"let's keep this one alive while we look.\" Your attributes vs Arkiv fields. The slides half explains each field as you step.",
    "Step 2 · $key: its address, forever.",
    "Step 3 · $creator: who wrote it, never changes.",
    "Step 4 · $owner: who controls it, can change.",
    "Step 5 · $expiresAt: can be extended.",
    "The architect who built the house vs the family that lives in it.",
  ],
  L5: [
    "Step 1 · On the dots: \"What if every dot were a business?\" Inspect a dot, B makes it a business → Rabby → a real patch adds category, rating and opening hours.",
    "Step 2 · Business view in Mumbai at street level. Filters: category is cafe · rating 4.5 or more · open now (app-side).",
    "Step 3 · The reviews: each review is its own entity pointing to the business.",
    "Point at the business card footer: Photos: Swarm. Everything you filter on: Arkiv.",
  ],
  L6: [
    "Step 1 · \"One wallet, santiago's, owns every entity on this map.\" Sound familiar? That's every platform today.",
    "Step 2 · The real transfer: in the entity card, paste a wallet address and press Transfer ownership. Rabby (the MUMBAI account, the writer wallet) asks to sign. $owner changes on the next query; $creator stays santiago.",
  ],
  L7: [
    "Everything you just did, in plain words, one row per →: you wrote an entity, the map queried it, owners are wallets, and it expires on time.",
  ],
  L8: [
    "One card per →: Docs, the Hub, AI tools (your agent already knows Arkiv) and Prizes.",
    "The corner QR still opens /scan: anyone who arrives late can still write an entity.",
  ],
  L9: [
    "Write it. Query it. Own it. Expire it. Thank you.",
    "Phones count down the lifetime each person chose; the map shows the real expiration and any extension.",
  ],
  D1: D1_NOTES,
  D2: D2_NOTES,
  D3: D3_NOTES,
  D4: D4_NOTES,
  D5: D5_NOTES,
  D6: D6_NOTES,
  D7: D7_NOTES,
  D8: D8_NOTES,
  LM: [
    "Back to the map: everything you just saw is what these dots are. Still live, still counting down.",
  ],
  A1: A1_NOTES,
  A1b: A1B_NOTES,
  A2: A2_NOTES,
  A2b: A2B_NOTES,
  A3: A3_NOTES,
  A3b: A3B_NOTES,
  A3c: A3C_NOTES,
  A4: A4_NOTES,
  PZ: PRIZES_NOTES,
};

/** What → reveals from each step, for every step but the last (the last → goes to the next scene). */
export const REVEALS: Record<SceneId, string[]> = {
  S0: [],
  S7: ["the lifetime card"],
  L1: [],
  AG: ["part 2 · Why Arkiv", "part 3 · Expire it. Query it. Own it.", "part 4 · Model it", "part 5 · Build it this weekend"],
  S1: ["the Indexing column", "the Storage column (still)", "the meme: scroll a thousand places", "the answer: one query"],
  S2: ["the fields move to Arkiv", "the media move to Swarm"],
  S3: ["Arkiv's fields", "your attributes"],
  S4: ["Server down. Rules changed. Data gone.", "the answer: query it like a database", "the table", "the query runs", "the table lives on a DB-Chain"],
  S5: ["the Arkiv DB-Chain layer", "the Your app layer", "own it: one app wallet", "give it to every user"],
  S6: ["tile 2 · Query it", "tile 3 · Own it", "tile 4 · Expire it", "\"You did the first one\""],
  L2: ["the caption: Expire it. Or extend it."],
  L3: ["filter: color is orange", "filter: country is India", "filter: inside this map view", "filter: owner is santiago"],
  L4: ["the $key badge", "the $creator badge", "the $owner badge", "the $expiresAt badge"],
  L5: ["the answer: business view, flying to Mumbai street level", "the reviews and the caption \"Each review is its own entity.\""],
  L6: ["the transfer: paste a wallet, Transfer ownership, Rabby"],
  L7: ["Query it", "Own it", "Expire it"],
  D1: ["attributes", "name · type · value", "every pin is one"],
  D2: ["Arkiv's fields"],
  D3: ["yes or no", "numbers", "text", "Ethereum", "files", "the closing line"],
  D4: ["a query that works", "a query that fails", "the closing line"],
  D5: ["readonly ON", "permissionlessExtension ON", "the closing line"],
  D6: ["the phone is public", "encrypt", "decrypt, or only bytes", "the closing line"],
  D7: ["the owner asks", "the first transfer", "the other three", "who can do what"],
  D8: ["deleted: the query returns nothing", "the create transaction still holds the data", "a query at that block still returns it", "the takeaway"],
  LM: [],
  A1: ["the agent's answer", "out of date", "With MCP: network_status", "Add it once"],
  A1b: ["tools", "prompts", "documents"],
  A2: ["data modeling", "app integration", "query", "troubleshooting"],
  A2b: ["arkiv-query, level 1", "level 2", "level 3", "back to the map"],
  A3: ["install line 1", "install line 2", "install line 3", "install line 4", "the ask", "what your agent uses 1", "what your agent uses 2", "what your agent uses 3", "what your agent uses 4", "ready", "which one to use"],
  A3b: ["Arkiv's parts", "plugin.json", "skills/", "hooks/", ".mcp.json", "evals/", "dashed parts and install line"],
  A3c: ["what it does at each moment", "Claude Code vs Codex", "what your agent sees"],
  A4: ["your agent clicks Save", "the wallet asks to sign", "your agent signs", "the pin lands, verify_tx confirms"],
  L8: ["Hub", "AI tools", "Prizes"],
  PZ: ["Mirror", "Build on Arkiv from scratch", "Continuity", "Node tooling", "Arkiv + Swarm bonus", "the total"],
  L9: [],
};
