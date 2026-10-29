// POST /api/presenter/check: one durable write-and-read proof, never a new write on a repeated
// request. Same behavior as the Worker's phase zero; the proof lives in the writer's kv table.
// The caller holds the writer lease, so no batch can use the nonce meanwhile.

import { ExpirationTime } from "@arkiv-network/sdk/utils";
import { i32 } from "@arkiv-network/sdk/attr";
import { eq, gte, lte } from "@arkiv-network/sdk/query";
import { createSdkClients } from "../../shared/arkiv/clients-0.8";
import { getProfile, NetworkNotConfiguredError } from "../../shared/arkiv/profiles";
import { APP_ID, type Hex } from "../../shared/types";
import type { Db } from "./db";
import type { WriterEnv } from "./writer";

interface Proof {
  status: "prepared" | "sending" | "written" | "uncertain" | "failed";
  txHash?: Hex; raw?: Hex; nonce?: number; query?: string; entityKey?: Hex; block?: string; expiresAtBlock?: string;
  gasUsed?: string; balanceWei?: string; chainId?: number; latestBlock?: string; error?: string;
}

export async function runPhaseZero(db: Db, env: WriterEnv, writerAddress: Hex): Promise<Response> {
  if (!env.ARKIV_PROFILE || !env.RPC || !env.ACCESS_KEY || !env.WORKSHOP_WRITER_PRIVATE_KEY) throw new NetworkNotConfiguredError("writer configuration is incomplete");
  const [stored] = await db.query<{ value: Proof }>(`select value from ${db.t("kv")} where key = 'phase0'`);
  const previous = stored?.value;
  const proof: Proof = previous ?? { status: "prepared" };
  const save = () => db.query(`insert into ${db.t("kv")} (key, value, updated_at) values ('phase0', $1, $2)
    on conflict (key) do update set value = $1, updated_at = $2`, [JSON.stringify(proof), Date.now()]);
  const profile = getProfile(env.ARKIV_PROFILE);
  const { reader, writer, checkNetwork } = createSdkClients({
    profile, creator: writerAddress,
    read: { kind: "keyed", url: env.RPC, accessKey: env.ACCESS_KEY },
    wallet: { kind: "privateKey", privateKey: env.WORKSHOP_WRITER_PRIVATE_KEY as Hex },
  }, {
    async beforeSend(raw, hash) {
      proof.status = "sending"; proof.raw = raw; proof.txHash = hash;
      await save();
    },
  });
  const publicProof = () => { const { raw: _raw, ...safe } = proof; return safe; };
  if (writer!.account!.address.toLowerCase() !== writerAddress.toLowerCase()) throw new NetworkNotConfiguredError("writer account mismatch");
  await checkNetwork();
  proof.chainId = await reader.getChainId();
  proof.latestBlock = String(await reader.getBlockNumber());
  proof.balanceWei = String(await reader.getBalance({ address: writerAddress }));
  if (previous) {
    if (proof.txHash && proof.status !== "written") {
      try {
        const receipt = await reader.getTransactionReceipt({ hash: proof.txHash });
        if (receipt.status === "reverted") proof.status = "failed";
        else {
          // The SDK may have lost its response. Read the exact transaction's created entity.
          const rows = await reader.select("*").createdBy(writerAddress).where(eq("app", APP_ID), eq("session", "phase-zero")).fetch();
          const entity = rows.entities.find(e => e.createdAt === receipt.blockNumber);
          if (entity) { proof.entityKey = entity.key; proof.expiresAtBlock = String(entity.expiresAt); proof.status = "written"; }
          proof.block = String(receipt.blockNumber);
          proof.gasUsed = String(receipt.gasUsed);
        }
      } catch { proof.status = "uncertain"; }
    }
    await save();
    return Response.json(publicProof());
  }
  if (proof.balanceWei === "0") return Response.json({ ...publicProof(), error: "Writer needs funding." }, { status: 409 });
  proof.nonce = await reader.getTransactionCount({ address: writerAddress, blockTag: "pending" });
  await save();
  try {
    const result = await writer!.executeBatch({ creates: [{
      attributes: { app: APP_ID, kind: "dot", session: "phase-zero", name: "writer check", color: "#fe7446", country: "in", lat: i32(19_076_000), lng: i32(72_877_700) },
      payload: new Uint8Array(), contentType: "application/octet-stream",
      flags: { permissionlessExtension: true }, expires: ExpirationTime.fromSeconds(120),
    }] }, { nonce: proof.nonce });
    proof.txHash = result.txHash;
    proof.entityKey = result.createdEntities[0];
    const receipt = await reader.getTransactionReceipt({ hash: result.txHash });
    proof.block = String(receipt.blockNumber);
    proof.gasUsed = String(receipt.gasUsed);
    const builder = reader.select("*").createdBy(writerAddress).where(
      eq("app", APP_ID), eq("session", "phase-zero"),
      gte("lat", i32(-90_000_000)), lte("lat", i32(90_000_000)),
      gte("lng", i32(-180_000_000)), lte("lng", i32(180_000_000)),
    );
    proof.query = builder.toString();
    const entity = (await builder.fetch()).entities.find(e => e.key === proof.entityKey);
    if (!entity || entity.payload.length !== 0 || !entity.creationFlags.permissionlessExtension) throw new Error("Entity readback differs from the create.");
    proof.expiresAtBlock = String(entity.expiresAt);
    proof.balanceWei = String(await reader.getBalance({ address: writerAddress }));
    proof.status = "written";
  } catch {
    proof.status = proof.txHash ? "uncertain" : "failed";
    proof.error = "Proof needs reconciliation; no automatic resend.";
  }
  await save();
  return Response.json(publicProof(), { status: proof.status === "written" ? 200 : 503 });
}
