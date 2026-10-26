# From zero to hero with Arkiv, the Web3 database

**Write it. Query it. Own it. Expire it.**

The app behind Arkiv's workshop at ETHGlobal Mumbai (November 5, 2026). Five minutes of Arkiv 101,
then the room becomes the database: everyone scans a QR code, picks a name, a color, a country and a
lifetime (5 to 15 minutes, 15 by default), and their Arkiv entity drops onto a live 3D globe with its own
countdown. The map is just a query, and the panel under it shows the query that ran.

| Route | Who | What |
|---|---|---|
| `/map` | Projector, left half | The live globe, the query panel and the QR. Presenter password. |
| `/slides` | Projector, right half | The slides, in step with `/map`. Presenter password. |
| `/scan` | Phones | Join the map, then follow your entity |

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

Polling is what costs requests, so it is cheap by design:

- `/api/session` (each phone, every 3 s until it writes) is cached by Vercel's CDN for 2 s.
- Each written phone polls its own ticket every 5 s; the DB-Chain is queried once per two seconds for
  the whole room, not once per phone.
- Phones and the presenter pages stop polling while the tab is hidden or the phone is locked.

| Session | CDN requests | Function invocations |
| --- | ---: | ---: |
| Rehearsal: 5 phones, 20 min | about 3,000 | about 1,500 |
| Workshop: 200 phones, 20 min, all on screen the whole time | about 120,000 | about 42,000 |

On Vercel Pro that is about 12% of the 1M CDN requests included each month and under 5 cents of
function invocations; the database runs on Neon's free plan. Load test evidence:
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
