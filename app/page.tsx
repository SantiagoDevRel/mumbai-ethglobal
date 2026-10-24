"use client";

// Projector stage: deck + live map in one frame. The app chat fills `map`, `hud` and `qr`.

import { useEffect, useSyncExternalStore } from "react";
import { StageFrame } from "../components/stage/StageFrame";
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

const SERVER_STATE = initialState();
const serverSnapshot = () => SERVER_STATE;

export default function StagePage() {
  useEffect(() => stage.connect("stage"), []);
  usePresenterKeys();
  const state = useSyncExternalStore(stage.subscribe, stage.getState, serverSnapshot);
  const data = useLiveData({ ...state.chainFilters, kinds: state.map === "business" ? ["dot", "business"] : state.chainFilters.kinds }, state.session);
  const block = useLiveBlock();
  const notice = useStageEffects(data.adapter, data.source, data.run?.entities ?? []);
  const reviews = useReviews(data.adapter, state.map === "business" ? state.inspected : null, block?.number);
  const view = applyAppFilters((data.run?.entities ?? []).filter((entity) => !state.hidden.includes(entity.key)), state.appFilters, state.overlays, block?.timestampMs ?? 0);
  const appSteps = [...view.steps, ...(state.map === "business" ? ["Audience dots: invented business category and rating"] : []), ...(state.map === "owner" ? ["Ownership badges and transfer animation · demo view"] : []), ...(state.hidden.length ? ["Hidden entities · local moderation"] : [])];
  return <StageFrame deck={deck} map={<Globe entities={view.entities} block={block} state={state} />} hud={<><StageHud data={data} block={block} state={state} entities={view.entities} appSteps={appSteps} reviews={reviews} />{notice && <p className="presenter-notice" role="status">{notice}</p>}</>} qr={<JoinQR />} />;
}
