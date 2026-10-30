// The stage's chain actions with a fake Rabby, writer and adapter: what each command sends, and
// what it never sends. Run: node --import ./tests/ts-resolve.mjs --test --experimental-strip-types tests/stage-effects.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStageEffects, ENTITY_DELETED, NOT_YOURS_TO_DELETE } from "../lib/data/stage-effects.ts";
import { createDeletions } from "../lib/data/deleted-entities.ts";
import { NOTHING_TO_EXTEND, type ArkivAdapter } from "../shared/arkiv/adapter.ts";
import { WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { NO_EXPIRY_BLOCK, STAGE_EXTENSION_SEC, type Hex, type LiveEntity, type QueryRun, type WriteResult } from "../shared/types.ts";
import type { Command, StageState } from "../lib/stage/store.ts";

const key = (digit: string) => `0x${digit.repeat(64)}` as Hex;
function dot(digit: string, extra: Partial<LiveEntity> = {}): LiveEntity {
  return { key: key(digit), owner: WRITER_ADDRESS, creator: WRITER_ADDRESS, createdAtBlock: 10n, expiresAtBlock: 400n,
    attrs: { kind: "dot", session: "TEST", name: `dot ${digit}`, color: "#fe7446", country: "in", lat: 19, lng: 73 }, raw: [], ...extra };
}
const timed = dot("1");
/** Written with ExpirationTime.permanent(): `$expiresAt` is 2**64 - 1. */
const endless = dot("2", { expiresAtBlock: NO_EXPIRY_BLOCK });
const given = dot("3", { owner: `0x${"9".repeat(40)}` as Hex });
const args = (...values: unknown[]) => JSON.stringify(values);

/** Records everything the stage reaches: Rabby (connect), the writer's hold and each adapter call. */
function harness(source: "mock" | "live", entities: LiveEntity[], at: Partial<StageState> = {}) {
  const calls: string[] = [];
  const notices: string[] = [];
  const dispatched: Command[] = [];
  const deletions = createDeletions();
  const write = (name: string) => async (...values: unknown[]): Promise<WriteResult> => {
    calls.push(`${name} ${args(...values)}`);
    return { txHash: key("f"), block: 123n, keys: [] };
  };
  const adapter = {
    query: async (): Promise<Partial<QueryRun>> => { calls.push("query"); return { entities }; },
    extend: write("extend"), changeOwner: write("changeOwner"), deleteEntity: write("deleteEntity"), patch: write("patch"),
  } as unknown as ArkivAdapter;
  const state = { phase: "talk", replay: false, selected: [], session: "TEST", inspected: null, ...at } as unknown as StageState;
  const handle = createStageEffects({
    adapter, source,
    entities: () => entities,
    connect: async (reader) => { calls.push("connect"); return reader; },
    writer: {
      phase: async () => { calls.push("phase"); },
      replay: async () => { calls.push("replay"); },
      hold: async () => { calls.push("hold"); return { held: true, idle: true }; },
      resume: async () => { calls.push("resume"); },
    },
    notify: (message) => { notices.push(message); },
    awaitQuery: () => { calls.push("awaitQuery"); },
    dispatch: (command) => { dispatched.push(command); },
    getState: () => state,
    deletions,
    initialPhase: "talk",
  });
  return { adapter, calls, notices, dispatched, deletions, run: (command: Command, change: Partial<StageState> = {}) => handle(command, { ...state, ...change }) };
}

// "Make sure Extend does nothing for an entity with no expiration" (October 30): every path.
test("an entity with no expiration never reaches the wallet: not from the card, E or Extend all", async () => {
  const stage = harness("live", [endless], { selected: [endless.key] });
  await stage.run({ type: "extend", scope: "selected" }); // the card's Extend, and E
  await stage.run({ type: "extend", scope: "all" }); // Shift+E
  assert.deepEqual(stage.notices, [NOTHING_TO_EXTEND, NOTHING_TO_EXTEND]);
  assert.deepEqual(stage.calls, ["query"], "Extend all reads the room once; no Rabby, no writer hold, no write");
  // Selected beside an entity that expires, it is left out of the one transaction.
  const mixed = harness("live", [endless, timed], { selected: [endless.key, timed.key] });
  await mixed.run({ type: "extend", scope: "selected" });
  assert.deepEqual(mixed.calls, ["connect", "hold", `extend ${args([timed.key], STAGE_EXTENSION_SEC)}`, "awaitQuery", "resume"]);
  // Mock data refuses the same way.
  const mock = harness("mock", [endless], { selected: [endless.key] });
  await mock.run({ type: "extend", scope: "selected" });
  assert.deepEqual([mock.calls, mock.notices], [[], [NOTHING_TO_EXTEND]]);
});

test("Delete signs once with the workshop wallet, records the delete and closes the card", async () => {
  const stage = harness("live", [timed], { inspected: timed.key });
  await stage.run({ type: "deleteEntity", key: timed.key });
  assert.deepEqual(stage.calls, ["connect", "hold", `deleteEntity ${args(timed.key)}`, "awaitQuery", "resume"]);
  assert.deepEqual(stage.notices, ["Confirm in Rabby…", ENTITY_DELETED]);
  assert.equal(stage.deletions.blocks().get(timed.key), 123n, "the receipt's block");
  assert.deepEqual(stage.dispatched, [{ type: "inspect", key: null }]);
  // Gone from the DB-Chain while the map still draws it: nothing more is sent for it.
  await stage.run({ type: "deleteEntity", key: timed.key });
  await stage.run({ type: "extend", scope: "selected" }, { selected: [timed.key] });
  assert.deepEqual(stage.notices.slice(2), ["Select a live entity first.", "Select an entity first."]);
  assert.equal(stage.calls.length, 5);
});

test("Delete refuses an entity another wallet owns, or one not on the map, before Rabby opens", async () => {
  const stage = harness("live", [given, timed]);
  await stage.run({ type: "deleteEntity", key: given.key });
  await stage.run({ type: "deleteEntity", key: key("8") });
  assert.deepEqual(stage.notices, [NOT_YOURS_TO_DELETE, "Select a live entity first."]);
  assert.deepEqual(stage.calls, []);
  assert.equal(stage.deletions.blocks().size, 0);
});

test("a delete rejected in Rabby records nothing, keeps the card open and resumes the writer", async () => {
  const stage = harness("live", [timed], { inspected: timed.key });
  (stage.adapter as { deleteEntity: unknown }).deleteEntity = async () => {
    stage.calls.push("deleteEntity");
    throw Object.assign(new Error("User rejected the request."), { code: 4001 });
  };
  await stage.run({ type: "deleteEntity", key: timed.key });
  assert.deepEqual(stage.calls, ["connect", "hold", "deleteEntity", "resume"]);
  assert.deepEqual(stage.notices, ["Confirm in Rabby…", "User rejected the request."]);
  assert.equal(stage.deletions.has(timed.key), false);
  assert.deepEqual(stage.dispatched, []);
});

test("mock data deletes at once, with no wallet and no writer hold", async () => {
  const stage = harness("mock", [timed, endless], { inspected: endless.key });
  // No expiration does not stop a delete.
  await stage.run({ type: "deleteEntity", key: endless.key });
  assert.deepEqual(stage.calls, [`deleteEntity ${args(endless.key)}`]);
  assert.deepEqual(stage.notices, ["Mock data · applying demo action", "Mock data · action applied"]);
  assert.equal(stage.deletions.has(endless.key), true);
  assert.deepEqual(stage.dispatched, [{ type: "inspect", key: null }]);
});

test("Transfer and the writer's phase still go through the same handler", async () => {
  const stage = harness("live", [timed]);
  await stage.run({ type: "phase", phase: "build" }, { phase: "build" });
  await stage.run({ type: "transferTo", key: timed.key, newOwner: given.owner }, { phase: "build" });
  assert.deepEqual(stage.calls, ["phase", "connect", "hold", `changeOwner ${args(timed.key, given.owner)}`, "awaitQuery", "resume"]);
  assert.deepEqual(stage.notices, ["Confirm in Rabby…", "Ownership transferred. $owner changes on the next query."]);
});

test("the deletion registry keeps each entity once, with its block, and tells its listeners", () => {
  const registry = createDeletions();
  const heard: bigint[] = [];
  const stop = registry.subscribe(({ block }) => { heard.push(block); });
  registry.record(timed, 5n);
  registry.record(timed, 6n);
  stop();
  registry.record(endless, 7n);
  assert.deepEqual(heard, [5n]);
  assert.deepEqual([...registry.blocks()], [[timed.key, 5n], [endless.key, 7n]]);
  assert.equal(registry.has(endless.key), true);
  assert.equal(registry.has(given.key), false);
});
