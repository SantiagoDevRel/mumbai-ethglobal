import type { BlockInfo } from "../../shared/types";

let block: BlockInfo | null = null;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let connections = 0;
function accept(next: BlockInfo | null) { block = next; for (const listener of listeners) listener(); }
export const blockFeed = {
  get: () => block,
  server: () => null,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  publish(next: BlockInfo | null) { accept(next); channel?.postMessage({ block: next }); },
  connect() {
    connections++;
    if (!channel) {
      channel = new BroadcastChannel("arkiv-mumbai-block");
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data;
        if (!data || typeof data !== "object") return;
        if ("hello" in data) { if (block) channel?.postMessage({ block }); return; }
        if (!("block" in data)) return;
        const next = data.block;
        if (next === null) accept(null);
        else if (typeof next === "object" && "number" in next && typeof next.number === "bigint" && "timestampMs" in next && typeof next.timestampMs === "number" && Number.isFinite(next.timestampMs) && "blockTimeMs" in next && typeof next.blockTimeMs === "number" && Number.isFinite(next.blockTimeMs) && next.blockTimeMs > 0) accept(next as BlockInfo);
      };
      channel.postMessage({ hello: true });
    }
    return () => { if (--connections === 0) { channel?.close(); channel = null; } };
  },
};
