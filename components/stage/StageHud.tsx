"use client";

import { useState } from "react";
import type { LiveData } from "../../lib/data/useLiveData";
import type { BlockInfo } from "../../shared/types";
import { stage, type StageState } from "../../lib/stage/store";
import { Filters } from "./Filters";
import { Inspector } from "./Inspector";
import { OwnerView } from "./OwnerView";
import type { LiveEntity } from "../../shared/types";
import { DoorsCountdown } from "./DoorsCountdown";
import { setSourceMode, useSourceMode, type SourceMode } from "../../lib/data/source-mode";
import { QueryText } from "./QueryText";

export function StageHud({ data, block, state, entities, appSteps, reviews }: { data: LiveData; block: BlockInfo | null; state: StageState; entities: LiveEntity[]; appSteps: string[]; reviews: LiveEntity[] }) {
  const [tab, setTab] = useState<"code" | "query">("code");
  const mode = useSourceMode();
  const text = data.run?.description[tab] ?? "Waiting for the first query…";
  return <>
    <DoorsCountdown startedAt={state.doorsCountdownAt} />
    <header className="stage-status pointer-events-auto"><span className="source-label">{data.source === "mock" ? "Mock data" : "Live · Arkiv DB-Chain"}</span><label className="source-picker"><span className="sr-only">Data source</span><select aria-label="Data source" value={mode} onChange={(event) => setSourceMode(event.target.value as SourceMode)}><option value="auto">Auto</option><option value="mock">Mock</option><option value="live">Live</option></select></label><strong>{data.run?.entities.length ?? 0}<small> live entities</small></strong><span>Block #{block?.number.toString() ?? "—"}</span><button onClick={() => stage.dispatch({ type: "togglePanel", panel: "filters" })}>Filters <kbd>F</kbd></button><button onClick={() => stage.dispatch({ type: "togglePanel", panel: "query" })}>Query <kbd>Q</kbd></button></header>
    {data.error && <p className="data-error" role="alert">{data.error}</p>}
    {!state.panels.inspector && <aside className="event-log panel pointer-events-auto"><h2>On the map</h2><ol>{data.events.map((event) => <li key={event.id}><button onClick={() => stage.dispatch({ type: "inspect", key: event.key })}><b>{event.type === "created" ? "+" : event.type === "expired" ? "−" : "↗"} {event.name}</b><span>{event.type === "expired" ? event.detail : `${event.detail} · block #${event.block}`}</span></button></li>)}</ol>{!data.events.length && <p>Waiting for the room…</p>}</aside>}
    {state.panels.filters && <Filters state={state} />}
    {state.panels.inspector && <Inspector entity={data.run?.entities.find((entity) => entity.key === state.inspected) ?? null} block={block} businessMode={state.map === "business"} reviews={reviews} />}
    {state.map === "owner" && <OwnerView transferred={state.transferred} count={entities.length} />}
    {state.panels.query && <section className={`query-panel panel pointer-events-auto ${state.panels.inspector ? "query-with-inspector" : ""} ${state.camera.cue === "mumbai-street" ? "query-shift-qr" : ""}`} aria-label="Query that ran"><div className="query-toolbar"><div role="tablist" aria-label="Query format">{(["code", "query"] as const).map((name) => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name === "code" ? "Code" : "Query"}</button>)}</div><span>Block #{data.run?.block.toString() ?? "—"} · {data.run?.rows ?? 0} rows · {Math.round(data.run?.latencyMs ?? 0)} ms</span></div><QueryText text={text} />{[...(data.run?.description.appSide ?? []), ...appSteps].map((line) => <p className="app-side" key={line}>app-side · {line}</p>)}</section>}
  </>;
}
