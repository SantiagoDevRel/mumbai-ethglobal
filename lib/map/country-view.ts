// Where the camera goes to frame one country. On L3 a country filter flies the globe there and
// clearing it flies back (Santiago, October 29). Pure: the globe passes the country's bbox from
// shared/geo/countries.json, the box of the polygon the writer places that country's dots in.

/** `[minLng, minLat, maxLng, maxLat]`, as in countries.json. */
export type Bbox = readonly [number, number, number, number];

/** Stage pixels kept clear around a framed country on L3: the entity counter and the filter bar
 * above it (they end by y 176), the query panel below it (top at y 752) and the right-hand column
 * the entity card opens in, as the India view keeps it. */
export const COUNTRY_PADDING = { left: 32, right: 456, top: 192, bottom: 344 } as const;

const STAGE = { width: 1920, height: 1080 };
/** MapLibre's world is 512 px wide at zoom 0. */
const WORLD_PX = 512;
/** Never closer than this (a city-state still shows the coast around it), never further than the
 * whole globe. */
const ZOOM_RANGE = { min: 1.5, max: 6 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Web Mercator y as a fraction of the world's height, north positive. */
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (clamp(lat, -85, 85) * Math.PI) / 360)) / (2 * Math.PI);
const latitudeOf = (y: number) => ((2 * Math.atan(Math.exp(y * 2 * Math.PI)) - Math.PI / 2) * 180) / Math.PI;

/**
 * Center and zoom that fit `bbox` inside the stage area `padding` leaves, `margin` stage pixels
 * inside its edges, in stage pixels (the globe adds log2 of the stage scale, as for its other views).
 * A Web Mercator fit: the globe draws its center at Mercator's scale and shrinks everything away
 * from it, so a country can come out a little smaller than the area, never bigger. A box that
 * crosses the antimeridian (minLng > maxLng) wraps.
 */
export function countryView(bbox: Bbox, padding: { left: number; right: number; top: number; bottom: number } = COUNTRY_PADDING, margin = 40): { center: [lng: number, lat: number]; zoom: number } {
  const [west, south, rawEast, north] = bbox;
  const east = rawEast < west ? rawEast + 360 : rawEast;
  const width = Math.max(1, STAGE.width - padding.left - padding.right - 2 * margin);
  const height = Math.max(1, STAGE.height - padding.top - padding.bottom - 2 * margin);
  const top = mercatorY(north);
  const bottom = mercatorY(south);
  const zoom = Math.min(
    Math.log2(width / (WORLD_PX * Math.max((east - west) / 360, 1e-9))),
    Math.log2(height / (WORLD_PX * Math.max(top - bottom, 1e-9))),
  );
  const lng = (west + east) / 2;
  return {
    center: [lng > 180 ? lng - 360 : lng, clamp(latitudeOf((top + bottom) / 2), -80, 80)],
    zoom: clamp(zoom, ZOOM_RANGE.min, ZOOM_RANGE.max),
  };
}
