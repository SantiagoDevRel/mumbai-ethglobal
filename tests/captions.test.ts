// Live captions: GET /api/presenter/captions grants a temporary Deepgram token to a presenter login
// only, and the Deepgram API key never leaves the server; plus the pure caption helpers. Fake key
// and fake Deepgram only. Run:
// node --import ./tests/ts-resolve.mjs --test --experimental-strip-types tests/captions.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createWriter } from "../lib/server/writer.ts";
import type { Db } from "../lib/server/db.ts";
import { DEEPGRAM_GRANT_URL } from "../lib/server/captions.ts";
import { CaptionsToken, WRITER_ROUTES } from "../shared/writer-api.ts";
import { CAPTION_KEYTERMS, correctTerms, deepgramListenUrl, readResult, tailWords } from "../lib/stage/captions-text.ts";

const presenter = "test-presenter-credential";
const auth = { authorization: `Bearer ${presenter}` };
const FAKE_KEY = "fake-deepgram-key-0123456789abcdef";
const FAKE_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.fake-signature-for-tests";

const untouched = () => Promise.reject(new Error("GET /api/presenter/captions must not touch the database."));
const db: Db = { t: (name) => `captions_test.${name}`, query: untouched, transaction: untouched, close: async () => undefined };

type Call = { url: string; init: RequestInit | undefined };
function writer(env: Record<string, string | undefined>, deepgram: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const instance = createWriter({
    db,
    env: { WORKSHOP_PRESENTER_TOKEN: presenter, ...env },
    writerAddress: "0x0000000000000000000000000000000000000001",
    defer: () => { throw new Error("Nothing runs after this response."); },
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = { url: String(input), init };
      calls.push(call);
      return deepgram(call);
    }) as typeof fetch,
  });
  const request = async (headers: Record<string, string> = auth, method = "GET") => {
    const response = await instance.handle(new Request(`https://app.example${WRITER_ROUTES.presenter.captions}`, { method, headers }));
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, data: JSON.parse(text) };
  };
  return { request, calls };
}
const granted = () => Response.json({ access_token: FAKE_JWT, expires_in: 60 });

test("a captions token needs a presenter login, checked before Deepgram is called", async () => {
  const { request, calls } = writer({ DEEPGRAM_API_KEY: FAKE_KEY }, granted);
  const strangers: Record<string, string>[] = [{}, { authorization: "Bearer wrong-credential" }, { authorization: presenter }, { authorization: "Bearer p.garbage" }];
  for (const headers of strangers) {
    const { status, data, text } = await request(headers);
    assert.equal(status, 401);
    assert.equal(data.error, "unauthorized");
    assert.equal(text.includes(FAKE_JWT) || text.includes(FAKE_KEY), false);
  }
  assert.equal(calls.length, 0, "A stranger never makes the writer spend a Deepgram call.");
});

test("a presenter gets a temporary token; the API key goes only to Deepgram's grant endpoint", async () => {
  const { request, calls } = writer({ DEEPGRAM_API_KEY: ` ${FAKE_KEY} ` }, granted);
  const expiresAt = Date.now() + 60_000;
  const login = `p.${expiresAt}.${createHmac("sha256", presenter).update(`presenter:${expiresAt}`).digest("hex")}`;
  for (const token of [presenter, login]) {
    const { status, headers, data, text } = await request({ authorization: `Bearer ${token}` });
    assert.equal(status, 200);
    assert.deepEqual(data, { accessToken: FAKE_JWT, expiresIn: 60 });
    assert.deepEqual(CaptionsToken.parse(data), data);
    assert.equal(headers.get("cache-control"), "no-store");
    assert.equal(text.includes(FAKE_KEY), false, "The answer never holds the API key.");
  }
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.url, DEEPGRAM_GRANT_URL);
    assert.equal(call.init?.method, "POST");
    assert.equal(new Headers(call.init?.headers).get("authorization"), `Token ${FAKE_KEY}`, "The key is trimmed and sent as Deepgram expects.");
  }
  assert.equal((await request(auth, "POST")).status, 404, "Only GET answers.");
});

test("no key answers 503 captions_not_configured without calling Deepgram", async () => {
  for (const value of [undefined, "", "   "]) {
    const { request, calls } = writer({ DEEPGRAM_API_KEY: value }, granted);
    const { status, data } = await request();
    assert.equal(status, 503);
    assert.equal(data.error, "captions_not_configured");
    assert.match(data.message, /DEEPGRAM_API_KEY/);
    assert.equal(calls.length, 0);
  }
});

test("a Deepgram failure answers 502 with a fixed reason, never Deepgram's body or the key", async () => {
  const leaky = `upstream said ${FAKE_KEY} is wrong`;
  const failures: (() => Response | Promise<Response>)[] = [
    () => new Response(leaky, { status: 401 }),
    () => new Response(leaky, { status: 500 }),
    () => new Response("not json", { status: 200 }),
    () => Response.json({ nothing: true }),
    () => Response.json({ access_token: "short" }),
    () => Response.json({ access_token: "has a space in it, so it is not a token" }),
    () => Promise.reject(new Error(leaky)),
  ];
  for (const failure of failures) {
    const { request } = writer({ DEEPGRAM_API_KEY: FAKE_KEY }, failure);
    const { status, data, text } = await request();
    assert.equal(status, 502);
    assert.equal(data.error, "captions_unavailable");
    assert.equal(text.includes(FAKE_KEY), false);
    assert.equal(text.includes("upstream said"), false);
  }
});

test("the streaming URL asks Nova-3 for English with interim words and every keyterm, no credential", () => {
  const url = new URL(deepgramListenUrl());
  assert.equal(url.origin, "wss://api.deepgram.com");
  assert.equal(url.pathname, "/v1/listen");
  assert.equal(url.searchParams.get("model"), "nova-3");
  assert.equal(url.searchParams.get("language"), "en");
  assert.equal(url.searchParams.get("interim_results"), "true");
  assert.deepEqual(url.searchParams.getAll("keyterm"), [...CAPTION_KEYTERMS]);
  assert.ok(CAPTION_KEYTERMS.includes("Arkiv") && CAPTION_KEYTERMS.includes("Rabdi"));
  for (const term of CAPTION_KEYTERMS) assert.doesNotMatch(term, /[,;\n]/, "Deepgram takes one plain term per keyterm.");
  // Deepgram counts at most 500 tokens across keyterms; words are a safe upper bound proxy here.
  assert.ok(CAPTION_KEYTERMS.join(" ").split(/[\s-]+/).length < 150);
  assert.equal(/token|key=|auth/i.test(url.search.replace(/keyterm=/g, "")), false);
});

test("readResult reads Deepgram Results and ignores everything else", () => {
  const result = (transcript: unknown, isFinal: boolean) => JSON.stringify({ type: "Results", is_final: isFinal, channel: { alternatives: [{ transcript }] } });
  assert.deepEqual(readResult(result(" hello Arkiv ", true)), { text: "hello Arkiv", isFinal: true });
  assert.deepEqual(readResult(result("write it", false)), { text: "write it", isFinal: false });
  assert.equal(readResult(JSON.stringify({ type: "Metadata" })), null);
  assert.equal(readResult(JSON.stringify({ type: "UtteranceEnd" })), null);
  assert.equal(readResult(result(42, true)), null);
  assert.equal(readResult("not json"), null);
  assert.equal(readResult(new ArrayBuffer(4)), null);
});

test("correctTerms fixes the talk's words the model hears as everyday English", () => {
  assert.equal(correctTerms("Today we write archive entities on Rabdi."), "Today we write Arkiv entities on Rabdi.");
  assert.equal(correctTerms("Archive is the Web3 database"), "Arkiv is the Web3 database");
  assert.equal(correctTerms("we watch entities Expiration remove them"), "we watch Entity Expiration remove them");
  assert.equal(correctTerms("lifetime extension"), "Lifetime Extension");
  assert.equal(correctTerms("archived archives"), "archived archives", "Only the whole word changes.");
  const final = JSON.stringify({ type: "Results", is_final: true, channel: { alternatives: [{ transcript: "write archive entities" }] } });
  assert.deepEqual(readResult(final), { text: "write Arkiv entities", isFinal: true });
});

test("tailWords keeps the newest words, cut at a word", () => {
  assert.equal(tailWords("  write   it.  query it. "), "write it. query it.");
  const long = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
  const tail = tailWords(long, 50);
  assert.ok(tail.length <= 50);
  assert.ok(tail.endsWith("word199"));
  assert.match(tail, /^word\d+ /, "It starts on a whole word.");
});
