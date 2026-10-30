// Loads the map's sample businesses and their reviews onto Rabdi, and is safe to run again: it first
// reads which seed entities the signer already has live on the chain and creates only the missing
// ones. Run it after the team resets Rabdi, and on the workshop morning (seeds live 12 hours by
// default). A rerun never sends while one of the signer's transactions is still pending, so a write
// that has not landed yet is never sent twice.
//
//   node --experimental-strip-types scripts/seed-rabdi.mjs [--dry-run] [--signer writer|test] [--hours 12]
//
// Env: RPC (Rabdi's RPC base URL) and ACCESS_KEY. --signer writer (default) signs with
// WORKSHOP_WRITER_PRIVATE_KEY, the address /map reads, and holds the app's writer while it sends
// (WORKSHOP_PRESENTER_TOKEN; doors closed, queue empty). --signer test signs with
// TEST_MUMBAI_PRIVATE_KEY, whose entities /map does not show. --dry-run only reads and prints the plan.
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { asc, eq, gt } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk";
import { createSdkClients } from "../shared/arkiv/clients-1.0.ts";
import { encodedFields, lifetime, PLACE, REVIEW } from "../shared/arkiv/sdk-1.0.ts";
import { explorerUrl, getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { SEED_BUSINESSES } from "../shared/data/seed-businesses.ts";
import { APP_ID } from "../shared/types.ts";
import { presenterRequest } from "./writer-http.ts";

const argv = process.argv.slice(2);
const option = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const dryRun = argv.includes("--dry-run");
const signer = option("--signer", "writer");
const hours = Number(option("--hours", "12"));
assert.ok(signer === "writer" || signer === "test", "--signer is writer or test.");
assert.ok(Number.isInteger(hours) && hours >= 1 && hours <= 72, "--hours is a whole number from 1 to 72.");
assert.ok(process.env.RPC && process.env.ACCESS_KEY, "Set RPC and ACCESS_KEY (an access key from https://hub.arkiv.network/access-keys).");
const privateKey = signer === "writer" ? process.env.WORKSHOP_WRITER_PRIVATE_KEY : process.env.TEST_MUMBAI_PRIVATE_KEY;
assert.ok(privateKey, `Set ${signer === "writer" ? "WORKSHOP_WRITER_PRIVATE_KEY" : "TEST_MUMBAI_PRIVATE_KEY"}.`);
const address = privateKeyToAccount(privateKey).address;
if (signer === "writer") assert.equal(address.toLowerCase(), WRITER_ADDRESS.toLowerCase(), "The writer key does not match the app's writer address.");

const profile = getProfile(process.env.ARKIV_PROFILE ?? "rabdi");
assert.equal(profile.id, "rabdi");
const DAY = new Date().toISOString().slice(0, 10);
/** A seed entity that will not live at least this long counts as missing: a fresh one replaces it. */
const MIN_LEFT_BLOCKS = 1800n; // one hour at 2 s a block
const BATCH = 20;

const { reader, writer, checkNetwork } = createSdkClients({ profile, creator: address,
  read: { kind: "keyed", url: process.env.RPC, accessKey: process.env.ACCESS_KEY },
  wallet: { kind: "privateKey", privateKey },
});

/** The signer's live seed entities of one kind, by seed id (the part after the day). */
async function liveSeeds(kind, head) {
  const found = new Map();
  let after;
  for (let pages = 0; pages < 20; pages++) {
    const query = reader.select({ $key: true, $expiresAt: true, $attributes: true }).createdBy(address)
      .where(eq("app", APP_ID), eq("kind", kind)).orderBy(asc("$key")).limit(100);
    if (after) query.where(gt("$key", key(after)));
    const page = await query.fetch();
    for (const entity of page.entities) {
      const seedId = entity.$attributes.seed_id?.value;
      if (typeof seedId !== "string" || entity.$expiresAt < head + MIN_LEFT_BLOCKS) continue;
      const id = seedId.slice(seedId.indexOf(":") + 1);
      const business = kind === "review" ? String(entity.$attributes.business?.value ?? "").toLowerCase() : undefined;
      found.set(id, { key: entity.$key, business });
    }
    if (page.entities.length < 100) return found;
    after = page.entities.at(-1).$key;
  }
  throw new Error("More than 2,000 seed entities: stop and check before writing more.");
}

async function plan() {
  const head = await reader.getBlockNumber({ cacheTime: 0 });
  const businesses = await liveSeeds("business", head);
  const reviews = await liveSeeds("review", head);
  const missingBusinesses = SEED_BUSINESSES.filter(item => !businesses.has(item.id));
  // A review counts only when it points at the live business it belongs to.
  const missingReviews = SEED_BUSINESSES.flatMap(item => item.reviews.map((review, index) => ({ item, review, id: `${item.id}-review-${index}` })))
    .filter(({ item, id }) => { const live = reviews.get(id); return !live || !businesses.has(item.id) || live.business !== businesses.get(item.id).key.toLowerCase(); });
  return { head, businesses, missingBusinesses, missingReviews };
}

async function send(kind, rows) {
  const out = [];
  for (let offset = 0; offset < rows.length; offset += BATCH) {
    const slice = rows.slice(offset, offset + BATCH);
    const result = await writer.executeBatch({ creates: slice.map(row => ({
      schema: kind === "review" ? REVIEW : PLACE,
      values: { ...encodedFields(row.attrs), app: APP_ID, kind, seed_id: `${DAY}:${row.id}` },
      flags: { permissionlessExtension: true },
      expiration: lifetime(hours * 60 * 60),
    })) });
    const receipt = await reader.getTransactionReceipt({ hash: result.txHash });
    assert.equal(receipt.status, "success", `Seed batch ${result.txHash} reverted.`);
    assert.equal(result.createdEntities.length, slice.length, "The batch created a different number of entities.");
    slice.forEach((row, index) => out.push({ id: row.id, key: result.createdEntities[index] }));
    console.log(JSON.stringify({ kind, entities: slice.length, txHash: result.txHash, explorer: explorerUrl(profile, "tx", result.txHash), block: String(receipt.blockNumber), gasUsed: String(receipt.gasUsed) }));
  }
  return out;
}

await checkNetwork();
const before = await plan();
const summary = { network: profile.id, signer, address, businesses: SEED_BUSINESSES.length, reviews: SEED_BUSINESSES.reduce((n, item) => n + item.reviews.length, 0),
  liveBusinesses: before.businesses.size, missingBusinesses: before.missingBusinesses.length, missingReviews: before.missingReviews.length };
if (dryRun || (!before.missingBusinesses.length && !before.missingReviews.length)) {
  console.log(JSON.stringify({ ...summary, dryRun, written: false }));
  process.exit(0);
}
const [latest, pending] = await Promise.all([reader.getTransactionCount({ address, blockTag: "latest" }), reader.getTransactionCount({ address, blockTag: "pending" })]);
assert.equal(pending, latest, "A transaction from this signer is still pending: wait for it to land, then run again.");
let held = false;
try {
  if (signer === "writer") {
    const hold = await presenterRequest("hold", {});
    held = true;
    const status = await presenterRequest("status");
    assert.ok(hold.idle && !status.queued && !status.inFlight && status.doors !== "open", "Seed only while the writer is idle, its queue is empty, and doors are closed.");
  }
  const created = await send("business", before.missingBusinesses.map(item => ({ id: item.id, attrs: item.business })));
  const businessKey = new Map([...before.businesses].map(([id, live]) => [id, live.key]));
  for (const row of created) businessKey.set(row.id, row.key);
  const reviewRows = before.missingReviews.map(({ item, review, id }) => ({ id, attrs: { ...review, business: businessKey.get(item.id) } }));
  assert.ok(reviewRows.every(row => row.attrs.business), "A business key is missing; never guess review links.");
  await send("review", reviewRows);
} finally {
  if (held) await presenterRequest("resume", {}).catch(() => undefined);
}
const after = await plan();
console.log(JSON.stringify({ ...summary, written: true, liveBusinessesAfter: after.businesses.size, missingBusinessesAfter: after.missingBusinesses.length, missingReviewsAfter: after.missingReviews.length }));
assert.equal(after.missingBusinesses.length + after.missingReviews.length, 0, "Some seed entities are still missing after the write.");
