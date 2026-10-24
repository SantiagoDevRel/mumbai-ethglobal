# Workshop writer

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
Configure `RPC`, `ACCESS_KEY`, `WORKSHOP_WRITER_PRIVATE_KEY`, and
`WORKSHOP_PRESENTER_TOKEN` as Worker secrets, never as committed files.

## Public and presenter API

`GET /api/session?s=<code>`, `POST /api/submit`, and `GET /api/ticket/<ticket>`
implement the phone contract. Submit sends `x-device-token` (a random identifier
persisted by the phone); the writer also sets `workshop_device`, a Secure, HttpOnly,
SameSite=None cookie. Send requests with credentials enabled when cookies are available.
The header continues to work when a browser blocks third-party cookies. A conflicting
header and cookie is rejected. Limits never use the venue's shared IP address.

Presenter routes and `POST /api/rpc` require `Authorization: Bearer <token>`.
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
reveals, twenty synthetic phones and one real `/j` page, two extensions, one patch,
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
