"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { DOT_COLOR_NAMES, DOT_PALETTE } from "../../shared/encoding";
import { stage, type StageState } from "../../lib/stage/store";
import { countryOptions } from "../../lib/data/countries";

const countries = countryOptions();

function countryFrom(text: string): string | undefined {
  const value = text.trim().toLowerCase();
  if (!value) return undefined;
  return countries.find((country) => country.name.toLowerCase() === value || country.code === value)?.code;
}

/** "Any color", then the phone's seven colors (lower-case hex, as stored). */
const COLOR_OPTIONS: { value?: string; name: string }[] = [{ name: "Any color" }, ...DOT_PALETTE.map((value) => ({ value, name: DOT_COLOR_NAMES[value] }))];

/** The color field: a list of the phone's colors with their swatches (Santiago, October 29). Its own
 * keys (arrows, Home, End, Enter, Space, Esc) stay in the list instead of moving the talk; after a
 * mouse choice it lets go of the focus, so → and Space advance the talk again. */
function ColorFilter({ value, onChange }: { value?: string; onChange: (color: string | undefined) => void }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(0, COLOR_OPTIONS.findIndex((option) => option.value === value?.toLowerCase()));
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open]);
  const choose = (index: number, keyboard: boolean) => {
    onChange(COLOR_OPTIONS[index]!.value);
    setOpen(false);
    if (keyboard) trigger.current?.focus();
    else trigger.current?.blur();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!open) {
      if (event.key !== "Escape") { setActive(selected); setOpen(true); }
      return;
    }
    const last = COLOR_OPTIONS.length - 1;
    if (event.key === "Escape") setOpen(false);
    else if (event.key === "Enter" || event.key === " ") choose(active, true);
    else setActive(event.key === "Home" ? 0 : event.key === "End" ? last : event.key === "ArrowDown" ? Math.min(last, active + 1) : Math.max(0, active - 1));
  };
  const swatch = (color?: string) => <i className="filter-swatch" data-any={color ? undefined : true} style={color ? { background: color } : undefined} aria-hidden />;
  return <div className="filter-field color-filter" ref={root}>
    <span aria-hidden>Color</span>
    <button ref={trigger} type="button" role="combobox" aria-label="Color" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-colors`} aria-activedescendant={open ? `${id}-${active}` : undefined} onClick={() => { setActive(selected); setOpen(!open); }} onKeyDown={onKeyDown}>
      {swatch(COLOR_OPTIONS[selected]!.value)}<span>{COLOR_OPTIONS[selected]!.name}</span><ChevronDown size={18} aria-hidden />
    </button>
    {open && <ul id={`${id}-colors`} role="listbox" aria-label="Colors" className="color-filter-list">{COLOR_OPTIONS.map((option, index) => (
      <li key={option.name} id={`${id}-${index}`} role="option" aria-selected={index === selected} data-active={index === active || undefined} onPointerDown={(event) => event.preventDefault()} onPointerEnter={() => setActive(index)} onClick={() => choose(index, false)}>
        {swatch(option.value)}<span>{option.name}</span>{index === selected && <Check size={16} aria-hidden />}
      </li>
    ))}</ul>}
  </div>;
}

/** The map's filter bar, along the top so it never covers the globe. Every field is an on-chain
 * predicate: changing one changes the query at once (the query panel below shows it, its line
 * marked) and the next block's read returns the matching entities, counted live. The fields are
 * what the phone form writes: name, country and color; the category the writer adds stays off the
 * bar and so does the owner (October 29). Text is stored in lower case, so the name filter is too:
 * Arkiv compares strings exactly. A country filter also flies the camera there (lib/stage). */
export function Filters({ state, results }: { state: StageState; results: number }) {
  const chain = state.chainFilters;
  const setChain = (filters: Partial<typeof chain>) => stage.dispatch({ type: "setChainFilters", filters: { ...stage.getState().chainFilters, ...filters } });
  const [country, setCountry] = useState(() => countries.find((option) => option.code === chain.country)?.name ?? "");
  // A country set from the other window shows here unless the presenter is typing a different one.
  const shownCountry = chain.country && countryFrom(country) !== chain.country ? countries.find((option) => option.code === chain.country)?.name ?? chain.country : country;
  const extra: { label: string; clear: () => void }[] = [];
  if (chain.viewport) extra.push({ label: "Inside this map view", clear: () => setChain({ viewport: undefined }) });
  if (chain.expiringWithinSec !== undefined) extra.push({ label: `Expiring within ${chain.expiringWithinSec} s`, clear: () => setChain({ expiringWithinSec: undefined }) });
  if (chain.minRating !== undefined) extra.push({ label: `Rating ${chain.minRating}+`, clear: () => setChain({ minRating: undefined }) });
  return <section className="filter-bar panel pointer-events-auto" aria-label="Filter the map">
    <label className="filter-field"><span>Name</span><input type="search" placeholder="Starts with…" value={chain.namePrefix ?? ""} maxLength={24} autoCapitalize="none" autoComplete="off" spellCheck={false} onChange={(event) => setChain({ namePrefix: event.target.value.toLowerCase() || undefined })} /></label>
    <label className="filter-field"><span>Country</span><input type="search" list="filter-countries" placeholder="Any country" value={shownCountry} autoComplete="off" spellCheck={false} onChange={(event) => { setCountry(event.target.value); setChain({ country: countryFrom(event.target.value) }); }} /></label>
    <datalist id="filter-countries">{countries.map((option) => <option key={option.code} value={option.name} />)}</datalist>
    <ColorFilter value={chain.color} onChange={(color) => setChain({ color })} />
    <p className="filter-results" aria-live="polite"><strong>{results}</strong> {results === 1 ? "result" : "results"}</p>
    <button className="filter-close" aria-label="Close filters" onClick={() => stage.dispatch({ type: "togglePanel", panel: "filters", open: false })}><X size={22} /></button>
    {extra.length > 0 && <div className="filter-extra">{extra.map((item) => <button key={item.label} className="filter-chip" onClick={item.clear}>{item.label}<X size={16} /></button>)}</div>}
  </section>;
}
