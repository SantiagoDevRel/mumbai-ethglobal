// Run: node --import ./tests/ts-resolve.mjs --test --experimental-strip-types shared/arkiv/mock.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockAdapter } from "./mock.ts";
import { NOTHING_TO_EXTEND, WriteNotSentError } from "./adapter.ts";
import { NO_EXPIRY_BLOCK, type DotAttrs } from "../types.ts";

test("mock mode starts with dots that have no expiration, in lower case like every write", async () => {
  const mock = createMockAdapter();
  try {
    for (let i = 0; i < 20; i++) mock.spawnRandom();
    const { entities } = await mock.query<DotAttrs>({ kinds: ["dot"], session: "MOCK" });
    const endless = entities.filter((entity) => entity.expiresAtBlock === NO_EXPIRY_BLOCK);
    assert.deepEqual(endless.map((entity) => entity.attrs.name).sort(), ["ada", "omar"]);
    assert.equal(entities.length, 22);
    for (const entity of entities) {
      assert.equal(entity.attrs.name, entity.attrs.name.toLowerCase());
      assert.match(entity.attrs.country, /^[a-z]{2}$/);
      assert.match(entity.attrs.color, /^#[0-9a-f]{6}$/);
      assert.equal(entity.raw.some((attribute) => attribute.name === "noExpiry" || attribute.name === "lifetimeSec"), false);
    }
  } finally { mock.stop(); }
});

test("mock writes and Lifetime Extension treat no expiration like the SDK adapter", async () => {
  const mock = createMockAdapter();
  try {
    const dot = { session: "TEST", name: "asha", color: "#fe7446", country: "in", lat: 19, lng: 72.8, lifetimeSec: 300 };
    const { keys: [timed, endless] } = await mock.createDots([dot, { ...dot, name: "ada", noExpiry: true }]);
    const read = async () => new Map((await mock.query({ kinds: ["dot"], session: "TEST" })).entities.map((entity) => [entity.key, entity]));
    const before = await read();
    assert.equal(before.get(endless!)!.expiresAtBlock, NO_EXPIRY_BLOCK);
    const deadline = before.get(timed!)!.expiresAtBlock;
    assert.ok(deadline < NO_EXPIRY_BLOCK);
    assert.equal(before.get(endless!)!.raw.some((attribute) => attribute.name === "noExpiry"), false);
    // Only the entity that expires gets the extension: 600 s is 300 blocks of 2 s.
    const extended = await mock.extend([timed!, endless!], 600);
    assert.deepEqual(extended.keys, [timed]);
    const after = await read();
    assert.equal(after.get(timed!)!.expiresAtBlock, deadline + 300n);
    assert.equal(after.get(endless!)!.expiresAtBlock, NO_EXPIRY_BLOCK);
    await assert.rejects(mock.extend([endless!], 600), (error: unknown) => error instanceof WriteNotSentError && error.message === NOTHING_TO_EXTEND);
    // "Expiring soon" never lists an entity with no expiration.
    const soon = await mock.query({ kinds: ["dot"], session: "TEST", expiringWithinSec: 3600 });
    assert.deepEqual(soon.entities.map((entity) => entity.key), [timed]);
  } finally { mock.stop(); }
});
