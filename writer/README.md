# Workshop writer

> **Retired on October 26, 2026.** The writer now runs as the app's own `/api` on Vercel
> (`../app/api/[...path]/route.ts`, `../lib/server/`) with Postgres. This Worker is kept
> only for rollback, with its doors closed so it cannot send with the same wallet. Load tests
> of the new writer: [vercel-loadtest.md](./vercel-loadtest.md).

Cloudflare Worker and one SQLite Durable Object. The public API is defined in
`../shared/writer-api.ts`. The Worker holds the signing key and RPC access key;
neither belongs in a frontend bundle.

## Phase zero

`phase-zero-evidence.json` contains the first verified workerd write/read on Tiramisu.
`POST /api/presenter/check` requires the presenter Bearer token. It performs one
durably journaled proof, then returns the same proof on subsequent calls. It never
automatically resubmits an uncertain transaction. Signed bytes stay in Durable
Object storage and are excluded from HTTP responses.

SDK 0.8.1 source and deployed behavior confirmed:

- Signed `i32` range predicates accept negative bounds.
- Empty `Uint8Array` payloads round-trip.
- Creation uses `flags: { permissionlessExtension: true }`.
- `executeBatch` returns created keys in operation order, without expiry blocks.
- `patchEntity({ set })` keeps attributes that are not mentioned.
- Extensions set an expiry; adding seconds requires an absolute target derived
  from the existing expiry and measured block duration.
- `predictEntityKeys` uses the separate entity-minting nonce. The returned salts
  must be passed to the corresponding creates under exclusive signer custody.
- Query pages are immutable: assign `page = await page.next()` and collect each page.
- `getBlockTiming()` reports Unix seconds and block duration in seconds.
- `ExpirationTime.fromSeconds()` uses the SDK's nominal two-second conversion;
  countdowns must use the actual expiry and live timing instead.
- An explicit EIP-1193 rejection (`4001`) permits a later user action; uncertain
  writes remain blocked until their known transaction outcome is reconciled.
- Receipt polling is explicitly 500 ms. This is a polling cadence, not a claimed
  block duration; the unconfigured viem client default was four seconds.
- A query snapshot does not reserve an entity's remaining lifetime. An entity
  close to expiration can disappear before a later `getEntity` or transaction
  simulation. The first timed rehearsal stopped before broadcasting its all-entity
  extension after querying targets with roughly two seconds left. Its evidence
  remains in `rehearsal-primary.json`; a later read returned `NoEntityFoundError`.
  The rehearsal now uses two arrival cohorts so late entities have preparation
  time after the selected extension. Participant lifetimes and scene times stay
  unchanged. Failed presenter actions also capture the UI notice in the report.

## Checks and deployment

Run dependency installation and checks on your remote build host:

```sh
npm ci --no-audit --no-fund
npm run typecheck
npx wrangler deploy --dry-run --outdir dist
```

Deploy the resulting `dist/index.js` with `wrangler deploy dist/index.js --no-bundle`.

Current deployment (October 24): version `430f0a2d-b5a3-4736-ad36-535bfd72f2b0`, with the code-less
`GET /api/session` and the 5-15 minute lifetime range. Version notes further down are history.
Configure `RPC`, `ACCESS_KEY`, `WORKSHOP_WRITER_PRIVATE_KEY`, `WORKSHOP_PRESENTER_TOKEN` and
`PRESENTER_PASSWORD` as Worker secrets, never as committed files.

## Public and presenter API

`GET /api/session` (returns the running session code; phones type no code; `?s=<code>` still checks one), `POST /api/submit`, and `GET /api/ticket/<ticket>`
implement the phone contract. Submit sends `x-device-token` (a random identifier
persisted by the phone); the writer also sets `workshop_device`, a Secure, HttpOnly,
SameSite=None cookie. Send requests with credentials enabled when cookies are available.
The header continues to work when a browser blocks third-party cookies. A conflicting
header and cookie is rejected. Limits never use the venue's shared IP address.

Written phones continue polling their ticket every five seconds and never call
an RPC. The ticket supplies the current canonical block, whether its entity is
live and its latest observed expiration block. A Durable Object cache shares one
keyed session query across every phone for two seconds; its response provides the
block number, so no separate block RPC is needed. Only keys and expiration blocks
are selected. SDK 0.8.1 caps a query page at 200 entities: a room of up to 200 uses
one query, and 201–400 entities share two cursor pages at the same block.
Last observed extensions survive Durable Object eviction and later expiration.
Failed reads return a retryable 503 and share a two-second backoff; they never
report an upstream failure as Entity Expiration. Refreshes run outside the request
mutex. A create receipt newer than the cache prevents a false absence result.

The presenter-only `GET /api/presenter/read-metrics` reports upstream request
attempts by RPC method, ticket query counts, HTTP/RPC 429s, errors and daily Worker
request usage. It exposes no credentials, request bodies or signed bytes.

`ticket-read-load.json` preserves the production read-path campaign: 200 distinct
historical written tickets polling every five seconds for three minutes, 7,200
successful reads, p50 225 ms, p95 483 ms and maximum 1,042 ms. There were no client
or upstream 429s and no errors. The Worker made 93 upstream calls: 81 session
queries and six chain-ID/timing check pairs, with no block-number calls. Each
observed query block was shared across the room. Daily request usage moved from
11,849 to 19,050; the 7,201-request delta includes the final metrics read. No
session changes, creates or signatures were used. Historical tickets exercise the
same keyed cache path after expiration; live extensions and expiration were
verified separately in the 200-ticket workerd regression test. All 39 tests passed.
The report includes per-round latency, upstream counters and the full raw sample
report's SHA-256; those raw samples are retained in operator evidence storage.
The deployed version is `df67fc27-80da-4ca9-b5ca-871a388e3ee6` from `4a6b620`.
The cache reduces upstream RPC traffic; Worker requests still scale with phones.
At this polling cadence, 200 phones use 40 requests per second, or 48,000 across
twenty minutes, before presenter, session and browser preflight traffic.

Presenter routes and `POST /api/rpc` require `Authorization: Bearer <token>`: either
`WORKSHOP_PRESENTER_TOKEN` itself (scripts) or a login from `POST /api/login {password}`, which
checks `PRESENTER_PASSWORD` and returns `{token, expiresAt}`. The login is
`p.<expiry ms>.<HMAC-SHA256 of the expiry keyed by WORKSHOP_PRESENTER_TOKEN>`, valid 12 hours;
rotating `WORKSHOP_PRESENTER_TOKEN` ends every login. After ten wrong passwords from one IP in ten
minutes, login answers 429 `too_many_attempts` until the window ends. A new session
(`/api/presenter/session/start`, the stage's Reset) opens for writes at once; `/api/presenter/doors`
remains for scripts. Submit accepts only the seven `DOT_PALETTE` colors.
The proxy accepts only `RPC_READ_ALLOWLIST`; neither the key nor upstream error
details appear in responses. CORS permits only `ALLOWED_ORIGINS` and all responses
use `Cache-Control: no-store`.

The single SQLite-backed Durable Object serializes state changes and batches. SDK
sends and receipt waits run outside the request mutex, so phone submissions,
tickets and stage queries can progress while a transaction is in flight. Accepted
tickets and their alarm are checkpointed together. Each block admits at most one
batch, with up to twenty creates and a fresh pending transaction nonce. Signed bytes
and their hash are persisted before forwarding. An uncertain outcome stops new
batches until that same hash is reconciled against its transaction and receipt.
Canonical create events supply keys and exact expiry blocks; no local timer marks
an entity written or expired.

`MIN_WRITER_BALANCE_WEI` is checked before admitting a batch. The authorized load
test sets it to eight test GLM: a lower balance closes the doors and holds queued
writes before any new transaction is sent. An already-broadcast transaction is
allowed to finish. The load script also monitors the balance independently.

Holds finish an in-flight batch before returning idle. They expire after a minute;
seed scripts renew a hold while signing. Replay mode pauses queued writes. Ending
a session cancels only its unsent queue. Previously included entities stay on-chain.

Run the shared checks from the repository root, then the writer checks here:

```sh
npm run typecheck
npm run lint
npx wrangler deploy --dry-run --outdir dist
npm test
```

`npm test` first builds `dist/index.js` through its `pretest` hook, so runtime tests
also work on a clean checkout without a previously generated bundle.
The writer tests use workerd through Wrangler's existing Miniflare dependency.
They cover actual routing, authorization, CORS, device admission, network failure
and the read-only RPC boundary. Additional adapter tests cover immutable pagination,
exact query descriptions, typed decoding and pre-send checkpoint failures.

`seed-evidence.json` preserves the first verified business/review seed. Its signed
transaction journal lives in operator-provided private storage, outside this repo.
`smoke-evidence.json` follows a public submission through actual inclusion and
disappearance, including the exact query and the observed expiry block.

## Timed rehearsal

`../scripts/rehearse.mjs` serves the static export under the production origin in
headless Chromium and signs the presenter's real extension/patch transactions in
Node. It follows every scene and reveal in the twenty-minute run of show. See
`../scripts/README.md` for the credential names, private journal and safety checks.

`rehearsal-final.json` is the passing Tiramisu run: all seventeen scenes and thirty-two
reveals, twenty synthetic phones and one real phone page (then `/j`, now `/scan`), two extensions, one patch,
and zero ownership transactions. The demo leaves owner and creator unchanged.
Talk time was 1,200,001 ms; setup through cleanup was 1,208,483 ms. Every scene
started within 28 ms of its planned time. No scene-start delay exceeded the
documented one-second overrun threshold; the talk clock exceeded its target by
one millisecond. There were no page errors, the owned session ended, and the
minimum observed balance was 9.922778615845557232 test GLM, above the eight-GLM floor.
Receipt-derived gas was 2,739,024. Selected extension, all-entity extension and
business patch took 8,360, 10,844 and 6,185 ms end to end, respectively.

The deployed Worker is version `c221c14e-fd84-481d-b625-b62d6e42a231`, the verified
`e1732fb` bundle. The passing report's SHA-256 is
`d1e9765e64e483ad07dd43bca16baa293ab7131712e3717a56ed1642e0f531cf`.
Its script hash matches the implementation published in `c266bfa`.
`rehearsal-primary.json` preserves the early expiration/preparation failure;
`rehearsal-cohorts.json` preserves a complete run that exposed two exact-label
selector failures in L3. Those selectors were corrected and verified against real
query UI before the passing run. Earlier failures were neither overwritten nor
reclassified. The passing workload uses the documented two arrival cohorts; it
does not establish that an all-entity extension can safely include an entity
immediately before its expiration.
