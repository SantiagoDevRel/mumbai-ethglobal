// Speaker notes for /notes, one paragraph per item (WORKSHOP.md sections 2 and 3).

import type { SceneId } from "../../shared/scenes";

export const NOTES: Record<SceneId, string[]> = {
  S0: [
    "Phones out. Scan the code. Don't press anything yet, you'll get your moment.",
    "The phone shows a waiting room. Press → to start the timer.",
  ],
  S1: [
    "Storage keeps the bytes. Indexing data helps you find them.",
    "→ reveals the mascot meme: scroll through gigabytes of videos vs search a tiny card.",
  ],
  S2: [
    "When you filter 'cafés, open now, 4 stars or more', you search the pins, never the photos.",
    "→ pulls the pin apart: indexing data on top (Arkiv), storage underneath (Swarm).",
  ],
  S3: [
    "Keep this picture. In three minutes you'll be one of these.",
    "→ shows Arkiv's fields underneath and the milk carton: best before block #…",
  ],
  S4: [
    "Same idea you know: tables and queries. The difference is where it lives and who controls it.",
    "→ reveals the DB-Chain side: every write is a transaction, anyone can query, owners are wallets.",
  ],
  S5: [
    "You don't write Solidity. You write entities and query them.",
    "The block counter is live from the chain; the block time is measured, not typed in.",
    "→ reveals the meme: Nobody: / Arkiv: removes the EVM on purpose.",
  ],
  S6: [
    "Four tiles, one per →: Write it, Query it, Own it, Expire it.",
    "Let's do all four. Live. With you.",
  ],
  S7: [
    "Name. Color. Country. Lifetime: 20 seconds to 2 minutes. Give them a few seconds to fill the form.",
    "Press D: 3 · 2 · 1 · write! Every phone unlocks at once. Then → to the map.",
  ],
  L1: [
    "Every dot is an entity you just wrote. This map has no backend database. It's one query, run again every block.",
    "Find yourself on the map. Point at the event log and the query panel.",
  ],
  L2: [
    "No cron job. No cleanup script. The DB-Chain forgets on time.",
    "Select three dots → E → Rabby → rings refill. \"Anyone can extend these. We switched on permissionless extension.\"",
    "Then Shift+E: save everyone still alive, one batch extension in Rabby (+20 minutes). → for the caption after.",
    "\"The ones I didn't save are gone for good.\"",
  ],
  L3: [
    "Fly to India: dots spread across the whole country. \"Same country, different spots.\"",
    "One filter per →: color is orange (\"show me the orange ones\") · country is India · inside this map view (\"what's on my screen right now\") · owner is santiago (\"Hold that thought.\").",
    "Honest limit, on the query panel's app-side line: No ORDER BY. Your app sorts.",
  ],
  L4: [
    "Pick a dot and extend it first: \"let's keep this one alive while we look.\"",
    "Your columns vs Arkiv fields. $key: its address, forever. $creator: who wrote it, never changes. $owner: who controls it, can change. $expiresAt: can be extended.",
    "The architect who built the house vs the family that lives in it.",
  ],
  L5: [
    "\"What if every dot were a business?\" Make it a business on the inspected dot → Rabby → a real patch adds category, rating and opening hours.",
    "B for business view: fly to Mumbai at street level. Filters: category is cafe · rating 4.5 or more · open now (app-side).",
    "Business card with its reviews: each review is its own entity pointing to the business.",
    "Point at the business card footer: Photos: Swarm. Everything you filter on: Arkiv.",
  ],
  L6: [
    "Owner view: every dot draws a line to one santiago badge. \"Santiago owns all the businesses' data.\" Pause. \"Sound familiar? That's every platform today.\"",
    "T: transfer ownership. The lines cut, each business gets its own owner badge. \"Each business owns its own data.\"",
    "Demo view: nothing on-chain changes. In your app: changeOwnership for each entity, or one executeBatch.",
  ],
  L7: [
    "This is the code that ran today. Copy it.",
    "Write, extend and query are the calls that ran (the create shows sample values; the query is today's session). Own it is labeled app-side: today's finale was a demo view, this is the call for your app.",
  ],
  L8: [
    "Docs, the Arkiv AI plugin (your agent already knows Arkiv), the Arkiv MCP.",
    "The corner QR now says Start building: the same URL opens the resources on their phones.",
  ],
  L9: [
    "Write it. Query it. Own it. Expire it. Thank you.",
    "Phones show each person's entity in its final state.",
  ],
};
