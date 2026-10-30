# From zero to hero with Arkiv, the Web3 database

**Write it. Query it. Own it. Expire it.**

The app behind Arkiv's workshop at ETHGlobal Mumbai (November 5, 2026), in four parts: why Arkiv, the
five steps before your first write (and what Arkiv is not), building your entity, and the resources and
prizes for the weekend. An index after the title lists the parts, and a bar across the top shows where
the talk is. In "Build your entity" everyone scans a QR code, picks a name, a color, a country and a
lifetime (5 to 15 minutes, 15 by default, or no expiration), and their Arkiv entity drops onto a live 3D
globe, where it counts down and expires, or stays. Everything is stored in lower case. Each idea gets
one slide, then runs on the room's own entities: write it and query it (the panel under the map shows
the query that ran: Code, the SDK call the app runs; Query, the query text the SDK sends to the
DB-Chain). The entity card transfers and extends any entity. Expired dots leave the map.

| Route | Who | What |
|---|---|---|
| `/map` | Projector | The whole talk: the live globe, the query panel, the QR, and the slides between map scenes. Presenter password. |
| `/slides` | Optional second window | The slides alone, in step with `/map`. Presenter password. |
| `/outline` | Presenter | The talk at a glance: each part folds open or shut, and each scene shows its slide and a few short points (no script, no times). Click a slide to zoom in and step through its reveals. Marks the scene on screen when `/map` or `/slides` is open in the same browser. Presenter password. |
| `/scan` | Phones | Join the map: write an entity (up to ten per phone per session), then watch it on the projector |

`/` opens `/map`; the old `/j` and `/notes` links redirect to `/scan` and `/map`.

Present from `/map` full screen: one thing at a time, map scenes and slides in one window
(scene order in `shared/scenes.ts`). `/slides` can still sit beside it on a split screen; the arrow
keys work in either window and move both. The presenter card opens with the small ? button at the bottom left, or the ? key (¿ and / work too; Esc closes it). It lists every scene to jump to, the keys, and Reset (also bottom right on /slides; click twice), which starts a new session: an empty
map, fresh limits for every phone and the slides back at the start. D runs the 3 · 2 · 1 countdown on
the QR slide.

Every reveal is one →; nothing moves on a timer, except the close (L9): on entry the mascot says the
four verbs and its cubes build THANK YOU in bricks, once (a click on the bricks plays it again; with
reduced motion the last frame shows at once). The dots and the scene counter (n / N) at the bottom
right show the steps of the current scene and where it is in the talk. Drag with the right mouse button, on a slide or on the map (panels and the QR card
included), to draw a rectangle that points at something; a right-click without dragging clears them,
and so does the next step or scene. The left button keeps clicks, text selection and moving the globe.

On L3 the filter bar along the top filters by name (starts with), country (the camera flies there) and
color; it counts the results and the query panel marks each filter line as you type. Text is stored in
lower case. Click a dot on L1 or L3 to open its entity card: the attributes the phone put in (name,
color, country), then a … row that shows the ones the app adds; `$key`, `$owner` and `$expiresAt`
beside them; and one row of actions: Extend | Transfer | Delete | ↗ (the entity in the data explorer,
in a new tab). Transfer asks for the new owner's wallet address; Transfer and Delete each sign one
transaction with Rabby. Type 0x then Space to fill in a random wallet. Rabby must use the writer wallet
(the account named MUMBAI): only the current owner can transfer or delete, so both are off once another
wallet owns the entity. A deleted dot leaves the map on the next query and the log says "deleted". An
entity with no expiration shows `$expiresAt` = 2**64 − 1, has no countdown and nothing to extend:
Extend is off and sends nothing. A click on the globe away from any dot closes the card. Dots in one country are spread apart, and each dot is a cafe,
restaurant, bookstore or parking, picked by the writer.

Phones can write only while the **Writing ON | OFF** switch (bottom left, beside ?) is ON. ON starts a
session if none is running and opens writes; OFF pauses them and keeps the map. Phones that write
while it is OFF see "Not open yet" or "Writing is paused".

## How it works

```
phone /scan ──POST /api/submit──► writer (this app's /api on Vercel + Postgres) ──► Arkiv DB-Chain (Tiramisu)
                                                                                      ▲
/map and /slides ── query every block, via the writer's keyed read proxy ─────────────┘
```

- Every entity is written by one writer wallet, with permissionless extension on, so anyone can extend it.
- Every query is scoped by `$creator` (the writer) and the `app` attribute.
- One sender at a time: a lease in Postgres lets only one function instance sign for the writer wallet, at most one batch per block.
- Entities are made only of queryable attributes (empty payload): your columns, plus Arkiv's `$key`, `$owner`, `$creator` and `$expiresAt`.
- "No expiration" writes with `ExpirationTime.permanent()`: `$expiresAt` is 2**64 − 1, with the same gas estimate as a 15-minute lifetime (Tiramisu, October 29, 2026).

## Run it

```bash
npm install
npm run dev            # the app and its writer on http://localhost:3000
```

The app runs on mock data until `NEXT_PUBLIC_WRITER_URL` is set: `same-origin` for the app's own
`/api`. The writer also needs `DATABASE_URL` (Postgres), `ARKIV_PROFILE`, `RPC`, `ACCESS_KEY`,
`WORKSHOP_WRITER_PRIVATE_KEY`, `WORKSHOP_PRESENTER_TOKEN`, `PRESENTER_PASSWORD` and
`MIN_WRITER_BALANCE_WEI`, all server-side only. `writer/` is the earlier Cloudflare Worker, kept for
rollback.

## Requests and limits

Each entity a phone writes is one request:

1. It loads `/scan` (page files only; it asks the writer nothing).
2. "Write my entity" sends the form once (`POST /api/submit?wait=1`). The writer puts the entity in
   the running session, sends it, and answers when the block is in (a few seconds; after 25 s it
   answers "on its way" and the dot still lands on the map).
3. The phone shows the block, the explorer link and a countdown of the lifetime the person chose
   (with no expiration: `$expiresAt = 2**64 − 1` and no countdown). The countdown runs on the phone's
   own clock and fetches nothing, so it can't see a Lifetime Extension: at zero it says the entity has
   expired unless someone extended it.
4. "Create new entity" brings the form back; a refresh does too. A phone can write up to
   `MAX_ENTITIES_PER_DEVICE` (10) entities per session, and its list ("Your entities") keeps a local
   countdown for each. The session takes at most `MAX_ENTITIES_PER_SESSION` (400).

The live countdown, the extension and the expiration are on `/map`, which queries the DB-Chain once
per block through the writer's read proxy; the status ("Updated · block #N") sits in the presenter's
"?" card, never on the stage. `/map` stops reading while hidden or after 20 minutes without input.

| Session | CDN requests | Function invocations |
| --- | ---: | ---: |
| Rehearsal: 5 phones, 20 min | about 2,000 | about 2,000 |
| Workshop: 50 phones, 20 min | about 2,700 | about 2,000 |
| Workshop, every phone at its limit (400 entities, the session cap) | about 3,100 | about 2,400 |

Most of it is `/map` (about 60 reads a minute); each phone adds about 16 requests, page files
included, and one function invocation per entity. On Vercel Pro that is well under 1% of the 1M CDN requests
included each month; the database runs on Neon's free plan. The load tests ran 200 phones:
[writer/vercel-loadtest.md](./writer/vercel-loadtest.md).

## Network

Tiramisu testnet with `@arkiv-network/sdk` 0.8.x. To change the network or the SDK, see
[AGENTS.md](./AGENTS.md#changing-the-network-or-the-sdk).

Arkiv testnet: everything written here is public.

## License

[MIT](./LICENSE)

## Brand assets

The MIT license covers the code. The Arkiv logos and brand assets in `public/brand/` belong to Golem Factory and are not covered by it.

The mascot art in `public/deck/mascot/` (3D renders made with ChatGPT image generation from the team's reference art) is a proposal pending brand review and is not covered by the MIT license.

The photos in `public/deck/me/` are the speaker's own and are not covered by the MIT license. The round flags in `public/deck/flags/` are unchanged files from circle-flags (MIT): see [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
