"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { LiveData } from "../../lib/data/useLiveData";
import type { BlockInfo, LiveEntity, QueryDescription } from "../../shared/types";
import { stage, type StageState } from "../../lib/stage/store";
import { quietMap } from "../../lib/stage/choreography";
import { Filters } from "./Filters";
import { Inspector } from "./Inspector";
import { setSourceMode, useSourceMode, type SourceMode } from "../../lib/data/source-mode";
import { QueryLines } from "./QueryText";
import { SCENES } from "../../shared/scenes";
import { queryLayout } from "../../lib/data/query-layout";

/** 15 min, 2 min 30 s, 45 s. */
function lifetimeLabel(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  return total % 60 ? `${Math.floor(total / 60)} min ${total % 60} s` : `${total / 60} min`;
}

/** Where the map's data comes from and whether the last read landed: "Updated · block #N" each time
 * a fresh query lands (once per block, about every 2 s). */
function SourceLabel({ data }: { data: LiveData }) {
  if (data.source === "mock") return <span className="source-label">Mock data</span>;
  const status = data.paused ? "paused" : data.error ? "error" : data.run ? "live" : "waiting";
  const detail = status === "paused" ? "Paused" : status === "error" ? "Reconnecting…" : status === "live" ? `Updated · block #${data.run!.block.toString()}` : "Updating…";
  return <span className="source-label" data-status={status}>
    <i key={status === "live" ? data.run!.block.toString() : status} className="refresh-dot" aria-hidden />
    <span>Live · Arkiv DB-Chain</span><span className="refresh-detail" aria-live="off">{detail}</span>
  </span>;
}

/** For the presenter only, in the "?" card on /map: the data source and its status. The projected
 * stage shows neither (Santiago, October 29: no logo or status line on any scene). */
export function LiveStatus({ data }: { data: LiveData }) {
  const mode = useSourceMode();
  return <div className="live-status">
    <SourceLabel data={data} />
    <label className="source-picker"><span>Data source</span><select aria-label="Data source" value={mode} onChange={(event) => setSourceMode(event.target.value as SourceMode)}><option value="auto">Auto</option><option value="mock">Mock</option><option value="live">Live</option></select></label>
  </div>;
}

/** The room's log, newest first. The list snaps row by row, and Chrome re-snaps to the row that was
 * on top, so a new row (an arrival or a delete) would land hidden above it. While the presenter has
 * not scrolled down, the newest row stays in view. */
function EventLog({ data, block }: { data: LiveData; block: BlockInfo | null }) {
  const list = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  const newest = data.events[0]?.id;
  useLayoutEffect(() => {
    const element = list.current;
    if (!pinned.current || !element) return;
    element.scrollTop = 0;
    // A re-snap may still land on the next frame; this row was pinned, so it goes back on top.
    const frame = requestAnimationFrame(() => { element.scrollTop = 0; });
    return () => cancelAnimationFrame(frame);
  }, [newest]);
  return <aside className="event-log panel pointer-events-auto"><h2>On the map <span className="live-dot" /></h2><ol ref={list} onScroll={(event) => { pinned.current = event.currentTarget.scrollTop < 38; }}>{data.events.map((event) => <li key={event.id} data-event={event.type} data-current={event.block === data.run?.block}><button onClick={() => stage.dispatch({ type: "inspect", key: event.key })}><i className="event-color" style={{ color: event.color ?? "#fe7446" }} /><div><b>{event.type === "created" ? "+" : event.type === "expired" ? "−" : event.type === "deleted" ? "×" : "↗"} {event.name}{event.country && ` · ${event.country}`}{event.type === "created" && (event.noExpiry ? " · no expiration" : block && ` · ${lifetimeLabel(Number(event.lifetimeBlocks) * block.blockTimeMs / 1000)}`)}</b><span>{event.type === "expired" || event.type === "deleted" ? event.detail : `block #${event.block}`}</span></div></button></li>)}</ol>{!data.events.length && <p>Waiting for the room…</p>}</aside>;
}

/** `described`: the query for the filters on screen right now, so the panel follows typing at once.
 * The close (L9) keeps the map quiet: only a data error shows there. */
export function StageHud({ data, block, state, entities, appSteps, reviews, described }: { data: LiveData; block: BlockInfo | null; state: StageState; entities: LiveEntity[]; appSteps: string[]; reviews: LiveEntity[]; described?: QueryDescription | null }) {
  const [tab, setTab] = useState<"code" | "query">("query");
  const scene = SCENES[state.sceneIndex]!;
  const error = data.error && <p className="data-error" role="alert">{data.error}</p>;
  if (quietMap(scene.id)) return error || null;
  const fullText = (described ?? data.run?.description)?.[tab] ?? "Waiting for the first query…";
  const text = state.map === "business" ? fullText.split(tab === "code" ? "// Seed businesses\n" : "Seed businesses:\n").at(-1)! : fullText;
  const lines = queryLayout(text, tab);
  const extraSteps = state.map === "business" ? ["Audience session + seed businesses; other sessions excluded; deduplicated by key. Audience dots use invented business attributes."] : [...(data.run?.description.appSide ?? []), ...appSteps];
  // Only the business view adds that there is no ORDER BY; L3 leaves it out (one idea, said once).
  const appLine = [...new Set([...extraSteps, ...(state.map === "business" ? ["No ORDER BY. Your app sorts."] : [])])].join(" ");
  const ownerView = state.map === "owner";
  const count = ownerView ? (state.transferred ? entities.length : Math.min(1, entities.length)) : data.run?.entities.length ?? 0;
  const noun = count === 1 ? "entity" : "entities";
  // With a filter on (L3), the count is what matches the query, not every live entity.
  const { namePrefix, color, country, viewport, owner, expiringWithinSec, category, minRating } = state.chainFilters;
  const filtered = [namePrefix, color, country, viewport, owner, expiringWithinSec, category, minRating].some((value) => value !== undefined);
  return <>
    <div className={`stage-counter panel${ownerView && state.transferred ? " counter-transferred" : ""}`}><div><strong key={`${ownerView}:${count}`}>{count}</strong><small>{ownerView ? count === 1 ? "owner" : "owners" : data.error ? `${noun} in last query` : filtered ? `matching ${noun}` : `live ${noun}`}</small></div><p>{ownerView ? "Demo view · app-side ownership" : "Counted from the query results"}</p></div>
    {error}
    {!state.panels.inspector && state.map !== "owner" && scene.id !== "L3" && <EventLog data={data} block={block} />}
    {state.panels.filters && <Filters state={state} results={entities.length} />}
    {state.panels.inspector && <Inspector entity={data.run?.entities.find((entity) => entity.key === state.inspected) ?? null} block={block} businessMode={state.map === "business"} reviews={reviews} />}
    {state.panels.query && <section className="query-panel panel pointer-events-auto" aria-label="Query that ran">
      <div className="query-toolbar">
        <div role="tablist" aria-label="Query format">{(["code", "query"] as const).map((name) => <button key={name} role="tab" aria-selected={tab === name} title={name === "code" ? "The TypeScript SDK call this app runs" : "The query text the SDK sends to the DB-Chain"} onClick={() => setTab(name)}>{name === "code" ? "Code" : "Query"}</button>)}</div>
        <p>{tab === "code" ? "The SDK call: scope and filters" : "The query text: scope and filters"}</p>
        <div className="query-metrics"><span><small>block</small>#{data.run?.block.toString() ?? "—"}</span><span><small>{state.map === "business" ? "rows across queries" : "rows"}</small>{data.run?.rows ?? 0}</span><span><small>latency</small>{Math.round(data.run?.latencyMs ?? 0)} ms</span></div>
      </div>
      <QueryLines lines={lines} />
      {appLine && <div className="query-app-steps"><p className="app-side" title={appLine}><b>app-side</b> {appLine}</p></div>}
    </section>}
  </>;
}
