import { test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_PADDING, countryView, type Bbox } from "../lib/map/country-view.ts";
import { countryBox, countryOptions } from "../lib/data/countries.ts";

const STAGE = { width: 1920, height: 1080 };
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);

/** Where a point lands on the 1920x1080 stage for a view: Web Mercator around the center of the area
 * the padding leaves, as MapLibre's flyTo with that padding (the globe matches it at the center). */
function onStage(view: ReturnType<typeof countryView>, [lng, lat]: [number, number]) {
  const world = 512 * 2 ** view.zoom;
  const middle = {
    x: COUNTRY_PADDING.left + (STAGE.width - COUNTRY_PADDING.left - COUNTRY_PADDING.right) / 2,
    y: COUNTRY_PADDING.top + (STAGE.height - COUNTRY_PADDING.top - COUNTRY_PADDING.bottom) / 2,
  };
  const east = (((lng - view.center[0]) % 360) + 540) % 360 - 180;
  return { x: middle.x + (east / 360) * world, y: middle.y - (mercatorY(lat) - mercatorY(view.center[1])) * world };
}

test("India fills the free middle of the stage, clear of the counter, filters, query panel and card", () => {
  const box = countryBox("in")!;
  const view = countryView(box);
  const [west, south, east, north] = box;
  const corner = { nw: onStage(view, [west, north]), se: onStage(view, [east, south]) };
  assert.ok(corner.nw.x >= COUNTRY_PADDING.left && corner.se.x <= STAGE.width - COUNTRY_PADDING.right, JSON.stringify(corner));
  assert.ok(corner.nw.y >= COUNTRY_PADDING.top - 1e-6 && corner.se.y <= STAGE.height - COUNTRY_PADDING.bottom + 1e-6, JSON.stringify(corner));
  // Tight, not lost in the middle: one side of the box reaches the 40 px margin.
  const gap = Math.min(corner.nw.y - COUNTRY_PADDING.top, STAGE.height - COUNTRY_PADDING.bottom - corner.se.y, corner.nw.x - COUNTRY_PADDING.left, STAGE.width - COUNTRY_PADDING.right - corner.se.x);
  assert.ok(Math.abs(gap - 40) < 1, String(gap));
  assert.ok(Math.abs(view.center[0] - 82.74) < 0.01 && Math.abs(view.center[1] - 22.46) < 0.05, JSON.stringify(view.center));
  assert.ok(view.zoom > 3.3 && view.zoom < 3.6, String(view.zoom));
});

test("a big country zooms out further, a tiny one stops at the closest view, the globe at the widest", () => {
  const india = countryView(countryBox("in")!).zoom;
  assert.ok(countryView(countryBox("ru")!).zoom < india);
  assert.equal(countryView(countryBox("mc")!).zoom, 6, "Monaco still shows the coast around it");
  assert.equal(countryView(countryBox("aq")!).zoom, 1.5);
  for (const option of countryOptions()) {
    const { center, zoom } = countryView(countryBox(option.code)!);
    assert.ok(zoom >= 1.5 && zoom <= 6 && Math.abs(center[0]) <= 180 && Math.abs(center[1]) <= 80, `${option.code}: ${JSON.stringify({ center, zoom })}`);
  }
});

test("a box across the antimeridian is centered on it, not on the far side of the world", () => {
  const box: Bbox = [170, -20, -170, -10];
  const view = countryView(box);
  assert.ok(Math.abs(Math.abs(view.center[0]) - 180) < 1e-9, String(view.center[0]));
  assert.ok(Math.abs(countryView([175, -20, -160, -10]).center[0] - -172.5) < 1e-9);
  // Same width as a 20° box that doesn't cross: the same zoom.
  assert.ok(Math.abs(view.zoom - countryView([10, -20, 30, -10]).zoom) < 1e-9);
});

test("the camera finds a country by its stored lower-case code, in any case; options are lower case, India first", () => {
  assert.deepEqual(countryBox("in"), countryBox("IN"));
  assert.deepEqual(countryBox(" co "), [-79.025, -4.236, -66.876, 12.432]);
  assert.equal(countryBox("zz"), undefined);
  const options = countryOptions();
  assert.deepEqual(options[0], { code: "in", name: "India" });
  assert.ok(options.every((option) => /^[a-z]{2}$/.test(option.code)));
  assert.equal(new Set(options.map((option) => option.code)).size, options.length);
});
