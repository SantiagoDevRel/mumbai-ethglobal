// The script for each scene, one paragraph per item (WORKSHOP.md sections 2 and 3), and what each
// → reveals inside a scene (lib/stage/choreography.ts and the scene files). Not shown on screen:
// the talk runs from /map and /slides only.

import type { SceneId } from "../../shared/scenes";

export const NOTES: Record<SceneId, string[]> = {
  S0: [
    "Phones out. Scan the code. Don't press anything yet, you'll get your moment.",
    "Start the session first (Workshop writer). The phone shows a waiting room. → starts the timer.",
  ],
  S1: [
    "Storage keeps the heavy files: videos scroll past one by one. Indexing is the tiny cards, sorted so you can find things.",
    "Step 2 · the thumbs meme on Google Maps: scroll a thousand places vs ask once, \"cafe, open now, 4.5 stars or more\", one answer.",
  ],
  S2: [
    "Open a place on Google Maps: photos and a video on top, name, rating and hours under them. When you filter, you search the small part, never the photos.",
    "Step 2 · the card pulls apart: the small fields fly to Arkiv (indexing data), the photos and video to Swarm (storage).",
  ],
  S3: [
    "Every entity starts with Arkiv's fields: its key, its owner and creator (both wallets) and when it expires.",
    "Step 2 · then your attributes underneath: whatever your app needs. Keep this picture: in three minutes you'll be one of these.",
  ],
  S4: [
    "The problem first: your data sits on one company's server. Server down, rules changed, data gone.",
    "Step 2 · the answer, on its own: you query Arkiv like a database, and the table lives on a DB-Chain. Every write is a transaction, anyone can query, owners are wallets.",
  ],
  S5: [
    "You don't write Solidity. You write entities, query them, and decide who owns them.",
    "The green dot blinks with the real latest block.",
    "Step 2 · own it, or give it to every user: the same four entities owned by your app's wallet, then each by its own user.",
  ],
  S6: [
    "Four tiles, one per →, each with a tiny example under it: writing an entity, a simple query, the owner changing hands, an entity expiring.",
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
    "Step 1 · Owner view: every dot draws a line to one santiago badge. \"Santiago owns all the businesses' data.\" Pause. \"Sound familiar? That's every platform today.\"",
    "Step 2 · The transfer (T works too): the lines cut, each business gets its own owner badge. \"Each business owns its own data.\"",
    "Demo view: nothing on-chain changes. In your app: changeOwnership for each entity, or one executeBatch.",
  ],
  L7: [
    "Everything you just did, in plain words: you wrote an entity, the map queried it, owners are wallets, and it expires on time.",
  ],
  L8: [
    "Docs, the Hub, AI tools (your agent already knows Arkiv) and Prizes. Click Prizes to open it (empty until the prizes are final).",
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
  S1: ["the thumbs meme: scroll a thousand places vs one query"],
  S2: ["the place card pulled apart: indexing data to Arkiv, storage to Swarm"],
  S3: ["your attributes under Arkiv's fields"],
  S4: ["the answer: query like a database, the table on a DB-Chain"],
  S5: ["own it, or give it to every user"],
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
