"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as GLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BlockInfo, Hex, LiveEntity } from "../../shared/types";
import { stage, type StageState } from "../../lib/stage/store";
import { darkStyle } from "../../lib/map/style";
import { mapViewport } from "../../lib/map/viewport";
import { remainingSeconds } from "../../lib/data/entity-state";
import { usePrefersReducedMotion } from "../stage/StageFrame";
import countries from "../../shared/geo/countries.json";
import { pointInPolygon, type LngLat } from "../../shared/geo/place";

export function Globe({ entities, block, state }: { entities: LiveEntity[]; block: BlockInfo | null; state: StageState }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<GLMap | null>(null);
  const current = useRef({ entities, block, state });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => { current.current = { entities, block, state }; }, [entities, block, state]);

  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let instance: GLMap | null = null;
    let frame = 0;
    let resize: ResizeObserver | undefined;
    const born = new Map<Hex, number>();
    const leaving = new Map<Hex, { entity: LiveEntity; at: number }>();
    let lastEntities = new Map<Hex, LiveEntity>();
    let hasLanded = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void Promise.all([import("maplibre-gl"), darkStyle(controller.signal)]).then(([gl, style]) => {
      if (stopped || !container.current) return;
      const map = new gl.Map({ container: container.current, style, center: [60, 18], zoom: 1.5, attributionControl: { compact: true }, canvasContextAttributes: { antialias: true } });
      instance = map;
      mapRef.current = map;
      map.on("error", () => { if (!stopped) setError("Map tiles unavailable. Retrying as you move the map."); });
      map.on("load", () => {
        if (stopped) return;
        map.setProjection({ type: "globe" });
        map.setSky({ "sky-color": "#111111", "horizon-color": "#181ea9", "fog-color": "#181ea9", "sky-horizon-blend": 0.4, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.1, "atmosphere-blend": 0.8 });
        const building = style.layers.find((layer) => layer.type === "fill" && layer["source-layer"] === "building");
        if (building && "source" in building) map.addLayer({ id: "workshop-buildings", type: "fill-extrusion", source: building.source, "source-layer": "building", minzoom: 14, paint: { "fill-extrusion-color": "#181ea9", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 10], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.8 } });
        setReady(true);
        setError(null);
      });
      for (const gesture of ["mousedown", "touchstart", "wheel"] as const) map.getCanvas().addEventListener(gesture, () => map.stop(), { passive: true });
      map.on("click", (event) => {
        const hit = current.current.entities.map((entity) => {
          if (entity.attrs.kind === "review") return { entity, distance: Infinity };
          const point = map.project([entity.attrs.lng, entity.attrs.lat]);
          return { entity, distance: Math.hypot(point.x - event.point.x, point.y - event.point.y) };
        }).sort((a, b) => a.distance - b.distance)[0];
        if (hit && hit.distance < 26) {
          stage.dispatch({ type: "select", keys: [hit.entity.key], mode: event.originalEvent.shiftKey ? "toggle" : "set" });
          stage.dispatch({ type: "inspect", key: hit.entity.key });
        } else {
          const point: LngLat = [event.lngLat.wrap().lng, event.lngLat.lat];
          const country = countries.find((item) => point[0] >= item.bbox[0]! && point[0] <= item.bbox[2]! && point[1] >= item.bbox[1]! && point[1] <= item.bbox[3]! && pointInPolygon(point, item.polygon as LngLat[]));
          if (country) map.fitBounds([[country.bbox[0]!, country.bbox[1]!], [country.bbox[2]!, country.bbox[3]!]], { padding: { top: 120, bottom: 210, left: 100, right: 310 }, duration: reducedMotion ? 0 : 1700, maxZoom: 10 });
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
        const delta = now - (last || now);
        last = now;
        const { entities, block, state } = current.current;
        if (entities.length) hasLanded = true;
        if (!hasLanded && !reducedMotion && state.camera.cue === "globe-idle" && !map.isMoving()) map.jumpTo({ center: [map.getCenter().lng + delta * 0.0018, map.getCenter().lat] });
        const surface = canvas.current;
        const width = surface.clientWidth, height = surface.clientHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        if (surface.width !== width * ratio || surface.height !== height * ratio) { surface.width = width * ratio; surface.height = height * ratio; }
        const ctx = surface.getContext("2d");
        if (!ctx) return;
        const fontFamily = getComputedStyle(surface).fontFamily;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const active = new Map(entities.map((entity) => [entity.key, entity]));
        for (const key of active.keys()) leaving.delete(key);
        for (const [key, entity] of lastEntities) if (!active.has(key)) leaving.set(key, { entity, at: now });
        for (const [key, item] of leaving) if (now - item.at > 600) { leaving.delete(key); born.delete(key); }
        lastEntities = active;
        for (const entity of [...entities, ...[...leaving.values()].map((item) => item.entity)]) {
          if (entity.attrs.kind === "review") continue;
          const a = entity.attrs;
          const point = map.project([a.lng, a.lat]);
          const center = map.getCenter(), radians = Math.PI / 180;
          const front = Math.sin(a.lat * radians) * Math.sin(center.lat * radians) + Math.cos(a.lat * radians) * Math.cos(center.lat * radians) * Math.cos((a.lng - center.lng) * radians);
          if ((map.getZoom() < 4 && front < 0.08) || point.x < -80 || point.x > width + 80 || point.y < -80 || point.y > height + 80) continue;
          if (!born.has(entity.key)) born.set(entity.key, now);
          const age = now - born.get(entity.key)!;
          const exit = leaving.get(entity.key);
          if (exit && now - exit.at > 600) { leaving.delete(entity.key); born.delete(entity.key); continue; }
          ctx.globalAlpha = exit ? Math.max(0, 1 - (now - exit.at) / 600) : 1;
          const y = point.y - (reducedMotion ? 0 : Math.max(0, 1 - age / 600) ** 2 * 48);
          const color = a.color ?? "#fe7446";
          const seconds = remainingSeconds(entity, block, Date.now());
          const total = block ? Math.max(1, Number(entity.expiresAtBlock - entity.createdAtBlock) * block.blockTimeMs / 1000) : 1;
          const radius = state.map === "business" ? 10 : 7;
          if (state.map === "owner" && !state.transferred) {
            ctx.strokeStyle = "rgba(246,244,239,0.2)"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(point.x, y); ctx.lineTo(width / 2, height * 0.24); ctx.stroke();
          }
          ctx.fillStyle = color; ctx.strokeStyle = "#f6f4ef"; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(point.x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(point.x, y, radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, seconds / total)); ctx.stroke();
          if ((!reducedMotion && age < 1000) || (!reducedMotion && seconds <= 0)) {
            const phase = age < 1000 ? age / 1000 : (now % 1300) / 1300;
            ctx.globalAlpha *= 1 - phase; ctx.beginPath(); ctx.arc(point.x, y, radius + phase * 26, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = exit ? Math.max(0, 1 - (now - exit.at) / 600) : 1;
          }
          if (state.map === "business") { ctx.fillStyle = "#111111"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(a.kind === "business" ? a.category.slice(0, 1).toUpperCase() : "C", point.x, y + 4); }
          ctx.fillStyle = "#f6f4ef"; ctx.font = `500 13px ${fontFamily}`; ctx.textAlign = "center"; ctx.shadowColor = "#111111"; ctx.shadowBlur = 5;
          ctx.fillText(state.map === "owner" && state.transferred ? `${a.name} · owner` : a.name, point.x, y + radius + 23); ctx.shadowBlur = 0;
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
    const view = cue === "india" ? { center: [79, 23] as [number, number], zoom: 4, pitch: 0 } : cue === "mumbai-street" ? { center: [72.8777, 19.076] as [number, number], zoom: 15.5, pitch: 58 } : { center: [60, 18] as [number, number], zoom: 1.5, pitch: 0 };
    map.flyTo({ ...view, bearing: cue === "mumbai-street" ? -24 : 0, duration: reduced ? 0 : 2400 });
  }, [ready, reduced, state.camera]);
  return <div className="globe-shell"><div ref={container} className="globe-map" aria-label="Interactive globe of Arkiv entities" /><canvas ref={canvas} className="globe-dots" aria-hidden="true" />{error && <p className="map-error" role="status">{error}</p>}</div>;
}
