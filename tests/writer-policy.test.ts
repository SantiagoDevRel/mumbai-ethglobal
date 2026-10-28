import { test } from "node:test";
import assert from "node:assert/strict";
import { admissionError, deviceToken, nameBlocked, placeDot, validDraft } from "../writer/src/policy.ts";
import countries from "../shared/geo/countries.json" with { type: "json" };
import { countryByIso2, pointInPolygon, type CountryShape } from "../shared/geo/place.ts";

test("ten per device and four hundred per session", () => {
  assert.equal(admissionError(true, 0, 0), "device_live");
  assert.equal(admissionError(false, 10, 0), "device_limit");
  assert.equal(admissionError(false, 9, 0), null);
  assert.equal(admissionError(false, 0, 400), "map_full");
  assert.equal(admissionError(false, 2, 399), null);
});
test("lifetime, name and data validation reject boundary violations", () => {
  const draft = { name: "Asha", color: "#FE7446", country: "IN", lifetimeSec: 300 };
  assert.equal(validDraft(draft), true);
  for (const lifetimeSec of [0, 20, 120, 299, 330, 901, 960, NaN, 300.5]) assert.equal(validDraft({ ...draft, lifetimeSec }), false);
  assert.equal(validDraft({ ...draft, lifetimeSec: 900 }), true);
  assert.equal(validDraft({ ...draft, color: "red" }), false);
  assert.equal(validDraft({ ...draft, name: "x".repeat(25) }), false);
  assert.equal(validDraft({ ...draft, country: "in" }), false);
});
test("multilingual blocklist catches spacing, leet and hidden controls", () => {
  for (const name of ["f.u.c.k", "5hit", "chutiya", "चूतिया", "A\u202eB"]) assert.equal(nameBlocked(name), true, name);
  for (const name of ["Asha", "María", "मुंबई"]) assert.equal(nameBlocked(name), false, name);
});
test("device token uses header plus cookie without depending on an IP", () => {
  const token = "test-device-token-1234";
  assert.equal(deviceToken(token, null), token);
  assert.equal(deviceToken(null, `workshop_device=${token}`), token);
  assert.equal(deviceToken(token, `workshop_device=${token}`), token);
  assert.equal(deviceToken(token, "workshop_device=another-device-token"), null);
  assert.equal(deviceToken("short", null), null);
});
test("country placement stays inside the polygon, is deterministic, and spreads devices", () => {
  const shape = countryByIso2(countries as CountryShape[], "IN")!;
  const positions = new Set<string>();
  for (let index = 0; index < 50; index++) {
    const seed = `submission-${index}`;
    const point = placeDot("IN", seed)!;
    assert.ok(pointInPolygon([point.lng, point.lat], shape.polygon));
    assert.deepEqual(placeDot("IN", seed), point);
    positions.add(JSON.stringify(point));
  }
  assert.equal(positions.size, 50);
  assert.equal(placeDot("XX", "submission"), null);
});
