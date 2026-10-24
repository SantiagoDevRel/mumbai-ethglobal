# Chain scripts

Run from the repository root with Node 22.15 or newer and the pinned dependencies.
Signing scripts use operator-supplied environment variables, never command-line
private keys. Keep the RPC access key and writer key outside frontend environments.

| Command | Purpose |
| --- | --- |
| `npm run check:network` | Verify chain ID, latest block and installed SDK against the profile. Uses keyed RPC when configured. |
| `node --experimental-strip-types scripts/check-writer.ts` | One live phone submission, public query readback, and an Entity Expiration check within one block. |
| `npm run seed -- --state-dir /secure/workshop-state` | Seed businesses and linked reviews once per UTC day, with twelve-hour lifetimes. |
| `npm run loadtest -- --approved --report /secure/loadtest-report.json` | Run the explicitly authorized on-chain load test against a dedicated session and retain its evidence. |
| `node --experimental-strip-types scripts/rehearse.mjs --preflight` | Check the production-origin static build, keyed reads and browser runtime without starting a session or sending transactions. |
| `node --experimental-strip-types scripts/rehearse.mjs --report writer/rehearsal.json --journal /secure/rehearsal.jsonl` | Run the full twenty-minute Tiramisu rehearsal with an explicitly authorized test-gas budget. Both files must be new. |

`WRITER_URL` selects the Worker; its deployed default is
`https://mumbai-workshop-writer.santiagotrujillozuluaga.workers.dev`.
Presenter operations read `WORKSHOP_PRESENTER_TOKEN`. Signing the seed also requires
`WORKSHOP_WRITER_PRIVATE_KEY`, `RPC`, and `ACCESS_KEY`. `ARKIV_PROFILE` selects the
network profile. Every generated explorer link uses `explorerUrl()`.

The seed requires closed doors and an empty, idle writer, acquires a hold, renews it
while working, and resumes afterward. It creates businesses before their reviews,
using receipt-confirmed entity keys. Its private state directory stores a frozen
daily plan, process lock, signed bytes and per-batch checkpoints. Keep that directory
across reruns. A completed daily journal skips every send. A partial journal first
authenticates and reconciles its captured transactions; it never resends uncertain
bytes or replaces a failed transaction automatically. An expired entity or a changed
plan stops verification instead of creating duplicates.

The load test requires explicit gas authorization before passing `--approved`.
It starts its own session, submits the phone traffic over thirty seconds, then ends
that session. It stops new submissions and holds the writer below eight test GLM;
the Worker enforces the same floor before admitting a new batch. Reported
confirmation latency includes ticket polling, so it is an upper bound on inclusion
latency. Visibility is the first keyed query response containing each entity, using
the stage's per-block polling and 700 ms cadence; browser paint is not measured.
The report includes throughput, receipt-derived batch sizes and gas, latency
percentiles, balance observations, errors and daily request usage. Its report file
must be new: existing campaign evidence is never overwritten. It exits nonzero on
dropped submissions, missing query visibility or a median confirmation latency
above the frozen acceptance threshold in `writer/loadtest-plan.json`.

The rehearsal needs the same four environment variables as the seed and a built
`out/` with the production writer URL. Run it through your secret injector, never
pass credential values as arguments. Install the Chromium revision belonging to
the pinned Playwright dependency on the execution machine. Chromium serves the
exact local export through route interception under the production origin; Worker
requests, public phone reads, signatures and receipts are real. No web server is
started. The private key and RPC access key stay in Node; only the stage receives
the presenter token. Its injected EIP-1193 provider delegates to a Node function.

Scene starts follow `shared/scenes.ts` in real time. That contract has no reveal
timestamps, so steps run in order at scene entry, 750 ms apart, awaiting each live
operation. The S7 wave sends twenty synthetic phones over 32 seconds and a real
phone at +33 seconds, all with 120-second lifetimes. Early arrivals expire before
L2; later arrivals remain available for its immediate selected/all extensions.
The three wallet transactions are two extensions and one business patch. The
signer validates their destination and operation tags, rejects ownership changes
and deletion, requires the writer's idle hold, journals signed bytes before
broadcast, and checks the eight-GLM floor including the estimated transaction cost.
An uncertain broadcast is never retried. Retain its private journal for receipt
reconciliation; never commit it.

The JSON checkpoints scene and reveal timing, operation latencies, phone inclusion
and real-page visibility, receipt gas, errors, balance observations and cleanup.
Scene lateness above one second is reported as an overrun. Setup and cleanup are
separate from the twenty-minute talk clock. L6 verifies the demo changes neither
owner nor creator and sends no transaction. L8 preserves the written phone's
actual heading and verifies resources on a fresh QR scan: written phones stop
polling the writer after inclusion. The rehearsal refuses to replace an existing
session and ends only its own session, including on failure.
