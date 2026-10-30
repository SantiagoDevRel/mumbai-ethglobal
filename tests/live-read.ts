// Explicit opt-in public-RPC smoke check; no wallet or writer credential is used.
import assert from "node:assert/strict";
import { createArkivAdapter } from "../shared/arkiv/sdk-1.0.ts";
import { getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";

const profile = getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE);
const adapter = createArkivAdapter({ profile, creator: WRITER_ADDRESS, read: { kind: "public" } });
const block = await adapter.getBlock();
const run = await adapter.query({ kinds: ["dot", "business"] });
assert.ok(block.number > 0n);
assert.ok(block.blockTimeMs > 0);
assert.equal(run.rows, run.entities.length);
assert.match(run.description.query.toLowerCase(), new RegExp(WRITER_ADDRESS.toLowerCase()));
process.stdout.write(JSON.stringify({ profile: profile.id, chainId: profile.chainId, sdk: profile.sdk.version, block: String(block.number), blockTimeMs: block.blockTimeMs, queryBlock: String(run.block), rows: run.rows, pages: run.pages, latencyMs: Math.round(run.latencyMs) }) + "\n");
