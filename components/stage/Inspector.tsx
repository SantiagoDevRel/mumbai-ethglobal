"use client";

import { useEffect, useState } from "react";
import { shortKey } from "../../shared/encoding";
import type { BlockInfo, LiveEntity } from "../../shared/types";
import { stage } from "../../lib/stage/store";
import { remainingSeconds } from "../../lib/data/entity-state";
import { businessPresentation, isOpen, mumbaiMinutes } from "../../lib/data/view-model";

export function Inspector({ entity, block, businessMode, reviews }: { entity: LiveEntity | null; block: BlockInfo | null; businessMode: boolean; reviews: LiveEntity[] }) {
  const [now, setNow] = useState(0);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  if (!entity) return <section className="inspector-panel panel pointer-events-auto"><h2>Inside one entity</h2><p>Select a dot on the map.</p></section>;
  const seconds = remainingSeconds(entity, block, now);
  const business = businessPresentation(entity);
  const fields = [
    { name: "$key", value: entity.key, badge: "its address, forever" },
    { name: "$owner", value: entity.owner, badge: "who controls it, can change" },
    { name: "$creator", value: entity.creator, badge: "who wrote it, never changes" },
    { name: "$expiresAt", value: `${entity.expiresAtBlock} · ${Math.ceil(seconds)} s`, badge: "can be extended" },
  ];
  return <section className="inspector-panel panel pointer-events-auto"><div className="panel-heading"><h2>Inside one entity</h2><button aria-label="Close inspector" onClick={() => stage.dispatch({ type: "inspect", key: null })}>×</button></div>
    {seconds < 60 && <p className="extend-suggestion">Less than 60 s left. Extend it before we look.</p>}
    <div className="inspector-columns"><div><h3>Your columns</h3><dl>{Object.entries(entity.attrs).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{String(value)}</dd></div>)}</dl></div><div><h3>Arkiv fields</h3><dl>{fields.map((field) => <div key={field.name}><dt>{field.name}</dt><dd title={field.value}>{field.name === "$expiresAt" ? field.value : shortKey(field.value)}<small>{field.badge}</small></dd></div>)}</dl></div></div>
    <details><summary>Stored attributes</summary><dl>{entity.raw.map((attr) => <div key={attr.name}><dt>{attr.name} · {attr.type}</dt><dd>{attr.stored}</dd></div>)}</dl></details>
    {businessMode && <div className="business-card"><div className="photo-placeholder">Photo placeholder</div><h3>{business.name}</h3><p>{business.category} · {business.rating.toFixed(1)} ★ · {isOpen(business.opens, business.closes, mumbaiMinutes(now)) ? "Open now" : "Closed now"}</p>{business.appSide && <p className="app-side">app-side · invented category, rating and opening hours</p>}<p>{reviews.length} reviews</p>{reviews.map((review) => review.attrs.kind === "review" && <article className="review-card" key={review.key}><p>{review.attrs.stars} ★ · {review.attrs.text}</p><code>business = {shortKey(review.attrs.business)}</code></article>)}</div>}
    <div className="inspector-actions"><button onClick={() => { stage.dispatch({ type: "select", keys: [entity.key], mode: "set" }); stage.dispatch({ type: "extend", scope: "selected" }); }}>Extend</button><button onClick={() => stage.dispatch({ type: "makeBusiness", key: entity.key })}>Make it a business</button><button onClick={() => stage.dispatch({ type: "transfer" })}>Transfer · demo view</button><button onClick={() => { stage.dispatch({ type: "select", keys: [entity.key], mode: "set" }); stage.dispatch({ type: "hideSelected" }); }}>Hide · local</button></div>
  </section>;
}
