"use client";

// /map: the whole talk on one screen. Live scenes show the globe, its HUD and, where the scene has
// one, the QR (October 29: no caption, logo or status line on any scene); slide scenes show the
// slide over the globe. The data source and its status sit in the presenter's "?" card. The leader
// window: it runs the scene engine, reads the DB-Chain through the writer and signs Rabby
// transactions. /slides can still sit beside it on a split screen and follows the same scene.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { MapFrame, StageBox } from "../../components/stage/StageFrame";
import { PresenterBar, PresenterGate, usePresenterSession, WritingSwitch } from "../../components/stage/Presenter";
import { usePresenterKeys } from "../../lib/stage/keyboard";
import { initialState, stage } from "../../lib/stage/store";
import { useLiveData } from "../../lib/data/useLiveData";
import { useLiveBlock } from "../../lib/data/useLiveBlock";
import { Globe } from "../../components/map/Globe";
import { JoinQR } from "../../components/stage/JoinQR";
import { LiveStatus, StageHud } from "../../components/stage/StageHud";
import { applyAppFilters } from "../../lib/data/view-model";
import { useStageEffects } from "../../lib/data/useStageEffects";
import "../../components/stage/app-stage.css";
import { useDeckPreload } from "../deck/preload";
import { deck } from "../deck/registry";
import { SCENES } from "../../shared/scenes";
import type { ChainFilters, LiveEntity } from "../../shared/types";

const SERVER_STATE = initialState();
// No scene shows business reviews any more (outline v3); the inspector keeps the prop.
const NO_REVIEWS: LiveEntity[] = [];
const serverSnapshot = () => SERVER_STATE;

export default function MapPage() {
  return <PresenterGate><MapStage /></PresenterGate>;
}

function MapStage() {
  useEffect(() => stage.connect("leader"), []);
  usePresenterKeys();
  useDeckPreload();
  usePresenterSession();
  const state = useSyncExternalStore(stage.subscribe, stage.getState, serverSnapshot);
  const leader = useSyncExternalStore(stage.subscribe, stage.isLeader, () => true);
  const filters: ChainFilters = { ...state.chainFilters, kinds: state.map !== "dots" ? ["dot", "business"] : state.chainFilters.kinds };
  const data = useLiveData(filters, state.session);
  const scene = SCENES[state.sceneIndex]!;
  const block = useLiveBlock();
  const notice = useStageEffects(data.adapter, data.source, data.run?.entities ?? []);
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
    hud={live && <StageBox><div className="app-hud"><StageHud data={data} block={block} state={state} entities={view.entities} appSteps={appSteps} reviews={NO_REVIEWS} described={described} />{status}</div></StageBox>}
    qr={<StageBox><JoinQR screen="map" />{!live && status ? <div className="slide-notice">{status}</div> : null}</StageBox>}
    bar={<><LiveStatus data={data} /><PresenterBar inline /></>}
    writing={<WritingSwitch />}
  />;
}
