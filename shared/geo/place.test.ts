// Run: node --test --experimental-strip-types shared/geo/place.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  countryByIso2,
  mulberry32,
  placeInCountry,
  pointInPolygon,
  seedFromString,
  type CountryShape,
} from "./place.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, "countries.json");
const countries: CountryShape[] = JSON.parse(readFileSync(dataPath, "utf8"));

const get = (iso2: string): CountryShape => {
  const c = countryByIso2(countries, iso2);
  assert.ok(c, `${iso2} is in countries.json`);
  return c;
};

const inBbox = (p: { lat: number; lng: number }, [a, b, c, d]: CountryShape["bbox"]) =>
  p.lng >= a && p.lng <= c && p.lat >= b && p.lat <= d;

test("data file: small, sorted by name, unique codes, expected countries present", () => {
  assert.ok(statSync(dataPath).size < 400 * 1024, "countries.json stays under 400 KB");
  const codes = countries.map((c) => c.iso2);
  assert.equal(new Set(codes).size, codes.length, "iso2 codes are unique");
  for (const c of countries) {
    assert.match(c.iso2, /^[A-Z]{2}$/);
    assert.ok(c.polygon.length <= 150, `${c.iso2} has at most 150 points`);
  }
  const names = countries.map((c) => c.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
  for (const iso of ["FR", "NO", "XK", "IN", "US", "BR", "SG", "MC"]) get(iso);
  // India's largest polygon is the mainland: it reaches from Gujarat to Arunachal Pradesh.
  const india = get("IN");
  assert.ok(india.bbox[0] < 70 && india.bbox[2] > 96 && india.bbox[1] < 9, "IN polygon is the mainland");
  // Norway's largest polygon is the mainland, not Svalbard.
  assert.ok(get("NO").bbox[1] < 60, "NO polygon is the mainland");
});

test("seeded helpers are deterministic", () => {
  assert.equal(seedFromString("abc"), seedFromString("abc"));
  assert.notEqual(seedFromString("abc"), seedFromString("abd"));
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 10; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test("pointInPolygon on a unit square", () => {
  const sq: CountryShape["polygon"] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  assert.equal(pointInPolygon([0.5, 0.5], sq), true);
  assert.equal(pointInPolygon([1.5, 0.5], sq), false);
  assert.equal(pointInPolygon([-0.1, 0.9], sq), false);
});

test("1000 placements in India are inside the polygon and spread across it", () => {
  const india = get("IN");
  const cells = new Set<string>();
  const points = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const p = placeInCountry(india, `dot-${i}`);
    assert.ok(pointInPolygon([p.lng, p.lat], india.polygon), `dot-${i} at ${p.lng},${p.lat} is inside India`);
    cells.add(`${Math.floor(p.lng / 5)}:${Math.floor(p.lat / 5)}`);
    points.add(`${p.lng},${p.lat}`);
  }
  assert.ok(cells.size >= 4, `spread over ${cells.size} 5x5 degree cells`);
  assert.ok(points.size >= 995, `${points.size} distinct points`);
});

test("placement is deterministic for the same seed and varies across seeds", () => {
  const br = get("BR");
  assert.deepEqual(placeInCountry(br, "same"), placeInCountry(br, "same"));
  assert.notDeepEqual(placeInCountry(br, "one"), placeInCountry(br, "two"));
  const p = placeInCountry(br, "rounding");
  assert.equal(p.lat, Math.round(p.lat * 1e5) / 1e5);
  assert.equal(p.lng, Math.round(p.lng * 1e5) / 1e5);
});

test("tiny countries still land on them", () => {
  for (const iso of ["SG", "MC", "VA"]) {
    const c = get(iso);
    for (let i = 0; i < 50; i++) {
      const p = placeInCountry(c, `tiny-${i}`);
      assert.ok(inBbox(p, c.bbox), `${iso} point inside bbox`);
    }
  }
  const sg = get("SG");
  const p = placeInCountry(sg, "x");
  assert.ok(pointInPolygon([p.lng, p.lat], sg.polygon), "SG point inside its polygon");
});

test("a degenerate shape falls back to the centroid with small jitter", () => {
  const dot: CountryShape = {
    iso2: "ZZ",
    name: "Test",
    centroid: [10, 20],
    bbox: [9.9, 19.9, 10.1, 20.1],
    polygon: [[10, 20]],
  };
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const p = placeInCountry(dot, `s${i}`);
    assert.ok(Math.abs(p.lng - 10) <= 0.05 && Math.abs(p.lat - 20) <= 0.05);
    seen.add(`${p.lng},${p.lat}`);
  }
  assert.ok(seen.size > 1, "jitter separates dots");
});

test("every country yields a point inside its bbox (and its polygon)", () => {
  const outsidePolygon: string[] = [];
  for (const c of countries) {
    for (let i = 0; i < 20; i++) {
      const p = placeInCountry(c, `all-${i}`);
      assert.ok(inBbox(p, c.bbox), `${c.iso2} ${c.name}: ${p.lng},${p.lat} inside bbox ${c.bbox}`);
      if (!pointInPolygon([p.lng, p.lat], c.polygon)) outsidePolygon.push(`${c.iso2}#${i}`);
    }
  }
  assert.deepEqual(outsidePolygon, [], "no centroid fallbacks needed");
});
