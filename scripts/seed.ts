import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { decodeEventLog, keccak256, parseTransaction } from "viem";
import { ENTITY_EVENTS_ABI } from "@arkiv-network/sdk/entity";
import { ExpirationTime } from "@arkiv-network/sdk/utils";
import { createSdkClients } from "../shared/arkiv/clients-0.8.ts";
import { encodedFields } from "../shared/arkiv/sdk-0.8.ts";
import { explorerUrl, getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { SEED_BUSINESSES } from "../shared/data/seed-businesses.ts";
import { APP_ID, type Hex } from "../shared/types.ts";
import { presenterRequest } from "./writer-http.ts";

const DAY = new Date().toISOString().slice(0, 10);
const REGISTRY = "0x4400000000000000000000000000000000000044";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
interface Row { id: string; kind: "business" | "review"; attrs: Record<string, unknown> }
interface Batch { ids: string[]; nonce?: number; raw?: Hex; txHash?: Hex; keys?: Hex[]; block?: string; gasUsed?: string; status: "prepared" | "sending" | "written" }
interface State { version: 1; day: string; app: string; creator: Hex; chainId: number; planHash: string; batches: Batch[]; keys: Record<string, Hex>; completed: boolean }

async function main() {
  const args = process.argv.slice(2);
  const flag = args.indexOf("--state-dir");
  const directory = flag >= 0 ? args[flag + 1] : process.env.WORKSHOP_STATE_DIR;
  if (!directory) throw new Error("Pass --state-dir pointing to durable private storage outside the repository.");
  if (!process.env.RPC || !process.env.ACCESS_KEY || !process.env.WORKSHOP_WRITER_PRIVATE_KEY) throw new Error("Keyed RPC and writer credentials are required.");
  const profile = getProfile(process.env.ARKIV_PROFILE);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = join(directory, `seed-${DAY}.json`);
  const lockfile = join(directory, "seed.lock");
  let lock;
  try { lock = await open(lockfile, "wx", 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const previous = JSON.parse(await readFile(lockfile, "utf8")) as { purpose: string; pid: number; host: string };
    if (previous.purpose !== "mumbai-seed-v1" || previous.host !== hostname()) throw new Error("Seed lock ownership is unknown.");
    try { process.kill(previous.pid, 0); throw new Error("Another seed process is still running."); }
    catch (check) { if ((check as NodeJS.ErrnoException).code !== "ESRCH") throw check; }
    await unlink(lockfile); // Only our own verified stale process lock.
    lock = await open(lockfile, "wx", 0o600);
  }
  await lock.writeFile(JSON.stringify({ purpose: "mumbai-seed-v1", pid: process.pid, host: hostname() }));
  await lock.sync();
  let held = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let leaseError: unknown;
  try {
    const planHash = digest({ day: DAY, profile: profile.id, chainId: profile.chainId, creator: WRITER_ADDRESS, data: SEED_BUSINESSES });
    let state: State;
    try { state = JSON.parse(await readFile(filename, "utf8")) as State; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      state = { version: 1, day: DAY, app: APP_ID, creator: WRITER_ADDRESS, chainId: profile.chainId, planHash, batches: [], keys: {}, completed: false };
    }
    if (state.version !== 1 || state.planHash !== planHash || state.creator !== WRITER_ADDRESS || state.chainId !== profile.chainId) throw new Error("Saved seed plan differs from this run. Do not replace it.");
    const save = async () => {
      const temporary = `${filename}.next-${process.pid}`;
      await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flush: true });
      await rename(temporary, filename);
      const parent = await open(directory, "r");
      try { await parent.sync(); } finally { await parent.close(); }
    };
    let active: Batch | undefined;
    const { reader, writer, checkNetwork } = createSdkClients({ profile, creator: WRITER_ADDRESS,
      read: { kind: "keyed", url: process.env.RPC, accessKey: process.env.ACCESS_KEY },
      wallet: { kind: "privateKey", privateKey: process.env.WORKSHOP_WRITER_PRIVATE_KEY as Hex },
    }, { beforeSend: async (raw, hash) => {
      if (!active || leaseError) throw new Error("Seed batch does not hold the writer lease.");
      const tx = parseTransaction(raw);
      if (tx.nonce !== active.nonce || tx.to?.toLowerCase() !== REGISTRY || tx.chainId !== profile.chainId) throw new Error("Signed seed batch differs from the plan.");
      active.raw = raw; active.txHash = hash; active.status = "sending";
      await save();
    } });
    await checkNetwork();
    if (writer!.account!.address.toLowerCase() !== WRITER_ADDRESS.toLowerCase()) throw new Error("Writer account mismatch.");
    if (state.completed) {
      console.log(JSON.stringify({ day: DAY, skipped: true, reason: "Already seeded today.", businesses: SEED_BUSINESSES.length, reviews: SEED_BUSINESSES.reduce((n, item) => n + item.reviews.length, 0), txHashes: state.batches.map(batch => batch.txHash), balanceWei: String(await reader.getBalance({ address: WRITER_ADDRESS })) }));
      return;
    }
    await save();
    const hold = await presenterRequest<{ held: true; idle: boolean }>("hold", {});
    held = true;
    const status = await presenterRequest<{ doors: string; queued: number; inFlight: boolean }>("status");
    if (!hold.idle || status.queued || status.inFlight || status.doors === "open") throw new Error("Seed only while the writer is idle, its queue is empty, and doors are closed.");
    heartbeat = setInterval(() => { void presenterRequest<{ idle: boolean }>("hold", {}).then(response => { if (!response.idle) leaseError = new Error("Writer is no longer idle."); }).catch(error => { leaseError = error; }); }, 20_000);
    const businesses: Row[] = SEED_BUSINESSES.map(item => ({ id: item.id, kind: "business", attrs: item.business }));
    const allRows: Row[] = [];
    let batchIndex = 0;
    for (const stage of ["business", "review"] as const) {
      const rows = stage === "business" ? businesses : SEED_BUSINESSES.flatMap(item => item.reviews.map((review, index): Row => ({ id: `${item.id}-review-${index}`, kind: "review", attrs: { ...review, business: state.keys[item.id] } })));
      if (stage === "review" && rows.some(row => !row.attrs.business)) throw new Error("A business key is missing; never guess review links.");
      for (let offset = 0; offset < rows.length; offset += 20) {
        if (leaseError) throw leaseError;
        const batchRows = rows.slice(offset, offset + 20);
        const index = batchIndex++;
        allRows.push(...batchRows);
        let batch = state.batches[index];
        if (!batch) { batch = { ids: batchRows.map(row => row.id), status: "prepared" }; state.batches[index] = batch; await save(); }
        if (JSON.stringify(batch.ids) !== JSON.stringify(batchRows.map(row => row.id))) throw new Error("Frozen batch order changed.");
        if (batch.status === "written") continue;
        active = batch;
        if (!batch.txHash) {
          await checkNetwork();
          batch.nonce = await reader.getTransactionCount({ address: WRITER_ADDRESS, blockTag: "pending" });
          await save();
          // SDK estimation remains enabled; no fixed gas limit bypasses preflight.
          try {
            await writer!.executeBatch({ creates: batchRows.map(row => ({
              attributes: { ...encodedFields(row.attrs), app: APP_ID, kind: row.kind, seed_day: DAY, seed_id: row.id },
              payload: new Uint8Array(), contentType: "application/octet-stream", flags: { permissionlessExtension: true },
              expires: ExpirationTime.fromHours(12), salt: BigInt(`0x${digest({ day: DAY, id: row.id }).slice(0, 32)}`),
            })) }, { nonce: batch.nonce });
          } catch (error) { if (!batch.txHash) throw error; }
        }
        if (!batch.txHash || !batch.raw || keccak256(batch.raw) !== batch.txHash) throw new Error("Seed write needs reconciliation; do not resend.");
        const receipt = await reader.getTransactionReceipt({ hash: batch.txHash });
        if (receipt.status !== "success") throw new Error("Seed transaction reverted; retained for explicit recovery.");
        const transaction = await reader.getTransaction({ hash: batch.txHash });
        if (transaction.from.toLowerCase() !== WRITER_ADDRESS.toLowerCase() || transaction.nonce !== batch.nonce || transaction.input !== parseTransaction(batch.raw).data) throw new Error("Seed receipt differs from the admitted transaction.");
        const keys: Hex[] = [];
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== REGISTRY) continue;
          const event = decodeEventLog({ abi: ENTITY_EVENTS_ABI, data: log.data, topics: log.topics });
          if (event.eventName === "EntityCreated") keys.push(event.args.entityKey);
        }
        if (keys.length !== batchRows.length) throw new Error("Seed event count differs; batch was applied, never recreate it.");
        for (let position = 0; position < keys.length; position++) {
          const entity = await reader.getEntity(keys[position]!);
          const row = batchRows[position]!;
          if (entity.creator.toLowerCase() !== WRITER_ADDRESS.toLowerCase() || entity.attributes.seed_id?.value !== row.id || entity.attributes.seed_day?.value !== DAY || entity.attributes.app?.value !== APP_ID || entity.payload.length !== 0 || !entity.creationFlags.permissionlessExtension) throw new Error("Seed entity readback differs from the frozen plan.");
          if (row.kind === "review" && entity.attributes.business?.value !== row.attrs.business) throw new Error("Review points to a different business.");
          state.keys[row.id] = entity.key;
        }
        batch.keys = keys; batch.block = String(receipt.blockNumber); batch.gasUsed = String(receipt.gasUsed); batch.status = "written";
        await save();
        console.log(JSON.stringify({ batch: index, kind: stage, entities: keys.length, txHash: batch.txHash, explorer: explorerUrl(profile, "tx", batch.txHash), block: batch.block, gasUsed: batch.gasUsed, gasPerEntity: Number(receipt.gasUsed) / keys.length, balanceWei: String(await reader.getBalance({ address: WRITER_ADDRESS })) }));
      }
    }
    state.completed = true;
    await save();
    console.log(JSON.stringify({ day: DAY, businesses: businesses.length, reviews: allRows.length - businesses.length, txHashes: state.batches.map(batch => batch.txHash), balanceWei: String(await reader.getBalance({ address: WRITER_ADDRESS })) }));
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    if (held) await presenterRequest("resume", {}).catch(() => undefined);
    await lock.close();
    await unlink(lockfile);
  }
}

await main().catch(error => { console.error(`Seed stopped: ${error instanceof Error ? error.message.slice(0, 300) : "unknown error"}. Preserve its durable journal; never resend an uncertain batch.`); process.exitCode = 1; });
