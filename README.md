# From zero to hero with Arkiv, the Web3 database

**Write it. Query it. Own it. Expire it.**

The app behind Arkiv's workshop at ETHGlobal Mumbai (November 5, 2026). Five minutes of Arkiv 101,
then the room becomes the database: everyone scans a QR code, picks a name, a color, a country and a
lifetime (20 seconds to 2 minutes), and their Arkiv entity drops onto a live 3D globe with its own
countdown. The map is just a query, and the panel under it shows the query that ran.

| Route | Who | What |
|---|---|---|
| `/` | Projector | The slides and the live map in one stage |
| `/notes` | Presenter laptop | Speaker notes, timer, scene list and controls |
| `/j` | Phones | Join the map, then follow your entity |

## How it works

```
phone /j ──POST──► writer (Cloudflare Worker + Durable Object) ──► Arkiv DB-Chain (Tiramisu)
                                                                         ▲
projector / and /notes (static Next.js) ── query every block ────────────┘
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
