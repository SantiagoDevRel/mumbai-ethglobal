"use client";

// Projector stage: deck + live map in one frame. The app chat fills `map`, `hud` and `qr`.

import { useEffect, useSyncExternalStore } from "react";
import { StageBox, StageFrame } from "../components/stage/StageFrame";
import { usePresenterKeys } from "../lib/stage/keyboard";
import { initialState, stage } from "../lib/stage/store";
import { useLiveData } from "../lib/data/useLiveData";
import { useLiveBlock } from "../lib/data/useLiveBlock";
import { Globe } from "../components/map/Globe";
import { JoinQR } from "../components/stage/JoinQR";
import { StageHud } from "../components/stage/StageHud";
import { applyAppFilters } from "../lib/data/view-model";
import { useStageEffects } from "../lib/data/useStageEffects";
import { useReviews } from "../lib/data/useReviews";
import "../components/stage/app-stage.css";
import { deck } from "./deck/registry";
import { SCENES } from "../shared/scenes";

const SERVER_STATE = initialState();
const serverSnapshot = () => SERVER_STATE;

export default function StagePage() {
  useEffect(() => stage.connect("stage"), []);
  usePresenterKeys();
  const state = useSyncExternalStore(stage.subscribe, stage.getState, serverSnapshot);
  const data = useLiveData({ ...state.chainFilters, kinds: state.map !== "dots" ? ["dot", "business"] : state.chainFilters.kinds }, state.session);
  const scene = SCENES[state.sceneIndex]!;
  const reviewScene = scene.id === "L5" && state.step === 2;
  useEffect(() => {
    const current = data.run?.entities.find((entity) => entity.key === state.inspected);
    if (scene.id !== "L4" && !reviewScene) return;
    if (current && (!reviewScene || current.attrs.kind === "business")) return;
    const distance = (entity: NonNullable<typeof current>) => "lat" in entity.attrs ? (entity.attrs.lat - 18.9275) ** 2 + (entity.attrs.lng - 72.8335) ** 2 : Infinity;
    const candidate = data.run?.entities.filter((entity) => reviewScene ? entity.attrs.kind === "business" && !entity.attrs.session : entity.attrs.kind === "dot").sort((a, b) => reviewScene ? distance(a) - distance(b) : Number(b.expiresAtBlock - a.expiresAtBlock))[0];
    if (candidate) {
      stage.dispatch({ type: "inspect", key: candidate.key });
      stage.dispatch({ type: "select", keys: [candidate.key], mode: "set" });
    }
  }, [data.run, reviewScene, scene.id, state.inspected]);
  const reviewKey = state.map === "business" && reviewScene ? state.inspected : null;
  useEffect(() => { if (reviewScene && state.inspected) stage.dispatch({ type: "togglePanel", panel: "inspector", open: true }); }, [reviewScene, state.inspected]);
  const block = useLiveBlock();
  const notice = useStageEffects(data.adapter, data.source, data.run?.entities ?? []);
  const reviews = useReviews(data.adapter, reviewKey, block?.number);
  const view = applyAppFilters((data.run?.entities ?? []).filter((entity) => !state.hidden.includes(entity.key)), state.appFilters, state.overlays, block?.timestampMs ?? 0);
  const appSteps = [...view.steps, ...(state.map === "business" ? ["Audience dots: invented business category and rating"] : []), ...(state.map === "owner" ? ["Ownership badges and transfer animation · demo view"] : []), ...(state.hidden.length ? ["Hidden entities · local moderation"] : [])];
  return <StageFrame deck={deck} map={<Globe source={data.source} entities={view.entities} block={block} state={state} />} hud={<StageBox><div className="app-hud"><StageHud data={data} block={block} state={state} entities={view.entities} appSteps={appSteps} reviews={reviews} />{notice && <p className="presenter-notice" role="status">{notice}</p>}</div></StageBox>} qr={<StageBox><JoinQR /></StageBox>} />;
}
