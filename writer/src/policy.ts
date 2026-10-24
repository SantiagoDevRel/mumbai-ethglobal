import { MAX_ENTITIES_PER_DEVICE, MAX_ENTITIES_PER_SESSION, type DotDraft } from "../../shared/types.ts";
import { isNameAllowed } from "../../shared/data/blocklist.ts";
import countries from "../../shared/geo/countries.json" with { type: "json" };
import { countryByIso2, placeInCountry, type CountryShape } from "../../shared/geo/place.ts";

export type AdmissionError = "device_live" | "device_limit" | "map_full";
export function admissionError(live: boolean, deviceCount: number, sessionCount: number): AdmissionError | null {
  if (live) return "device_live";
  if (deviceCount >= MAX_ENTITIES_PER_DEVICE) return "device_limit";
  if (sessionCount >= MAX_ENTITIES_PER_SESSION) return "map_full";
  return null;
}

export function nameBlocked(input: string): boolean {
  return /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/u.test(input)
    || new TextEncoder().encode(input).length > 128
    || !isNameAllowed(input);
}

export function validDraft(value: DotDraft): boolean {
  return value.name.trim().length >= 1 && value.name.trim().length <= 24
    && /^#[0-9a-f]{6}$/i.test(value.color) && /^[A-Z]{2}$/.test(value.country)
    && Number.isInteger(value.lifetimeSec) && value.lifetimeSec >= 20
    && value.lifetimeSec <= 120 && value.lifetimeSec % 10 === 0;
}

export function placeDot(iso2: string, seed: string): { lat: number; lng: number } | null {
  const country = countryByIso2(countries as CountryShape[], iso2);
  return country ? placeInCountry(country, seed) : null;
}

export function deviceToken(header: string | null, cookie: string | null): string | null {
  const fromCookie = cookie?.split(";").map(part => part.trim()).find(part => part.startsWith("workshop_device="))?.slice("workshop_device=".length);
  const token = header ?? fromCookie;
  if (!token || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) return null;
  if (header && fromCookie && header !== fromCookie) return null;
  return token;
}
