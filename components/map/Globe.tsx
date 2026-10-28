"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as GLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BlockInfo, Hex, LiveEntity } from "../../shared/types";
import { stage, type StageState } from "../../lib/stage/store";
import { darkStyle } from "../../lib/map/style";
import { mapViewport } from "../../lib/map/viewport";
import { remainingSeconds } from "../../lib/data/entity-state";
import { StageBox, stageGeometry, usePrefersReducedMotion, useStageScale } from "../stage/StageFrame";
import { businessPresentation } from "../../lib/data/view-model";

const CATEGORY_PATHS = {
  cafe: "M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM16 8h2a3 3 0 0 1 0 6h-2M7 3v2M11 3v2",
  restaurant: "M4 3v6a3 3 0 0 0 6 0V3M7 3v19M20 22V3c-5 4-5 10 0 10",
  "street-food": "M3 12h18l-3 8H6ZM7 3l3 6M13 3l3 6",
  bakery: "M4 11V9a8 6 0 0 1 16 0v2h-2v10H6V11ZM9 6l2 3M14 6l2 3",
  bookstore: "M3 4h7a3 3 0 0 1 2 2 3 3 0 0 1 2-2h7v16h-7a3 3 0 0 0-2 2 3 3 0 0 0-2-2H3ZM12 6v16",
  gym: "M6 5v14M3 8v8M18 5v14M21 8v8M6 12h12",
  market: "M3 8h18l-2 13H5ZM7 8l3-6M17 8l-3-6M9 12v5M15 12v5",
  bar: "M5 3h14v4a7 7 0 0 1-14 0ZM12 14v8M7 22h10",
  parking: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 17V7h4a3 3 0 0 1 0 6H9",
};

/** `ghosts`: expired dots the screen remembers, drawn grey under the live ones and never selectable. */
export function Globe({ entities, ghosts = [], block, state, source }: { entities: LiveEntity[]; ghosts?: LiveEntity[]; block: BlockInfo | null; state: StageState; source: "mock" | "live" }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<GLMap | null>(null);
  const current = useRef({ entities, ghosts, block, state, source });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const stageScale = useStageScale();
  useEffect(() => { current.current = { entities, ghosts, block, state, source }; }, [entities, ghosts, block, state, source]);

  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let instance: GLMap | null = null;
    let frame = 0;
    let resize: ResizeObserver | undefined;
    const born = new Map<Hex, number>();
    const categoryIcons = Object.fromEntries(Object.entries(CATEGORY_PATHS).map(([name, path]) => [name, new Path2D(path)]));
    const leaving = new Map<Hex, { entity: LiveEntity; at: number }>();
    let lastEntities = new Map<Hex, LiveEntity>();
    let lastSource: string | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void Promise.all([import("maplibre-gl"), darkStyle()]).then(([gl, style]) => {
      if (stopped || !container.current) return;
      // Two gestures only: drag to turn the globe, pinch or scroll to zoom. No tilt, no twist, no
      // keyboard (the arrows move the slides), no double-click zoom, and a short glide after a drag.
      const map = new gl.Map({
        container: container.current, style, center: [72, 19], zoom: 2.38, minZoom: 1, attributionControl: false, canvasContextAttributes: { antialias: true },
        dragRotate: false, pitchWithRotate: false, touchPitch: false, keyboard: false, doubleClickZoom: false,
        dragPan: { linearity: 0.2, maxSpeed: 700, deceleration: 4000 },
      });
      map.touchZoomRotate.disableRotation();
      instance = map;
      mapRef.current = map;
      map.on("error", () => { if (!stopped) setError("Map tiles unavailable. Retrying as you move the map."); });
      map.on("load", () => {
        if (stopped) return;
        map.setProjection({ type: "globe" });
        setReady(true);
        setError(null);
      });
      // The first touch cancels any camera flight in progress. The globe never turns on its own.
      for (const gesture of ["mousedown", "touchstart", "wheel"] as const) map.getCanvas().addEventListener(gesture, () => { map.stop(); }, { passive: true });
      map.on("click", (event) => {
        const hit = current.current.entities.map((entity) => {
          if (entity.attrs.kind === "review") return { entity, distance: Infinity };
          const point = map.project([entity.attrs.lng, entity.attrs.lat]);
          const scale = Math.min(map.getCanvas().clientWidth / 1920, map.getCanvas().clientHeight / 1080);
          if (current.current.state.map === "business" && (point.y < 260 * scale || point.y > 780 * scale || point.x < 40 * scale || point.x > 1432 * scale)) return { entity, distance: Infinity };
          return { entity, distance: Math.hypot(point.x - event.point.x, point.y - (current.current.state.map === "business" ? 38 * scale : 0) - event.point.y) / scale };
        }).sort((a, b) => a.distance - b.distance)[0];
        if (hit && hit.distance < 26) {
          stage.dispatch({ type: "select", keys: [hit.entity.key], mode: event.originalEvent.shiftKey ? "toggle" : "set" });
          stage.dispatch({ type: "inspect", key: hit.entity.key });
        } else if (current.current.state.panels.inspector) {
          // A click on the globe itself closes the entity card so it no longer covers other dots.
          stage.dispatch({ type: "inspect", key: null });
          stage.dispatch({ type: "select", keys: [], mode: "set" });
        }
      });
      resize = new ResizeObserver(() => map.resize());
      resize.observe(container.current);
      map.on("moveend", () => {
        const bounds = map.getBounds();
        const wrap = (lng: number) => ((lng + 180) % 360 + 360) % 360 - 180;
        const viewport = { minLat: Math.max(-90, bounds.getSouth()), maxLat: Math.min(90, bounds.getNorth()), minLng: bounds.getEast() - bounds.getWest() >= 360 ? -180 : wrap(bounds.getWest()), maxLng: bounds.getEast() - bounds.getWest() >= 360 ? 180 : wrap(bounds.getEast()) };
        mapViewport.set(viewport);
        const filters = stage.getState().chainFilters;
        if (filters.viewport) stage.dispatch({ type: "setChainFilters", filters: { ...filters, viewport } });
      });
      let last = 0;
      const draw = (now: number) => {
        if (stopped) return;
        frame = requestAnimationFrame(draw);
        if (now - last < 32 || !canvas.current) return;
        last = now;
        const { entities, ghosts, block, state, source } = current.current;
        const surface = canvas.current;
        const width = surface.clientWidth, height = surface.clientHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        if (surface.width !== width * ratio || surface.height !== height * ratio) { surface.width = width * ratio; surface.height = height * ratio; }
        const ctx = surface.getContext("2d");
        if (!ctx) return;
        const css = getComputedStyle(surface);
        const fontFamily = css.fontFamily;
        const fontMono = css.getPropertyValue("--font-plex-mono") || "monospace";
        const scale = Math.min(width / 1920, height / 1080);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        // /map shows the dots in every scene: the room can write from the first slide.
        if (surface.dataset.source !== source) return;
        const box = stageGeometry(width, height, "fill");
        if (lastSource !== source) { born.clear(); leaving.clear(); lastEntities.clear(); lastSource = source; }
        const active = new Map(entities.map((entity) => [entity.key, entity]));
        for (const key of active.keys()) leaving.delete(key);
        for (const [key, entity] of lastEntities) if (!active.has(key)) leaving.set(key, { entity, at: now });
        for (const [key, item] of leaving) if (now - item.at > 600) { leaving.delete(key); born.delete(key); }
        lastEntities = active;
        for (const ghost of ghosts) {
          if (ghost.attrs.kind !== "dot" || active.has(ghost.key) || leaving.has(ghost.key)) continue;
          const point = map.project([ghost.attrs.lng, ghost.attrs.lat]);
          const center = map.getCenter(), radians = Math.PI / 180;
          const front = Math.sin(ghost.attrs.lat * radians) * Math.sin(center.lat * radians) + Math.cos(ghost.attrs.lat * radians) * Math.cos(center.lat * radians) * Math.cos((ghost.attrs.lng - center.lng) * radians);
          if ((map.getZoom() < 4 && front < 0.08) || point.x < -80 || point.x > width + 80 || point.y < -80 || point.y > height + 80) continue;
          ctx.save(); ctx.translate(point.x, point.y); ctx.scale(scale, scale);
          // Same size as a live dot, with its lifetime ring empty and no color left.
          ctx.strokeStyle = "rgba(233,230,222,.28)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = "rgba(233,230,222,.5)"; ctx.strokeStyle = "rgba(233,230,222,.7)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        const labels: { x: number; y: number; width: number; name: string; suffix: string; hot: boolean; appSide: boolean }[] = [];
        const sorted = [...entities, ...[...leaving.values()].map((item) => item.entity)].sort((a, b) => Number(state.selected.includes(b.key)) - Number(state.selected.includes(a.key)) || Number(b.createdAtBlock - a.createdAtBlock));
        for (const entity of sorted) {
          if (entity.attrs.kind === "review") continue;
          const a = entity.attrs;
          const point = map.project([a.lng, a.lat]);
          if (state.map === "business" && (point.y < 260 * scale || point.y > 780 * scale || point.x < 40 * scale || point.x > 1432 * scale)) continue;
          const center = map.getCenter(), radians = Math.PI / 180;
          const front = Math.sin(a.lat * radians) * Math.sin(center.lat * radians) + Math.cos(a.lat * radians) * Math.cos(center.lat * radians) * Math.cos((a.lng - center.lng) * radians);
          if ((map.getZoom() < 4 && front < 0.08) || point.x < -80 || point.x > width + 80 || point.y < -80 || point.y > height + 80) continue;
          if (!born.has(entity.key)) born.set(entity.key, now);
          const age = now - born.get(entity.key)!;
          const exit = leaving.get(entity.key);
          if (exit && now - exit.at > 600) { leaving.delete(entity.key); born.delete(entity.key); continue; }
          ctx.globalAlpha = exit ? Math.max(0, 1 - (now - exit.at) / 600) : 1;
          const y = point.y - (reducedMotion ? 0 : Math.max(0, 1 - age / 360) ** 2 * 24 * scale);
          const color = a.color ?? "#fe7446";
          const seconds = remainingSeconds(entity, block, Date.now());
          const total = block ? Math.max(1, Number(entity.expiresAtBlock - entity.createdAtBlock) * block.blockTimeMs / 1000) : 1;
          if (state.map === "owner" && !state.transferred) {
            ctx.strokeStyle = "rgba(246,244,239,0.42)"; ctx.lineWidth = 1.5 * scale; ctx.beginPath(); ctx.moveTo(point.x, y); ctx.lineTo(box.x + 180 * scale, box.y + 528 * scale); ctx.stroke();
          }
          if (state.panels.inspector && state.inspected === entity.key) {
            ctx.strokeStyle = "rgba(246,244,239,.42)"; ctx.lineWidth = scale; ctx.beginPath(); ctx.moveTo(point.x, y); ctx.lineTo(box.x + (state.map === "business" ? 1464 : 1032) * scale, box.y + 340 * scale); ctx.stroke();
          }
          const selected = state.selected.includes(entity.key);
          const business = businessPresentation(entity);
          ctx.save(); ctx.translate(point.x, y); ctx.scale(scale, scale);
          if (selected) { ctx.strokeStyle = "#f6f4ef"; ctx.lineWidth = 2; ctx.shadowColor = "rgba(246,244,239,.12)"; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
          if (state.map === "business") {
            ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = selected ? "#fe7446" : business.appSide ? "rgba(246,244,239,.75)" : "#f6f4ef";
            ctx.fillRect(-2, -16, 4, 16); ctx.beginPath(); ctx.roundRect(-22, -60, 44, 44, 12); ctx.fill();
            ctx.strokeStyle = selected ? "#f6f4ef" : "#111111"; ctx.lineWidth = selected ? 4 : 2;
            if (business.appSide) ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
            ctx.save(); ctx.translate(-12, -50); ctx.strokeStyle = "#111111"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(categoryIcons[business.category]!); ctx.restore();
          } else {
            ctx.strokeStyle = "rgba(246,244,239,.2)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(0, 0, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, seconds / total)); ctx.stroke();
            if (seconds <= 0) { ctx.save(); ctx.globalAlpha *= .35; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
            ctx.fillStyle = color; ctx.strokeStyle = "#f6f4ef"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            if (!reducedMotion && age < 900) {
              const phase = age / 900;
              ctx.save(); ctx.globalAlpha *= 1 - phase; ctx.strokeStyle = color; ctx.lineWidth = 2;
              for (const radius of [28, 44]) { ctx.beginPath(); ctx.arc(0, 0, 13 + (radius - 13) * phase, 0, Math.PI * 2); ctx.stroke(); }
              ctx.restore();
            }
          }
          ctx.restore();
          if (!exit) {
            const name = state.map === "owner" && state.transferred ? `${a.name} · owner` : a.kind === "dot" ? `${a.name} · ${business.category}` : a.name;
            const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
            const suffix = state.map === "business" ? business.rating.toFixed(1) : a.kind === "business" && seconds > 120 ? `${clock(business.opens)}–${clock(business.closes)}` : seconds >= 60 ? `${Math.floor(Math.ceil(seconds) / 60)}:${String(Math.ceil(seconds) % 60).padStart(2, "0")}` : `${Math.ceil(seconds)} s`;
            ctx.font = `600 16px ${fontFamily}`;
            const labelWidth = ctx.measureText(name).width + suffix.length * 8.5 + 36;
            const label = { x: point.x + (state.map === "business" ? 28 : 22) * scale, y: y - (state.map === "business" ? 52 : 15) * scale, width: labelWidth, name, suffix, hot: seconds < 5 || state.map === "business", appSide: state.map === "business" && business.appSide };
            if (!labels.some((other) => label.x < other.x + other.width * scale + 8 && label.x + label.width * scale + 8 > other.x && label.y < other.y + 36 * scale && label.y + 36 * scale > other.y)) labels.push(label);
          }
        }
        ctx.globalAlpha = 1;
        for (const label of labels.reverse()) {
          ctx.save(); ctx.translate(label.x, label.y); ctx.scale(scale, scale);
          ctx.fillStyle = state.map === "owner" && state.transferred ? "#f6f4ef" : "rgba(17,17,17,.84)"; ctx.strokeStyle = "rgba(246,244,239,.14)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(0, 0, label.width, 30, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = state.map === "owner" && state.transferred ? "#111111" : "#f6f4ef"; ctx.font = `600 16px ${fontFamily}`; ctx.textAlign = "left"; ctx.fillText(label.name, 10, 21);
          const nameWidth = ctx.measureText(label.name).width;
          ctx.fillStyle = label.hot ? "#fe7446" : state.map === "owner" && state.transferred ? "rgba(17,17,17,.64)" : "rgba(246,244,239,.64)"; ctx.font = `400 14px ${fontMono}`; ctx.fillText(label.suffix, nameWidth + 20, 20);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        for (const key of born.keys()) if (!active.has(key) && !leaving.has(key)) born.delete(key);
      };
      frame = requestAnimationFrame(draw);
    }).catch(() => { if (!stopped) setError("Map unavailable. Check your connection."); });
    return () => { stopped = true; controller.abort(); cancelAnimationFrame(frame); resize?.disconnect(); instance?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || state.camera.cue === "keep") return;
    const cue = state.camera.cue;
    const scale = stageScale;
    const view = cue === "india" ? { center: [82, 19.2] as [number, number], zoom: 4.5, pitch: 0 } : cue === "mumbai-street" ? { center: [72.8335, 18.9275] as [number, number], zoom: 15.9, pitch: 60 } : { center: [72, 19] as [number, number], zoom: 2.38, pitch: 0 };
    map.flyTo({ ...view, zoom: view.zoom + Math.log2(scale), padding: { left: 0, right: 456 * scale, top: 200 * scale, bottom: (cue === "mumbai-street" ? 300 : 272) * scale }, bearing: cue === "mumbai-street" ? -22 : 0, duration: reduced ? 0 : 1200, easing: (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 });
  }, [ready, reduced, state.camera, stageScale]);
  return <div className="globe-shell"><div ref={container} className="globe-map" aria-label="Interactive globe of Arkiv entities" /><canvas key={source} data-source={source} ref={canvas} className="globe-dots" aria-hidden="true" /><StageBox><details className="map-attribution pointer-events-auto"><summary aria-label="Map attribution">i</summary><p><a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · © <a href="https://openmaptiles.org" target="_blank" rel="noreferrer">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p></details></StageBox>{error && <p className="map-error" role="status">{error}</p>}</div>;
}
