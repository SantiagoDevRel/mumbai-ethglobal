// Speaker notes for /notes, one paragraph per item (WORKSHOP.md sections 2 and 3), and what each
// → reveals inside a scene (lib/stage/choreography.ts and the scene files). "Step n" matches the
// "Step n of N" line on /notes.

import type { SceneId } from "../../shared/scenes";

export const NOTES: Record<SceneId, string[]> = {
  S0: [
    "Phones out. Scan the code. Don't press anything yet, you'll get your moment.",
    "Start the session first (Workshop writer). The phone shows a waiting room. → starts the timer.",
  ],
  S1: [
    "Storage keeps the bytes. Indexing data helps you find them: a photo album vs one index card.",
    "Step 2 · the mascot meme: scroll through gigabytes of videos vs search a tiny card.",
  ],
  S2: [
    "When you filter 'cafés, open now, 4 stars or more', you search the pins, never the photos.",
    "Step 2 · the pin pulls apart: indexing data on top (Arkiv), storage underneath (Swarm).",
  ],
  S3: [
    "Keep this picture. In three minutes you'll be one of these.",
    "Step 2 · Arkiv's fields underneath and the milk carton: best before block #…",
  ],
  S4: [
    "Same idea you know: tables and queries. The difference is where it lives and who controls it.",
    "Step 2 · the DB-Chain side: every write is a transaction, anyone can query, owners are wallets.",
  ],
  S5: [
    "You don't write Solidity. You write entities and query them.",
    "The block counter is live from the chain; the block time is measured, not typed in.",
    "Step 2 · the meme: Nobody: / Arkiv: removes the EVM on purpose.",
  ],
  S6: [
    "Four tiles, one per →: Write it, Query it, Own it, Expire it.",
    "Let's do all four. Live. With you.",
  ],
  S7: [
    "Name. Color. Country. Lifetime: 5 to 15 minutes, 15 by default. Give them a few seconds to fill the form.",
    "Press D: 3 · 2 · 1 · write! Every phone unlocks at once. Then → to the map.",
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
    "Step 1 · Pick a dot and extend it first: \"let's keep this one alive while we look.\" Your columns vs Arkiv fields.",
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
    "Step 1 · Owner view: every dot draws a line to one santiago badge. \"Santiago owns all the businesses' data.\" Pause. \"Sound familiar? That's every platform today.\"",
    "Step 2 · The transfer (T works too): the lines cut, each business gets its own owner badge. \"Each business owns its own data.\"",
    "Demo view: nothing on-chain changes. In your app: changeOwnership for each entity, or one executeBatch.",
  ],
  L7: [
    "This is the code that ran today. Copy it.",
    "Write, extend and query are the calls that ran (the create shows sample values; the query is today's session). Own it is marked not run today: today's finale was a demo view, this is the call for your app.",
  ],
  L8: [
    "Docs, the Arkiv AI plugin (your agent already knows Arkiv), the Arkiv MCP.",
    "The QR now says Start building: the same URL opens the resources on their phones.",
  ],
  L9: [
    "Write it. Query it. Own it. Expire it. Thank you.",
    "Phones show each person's entity in its final state.",
  ],
};

/** What → reveals from each step, for every step but the last (the last → goes to the next scene). */
export const REVEALS: Record<SceneId, string[]> = {
  S0: [],
  S1: ["the meme: gigabytes of videos vs a tiny card"],
  S2: ["the pin pulled apart: indexing data (Arkiv) on top, storage (Swarm) underneath"],
  S3: ["Arkiv's fields under your columns and the milk carton"],
  S4: ["the DB-Chain side: the same table held by blocks"],
  S5: ["the meme: Nobody: / Arkiv: removes the EVM on purpose"],
  S6: ["tile 2 · Query it", "tile 3 · Own it", "tile 4 · Expire it, and \"Let's do all four\""],
  S7: [],
  L1: [],
  L2: ["the caption: Expire it. Or extend it."],
  L3: ["filter: color is orange", "filter: country is India", "filter: inside this map view", "filter: owner is santiago"],
  L4: ["the $key badge", "the $creator badge", "the $owner badge", "the $expiresAt badge"],
  L5: ["the answer: business view, flying to Mumbai street level", "the reviews and the caption \"Each review is its own entity.\""],
  L6: ["the transfer (demo view): each business owns its data"],
  L7: [],
  L8: [],
  L9: [],
};
