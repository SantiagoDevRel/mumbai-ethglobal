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
| `app/deck/`, `app/notes/`, `public/deck/` | Every scene's slide or overlay, speaker notes, `/notes` | deck |
| `app/` (rest), `components/` (rest), `lib/map/`, `lib/data/` | Stage, globe, phone page `/j`, query panel, filters, inspector | app |
| `writer/` | Cloudflare Worker + one Durable Object: queue, limits, batches, read proxy | chain |
| `scripts/` | `check:network`, seed, load test | chain |

Change a contract only through the orchestrator. Every user-facing string is English.

## Rules

- The RPC access key never reaches a browser, a `NEXT_PUBLIC_*` variable or this repo. Phones never call an RPC: they poll their ticket on the Worker (a room shares one IP and the public RPC limits each IP). The presenter screen reads through the Worker's read proxy.
- Never claim on screen what didn't happen on-chain. App-side steps are labeled *app-side*.
- Vocabulary: "Arkiv entities", "Entity Expiration", "Lifetime Extension", "DB-Chain", "Ethereum-aligned", "your agent", "the Web3 database". Never "TTL", "records", "on Ethereum", or unqualified "decentralized", "trustless", "permanent". The mascot is BLOK. No hardcoded counts in copy.
- Palette for UI chrome: Arkiv Blue `#181EA9`, Arkiv Orange `#FE7446`, Ink `#111111`, Sand `#F6F4EF`, Stone `#E9E6DE`. Official logo SVGs only (`public/brand/`). Dot colors are participant data and free.
- Text font IBM Plex Sans; code IBM Plex Mono.
- Never `git add .`; scan staged changes for secrets before every commit.

## Changing the network or the SDK

Everything network-specific lives in two places:

1. `shared/arkiv/profiles.ts`: one profile per network (chain ID, RPC and WebSocket URLs, explorer, faucet, SDK package and version). `tiramisu` is the default; `udc` is a placeholder that fails closed until filled.
2. `shared/arkiv/sdk-0.8.ts`: the adapter for the 0.8.x SDK. A new SDK gets its own adapter file implementing `ArkivAdapter` from `shared/arkiv/adapter.ts`.

Select the profile with `ARKIV_PROFILE` (`writer/wrangler.toml` `[vars]`, and `NEXT_PUBLIC_ARKIV_PROFILE` for the app). Pin the SDK version in both `package.json` files.

After a switch, run all of these and keep the output:

- `npm run check:network`: chain ID, latest block and installed SDK version against the profile.
- The writer write-and-read check (`scripts/`), on the new network.
- Typecheck, lint, build and tests for the app and the writer.
- The load test and the countdown check.

The writer fails closed: no profile, a placeholder profile, or an `eth_chainId` that doesn't match stops it, and the stage shows *Network not configured*.
