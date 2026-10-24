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
