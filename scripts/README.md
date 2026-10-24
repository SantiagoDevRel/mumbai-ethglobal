# Chain scripts

Run from the repository root with Node 22.15 or newer and the pinned dependencies.
Signing scripts use operator-supplied environment variables, never command-line
private keys. Keep the RPC access key and writer key outside frontend environments.

| Command | Purpose |
| --- | --- |
| `npm run check:network` | Verify chain ID, latest block and installed SDK against the profile. Uses keyed RPC when configured. |
| `node --experimental-strip-types scripts/check-writer.ts` | One live phone submission, public query readback, and an Entity Expiration check within one block. |
| `npm run seed -- --state-dir /secure/workshop-state` | Seed businesses and linked reviews once per UTC day, with twelve-hour lifetimes. |
| `npm run loadtest -- --approved` | Run the explicitly authorized on-chain load test against a dedicated session. |

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
that session. Reported confirmation latency includes ticket polling, so it is an
upper bound on submit-to-inclusion latency. Errors and daily request usage are
included in its JSON report. It exits nonzero on dropped submissions or a median
confirmation latency above the workshop acceptance threshold.
