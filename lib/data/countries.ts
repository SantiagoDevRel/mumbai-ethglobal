// The import attribute lets Node's test runner load the JSON too; the app's bundler already reads
// countries.json this way through the writer's policy (writer/src/policy.ts).
import countries from "../../shared/geo/countries.json" with { type: "json" };
import type { Bbox } from "../map/country-view";

/** `code` is the lower-case ISO code the app keeps ("in"); entities store the full name ("india",
 * shared/geo/country-name.ts). */
export interface CountryOption { code: string; name: string }

/** Every country, India first (the room is in Mumbai), then by name. */
export function countryOptions(): CountryOption[] {
  return countries.map((country) => ({ code: country.iso2.toLowerCase(), name: country.name }))
    .sort((a, b) => a.code === "in" ? -1 : b.code === "in" ? 1 : a.name.localeCompare(b.name));
}

/** The box of the polygon the writer places a country's dots in, for the camera; any case. */
export function countryBox(code: string): Bbox | undefined {
  const iso2 = code.trim().toUpperCase();
  const box = countries.find((country) => country.iso2 === iso2)?.bbox;
  return box && box.length === 4 ? [box[0]!, box[1]!, box[2]!, box[3]!] : undefined;
}
