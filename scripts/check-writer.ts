import { randomUUID } from "node:crypto";
import { createSdkClients } from "../shared/arkiv/clients-0.8.ts";
import { createArkivAdapter } from "../shared/arkiv/sdk-0.8.ts";
import { explorerUrl, getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { eq } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/attr";
import { APP_ID, type Hex } from "../shared/types.ts";
import { delay, presenterRequest, writerRequest } from "./writer-http.ts";

// One real create, followed all the way from HTTP admission to disappearance at its expiry block.
const profile = getProfile(process.env.ARKIV_PROFILE);
const { reader } = createSdkClients({ profile, creator: WRITER_ADDRESS, read: { kind: "public" } });
const adapter = createArkivAdapter({ profile, creator: WRITER_ADDRESS, read: { kind: "public" } });
const { code } = await presenterRequest<{ code: string }>("session/start", {});
try {
  await presenterRequest("doors", { open: true });
  const token = randomUUID();
  const submittedAt = Date.now();
  const accepted = await writerRequest<{ ticket: string; lat: number; lng: number }>("/api/submit", { session: code, name: "Chain smoke", color: "#fe7446", country: "CO", lifetimeSec: 300 }, { "x-device-token": token });
  let ticket: { status: string; entityKey?: Hex; txHash?: Hex; block?: string; expiresAtBlock?: string } | undefined;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    ticket = await writerRequest(`/api/ticket/${accepted.ticket}`);
    if (ticket!.status === "failed") throw new Error("Writer marked the smoke submission failed.");
    if (ticket!.entityKey) break;
    await delay(500);
  }
  if (!ticket?.entityKey || !ticket.txHash || !ticket.expiresAtBlock) throw new Error("Writer did not confirm the smoke entity before the deadline.");
  const entity = await reader.getEntity(ticket.entityKey);
  if (!entity.creationFlags.permissionlessExtension || entity.payload.length !== 0) throw new Error("Entity creation policy did not round-trip.");
  const queried = await adapter.query({ kinds: ["dot"], session: code, viewport: { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 } });
  const dot = queried.entities.find(item => item.key === ticket!.entityKey);
  if (!dot || dot.attrs.kind !== "dot" || dot.attrs.lat !== accepted.lat || dot.attrs.lng !== accepted.lng) throw new Error("Writer placement differs from the public query.");
  const receipt = await reader.getTransactionReceipt({ hash: ticket.txHash });
  const expiry = BigInt(ticket.expiresAtBlock);
  let lastPresentBlock = receipt.blockNumber;
  let firstMissingBlock: bigint | undefined;
  while (Date.now() < deadline) {
    const block = await reader.getBlockNumber();
    const result = await reader.select({ key: true }).createdBy(WRITER_ADDRESS).where(eq("app", APP_ID), eq("$key", key(ticket.entityKey))).atBlock(block).fetch();
    if (!result.entities.length) { firstMissingBlock = block; break; }
    lastPresentBlock = block;
    await delay(500);
  }
  if (firstMissingBlock === undefined || firstMissingBlock < expiry || firstMissingBlock - expiry > 1n) throw new Error("Entity Expiration differs from the countdown by more than one block.");
  console.log(JSON.stringify({ session: code, ticket: accepted.ticket, txHash: ticket.txHash, entityKey: ticket.entityKey,
    block: ticket.block, expiresAtBlock: ticket.expiresAtBlock, lat: accepted.lat, lng: accepted.lng,
    lastPresentBlock: String(lastPresentBlock), firstMissingBlock: String(firstMissingBlock),
    expiryErrorBlocks: String(firstMissingBlock - expiry), observedTotalMs: Date.now() - submittedAt,
    gasUsed: String(receipt.gasUsed), query: queried.description.query, explorer: explorerUrl(profile, "tx", ticket.txHash), balanceWei: String(await reader.getBalance({ address: WRITER_ADDRESS })) }));
} finally { await presenterRequest("session/end", {}); }
