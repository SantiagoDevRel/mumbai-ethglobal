# From zero to hero with Arkiv, the Web3 database

**Write it. Query it. Own it. Expire it.**

The app behind Arkiv's workshop at ETHGlobal Mumbai (November 5, 2026). Five minutes of Arkiv 101,
then the room becomes the database: everyone scans a QR code, picks a name, a color, a country and a
lifetime (5 to 15 minutes, 15 by default), and their Arkiv entity drops onto a live 3D globe, where it
counts down and expires. The map is just a query, and the panel under it shows the query that ran.

| Route | Who | What |
|---|---|---|
| `/map` | Projector, left half | The live globe, the query panel and the QR. Presenter password. |
| `/slides` | Projector, right half | The slides, in step with `/map`. Presenter password. |
| `/scan` | Phones | Join the map: write one entity, then watch it on the projector |

`/` opens `/map`; the old `/j` and `/notes` links redirect to `/scan` and `/map`.

Present with the screen split in two: `/map` in one window, `/slides` in the other. The arrow keys
work in either window and move both. Reset (bottom right on /slides; on /map press ? to show it; click twice) starts a new session: an empty
map, fresh limits for every phone and the slides back at the start. D runs the 3 · 2 · 1 countdown on
the QR slide.

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

A phone makes one request:

1. It loads `/scan` (page files only; it asks the writer nothing).
2. "Write my entity" sends the form once (`POST /api/submit?wait=1`). The writer puts the entity in
   the running session, sends it, and answers when the block is in (a few seconds; after 25 s it
   answers "on its way" and the dot still lands on the map).
3. The phone shows the block, the explorer link and a countdown of the lifetime the person chose. The
   countdown runs on the phone's own clock and fetches nothing, so it can't see a Lifetime Extension:
   at zero it says the entity has expired unless someone extended it.

The live countdown, the extension and the expiration are on `/map`, which queries the DB-Chain once
per block through the writer's read proxy; the dot next to "Live · Arkiv DB-Chain" flashes each time a
query lands. `/map` stops reading while hidden or after 20 minutes without input.

| Session | CDN requests | Function invocations |
| --- | ---: | ---: |
| Rehearsal: 5 phones, 20 min | about 2,000 | about 2,000 |
| Workshop: 50 phones, 20 min | about 2,700 | about 2,000 |

Most of it is `/map` (about 60 reads a minute); each phone adds about 16 requests, page files
included, and one function invocation. On Vercel Pro that is well under 1% of the 1M CDN requests
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
