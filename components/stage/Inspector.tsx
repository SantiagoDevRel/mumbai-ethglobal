"use client";

import { useEffect, useState } from "react";
import { decodeCoord, shortKey } from "../../shared/encoding";
import { hasNoExpiry, type BlockInfo, type LiveEntity, type RawAttribute } from "../../shared/types";
import { stage } from "../../lib/stage/store";
import { remainingSeconds } from "../../lib/data/entity-state";
import { randomAddress } from "../../lib/data/random-address";
import { businessPresentation, isOpen, mumbaiMinutes } from "../../lib/data/view-model";
import { explorerUrl, getProfile, WRITER_ADDRESS } from "../../shared/arkiv/profiles";
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

/** The order the phone form and the writer fill them in; anything else follows as stored. */
const ATTRIBUTE_ORDER = ["app", "kind", "session", "name", "color", "country", "category", "lat", "lng"];
const rank = (attribute: RawAttribute) => {
  const index = ATTRIBUTE_ORDER.indexOf(attribute.name);
  return index < 0 ? ATTRIBUTE_ORDER.length : index;
};

/** A coordinate is stored as an i32 of millionths of a degree; the card shows the degrees beside it. */
function degrees(attribute: RawAttribute): number | null {
  if ((attribute.name !== "lat" && attribute.name !== "lng") || !/^-?\d+$/.test(attribute.stored)) return null;
  return decodeCoord(Number(attribute.stored));
}

/** The entity card. It shows `$owner`, never `$creator` (the talk names one wallet per entity,
 * October 28), and every attribute the entity stores in one table that fits without scrolling
 * (Santiago, October 29). After a transfer the read-back `$owner` is a wallet other than ours: the
 * card marks it. Extend stays for any entity with an expiration (these dots allow permissionless
 * extension); an entity with no expiration has nothing to extend. */
export function Inspector({ entity, block, businessMode, reviews, showReviews = false }: { entity: LiveEntity | null; block: BlockInfo | null; businessMode: boolean; reviews: LiveEntity[]; showReviews?: boolean }) {
  const [now, setNow] = useState(0);
  const [newOwner, setNewOwner] = useState("");
  // Transfer ownership opens a wallet field in place of the action row (the card keeps its height).
  const [transferKey, setTransferKey] = useState<string | null>(null);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!entity) return <section className="inspector-panel panel pointer-events-auto"><h2>Inside one entity</h2><p>Select a dot on the map.</p></section>;
  const seconds = remainingSeconds(entity, block, now);
  const endless = hasNoExpiry(entity.expiresAtBlock);
  // Our wallet writes every entity and owns it until a transfer; the chain's answer says who owns it now.
  const transferred = entity.owner.toLowerCase() !== entity.creator.toLowerCase();
  const ours = entity.owner.toLowerCase() === WRITER_ADDRESS.toLowerCase();
  const link = explorer(entity.key);
  const business = businessPresentation(entity);
  const fields = [
    { name: "$key", value: entity.key, badge: "its address" },
    { name: "$owner", value: entity.owner, badge: "who controls it" },
    { name: "$expiresAt", value: `${entity.expiresAtBlock}`, badge: endless ? "no expiration" : "can be extended" },
  ];
  const stored = [...entity.raw].sort((a, b) => rank(a) - rank(b));
  const transfer = (owner: string) => {
    if (!ADDRESS.test(owner.trim())) return;
    stage.dispatch({ type: "transferTo", key: entity.key, newOwner: owner.trim() as Hex });
    setTransferKey(null);
    setNewOwner("");
  };
  return <section data-reviews={businessMode && showReviews} className={`inspector-panel panel pointer-events-auto${businessMode ? " business-inspector" : ""}`}><div className="panel-heading"><h2><i className="inspected-color" style={{ background: "color" in entity.attrs ? entity.attrs.color ?? "#fe7446" : "#fe7446" }} />{business.name}</h2><button aria-label="Close inspector" onClick={() => stage.dispatch({ type: "inspect", key: null })}>×</button></div>
    {seconds < 60 && <p className="extend-suggestion">Less than 60 s left. Extend it before we look.</p>}
    {!businessMode && <div className="inspector-columns">
      <div className="stored-attributes"><h3>Stored attributes</h3><table><thead><tr><th scope="col">name</th><th scope="col">type</th><th scope="col">value</th></tr></thead><tbody>{stored.map((attribute) => {
        const decoded = degrees(attribute);
        return <tr key={attribute.name}><th scope="row">{attribute.name}</th><td>{attribute.type}</td><td title={decoded === null ? attribute.stored : `${attribute.stored} = ${decoded}°`}>{attribute.stored}{decoded !== null && <small> · {decoded.toFixed(2)}°</small>}</td></tr>;
      })}</tbody></table></div>
      <div><h3>Arkiv fields</h3><dl>{fields.map((field) => <div key={field.name} data-field={field.name} className={field.name === "$owner" && transferred ? "badge-highlight" : ""}><dt>{field.name}</dt><dd title={field.value}>{field.name === "$expiresAt" ? <>block {field.value}<span className="field-countdown">{endless ? "2**64 − 1 · no expiration" : timeLeft(seconds)}</span></> : shortKey(field.value)}<small>{field.badge}</small></dd></div>)}</dl>
        {transferred && <p className="owner-note">Only this wallet can now update, transfer or delete it.</p>}</div>
    </div>}
    {businessMode && <details><summary>Stored attributes</summary><dl>{stored.map((attr) => <div key={attr.name}><dt>{attr.name} · {attr.type}</dt><dd>{attr.stored}</dd></div>)}</dl></details>}
    {businessMode && <div className="business-card"><div className="photo-placeholder">photo · bundled with the app</div><p>{business.category} · {business.rating.toFixed(1)} ★ · {isOpen(business.opens, business.closes, mumbaiMinutes(now)) ? "Open now" : "Closed now"}</p>{business.appSide && <p className="app-side">app-side · invented category, rating and opening hours</p>}{showReviews && <><p>{reviews.length} reviews</p><div className="business-reviews">{reviews.map((review) => review.attrs.kind === "review" && <article className="review-card" key={review.key}><p>{review.attrs.stars} ★ · {review.attrs.text}</p><code>business = {shortKey(review.attrs.business)}</code></article>)}</div></>}<p className="photo-callback"><b>Architecture callback</b> “Photos: Swarm. Everything you filter on: Arkiv.” Demo photos are bundled with the app.</p></div>}
    {transferKey === entity.key ? <form className="transfer-form" onSubmit={(event) => { event.preventDefault(); transfer(newOwner); }}>
      {/* "0x" then Space fills in a new random wallet, so nobody pastes an address on stage. */}
      <input aria-label="New owner wallet" placeholder="Paste a 0x… wallet, or type 0x and Space" value={newOwner} spellCheck={false} autoComplete="off" autoFocus onChange={(event) => setNewOwner(event.target.value)} onKeyDown={(event) => { if (event.key === " " && newOwner.trim().toLowerCase() === "0x") { event.preventDefault(); setNewOwner(randomAddress()); } }} />
      <button type="submit" disabled={!ADDRESS.test(newOwner.trim())}>Transfer ownership</button>
      <button type="button" className="transfer-cancel" aria-label="Cancel transfer" onClick={() => { setTransferKey(null); setNewOwner(""); }}>×</button>
    </form> : <div className="inspector-actions">
      <button disabled={endless} title={endless ? "No expiration: there is nothing to extend." : undefined} onClick={() => { stage.dispatch({ type: "select", keys: [entity.key], mode: "set" }); stage.dispatch({ type: "extend", scope: "selected" }); }}>Extend</button>
      <button disabled={!ours} title={ours ? undefined : "Another wallet owns it now: only that wallet can transfer it."} onClick={() => setTransferKey(entity.key)}>Transfer ownership</button>
      {link && <a className="explorer-link" href={link} target="_blank" rel="noreferrer">Data explorer ↗</a>}
      <button onClick={() => { stage.dispatch({ type: "select", keys: [entity.key], mode: "set" }); stage.dispatch({ type: "hideSelected" }); }}>Hide · local</button>
    </div>}
  </section>;
}
