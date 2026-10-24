import countries from "../../shared/geo/countries.json";
export interface CountryOption { code: string; name: string }
export function countryOptions(): CountryOption[] {
  return countries.map((country) => ({ code: country.iso2, name: country.name }))
    .sort((a, b) => a.code === "IN" ? -1 : b.code === "IN" ? 1 : a.name.localeCompare(b.name));
}
