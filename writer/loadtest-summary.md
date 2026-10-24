# Tiramisu load test

Two campaigns submitted synthetic phones over a thirty-second window. The first
failed the frozen six-second median confirmation gate. After correcting receipt
polling and request locking, the second passed the same gate. Both reports are
retained; acceptance limits in `loadtest-plan.json` did not change.

| Metric | Initial implementation | After receipt-wait fix |
| --- | ---: | ---: |
| Source commit | `7218bb7` | `e1732fb` |
| Session | `180040DC` | `B2DEF664` |
| Submitted / written / query-visible | 200 / 200 / 200 | 200 / 200 / 200 |
| Dropped / observed nonce errors | 0 / 0 | 0 / 0 |
| End-to-end throughput | 3.39 entities/s | 5.25 entities/s |
| Median submit-to-confirmation | 18.032 s | 5.543 s |
| p95 submit-to-confirmation | 27.207 s | 7.675 s |
| Median submit-to-query-visible | 26.126 s | 6.352 s |
| p95 submit-to-query-visible | 37.483 s | 8.549 s |
| Batches | 11 | 12 |
| Batch-size range | 6–20 | 3–20 |
| Gas used | 24,076,800 | 24,076,800 |
| Gas cost | 0.024076800048153600 test GLM | 0.024076800048153600 test GLM |
| Minimum observed balance | 9.955127535910255072 GLM | 9.930930351861860704 GLM |
| Balance-floor stop | Not needed | Not needed |

The offered rate was 6.67 entities/s. End-to-end throughput divides the number of
query-visible entities by elapsed time from the first scheduled submission until
the last query observation, including the queue's initial and final drain.
Query visibility uses the stage's keyed RPC proxy, one query per new block and a
700 ms polling cadence. Browser paint is outside this measurement. Confirmation
latency includes ticket polling and is an upper bound on actual inclusion latency.

Passing-run batch sizes, in receipt order:
`14, 13, 16, 14, 20, 20, 20, 20, 20, 20, 20, 3`.
The two campaigns together used 48,153,600 gas. The Worker checked the eight-GLM
floor before each batch; an independent monitor checked the balance throughout
each campaign. The below-floor path is covered by a workerd regression test.

The fix releases the request mutex during SDK sends and receipt waits, while keeping
durable state changes and the one-sender guard serialized. It also sets receipt
polling to 500 ms instead of viem's four-second default for this client. A controlled
slow-wallet test proves phone reads stay responsive and Hold still waits for the
batch. Signed-byte checkpointing and reconciliation remain enforced.

Detailed receipt hashes, gas and observations:
[initial campaign](./loadtest-primary.json) and
[campaign after the fix](./loadtest-after-receipt-fix.json).
The full per-phone reports remain in operator storage; their SHA-256 hashes are
included in the public summaries.

Writer tests also passed on a fresh build lane with no existing `dist/index.js`:
`npm test` now builds its bundle through `pretest`. SDK findings stay in
`writer/README.md`.
