"use client";

import { useState } from "react";
import type { LiveData } from "../../lib/data/useLiveData";
import type { BlockInfo } from "../../shared/types";
import { stage, type StageState } from "../../lib/stage/store";
import { Filters } from "./Filters";
import { Inspector } from "./Inspector";
import { OwnerView } from "./OwnerView";
import type { LiveEntity } from "../../shared/types";
import { setSourceMode, useSourceMode, type SourceMode } from "../../lib/data/source-mode";
import { QueryText } from "./QueryText";
import Image from "next/image";
import { SCENES } from "../../shared/scenes";
import { queryLayout } from "../../lib/data/query-layout";

/** 15 min, 2 min 30 s, 45 s. */
function lifetimeLabel(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  return total % 60 ? `${Math.floor(total / 60)} min ${total % 60} s` : `${total / 60} min`;
}

/** The dot flashes each time a fresh query lands (once per block, about every 2 s). */
function SourceLabel({ data }: { data: LiveData }) {
  if (data.source === "mock") return <span className="source-label">Mock data</span>;
  const status = data.paused ? "paused" : data.error ? "error" : data.run ? "live" : "waiting";
  const detail = status === "paused" ? "Paused" : status === "error" ? "Reconnecting…" : status === "live" ? `Updated · block #${data.run!.block.toString()}` : "Updating…";
  return <span className="source-label" data-status={status}>
    <i key={status === "live" ? data.run!.block.toString() : status} className="refresh-dot" aria-hidden />
    <span>Live · Arkiv DB-Chain</span><span className="refresh-detail" aria-live="off">{detail}</span>
  </span>;
}

export function StageHud({ data, block, state, entities, appSteps, reviews }: { data: LiveData; block: BlockInfo | null; state: StageState; entities: LiveEntity[]; appSteps: string[]; reviews: LiveEntity[] }) {
  const [tab, setTab] = useState<"code" | "query">("code");
  const mode = useSourceMode();
  const scene = SCENES[state.sceneIndex]!;
  const fullText = data.run?.description[tab] ?? "Waiting for the first query…";
  const text = state.map === "business" ? fullText.split(tab === "code" ? "// Seed businesses\n" : "Seed businesses:\n").at(-1)! : fullText;
  const layout = queryLayout(text, tab);
  const extraSteps = state.map === "business" ? ["Audience session + seed businesses; other sessions excluded; deduplicated by key. Audience dots use invented business attributes."] : [...(data.run?.description.appSide ?? []), ...appSteps];
  const appLine = [...new Set([...extraSteps, ...(scene.id === "L3" || state.map === "business" ? ["No ORDER BY. Your app sorts."] : [])])].join(" ");
  const ownerView = state.map === "owner";
  const count = ownerView ? (state.transferred ? entities.length : Math.min(1, entities.length)) : data.run?.entities.length ?? 0;
  return <>
    <header className="stage-status"><Image className="stage-logo" src="/brand/arkiv-white.svg" width={104} height={24} alt="Arkiv" /><SourceLabel data={data} /><div className={`stage-counter panel${ownerView && state.transferred ? " counter-transferred" : ""}`}><div><strong key={`${ownerView}:${count}`}>{count}</strong><small>{ownerView ? count === 1 ? "owner" : "owners" : data.error ? "entities in last query" : "live entities"}</small></div><p>{ownerView ? "Demo view · app-side ownership" : "Counted from the query results"}</p></div>{state.panels.controls && <div className="stage-toolbar pointer-events-auto"><label className="source-picker"><span className="sr-only">Data source</span><select aria-label="Data source" value={mode} onChange={(event) => setSourceMode(event.target.value as SourceMode)}><option value="auto">Auto</option><option value="mock">Mock</option><option value="live">Live</option></select></label><button onClick={() => stage.dispatch({ type: "togglePanel", panel: "filters" })}>Filters <kbd>F</kbd></button><button onClick={() => stage.dispatch({ type: "togglePanel", panel: "query" })}>Query <kbd>Q</kbd></button><span className="toolbar-block">Block #{block?.number.toString() ?? "—"}</span></div>}</header>
    {data.error && <p className="data-error" role="alert">{data.error}</p>}
    {!state.panels.inspector && state.map !== "owner" && scene.id !== "L9" && <aside className="event-log panel pointer-events-auto"><h2>On the map <span className="live-dot" /></h2><ol>{data.events.map((event) => <li key={event.id} data-event={event.type} data-current={event.block === data.run?.block}><button onClick={() => stage.dispatch({ type: "inspect", key: event.key })}><i className="event-color" style={{ color: event.color ?? "#fe7446" }} /><div><b>{event.type === "created" ? "+" : event.type === "expired" ? "−" : "↗"} {event.name}{event.country && ` · ${event.country}`}{event.type === "created" && block && ` · ${lifetimeLabel(Number(event.lifetimeBlocks) * block.blockTimeMs / 1000)}`}</b><span>{event.type === "expired" ? event.detail : `block #${event.block}`} · {block ? Math.max(0, Math.floor((block.timestampMs - event.at) / 1000)) : 0} s ago</span></div></button></li>)}</ol>{!data.events.length && <p>Waiting for the room…</p>}</aside>}
    {state.panels.filters && <Filters state={state} />}
    {state.panels.inspector && <Inspector entity={data.run?.entities.find((entity) => entity.key === state.inspected) ?? null} block={block} businessMode={state.map === "business"} reviews={reviews} badgeStep={scene.id === "L4" ? state.step : 0} showReviews={scene.id === "L5" && state.step === 2} />}
    {state.map === "owner" && <OwnerView transferred={state.transferred} count={entities.length} />}
    {state.panels.query && <section className="query-panel panel pointer-events-auto" aria-label="Query that ran"><div className="query-toolbar"><div role="tablist" aria-label="Query format">{(["code", "query"] as const).map((name) => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name === "code" ? "Code" : "Query"}</button>)}</div><p>{state.map === "business" ? "Business query that ran" : "The query that ran"}</p><div className="query-metrics"><span><small>block</small>#{data.run?.block.toString() ?? "—"}</span><span><small>{state.map === "business" ? "rows across queries" : "rows"}</small>{data.run?.rows ?? 0}</span><span><small>latency</small>{Math.round(data.run?.latencyMs ?? 0)} ms</span></div></div><details className="query-scope"><summary><b>Scope</b> <code>{layout.scope || "Executed SDK call"}</code></summary><pre className="query-full-text">{fullText}</pre></details>{layout.changing ? <QueryText text={layout.changing} /> : <p className="query-empty">No additional predicates.</p>}{appLine && <div className="query-app-steps"><p className="app-side" title={appLine}><b>app-side</b> {appLine}</p></div>}</section>}
  </>;
}
