"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { countryOptions } from "../../lib/data/countries";

export function CountryPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const countries = useMemo(() => countryOptions(), []);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const visible = countries.filter((country) => country.name.toLowerCase().includes(search.toLowerCase()) || country.code.toLowerCase() === search.toLowerCase());
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const choose = (code: string) => { onChange(code); setOpen(false); setSearch(""); trigger.current?.focus(); };
  return <div className="country-picker" ref={root} onKeyDown={(event) => { if (open && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}><button ref={trigger} className="country-trigger" type="button" role="combobox" aria-label="Your country" aria-expanded={open} aria-haspopup="listbox" aria-controls={id} onClick={() => { setOpen(!open); setActive(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}><Search size={18} /><span>{countries.find((country) => country.code === value)?.name ?? value}</span><ChevronDown size={18} /></button>{open && <div className="country-menu"><input ref={input} aria-label="Search countries" role="combobox" aria-expanded="true" aria-controls={id} aria-activedescendant={visible.length ? `${id}-${active}` : undefined} type="search" placeholder="Search countries" value={search} onChange={(event) => { setSearch(event.target.value); setActive(0); }} onKeyDown={(event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = Math.max(0, Math.min(visible.length - 1, active + (event.key === "ArrowDown" ? 1 : -1))); setActive(next); list.current?.children[next]?.scrollIntoView({ block: "nearest" }); }
    if (event.key === "Enter" && visible[active]) { event.preventDefault(); choose(visible[active].code); }
  }} /><ul id={id} ref={list} role="listbox" aria-label="Countries">{visible.map((country, index) => <li id={`${id}-${index}`} key={country.code} role="option" aria-selected={value === country.code} className={index === active ? "country-active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(country.code)}>{country.name}{value === country.code && <Check size={16} />}</li>)}{!visible.length && <li className="country-empty">No countries match.</li>}</ul></div>}</div>;
}
