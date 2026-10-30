// What an entity stores as its `country` (Santiago, October 30): the country's full name in lower
// case ("india"), easier to read on the Write it / Query it slides and the entity card than the code.
// The app keeps the lower-case ISO code ("in") everywhere else: the phone sends it, the writer places
// the dot with it and the camera flies with it. The name is set where an entity is written and where a
// query filters on it; entities read back keep the name they were stored with (older ones, "in").
// The import attribute lets Node's test runner load the JSON too, as in lib/data/countries.ts.
import countries from "./countries.json" with { type: "json" };

const NAMES = new Map(countries.map((country) => [country.iso2.toLowerCase(), country.name.toLowerCase()]));

/** The stored `country` for a code, any case ("IN" → "india"); an unknown value is returned in lower case. */
export function countryName(code: string): string {
  const value = code.trim().toLowerCase();
  return NAMES.get(value) ?? value;
}
