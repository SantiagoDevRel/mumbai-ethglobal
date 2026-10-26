# Load tests of the Vercel writer (October 26, 2026)

The writer moved from this Cloudflare Worker to the app's own `/api` on Vercel (`lib/server/`,
Postgres on Neon). The same frozen gate in `loadtest-plan.json` applied, unchanged. All runs hit a
Vercel preview in `fra1` from a client in Colombia, so every client-side latency includes about
200 ms of round trip.

## On-chain: 200 phones in 30 seconds (`npm run loadtest`)

| Metric | First run | After the batch-cycle fix |
| --- | ---: | ---: |
| Session | `DBE19D55` | `EF8595E7` |
| Submitted / written / query-visible | 200 / 200 / 200 | 200 / 200 / 200 |
| Dropped / nonce errors | 0 / 0 | 0 / 0 |
| Median submit-to-confirmation | 6.291 s (gate: under 6 s) **failed** | 3.726 s **passed** |
| p95 submit-to-confirmation | 9.031 s | 5.099 s |
| Median / p95 submit-to-query-visible | 6.336 / 9.247 s | 3.997 / 5.571 s |
| Batch sizes | 2, 14, 16, 20 × 8, 8 | 2, 19, 16, 15, 10, 16, 11, 15, 14, 11, 14, 14, 15, 11, 14, 3 |
| Gas | 0.0240768 test GLM | 0.0240768 test GLM |

The first run kept up with the offered rate only every other block, so a backlog of full batches
built up. The fix sends the queue count, block number, balance and nonce reads together and writes a
whole batch of tickets in one statement. The Worker's passing run in `loadtest-summary.md` had a
5.543 s median.

## Reads: 200 phones for three minutes (`scripts/loadtest-ticket-reads.mjs`)

Each phone polled its written ticket every 5 s and the session every 3 s, as the phone page does.

- 7,200 ticket reads, 0 errors, p95 319 ms. The first attempt sent the production origin to the
  preview and got 403 on every ticket read, as cross-origin calls should; the script now sends the
  app's own origin.
- 76 session queries to the DB-Chain in 180 s, shared by all phones and function instances (the
  bound is one per two-second window).
- 12,000 session polls, 0 errors: 10,537 served by the CDN cache, 1,436 stale while revalidating,
  27 misses.

Full per-phone reports are kept in operator storage. SHA-256:

- First on-chain run: `d0a070ff0479880300250e2fc308fd70f70966d38144f78c5fdaa0043a6eff90`
- On-chain run after the fix: `2cd444bb4ac0a448bb7df942701631ac030f446c082b9d4ff6acf49dd5aea1d5`
- Reads with the wrong origin: `91a771399a61dd1e82b244d7dc3e6ee69fd493951b1b7030d6c3ac45959d6c1a`
- Reads: `584d2e62b6cd12107f8b4db56d3fa94380240a6a1f1e2384e689cf92b01edea1`

## Production

After promotion, `tests/presenter-prod.mjs` passed (password gate, one login for both windows, 15
keyed proxy reads, no public RPC reads) and `scripts/check-writer.ts` wrote one entity through
production and saw it disappear one block after its expiry block (`0x7f7fce62…f48404`).

`tests/phone-to-globe.mjs` then ran the whole path on production in a browser: a phone on `/scan`
wrote an entity (included 3.9 s after the tap), its dot appeared on `/map`, the inspector showed
it, and the phone showed its Entity Expiration five minutes later. While included, the phone
polled only its own ticket and never called an RPC; `/map` made 353 keyed proxy reads and no
public RPC reads; no page errors.
