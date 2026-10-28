"use client";

import { useEffect, useRef, useState } from "react";
import { shortKey } from "../../shared/encoding";
import type { BlockInfo, LiveEntity } from "../../shared/types";
import { stage } from "../../lib/stage/store";
import { remainingSeconds } from "../../lib/data/entity-state";
import { businessPresentation, isOpen, mumbaiMinutes } from "../../lib/data/view-model";
import { explorerUrl, getProfile } from "../../shared/arkiv/profiles";
import type { Hex } from "../../shared/types";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
function explorer(key: Hex): string | null {
  try { return explorerUrl(getProfile(process.env.NEXT_PUBLIC_ARKIV_PROFILE), "entity", key); } catch { return null; }
}

/** Coarse on purpose: the card changes once a minute, so nothing ticks on the projector. */
function timeLeft(seconds: number): string {
  if (seconds <= 0) return "expired";
  return seconds < 60 ? "under a minute left" : `about ${Math.round(seconds / 60)} min left`;
}

/** `highlight`: the Arkiv field the scene talks about (L6: `$owner`). The card shows `$owner`, never
 * `$creator` (the talk names one wallet per entity, October 28). */
export function Inspector({ entity, block, businessMode, reviews, highlight, showReviews = false }: { entity: LiveEntity | null; block: BlockInfo | null; businessMode: boolean; reviews: LiveEntity[]; highlight?: string; showReviews?: boolean }) {
  const [now, setNow] = useState(0);
  const [newOwner, setNewOwner] = useState("");
  // Transfer ownership opens a wallet field in place of the action row (the card keeps its height).
  const [transferKey, setTransferKey] = useState<string | null>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { fieldsRef.current?.querySelector(".badge-highlight")?.scrollIntoView({ block: "nearest" }); }, [highlight, entity?.key]);
  if (!entity) return <section className="inspector-panel panel pointer-events-auto"><h2>Inside one entity</h2><p>Select a dot on the map.</p></section>;
  const seconds = remainingSeconds(entity, block, now);
  const link = explorer(entity.key);
  const business = businessPresentation(entity);
  const fields = [
    { name: "$key", value: entity.key, badge: "its address" },
    { name: "$owner", value: entity.owner, badge: "who controls it" },
    { name: "$expiresAt", value: `${entity.expiresAtBlock}`, badge: "can be extended" },
  ];
  const visibleFields = Object.entries(entity.attrs).filter(([name]) => businessMode ? ["name", "category", "rating", "opens", "closes", "city", "lat", "lng"].includes(name) : ["name", "color", "country"].includes(name));
  return <section data-reviews={businessMode && showReviews} className={`inspector-panel panel pointer-events-auto${businessMode ? " business-inspector" : ""}`}><div className="panel-heading"><h2><i className="inspected-color" style={{ background: "color" in entity.attrs ? entity.attrs.color ?? "#fe7446" : "#fe7446" }} />{business.name}</h2><button aria-label="Close inspector" onClick={() => stage.dispatch({ type: "inspect", key: null })}>×</button></div>
    {seconds < 60 && <p className="extend-suggestion">Less than 60 s left. Extend it before we look.</p>}
    {!businessMode && <div className="inspector-columns" ref={fieldsRef}><div><h3>Your attributes</h3><dl>{visibleFields.map(([name, value]) => <div key={name}><dt>{name}</dt><dd title={String(value)}>{(name === "lat" || name === "lng") && typeof value === "number" ? value.toFixed(5) : String(value)}</dd></div>)}</dl></div><div><h3>Arkiv fields</h3><dl>{fields.map((field) => <div key={field.name} data-field={field.name} className={highlight === field.name ? "badge-highlight" : ""}><dt>{field.name}</dt><dd title={field.value}>{field.name === "$expiresAt" ? <>block {field.value}<span className="field-countdown">{timeLeft(seconds)}</span></> : shortKey(field.value)}<small>{field.badge}</small></dd></div>)}</dl></div></div>}
    <details><summary>Stored attributes</summary><dl>{entity.raw.map((attr) => <div key={attr.name}><dt>{attr.name} · {attr.type}</dt><dd>{attr.stored}</dd></div>)}</dl></details>
    {businessMode && <div className="business-card"><div className="photo-placeholder">photo · bundled with the app</div><p>{business.category} · {business.rating.toFixed(1)} ★ · {isOpen(business.opens, business.closes, mumbaiMinutes(now)) ? "Open now" : "Closed now"}</p>{business.appSide && <p className="app-side">app-side · invented category, rating and opening hours</p>}{showReviews && <><p>{reviews.length} reviews</p><div className="business-reviews">{reviews.map((review) => review.attrs.kind === "review" && <article className="review-card" key={review.key}><p>{review.attrs.stars} ★ · {review.attrs.text}</p><code>business = {shortKey(review.attrs.business)}</code></article>)}</div></>}<p className="photo-callback"><b>Architecture callback</b> “Photos: Swarm. Everything you filter on: Arkiv.” Demo photos are bundled with the app.</p></div>}
    {transferKey === entity.key ? <form className="transfer-form" onSubmit={(event) => { event.preventDefault(); if (ADDRESS.test(newOwner.trim())) stage.dispatch({ type: "transferTo", key: entity.key, newOwner: newOwner.trim() as Hex }); }}>
      <input aria-label="New owner wallet" placeholder="New owner · 0x… wallet address" value={newOwner} spellCheck={false} autoFocus onChange={(event) => setNewOwner(event.target.value)} />
      <button type="submit" disabled={!ADDRESS.test(newOwner.trim())}>Transfer ownership</button>
      <button type="button" className="transfer-cancel" aria-label="Cancel transfer" onClick={() => setTransferKey(null)}>×</button>
    </form> : <div className="inspector-actions">
      <button onClick={() => { stage.dispatch({ type: "select", keys: [entity.key], mode: "set" }); stage.dispatch({ type: "extend", scope: "selected" }); }}>Extend</button>
      <button onClick={() => setTransferKey(entity.key)}>Transfer ownership</button>
      {link && <a className="explorer-link" href={link} target="_blank" rel="noreferrer">Data explorer ↗</a>}
      <button onClick={() => { stage.dispatch({ type: "select", keys: [entity.key], mode: "set" }); stage.dispatch({ type: "hideSelected" }); }}>Hide · local</button>
    </div>}
  </section>;
}
