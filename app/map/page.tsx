"use client";

// /map: the whole talk on one screen. Live scenes show the globe, its HUD, the QR and the scene's
// caption; slide scenes show the slide over the globe. The leader window: it runs the scene engine,
// reads the DB-Chain through the writer and signs Rabby transactions. /slides can still sit beside
// it on a split screen and follows the same scene.

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { MapFrame, StageBox } from "../../components/stage/StageFrame";
import { PresenterBar, PresenterGate, usePresenterSession, WritingSwitch } from "../../components/stage/Presenter";
import { usePresenterKeys } from "../../lib/stage/keyboard";
import { initialState, stage } from "../../lib/stage/store";
import { useLiveData } from "../../lib/data/useLiveData";
import { useLiveBlock } from "../../lib/data/useLiveBlock";
import { Globe } from "../../components/map/Globe";
import { JoinQR } from "../../components/stage/JoinQR";
import { StageHud } from "../../components/stage/StageHud";
import { applyAppFilters } from "../../lib/data/view-model";
import { useStageEffects } from "../../lib/data/useStageEffects";
import { useReviews } from "../../lib/data/useReviews";
import "../../components/stage/app-stage.css";
import { deck } from "../deck/registry";
import { SCENES } from "../../shared/scenes";
import type { ChainFilters } from "../../shared/types";

const SERVER_STATE = initialState();
const serverSnapshot = () => SERVER_STATE;

export default function MapPage() {
  return <PresenterGate><MapStage /></PresenterGate>;
}

function MapStage() {
  useEffect(() => stage.connect("leader"), []);
  usePresenterKeys();
  usePresenterSession();
  const state = useSyncExternalStore(stage.subscribe, stage.getState, serverSnapshot);
  const leader = useSyncExternalStore(stage.subscribe, stage.isLeader, () => true);
  const filters: ChainFilters = { ...state.chainFilters, kinds: state.map !== "dots" ? ["dot", "business"] : state.chainFilters.kinds };
  const data = useLiveData(filters, state.session);
  const scene = SCENES[state.sceneIndex]!;
  const reviewScene = scene.id === "L5" && state.step === 2;
  // L4 and L6 open on one entity, once per entry: closing the card keeps it closed, so "On the map"
  // comes back. The L5 reviews step keeps a business inspected.
  const picked = useRef<string | null>(null);
  const entry = `${state.sceneIndex}:${reviewScene}`;
  useEffect(() => {
    const current = data.run?.entities.find((entity) => entity.key === state.inspected);
    if (scene.id !== "L4" && scene.id !== "L6" && !reviewScene) { picked.current = null; return; }
    if (!reviewScene && picked.current === entry) return;
    if (current && (!reviewScene || current.attrs.kind === "business")) return;
    const distance = (entity: NonNullable<typeof current>) => "lat" in entity.attrs ? (entity.attrs.lat - 18.9275) ** 2 + (entity.attrs.lng - 72.8335) ** 2 : Infinity;
    const candidate = data.run?.entities.filter((entity) => reviewScene ? entity.attrs.kind === "business" && !entity.attrs.session : entity.attrs.kind === "dot").sort((a, b) => reviewScene ? distance(a) - distance(b) : Number(b.expiresAtBlock - a.expiresAtBlock))[0];
    if (candidate) {
      picked.current = entry;
      stage.dispatch({ type: "inspect", key: candidate.key });
      stage.dispatch({ type: "select", keys: [candidate.key], mode: "set" });
    }
  }, [data.run, entry, reviewScene, scene.id, state.inspected]);
  const reviewKey = state.map === "business" && reviewScene ? state.inspected : null;
  useEffect(() => { if (reviewScene && state.inspected) stage.dispatch({ type: "togglePanel", panel: "inspector", open: true }); }, [reviewScene, state.inspected]);
  const block = useLiveBlock();
  const notice = useStageEffects(data.adapter, data.source, data.run?.entities ?? []);
  const reviews = useReviews(data.adapter, reviewKey, block?.number);
  // An expired entity leaves the map completely (Santiago, October 28): no grey dot stays behind.
  const ghosts: typeof data.expired = [];
  // The query for the filters on screen now, so the panel follows the presenter's typing at once.
  const filterKey = JSON.stringify(filters);
  const described = useMemo(() => {
    if (!data.adapter || state.map !== "dots") return null;
    try { return data.adapter.describe({ ...(JSON.parse(filterKey) as ChainFilters), session: data.source === "mock" ? "MOCK" : state.session ?? "__no_session__" }); }
    catch { return null; }
  }, [data.adapter, data.source, filterKey, state.map, state.session]);
  const view = applyAppFilters((data.run?.entities ?? []).filter((entity) => !state.hidden.includes(entity.key)), state.appFilters, state.overlays, block?.timestampMs ?? 0);
  const appSteps = [...view.steps, ...(state.map === "business" ? ["Audience dots: invented business category and rating"] : []), ...(state.map === "owner" ? ["Ownership badges and transfer animation · demo view"] : []), ...(state.hidden.length ? ["Hidden entities · local moderation"] : []), ...(ghosts.length ? ["Grey dots: expired entities this screen remembers"] : [])];
  const live = scene.kind === "live";
  // Shown on slides too, at the top edge, so a follower window or a paused read is never silent.
  const message = !leader ? "Another map window is running the talk. This one follows it." : notice ?? (data.paused ? "Live reads paused to save the access key’s quota. Press any key to resume." : null);
  const status = message ? <p className="presenter-notice" role="status">{message}</p> : null;
  const Overlay = live ? deck[scene.id].Overlay : undefined;
  const Slide = live ? undefined : deck[scene.id].Slide;
  return <MapFrame
    map={<Globe source={data.source} entities={view.entities} ghosts={ghosts} block={block} state={state} />}
    overlay={Overlay ? <StageBox><Overlay scene={scene} step={state.step} /></StageBox> : undefined}
    slide={Slide ? <Slide scene={scene} step={state.step} /> : undefined}
    hud={live && <StageBox><div className="app-hud"><StageHud data={data} block={block} state={state} entities={view.entities} appSteps={appSteps} reviews={reviews} described={described} />{status}</div></StageBox>}
    qr={<StageBox><JoinQR screen="map" />{!live && status ? <div className="slide-notice">{status}</div> : null}</StageBox>}
    bar={<PresenterBar inline />}
    writing={<WritingSwitch />}
  />;
}
