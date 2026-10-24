import { ExpirationTime } from "@arkiv-network/sdk/utils";
import { i32 } from "@arkiv-network/sdk/attr";
import { eq, gte, lte } from "@arkiv-network/sdk/query";
import { createSdkClients } from "../../shared/arkiv/clients-0.8.ts";
import { getProfile, WRITER_ADDRESS, NetworkNotConfiguredError } from "../../shared/arkiv/profiles.ts";
import { APP_ID, type Hex } from "../../shared/types.ts";
import type { Env } from "./index.ts";

interface Proof {
  status: "prepared" | "sending" | "written" | "uncertain" | "failed";
  txHash?: Hex;
  raw?: Hex;
  nonce?: number;
  query?: string;
  entityKey?: Hex;
  block?: string;
  expiresAtBlock?: string;
  gasUsed?: string;
  balanceWei?: string;
  chainId?: number;
  latestBlock?: string;
  error?: string;
}

/** One durable proof, never a new write on a repeated request. */
export async function phaseZero(state: DurableObjectState, env: Env): Promise<Response> {
  if (!env.ARKIV_PROFILE || !env.RPC || !env.ACCESS_KEY) throw new NetworkNotConfiguredError("writer configuration is incomplete");
  const previous = await state.storage.get<Proof>("phase0");
  const proof: Proof = previous ?? { status: "prepared" };
  const profile = getProfile(env.ARKIV_PROFILE);
  const { reader, writer, checkNetwork } = createSdkClients({
    profile, creator: WRITER_ADDRESS,
    read: { kind: "keyed", url: env.RPC, accessKey: env.ACCESS_KEY },
    wallet: { kind: "privateKey", privateKey: env.WORKSHOP_WRITER_PRIVATE_KEY as Hex },
  }, {
    async beforeSend(raw, hash) {
      proof.status = "sending";
      proof.raw = raw;
      proof.txHash = hash;
      await state.storage.put("phase0", proof);
    },
  });
  const publicProof = () => { const { raw: _raw, ...safe } = proof; return safe; };
  if (writer!.account!.address.toLowerCase() !== WRITER_ADDRESS.toLowerCase()) throw new NetworkNotConfiguredError("writer account mismatch");
  await checkNetwork();
  proof.chainId = await reader.getChainId();
  proof.latestBlock = String(await reader.getBlockNumber());
  proof.balanceWei = String(await reader.getBalance({ address: WRITER_ADDRESS }));
  if (previous) {
    if (proof.txHash && proof.status !== "written") {
      try {
        const receipt = await reader.getTransactionReceipt({ hash: proof.txHash });
        if (receipt.status === "reverted") proof.status = "failed";
        else {
          // The SDK may have lost its response. Read the exact transaction's created entity.
          const rows = await reader.select("*").createdBy(WRITER_ADDRESS)
            .where(eq("app", APP_ID), eq("session", "phase-zero")).fetch();
          const entity = rows.entities.find(e => e.createdAt === receipt.blockNumber);
          if (entity) { proof.entityKey = entity.key; proof.expiresAtBlock = String(entity.expiresAt); proof.status = "written"; }
          proof.block = String(receipt.blockNumber);
          proof.gasUsed = String(receipt.gasUsed);
        }
      } catch { proof.status = "uncertain"; }
    }
    await state.storage.put("phase0", proof);
    return Response.json(publicProof());
  }
  if (proof.balanceWei === "0") return Response.json({ ...publicProof(), error: "Writer needs funding." }, { status: 409 });
  proof.nonce = await reader.getTransactionCount({ address: WRITER_ADDRESS, blockTag: "pending" });
  await state.storage.put("phase0", proof);
  try {
    const result = await writer!.executeBatch({ creates: [{
      attributes: { app: APP_ID, kind: "dot", session: "phase-zero", name: "Worker check", color: "#fe7446", country: "IN", lat: i32(19_076_000), lng: i32(72_877_700) },
      payload: new Uint8Array(), contentType: "application/octet-stream",
      flags: { permissionlessExtension: true }, expires: ExpirationTime.fromSeconds(120),
    }] }, { nonce: proof.nonce });
    proof.txHash = result.txHash;
    proof.entityKey = result.createdEntities[0];
    const receipt = await reader.getTransactionReceipt({ hash: result.txHash });
    proof.block = String(receipt.blockNumber);
    proof.gasUsed = String(receipt.gasUsed);
    const builder = reader.select("*").createdBy(WRITER_ADDRESS).where(
      eq("app", APP_ID), eq("session", "phase-zero"),
      gte("lat", i32(-90_000_000)), lte("lat", i32(90_000_000)),
      gte("lng", i32(-180_000_000)), lte("lng", i32(180_000_000)),
    );
    proof.query = builder.toString();
    const resultPage = await builder.fetch();
    const entity = resultPage.entities.find(e => e.key === proof.entityKey);
    if (!entity || entity.payload.length !== 0 || !entity.creationFlags.permissionlessExtension) throw new Error("Entity readback differs from the create.");
    proof.expiresAtBlock = String(entity.expiresAt);
    proof.balanceWei = String(await reader.getBalance({ address: WRITER_ADDRESS }));
    proof.status = "written";
  } catch {
    proof.status = proof.txHash ? "uncertain" : "failed";
    proof.error = "Proof needs reconciliation; no automatic resend.";
  }
  await state.storage.put("phase0", proof);
  return Response.json(publicProof(), { status: proof.status === "written" ? 200 : 503 });
}
