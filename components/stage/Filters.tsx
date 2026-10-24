"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { DOT_PALETTE } from "../../shared/encoding";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";
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
  const chip = (label: string, on: boolean, action: () => void, local = false) => <button key={`${label}:${on}`} className={`filter-chip${local ? " local-chip" : ""}`} aria-pressed={on} onClick={action}>{on ? <Check size={20} /> : <Plus size={20} />}<span>{label}</span>{local && <small>app-side</small>}</button>;
  return <section className="filters-panel panel pointer-events-auto"><div className="panel-heading"><h2>Filter the map</h2><button aria-label="Close filters" onClick={() => stage.dispatch({ type: "togglePanel", panel: "filters", open: false })}>×</button></div>
    <div className="filter-chips" aria-label="On-chain filters">
      {chip(`Color · ${!chain.color || chain.color.toLowerCase() === "#fe7446" ? "Orange" : chain.color}`, !!chain.color, () => setChain({ color: chain.color ? undefined : "#fe7446" }))}
      {chip(`Country · ${countries.find((country) => country.code === (chain.country ?? "IN"))?.name ?? chain.country}`, !!chain.country, () => setChain({ country: chain.country ? undefined : "IN" }))}
      {chip("Inside this map view", !!chain.viewport, () => setChain({ viewport: chain.viewport ? undefined : mapViewport.get() }))}
      {chip("Owner · santiago", !!chain.owner, () => setChain({ owner: chain.owner ? undefined : WRITER_ADDRESS }))}
    </div>
    <div className="app-filter-group filter-chips">
      {chip("Open now", !!app.openNow, () => setApp({ openNow: !app.openNow }), true)}
      {chip(`Sort · ${app.sort ?? "name"}`, !!app.sort, () => setApp({ sort: app.sort ? undefined : "name" }), true)}
    </div>
    <details className="more-filters"><summary>More filters</summary><p className="filter-scope">Creator · santiago · workshop scope</p><div className="filter-color-options">{DOT_PALETTE.map((color) => <button key={color} aria-label={`Filter color ${color}`} aria-pressed={chain.color === color} style={{ background: color }} onClick={() => setChain({ color: chain.color === color ? undefined : color })} />)}</div><label>Country<select value={chain.country ?? ""} onChange={(event) => setChain({ country: event.target.value || undefined })}><option value="">Any country</option>{countries.map((country) => <option value={country.code} key={country.code}>{country.name}</option>)}</select></label>
      {chip(`Expiring within · ${chain.expiringWithinSec ?? 60} s`, chain.expiringWithinSec !== undefined, () => setChain({ expiringWithinSec: chain.expiringWithinSec === undefined ? 60 : undefined }))}
      {state.map === "business" && <>{chip(`Category · ${chain.category ?? "cafe"}`, !!chain.category, () => setChain({ category: chain.category ? undefined : "cafe" }))}{chip(`Rating · ${chain.minRating ?? 4}+`, chain.minRating !== undefined, () => setChain({ minRating: chain.minRating === undefined ? 4 : undefined }))}</>}
      <div className="app-filter-group"><p className="filter-caption">app-side</p><div className="filter-chips">{(["name", "expiry", "rating"] as const).map((sort) => chip(`Sort · ${sort}`, app.sort === sort, () => setApp({ sort: app.sort === sort ? undefined : sort }), true))}</div><div className="overlay-inputs"><input aria-label="Custom attribute" value={customName} maxLength={24} onChange={(event) => setCustomName(event.target.value)} /><input aria-label="Custom value" value={customValue} maxLength={32} onChange={(event) => setCustomValue(event.target.value)} /></div><button disabled={!state.selected.length || !customName.trim()} onClick={() => { for (const key of state.selected) stage.dispatch({ type: "setOverlay", key, name: customName.trim(), value: customValue }); }}>Add to selected · app-side</button>{chip("Filter custom attribute", !!app.custom, () => setApp({ custom: app.custom ? undefined : { name: customName.trim(), value: customValue } }), true)}</div>
    </details>
  </section>;
}
