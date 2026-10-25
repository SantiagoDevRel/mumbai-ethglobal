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
phone /scan ──POST──► writer (Cloudflare Worker + Durable Object) ──► Arkiv DB-Chain (Tiramisu)
                                                                         ▲
/map and /slides (static Next.js) ── query every block, via the writer ──┘
```

- Every entity is written by one writer wallet, with permissionless extension on, so anyone can extend it.
- Every query is scoped by `$creator` (the writer) and the `app` attribute.
- Entities are made only of queryable attributes (empty payload): your columns, plus Arkiv's `$key`, `$owner`, `$creator` and `$expiresAt`.

## Run it

```bash
npm install
npm run dev            # the app on http://localhost:3000
cd writer && npm install && npx wrangler dev   # the writer
```

The app runs on mock data until `NEXT_PUBLIC_WRITER_URL` points at a writer.

## Network

Tiramisu testnet with `@arkiv-network/sdk` 0.8.x. To change the network or the SDK, see
[AGENTS.md](./AGENTS.md#changing-the-network-or-the-sdk).

Arkiv testnet: everything written here is public.

## License

[MIT](./LICENSE)

## Brand assets

The MIT license covers the code. The Arkiv logos and brand assets in `public/brand/` belong to Golem Factory and are not covered by it.

The mascot art in `public/deck/mascot/` (3D renders made with ChatGPT image generation from the team's reference art) is a proposal pending brand review and is not covered by the MIT license.
