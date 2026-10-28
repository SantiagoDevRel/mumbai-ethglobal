Edit instructions only in AGENTS.md; CLAUDE.md only imports this file.

# mumbai-ethglobal: agent guide

"From zero to hero with Arkiv, the Web3 database": a 20-minute live workshop. The room scans a QR,
writes Arkiv entities from their phones, and watches them land, count down and expire on a 3D globe.

## Layout

| Path | What | Owner |
|---|---|---|
| `shared/types.ts`, `shared/scenes.ts`, `shared/writer-api.ts`, `shared/encoding.ts` | Contracts: domain types, run of show, writer HTTP API, value encodings | orchestrator |
| `shared/arkiv/adapter.ts`, `profiles.ts`, `mock.ts` | The one Arkiv interface, network profiles, in-memory mock | orchestrator (contract) |
| `shared/arkiv/sdk-0.8.ts` | The adapter on `@arkiv-network/sdk` 0.8.x | chain |
| `lib/stage/` | Scene engine: store, BroadcastChannel sync, presenter keys, deck contract | orchestrator |
| `components/stage/StageFrame.tsx` | Stage layers: map, scene box (1920x1080 scaled), HUD, QR, controls | orchestrator |
| `app/deck/`, `public/deck/` | Every scene's slide or overlay, and the script each scene follows | deck |
| `app/` (rest), `components/` (rest), `lib/map/`, `lib/data/` | `/map` (globe, query panel, filters, inspector), `/slides`, phone page `/scan`, presenter login | app |
| `app/api/[...path]/route.ts`, `lib/server/` | The writer: the app's own `/api` on Vercel (`fra1`) with Postgres (Neon): queue, limits, one-sender lease, batches, read proxy | chain |
| `writer/` | The earlier Cloudflare Worker, retired October 26, 2026 and kept for rollback; its load tests and the Vercel ones (`vercel-loadtest.md`) | chain |
| `scripts/` | `check:network`, seed, load test | chain |

Change a contract only through the orchestrator. Every user-facing string is English.

The talk runs on one screen, `/map` (outline v3, October 28): the title (S0) and the index (IX), then
four parts that the outline bar across the top tracks. Why Arkiv (W1-W4) and the five steps (ST) are
slides with no QR. In "Build it, live" the room scans (S7) and each idea gets a slide followed by the map
running it on their entities: write (L1, B2), query (B3, L3), own (L6), expire (L2), then encryption
(B4) and the explorer (B5). Tools and prizes: Hub and docs (T1), your agent's MCP (T2), the prizes (PZ)
and the close (L9). One idea per scene, never twice; `$owner` only, no `$creator` on screen. Every
reveal is one → (`steps` in `SCENES`): nothing moves on a timer, and live data changes in place (no
flash, roll, spin or ticking clock). The query panel opens on L3 only, on the Query tab: the scope and
the filters joined by AND, never `$creator` (every read still scopes by it). `tests/deck-walk.mjs` walks every scene
and step. A new scene goes into `SCENES` (`shared/scenes.ts`) with a `section`, so the index and the
outline bar list it, and a `qr.placement` (`corner`, `center` or `none`); add its slide or overlay and
notes in `app/deck/`.

## Rules

- The RPC access key never reaches a browser, a `NEXT_PUBLIC_*` variable or this repo. Phones never call an RPC (a room shares one IP and the public RPC limits each IP): they send one request to the writer and nothing else. The presenter pages (/map and /slides) open with the presenter password; the writer answers with a signed 12-hour login that both windows share, and every presenter read goes through the writer's keyed read proxy with it. Without a login, reads fail. No browser falls back to the public RPC. The key has a monthly quota: once it is used up (429 `QUOTA_EXCEEDED`), the writer alone retries reads and sends on the public RPC and tries the key again every ten minutes; `/api/presenter/status` reports `keyQuotaExhausted`. That fallback covers block reads and sends only: the public RPC gives each IP a small anonymous query budget (`arkiv_query` costs 100 units; 429 `ANON_COST_LIMITED`) and the writer shares Vercel IPs, so the stage needs the key's quota. Each query spends 100 units of it: /map reads every block while it is visible and in use, and pauses when hidden or after 20 minutes without input. The Vercel function logs show why a read failed.
- Each entity a phone writes is one request (Santiago, October 26; up to ten entities per phone per session since October 28; at most 50 phones for 20 minutes). Opening `/scan` asks the writer nothing; "Write my entity" sends `POST /api/submit?wait=1` without a session code, and the writer joins the running session and answers once the block is in. Phones write only while the /map Writing switch is ON (`/api/presenter/writing`). The phone's countdown runs on its own clock from the chosen lifetime and fetches nothing; extension and the real expiration show on `/map`, which reads once per block and pauses while hidden. Recompute the request table in `README.md` before adding any phone request.
- One sender: only the holder of the Postgres lease signs with the writer wallet. Production and preview share the database on purpose, so they can never send at the same time.
- Never claim on screen what didn't happen on-chain. App-side steps are labeled *app-side*.
- Vocabulary: "Arkiv entities", "Entity Expiration", "Lifetime Extension", "DB-Chain", "Ethereum-aligned", "your agent", "the Web3 database". Never "TTL", "records", "on Ethereum", or unqualified "decentralized", "trustless", "permanent". The mascot is BLOK. No hardcoded counts in copy.
- Palette for UI chrome: Arkiv Blue `#181EA9`, Arkiv Orange `#FE7446`, Ink `#111111`, Sand `#F6F4EF`, Stone `#E9E6DE`. Official logo SVGs only (`public/brand/`). Dot colors are the seven in `DOT_PALETTE` (`shared/encoding.ts`); the writer accepts no other.
- Text font IBM Plex Sans; code IBM Plex Mono.
- Never `git add .`; scan staged changes for secrets before every commit.
- Vercel is connected to this repo: every push to `main` deploys production (`mumbai-ethglobal.vercel.app`), and other branches get preview deployments. Push to `main` only verified work.
- Checks run on GitHub Actions (`.github/workflows/ci.yml`) on every push, in parallel: typecheck, lint, unit, `ui-layout`, `phone-ticket`, `deck-walk`, and the deck captures (artifact `deck-captures`, read with `gh run download <id> -n deck-captures`). Push work to a branch, wait for a green run, then merge to `main`. The writer tests against real Postgres need `DATABASE_URL` and run outside Actions.

## Changing the network or the SDK

Everything network-specific lives in two places:

1. `shared/arkiv/profiles.ts`: one profile per network (chain ID, RPC and WebSocket URLs, explorer, faucet, SDK package and version). `tiramisu` is the default; `udc` is a placeholder that fails closed until filled.
2. `shared/arkiv/sdk-0.8.ts`: the adapter for the 0.8.x SDK. A new SDK gets its own adapter file implementing `ArkivAdapter` from `shared/arkiv/adapter.ts`.

Select the profile with `ARKIV_PROFILE` (a Vercel environment variable for the writer, and `NEXT_PUBLIC_ARKIV_PROFILE` for the app). Pin the SDK version in `package.json` (and in `writer/package.json` while the retired Worker is kept).

After a switch, run all of these and keep the output:

- `npm run check:network`: chain ID, latest block and installed SDK version against the profile.
- The writer write-and-read check (`scripts/`), on the new network.
- Typecheck, lint, build and tests for the app and the writer.
- The load test and the countdown check.

The writer fails closed: no profile, a placeholder profile, or an `eth_chainId` that doesn't match stops it, and the stage shows *Network not configured*.
