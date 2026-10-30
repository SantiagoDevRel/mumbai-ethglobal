// GET /api/presenter/rabdi: Rabdi's network details for the Add network button on the Five steps
// slide, read from server-only env vars and served only to a presenter login. Fake values only: the
// real ones were announced inside the team and never go into this repo. The endpoint needs no
// database, so this runs everywhere (tests/writer-server.test.ts needs a real Postgres).
// Run: node --import ./tests/ts-resolve.mjs --test --experimental-strip-types tests/rabdi-endpoint.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createWriter } from "../lib/server/writer.ts";
import type { Db } from "../lib/server/db.ts";
import { RabdiNetwork, WRITER_ROUTES } from "../shared/writer-api.ts";

const presenter = "test-presenter-credential";
const auth = { authorization: `Bearer ${presenter}` };
const FAKE = {
  RABDI_CHAIN_ID: "424242",
  RABDI_RPC_URL: "https://rpc.rabdi.example/",
  RABDI_EXPLORER_URL: "https://explorer.rabdi.example/",
  RABDI_CURRENCY_SYMBOL: "tGLM",
};

/** The endpoint never needs the database: any use fails the request, and with it the test. */
const untouched = () => Promise.reject(new Error("GET /api/presenter/rabdi must not touch the database."));
const db: Db = { t: (name) => `rabdi_test.${name}`, query: untouched, transaction: untouched, close: async () => undefined };

function writer(env: Record<string, string | undefined>) {
  const instance = createWriter({
    db,
    env: { WORKSHOP_PRESENTER_TOKEN: presenter, ...env },
    writerAddress: "0x0000000000000000000000000000000000000001",
    defer: () => { throw new Error("Nothing runs after this response."); },
  });
  return async (headers: Record<string, string> = auth, method = "GET") => {
    const response = await instance.handle(new Request(`https://app.example${WRITER_ROUTES.presenter.rabdi}`, { method, headers }));
    return { status: response.status, headers: response.headers, data: await response.json() };
  };
}

test("Rabdi's details need a presenter login, checked before anything else", async () => {
  const envs: Record<string, string | undefined>[] = [FAKE, {}];
  const strangers: Record<string, string>[] = [{}, { authorization: "Bearer wrong-credential" }, { authorization: presenter }, { authorization: "Bearer p.garbage" }];
  for (const env of envs) {
    const call = writer(env);
    for (const headers of strangers) {
      const { status, data } = await call(headers);
      assert.equal(status, 401);
      assert.equal(data.error, "unauthorized");
      assert.doesNotMatch(JSON.stringify(data), /rabdi\.example|424242|RABDI_/, "A caller without a login learns nothing about the network.");
    }
  }
});

test("a presenter gets the details, with the chain ID also in hex, never cached", async () => {
  const call = writer(FAKE);
  const expiresAt = Date.now() + 60_000;
  const login = `p.${expiresAt}.${createHmac("sha256", presenter).update(`presenter:${expiresAt}`).digest("hex")}`;
  for (const token of [presenter, login]) {
    const { status, headers, data } = await call({ authorization: `Bearer ${token}` });
    assert.equal(status, 200);
    assert.deepEqual(data, {
      chainId: 424242,
      chainIdHex: "0x67932",
      rpcUrl: "https://rpc.rabdi.example/",
      explorerUrl: "https://explorer.rabdi.example/",
      currencySymbol: "tGLM",
    });
    assert.deepEqual(RabdiNetwork.parse(data), data);
    assert.equal(headers.get("cache-control"), "no-store");
  }
  assert.equal((await writer({ ...FAKE, RABDI_CHAIN_ID: " 424242 " })()).data.chainIdHex, "0x67932", "Values are trimmed.");
  assert.equal((await call(auth, "POST")).status, 404, "Only GET answers.");
});

test("a missing or invalid variable answers 503 network_not_configured, naming it and never a value", async () => {
  const cases: [name: string, value: string | undefined][] = [];
  for (const name of Object.keys(FAKE)) for (const value of [undefined, "", "   "]) cases.push([name, value]);
  cases.push(
    ["RABDI_CHAIN_ID", "0x67932"],
    ["RABDI_CHAIN_ID", "12.5"],
    ["RABDI_CHAIN_ID", "0"],
    ["RABDI_CHAIN_ID", "-7"],
    ["RABDI_CHAIN_ID", "99999999999999999999"],
    ["RABDI_RPC_URL", "http://rpc.rabdi.example/"],
    ["RABDI_RPC_URL", "rpc.rabdi.example"],
    ["RABDI_EXPLORER_URL", "ftp://explorer.rabdi.example/"],
    ["RABDI_CURRENCY_SYMBOL", "G"],
    ["RABDI_CURRENCY_SYMBOL", "tGLMtGLM"],
    ["RABDI_CURRENCY_SYMBOL", "t GLM"],
  );
  for (const [name, value] of cases) {
    const { status, data } = await writer({ ...FAKE, [name]: value })();
    assert.equal(status, 503, `${name}=${JSON.stringify(value)}`);
    assert.equal(data.error, "network_not_configured");
    assert.match(data.message, new RegExp(`\\b${name}\\b`), `the message names ${name}`);
    for (const other of Object.keys(FAKE).filter((key) => key !== name)) assert.doesNotMatch(data.message, new RegExp(`\\b${other}\\b`), `only ${name} is wrong`);
    // Values of three characters or more: a lone "0" or "G" could be part of any word.
    for (const secret of [...Object.values(FAKE), value?.trim() ?? ""].filter((item) => item.length > 2)) {
      assert.equal(data.message.includes(secret), false, `the message never repeats a value (${name})`);
    }
  }
  const none = await writer({})();
  assert.equal(none.status, 503);
  for (const name of Object.keys(FAKE)) assert.match(none.data.message, new RegExp(`\\b${name}\\b`), "every missing variable is named");
});
