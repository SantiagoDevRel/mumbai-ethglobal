import { test } from "node:test";
import assert from "node:assert/strict";
import { createArkivAdapter } from "../shared/arkiv/sdk-0.8.ts";
import { getProfile, WRITER_ADDRESS } from "../shared/arkiv/profiles.ts";
import { queryLayout, type QueryLine } from "../lib/data/query-layout.ts";
import { describeFilters } from "../shared/arkiv/mock.ts";
import { APP_ID } from "../shared/types.ts";

const OTHER_OWNER = "0x00000000000000000000000000000000000000aa";
const texts = (lines: QueryLine[]) => lines.map((line) => line.text);
const marked = (lines: QueryLine[]) => lines.filter((line) => line.live).map((line) => line.text);

test("the SDK's own description: one predicate per line, the scope first, the presenter's filters marked", () => {
  const adapter = createArkivAdapter({ profile: getProfile("tiramisu"), creator: WRITER_ADDRESS, read: { kind: "public" } });
  const description = adapter.describe({ kinds: ["dot"], session: "MOCK", namePrefix: "pri", color: "#fe7446", country: "in", owner: OTHER_OWNER, viewport: { minLat: 6, maxLat: 36, minLng: 68, maxLng: 98 } });
  for (const kind of ["code", "query"] as const) {
    const text = description[kind];
    const lines = queryLayout(text, kind);
    // app, kind and session open the panel, one per line and never marked.
    assert.deepEqual(lines.slice(0, 3).map((line) => line.live), [false, false, false], text);
    for (const [i, name] of ["app", "kind", "session"].entries()) assert.match(lines[i]!.text, new RegExp(`\\b${name}\\b`), text);
    // Every filter set on stage is its own marked line: the name prefix, the color, the country, the
    // map view and the owner.
    const live = marked(lines);
    // The name prefix in whatever form the SDK prints it, as long as the line names the field and the prefix.
    for (const pattern of [/\bname\b.*\bpri\b/, /#fe7446/, /country.*["']india["']/, /lat/, /lng/, kind === "code" ? /ownedBy/ : /\$owner/]) {
      assert.ok(live.some((line) => pattern.test(line)), `${kind}: ${pattern} in ${live.join(" | ")} (from ${text})`);
    }
    assert.ok(live.every((line) => !/\b(?:app|session)\b/.test(line)), "the scope is never marked");
    // Each line is text that ran; the query tab only adds the AND that joined it.
    for (const line of texts(lines)) assert.ok(text.includes(line.replace(/^AND /, "")), line);
    assert.ok(texts(lines).every((line) => !/\$creator|createdBy/.test(line)), "The talk projects $owner only.");
    if (kind === "query") assert.ok(texts(lines).slice(1).every((line) => line.startsWith("AND ")), "every line after the first reads AND …");
    else assert.ok(texts(lines).every((line) => line.startsWith(".where(") || line.startsWith(".ownedBy(")), texts(lines).join("\n"));
  }
});

test("the mock describes reads in the SDK's AND form; the panel lists them one per line, without $creator", () => {
  const description = describeFilters({ kinds: ["dot"], session: "MOCK", color: "#fe7446", country: "in", namePrefix: "pri" }, WRITER_ADDRESS);
  assert.equal(description.query, `app = str('${APP_ID}') AND kind = str('dot') AND session = str('MOCK') AND color = str('#fe7446') AND country = str('india') AND name STARTSWITH str("pri") AND $creator = addr(${WRITER_ADDRESS})`);
  assert.deepEqual(queryLayout(description.query, "query"), [
    { text: `app = str('${APP_ID}')`, live: false },
    { text: "AND kind = str('dot')", live: false },
    { text: "AND session = str('MOCK')", live: false },
    { text: "AND color = str('#fe7446')", live: true },
    { text: "AND country = str('india')", live: true },
    { text: 'AND name STARTSWITH str("pri")', live: true },
  ]);
  assert.deepEqual(queryLayout(description.code, "code"), [
    { text: `eq("app", "${APP_ID}")`, live: false },
    { text: 'eq("kind", "dot")', live: false },
    { text: 'eq("session", "MOCK")', live: false },
    { text: 'eq("color", "#fe7446")', live: true },
    { text: 'eq("country", "india")', live: true },
    { text: 'startsWith("name", "pri")', live: true },
  ]);
});

test("with no filter on stage, nothing is marked", () => {
  const description = describeFilters({ kinds: ["dot"], session: "MOCK" }, WRITER_ADDRESS);
  for (const kind of ["code", "query"] as const) assert.deepEqual(queryLayout(description[kind], kind).map((line) => line.live), [false, false, false], kind);
});

test("a quoted ' AND ' or an OR group never splits a predicate", () => {
  const text = "app = str('x') AND (kind = str('dot') OR kind = str('business')) AND name STARTSWITH str('it''s AND more') AND country = str('in')";
  assert.deepEqual(texts(queryLayout(text, "query")), [
    "app = str('x')",
    "AND (kind = str('dot') OR kind = str('business'))",
    "AND name STARTSWITH str('it''s AND more')",
    "AND country = str('in')",
  ]);
  assert.deepEqual(texts(queryLayout('app = str(\'x\') AND name STARTSWITH str("a \\" AND b")', "query")), ["app = str('x')", 'AND name STARTSWITH str("a \\" AND b")']);
});

test("an unfamiliar adapter description stays visible instead of being silently hidden, without $creator", () => {
  assert.deepEqual(queryLayout("future adapter syntax", "query"), [{ text: "future adapter syntax", live: false }]);
  assert.deepEqual(queryLayout("future adapter syntax\n$creator = addr(0x01)", "query"), [{ text: "future adapter syntax", live: false }]);
});

test("a filter in an operator the panel doesn't know is still its own marked line, never dropped", () => {
  assert.deepEqual(queryLayout("app = str('x') AND kind = str('dot') AND name ~ str('pri*') AND $creator = addr(0x01)", "query"), [
    { text: "app = str('x')", live: false },
    { text: "AND kind = str('dot')", live: false },
    { text: "AND name ~ str('pri*')", live: true },
  ]);
  // The code keeps only its filter calls: the builder's select, limit and fetch lines stay out.
  assert.deepEqual(queryLayout('reader.select({ key: true })\n  .where(eq("app", "x"))\n  .where(eq("color", "#fe7446"))\n  .limit(200)\n  .fetch();', "code"), [
    { text: '.where(eq("app", "x"))', live: false },
    { text: '.where(eq("color", "#fe7446"))', live: true },
  ]);
});

test("comma-terminated builder lines lose their comma", () => {
  const text = '  eq("app", "mumbai-workshop"),\n  eq("kind", "dot"),\n  eq("session", "MOCK"),\n  eq("color", "#fe7446"),';
  assert.deepEqual(queryLayout(text, "code"), [
    { text: 'eq("app", "mumbai-workshop")', live: false },
    { text: 'eq("kind", "dot")', live: false },
    { text: 'eq("session", "MOCK")', live: false },
    { text: 'eq("color", "#fe7446")', live: true },
  ]);
});
