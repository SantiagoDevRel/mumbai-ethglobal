"use client";

import { useState } from "react";
import { DOT_PALETTE } from "../../shared/encoding";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
import type { BusinessCategory } from "../../shared/types";
import { stage, type StageState } from "../../lib/stage/store";
import { mapViewport } from "../../lib/map/viewport";
import { countryOptions } from "../../lib/data/countries";

const countries = countryOptions();
export function Filters({ state }: { state: StageState }) {
  const [customName, setCustomName] = useState("vegan");
  const [customValue, setCustomValue] = useState("yes");
  const chain = state.chainFilters, app = state.appFilters;
  const setChain = (filters: Partial<typeof chain>) => stage.dispatch({ type: "setChainFilters", filters: { ...chain, ...filters } });
  const setApp = (filters: Partial<typeof app>) => stage.dispatch({ type: "setAppFilters", filters: { ...app, ...filters } });
  return <section className="filters-panel panel pointer-events-auto"><div className="panel-heading"><h2>Filter the map</h2><button aria-label="Close filters" onClick={() => stage.dispatch({ type: "togglePanel", panel: "filters", open: false })}>×</button></div>
    <label>Owner<select value={chain.owner ?? ""} onChange={(event) => setChain({ owner: event.target.value ? WRITER_ADDRESS : undefined })}><option value="">Any owner</option><option value={WRITER_ADDRESS}>santiago</option></select></label>
    <label>Color<select value={chain.color ?? ""} onChange={(event) => setChain({ color: event.target.value || undefined })}><option value="">Any color</option>{DOT_PALETTE.map((color) => <option value={color} key={color}>{color}</option>)}</select></label>
    <label>Country<select value={chain.country ?? ""} onChange={(event) => setChain({ country: event.target.value || undefined })}><option value="">Any country</option>{countries.map((country) => <option value={country.code} key={country.code}>{country.name}</option>)}</select></label>
    <label className="checkbox-label"><input type="checkbox" checked={!!chain.viewport} onChange={(event) => setChain({ viewport: event.target.checked ? mapViewport.get() : undefined })} />Inside this map view</label>
    <label>Expiring within<select value={chain.expiringWithinSec ?? ""} onChange={(event) => setChain({ expiringWithinSec: event.target.value ? Number(event.target.value) : undefined })}><option value="">Any lifetime</option><option value="20">20 seconds</option><option value="60">60 seconds</option><option value="120">2 minutes</option></select></label>
    {state.map === "business" && <><label>Category<select value={chain.category ?? ""} onChange={(event) => setChain({ category: (event.target.value || undefined) as BusinessCategory | undefined })}><option value="">Any category</option>{["cafe", "restaurant", "street-food", "bakery", "bookstore", "gym", "market", "bar"].map((category) => <option key={category}>{category}</option>)}</select></label><label>Rating<select value={chain.minRating ?? ""} onChange={(event) => setChain({ minRating: event.target.value ? Number(event.target.value) : undefined })}><option value="">Any rating</option><option value="4">4 or more</option><option value="4.5">4.5 or more</option></select></label></>}
    <div className="app-filter-group"><p className="filter-caption">app-side</p><label className="checkbox-label"><input type="checkbox" checked={!!app.openNow} onChange={(event) => setApp({ openNow: event.target.checked })} />Open now</label><label>Sort<select value={app.sort ?? ""} onChange={(event) => setApp({ sort: (event.target.value || undefined) as typeof app.sort })}><option value="">Query order</option><option value="name">Name</option><option value="expiry">Expiration</option><option value="rating">Rating</option></select></label>
      <div className="overlay-inputs"><input aria-label="Custom attribute" value={customName} maxLength={24} onChange={(event) => setCustomName(event.target.value)} /><input aria-label="Custom value" value={customValue} maxLength={32} onChange={(event) => setCustomValue(event.target.value)} /></div><button disabled={!state.selected.length || !customName.trim()} onClick={() => { for (const key of state.selected) stage.dispatch({ type: "setOverlay", key, name: customName.trim(), value: customValue }); }}>Add to selected · app-side</button><label className="checkbox-label"><input type="checkbox" checked={!!app.custom} onChange={(event) => setApp({ custom: event.target.checked ? { name: customName.trim(), value: customValue } : undefined })} />Filter custom attribute</label>
    </div>
  </section>;
}
