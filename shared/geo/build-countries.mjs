// Builds shared/geo/countries.json from Natural Earth 1:50m admin-0 countries (public domain).
// Usage: node shared/geo/build-countries.mjs <path/to/ne_50m_admin_0_countries.geojson>
// No dependencies. For each country it keeps the outer ring of the largest polygon,
// simplified with Douglas-Peucker to at most MAX_POINTS points, rounded to 3 decimals.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_POINTS = 150;
const DECIMALS = 3;

const src = process.argv[2];
if (!src) {
  console.error("Usage: node shared/geo/build-countries.mjs <ne_50m_admin_0_countries.geojson>");
  process.exit(1);
}
const outPath = join(dirname(fileURLToPath(import.meta.url)), "countries.json");

const round = (v) => Math.round(v * 10 ** DECIMALS) / 10 ** DECIMALS;

/** Area of a ring on the sinusoidal (equal-area) projection, so high-latitude islands don't win. */
function ringArea(ring) {
  const proj = ring.map(([x, y]) => [x * Math.cos((y * Math.PI) / 180), y]);
  let a = 0;
  for (let i = 0, j = proj.length - 1; i < proj.length; j = i++) {
    a += proj[j][0] * proj[i][1] - proj[i][0] * proj[j][1];
  }
  return Math.abs(a / 2);
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Iterative Douglas-Peucker on an open polyline; keeps both endpoints. */
function douglasPeucker(pts, eps) {
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = -1;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(pts[i], pts[s], pts[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > eps) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Simplify a closed ring (open form, no repeated last point). Splits at the point farthest from the first. */
function simplifyRing(ring, eps) {
  if (ring.length <= 4) return ring.slice();
  let far = 1;
  let farD = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const a = douglasPeucker(ring.slice(0, far + 1), eps);
  const b = douglasPeucker([...ring.slice(far), ring[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function roundRing(ring) {
  const out = [];
  for (const [x, y] of ring) {
    const p = [round(x), round(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  while (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
}

/** Simplify to <= MAX_POINTS by binary-searching the tolerance; never coarser than needed. */
function simplifyToLimit(ring) {
  let result = roundRing(ring);
  if (result.length <= MAX_POINTS) return result;
  let lo = 0;
  let hi = 5;
  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    const r = roundRing(simplifyRing(ring, mid));
    if (r.length <= MAX_POINTS) {
      hi = mid;
      result = r;
    } else {
      lo = mid;
    }
  }
  return result;
}

function pointInPolygon([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Area-weighted centroid; if it falls outside (crescent shapes), the midpoint of the widest interior run on its latitude. */
function interiorCentroid(poly) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j];
    const [x2, y2] = poly[i];
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  let c;
  if (Math.abs(a) < 1e-12) {
    c = [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  } else {
    c = [cx / (3 * a), cy / (3 * a)];
  }
  if (poly.length < 3 || pointInPolygon(c, poly)) return [round(c[0]), round(c[1])];
  // Scanline at the centroid latitude (nudged off vertices): pick the widest inside segment.
  const y = c[1] + 1e-7;
  const xs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
  }
  xs.sort((p, q) => p - q);
  let best = null;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (!best || xs[i + 1] - xs[i] > best[1] - best[0]) best = [xs[i], xs[i + 1]];
  }
  if (best) return [round((best[0] + best[1]) / 2), round(c[1])];
  return [round(c[0]), round(c[1])];
}

function pickIso2(p) {
  for (const key of ["ISO_A2", "ISO_A2_EH", "WB_A2"]) {
    const v = p[key];
    if (typeof v === "string" && /^[A-Z]{2}$/.test(v)) return v;
  }
  return null;
}

const geo = JSON.parse(readFileSync(src, "utf8"));
const byIso = new Map();
const skipped = [];

for (const f of geo.features) {
  const p = f.properties;
  const iso2 = pickIso2(p);
  if (!iso2) {
    skipped.push(p.NAME);
    continue;
  }
  const g = f.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  let outer = null;
  let outerArea = -1;
  for (const poly of polys) {
    const ring = poly[0].slice(0, -1); // GeoJSON rings repeat the first point at the end
    const area = ringArea(ring);
    if (area > outerArea) {
      outerArea = area;
      outer = ring;
    }
  }
  if (!outer) {
    skipped.push(p.NAME);
    continue;
  }
  const polygon = simplifyToLimit(outer);
  const xs = polygon.map((q) => q[0]);
  const ys = polygon.map((q) => q[1]);
  const entry = {
    iso2,
    name: p.NAME,
    centroid: interiorCentroid(polygon),
    bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    polygon,
    _area: outerArea,
  };
  const prev = byIso.get(iso2);
  if (prev) {
    console.warn(`duplicate ${iso2}: "${prev.name}" vs "${entry.name}", keeping the larger`);
    if (prev._area >= entry._area) continue;
  }
  byIso.set(iso2, entry);
}

const list = [...byIso.values()]
  .sort((a, b) => a.name.localeCompare(b.name, "en"))
  .map(({ _area, ...rest }) => rest);

const json = JSON.stringify(list);
writeFileSync(outPath, json + "\n");
const pts = list.reduce((s, c) => s + c.polygon.length, 0);
console.log(`${list.length} countries, ${pts} points, ${Buffer.byteLength(json) + 1} bytes -> ${outPath}`);
if (skipped.length) console.log(`skipped (no valid ISO code): ${skipped.join(", ")}`);
