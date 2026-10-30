// The stage's chain actions, apart from React: Extend, Transfer and Delete from the entity card or the
// keys (and Make it a business), plus the writer's phase and replay. useStageEffects wires in Rabby,
// the writer API and the notice; tests drive it with fakes.

import { NOTHING_TO_EXTEND, type ArkivAdapter } from "../../shared/arkiv/adapter.ts";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles.ts";
import { hasNoExpiry, STAGE_EXTENSION_SEC, type Hex, type LiveEntity } from "../../shared/types.ts";
import type { Command, StageState } from "../stage/store.ts";

export const ENTITY_DELETED = "Entity deleted. It leaves the map on the next query.";
export const NOT_YOURS_TO_DELETE = "Another wallet owns it now: only that wallet can delete it.";

/** The writer API calls the presenter makes (live only). */
export interface WriterControls {
  phase(phase: StageState["phase"]): Promise<unknown>;
  replay(on: boolean): Promise<unknown>;
  /** Reserves the writer for one presenter transaction (a bounded window). */
  hold(): Promise<{ held: boolean; idle: boolean }>;
  resume(): Promise<unknown>;
}

export interface StageEffectsOptions {
  adapter: ArkivAdapter | null;
  source: "mock" | "live";
  /** The entities of the stage's latest query. */
  entities(): LiveEntity[];
  /** Live: opens Rabby on the workshop account and returns an adapter that signs with it. */
  connect(adapter: ArkivAdapter): Promise<ArkivAdapter>;
  writer: WriterControls;
  notify(message: string): void;
  /** Live: the notice after a confirmed write waits for the next query. */
  awaitQuery(): void;
  dispatch(command: Command): void;
  getState(): StageState;
  /** Entities this window deleted (deleted-entities.ts). */
  deletions: { has(key: Hex): boolean; record(entity: LiveEntity, block: bigint): void };
  initialPhase: StageState["phase"];
}

/** The leader's `stage.onCommand` handler. Every failure becomes the notice; nothing throws. */
export function createStageEffects(options: StageEffectsOptions): (command: Command, state: StageState) => Promise<void> {
  const { adapter, source, writer: api, notify } = options;
  let busy = false;
  let wallet: ArkivAdapter | null = null;
  let lastPhase = options.initialPhase;
  return async (command, state) => {
    try {
      if (state.phase !== lastPhase && source === "live") { lastPhase = state.phase; await api.phase(state.phase); }
      if (command.type === "replay") {
        if (source === "live") await api.replay(state.replay);
        notify("Replay requested. A recorded rehearsal must be loaded before playback.");
      }
      if (command.type !== "extend" && command.type !== "makeBusiness" && command.type !== "transferTo" && command.type !== "deleteEntity") return;
      if (!adapter) throw new Error("Network not configured");
      if (busy) throw new Error("Wait for the current transaction to finish.");
      busy = true;
      let held = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      try {
        // Every refusal below comes before Rabby opens or the writer is held.
        let keys: Hex[] = [];
        let doomed: LiveEntity | undefined;
        if (command.type === "extend") {
          let targets = options.entities().filter((entity) => state.selected.includes(entity.key));
          if (command.scope === "all") {
            if (source === "live" && !state.session) throw new Error("No session yet. Press Reset.");
            targets = (await adapter.query({ kinds: ["dot", "business"], session: source === "mock" ? "MOCK" : state.session! })).entities;
          }
          // A deleted entity is gone from the DB-Chain even while the map still draws it.
          targets = targets.filter((entity) => !options.deletions.has(entity.key));
          if (!targets.length) throw new Error("Select an entity first.");
          // An entity with the longest lifetime is already at Rabdi's maximum: extending it would
          // revert, so it is left out, and with nothing else to extend no wallet opens.
          keys = targets.filter((entity) => !hasNoExpiry(entity.expiresAtBlock)).map((entity) => entity.key);
          if (!keys.length) throw new Error(NOTHING_TO_EXTEND);
        }
        if (command.type === "deleteEntity") {
          doomed = options.entities().find((entity) => entity.key === command.key);
          if (!doomed || options.deletions.has(command.key)) throw new Error("Select a live entity first.");
          // Only its owner can delete it: the workshop wallet, until a transfer.
          if (doomed.owner.toLowerCase() !== WRITER_ADDRESS.toLowerCase()) throw new Error(NOT_YOURS_TO_DELETE);
        }
        let writer = adapter;
        if (source === "live") {
          // Finish wallet setup before reserving the writer's bounded hold window.
          wallet ??= await options.connect(adapter);
          writer = wallet;
          const hold = await api.hold();
          held = hold.held;
          if (!hold.idle) throw new Error("The writer is still sending. Wait for it to become idle.");
          heartbeat = setInterval(() => { void api.hold().catch(() => notify("Writer hold renewal failed. Wait a minute before another transaction.")); }, 20_000);
        }
        notify(source === "mock" ? "Mock data · applying demo action" : "Confirm in Rabby…");
        if (command.type === "extend") await writer.extend(keys, STAGE_EXTENSION_SEC);
        else if (command.type === "transferTo") await writer.changeOwner(command.key, command.newOwner);
        else if (command.type === "deleteEntity") {
          const result = await writer.deleteEntity(command.key);
          options.deletions.record(doomed!, result.block);
          // Its card closes; the event log says why the dot leaves the map.
          if (options.getState().inspected === command.key) options.dispatch({ type: "inspect", key: null });
        } else {
          const entity = options.entities().find((item) => item.key === command.key);
          if (!entity || entity.attrs.kind === "review") throw new Error("Select a live dot first.");
          await writer.patch(command.key, { kind: "business", name: entity.attrs.name, category: "cafe", rating: 4.6, opens: 480, closes: 1320, city: "Mumbai" }, entity.attrs);
          options.dispatch({ type: "setMap", map: "business" });
        }
        if (source === "live") options.awaitQuery();
        notify(source === "mock" ? "Mock data · action applied"
          : command.type === "transferTo" ? "Ownership transferred. $owner changes on the next query."
          : command.type === "deleteEntity" ? ENTITY_DELETED
          : "Transaction confirmed. Waiting for the next query…");
      } finally {
        clearInterval(heartbeat);
        if (held) {
          try { await api.resume(); }
          catch { notify("Writer resume failed. It resumes on its own within a minute."); }
        }
        busy = false;
      }
    } catch (error) {
      // Rabby rejects with a plain { code, message } object, not an Error.
      const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : null;
      notify(message ?? "Presenter action failed.");
    }
  };
}
