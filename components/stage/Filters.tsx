"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { DOT_COLOR_NAMES, type DotColor } from "../../shared/encoding";
import type { Hex } from "../../shared/types";
import { stage, type StageState } from "../../lib/stage/store";
import { countryOptions } from "../../lib/data/countries";

const countries = countryOptions();
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function countryFrom(text: string): string | undefined {
  const value = text.trim().toLowerCase();
  if (!value) return undefined;
  return countries.find((country) => country.name.toLowerCase() === value || country.code.toLowerCase() === value)?.code;
}

/** The map's filter bar, along the top so it never covers the globe. Every field is an on-chain
 * predicate: typing changes the query at once (the query panel below shows it) and the next block's
 * read returns the matching entities, counted live. The fields are what the phone form writes (name,
 * color, country) and the owner; the category the writer adds stays off the bar (October 29). */
export function Filters({ state, results }: { state: StageState; results: number }) {
  const chain = state.chainFilters;
  const setChain = (filters: Partial<typeof chain>) => stage.dispatch({ type: "setChainFilters", filters: { ...stage.getState().chainFilters, ...filters } });
  const [country, setCountry] = useState(() => countries.find((option) => option.code === chain.country)?.name ?? "");
  const [owner, setOwner] = useState(chain.owner ?? "");
  // Scenes set the country too (L3): show it unless the presenter is typing a different one.
  const shownCountry = chain.country && countryFrom(country) !== chain.country ? countries.find((option) => option.code === chain.country)?.name ?? chain.country : country;
  const ownerValid = !owner.trim() || ADDRESS.test(owner.trim());
  const extra: { label: string; clear: () => void }[] = [];
  if (chain.color) extra.push({ label: `Color · ${DOT_COLOR_NAMES[chain.color.toLowerCase() as DotColor] ?? chain.color}`, clear: () => setChain({ color: undefined }) });
  if (chain.viewport) extra.push({ label: "Inside this map view", clear: () => setChain({ viewport: undefined }) });
  if (chain.expiringWithinSec !== undefined) extra.push({ label: `Expiring within ${chain.expiringWithinSec} s`, clear: () => setChain({ expiringWithinSec: undefined }) });
  if (chain.minRating !== undefined) extra.push({ label: `Rating ${chain.minRating}+`, clear: () => setChain({ minRating: undefined }) });
  return <section className="filter-bar panel pointer-events-auto" aria-label="Filter the map">
    <label className="filter-field"><span>Name</span><input type="search" placeholder="Starts with…" value={chain.namePrefix ?? ""} maxLength={24} onChange={(event) => setChain({ namePrefix: event.target.value || undefined })} /></label>
    <label className="filter-field"><span>Country</span><input type="search" list="filter-countries" placeholder="Any country" value={shownCountry} onChange={(event) => { setCountry(event.target.value); setChain({ country: countryFrom(event.target.value) }); }} /></label>
    <datalist id="filter-countries">{countries.map((option) => <option key={option.code} value={option.name} />)}</datalist>
    <label className="filter-field filter-owner" data-invalid={!ownerValid}><span>Owner</span><input type="search" placeholder="0x… wallet" value={owner} spellCheck={false} onChange={(event) => { const text = event.target.value; setOwner(text); setChain({ owner: ADDRESS.test(text.trim()) ? text.trim() as Hex : undefined }); }} /></label>
    <p className="filter-results" aria-live="polite"><strong>{results}</strong> {results === 1 ? "result" : "results"}</p>
    <button className="filter-close" aria-label="Close filters" onClick={() => stage.dispatch({ type: "togglePanel", panel: "filters", open: false })}><X size={22} /></button>
    {(extra.length > 0 || !ownerValid) && <div className="filter-extra">{!ownerValid && <span className="filter-hint">Paste a full 0x address to filter by owner.</span>}{extra.map((item) => <button key={item.label} className="filter-chip" onClick={item.clear}>{item.label}<X size={16} /></button>)}</div>}
  </section>;
}
