"use client";

import { useEffect, useRef, useState } from "react";
import { shortKey } from "../../shared/encoding";
import type { BlockInfo, LiveEntity } from "../../shared/types";
import { stage } from "../../lib/stage/store";
import { remainingSeconds } from "../../lib/data/entity-state";
import { businessPresentation, isOpen, mumbaiMinutes } from "../../lib/data/view-model";

export function Inspector({ entity, block, businessMode, reviews, badgeStep = 0, showReviews = false }: { entity: LiveEntity | null; block: BlockInfo | null; businessMode: boolean; reviews: LiveEntity[]; badgeStep?: number; showReviews?: boolean }) {
  const [now, setNow] = useState(0);
  const fieldsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  useEffect(() => { fieldsRef.current?.querySelector(".badge-highlight")?.scrollIntoView({ block: "nearest" }); }, [badgeStep, entity?.key]);
  if (!entity) return <section className="inspector-panel panel pointer-events-auto"><h2>Inside one entity</h2><p>Select a dot on the map.</p></section>;
  const seconds = remainingSeconds(entity, block, now);
  const business = businessPresentation(entity);
  const fields = [
    { name: "$key", value: entity.key, badge: "its address, forever" },
    { name: "$owner", value: entity.owner, badge: "who controls it, can change" },
    { name: "$creator", value: entity.creator, badge: "who wrote it, never changes" },
    { name: "$expiresAt", value: `${entity.expiresAtBlock}`, badge: "can be extended" },
  ];
  const visibleFields = Object.entries(entity.attrs).filter(([name]) => businessMode ? ["name", "category", "rating", "opens", "closes", "city", "lat", "lng"].includes(name) : ["name", "color", "country", "lat", "lng"].includes(name));
  return <section data-reviews={businessMode && showReviews} className={`inspector-panel panel pointer-events-auto${businessMode ? " business-inspector" : ""}`}><div className="panel-heading"><h2><i className="inspected-color" style={{ background: "color" in entity.attrs ? entity.attrs.color ?? "#fe7446" : "#fe7446" }} />{business.name}</h2><button aria-label="Close inspector" onClick={() => stage.dispatch({ type: "inspect", key: null })}>×</button></div>
    {seconds < 60 && <p className="extend-suggestion">Less than 60 s left. Extend it before we look.</p>}
    {!businessMode && <div className="inspector-columns" ref={fieldsRef}><div><h3>Your columns</h3><dl>{visibleFields.map(([name, value]) => <div key={name}><dt>{name}</dt><dd title={String(value)}>{(name === "lat" || name === "lng") && typeof value === "number" ? value.toFixed(5) : String(value)}</dd></div>)}</dl></div><div><h3>Arkiv fields</h3><dl>{fields.map((field) => <div key={field.name} data-field={field.name} className={["$key", "$creator", "$owner", "$expiresAt"][badgeStep - 1] === field.name ? "badge-highlight" : ""}><dt>{field.name}</dt><dd title={field.value}>{field.name === "$expiresAt" ? <>{field.value}<span className="field-countdown">{Math.floor(Math.ceil(seconds) / 60)}:{String(Math.ceil(seconds) % 60).padStart(2, "0")} left</span></> : shortKey(field.value)}<small>{field.badge}</small></dd></div>)}</dl></div></div>}
    <details><summary>Stored attributes</summary><dl>{entity.raw.map((attr) => <div key={attr.name}><dt>{attr.name} · {attr.type}</dt><dd>{attr.stored}</dd></div>)}</dl></details>
    {businessMode && <div className="business-card"><div className="photo-placeholder">photo · bundled with the app</div><h3>{business.name}</h3><p>{business.category} · {business.rating.toFixed(1)} ★ · {isOpen(business.opens, business.closes, mumbaiMinutes(now)) ? "Open now" : "Closed now"}</p>{business.appSide && <p className="app-side">app-side · invented category, rating and opening hours</p>}{showReviews && <><p>{reviews.length} reviews</p>{reviews.map((review) => review.attrs.kind === "review" && <article className="review-card" key={review.key}><p>{review.attrs.stars} ★ · {review.attrs.text}</p><code>business = {shortKey(review.attrs.business)}</code></article>)}</>}<p className="photo-callback"><b>Architecture callback</b> “Photos: Swarm. Everything you filter on: Arkiv.” Demo photos are bundled with the app.</p></div>}
    <div className="inspector-actions"><button onClick={() => { stage.dispatch({ type: "select", keys: [entity.key], mode: "set" }); stage.dispatch({ type: "extend", scope: "selected" }); }}>Extend</button><button onClick={() => stage.dispatch({ type: "makeBusiness", key: entity.key })}>Make it a business</button><button onClick={() => stage.dispatch({ type: "transfer" })}>Transfer · demo view</button><button onClick={() => { stage.dispatch({ type: "select", keys: [entity.key], mode: "set" }); stage.dispatch({ type: "hideSelected" }); }}>Hide · local</button></div>
  </section>;
}
