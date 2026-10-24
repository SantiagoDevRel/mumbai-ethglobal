"use client";

// Projector stage: deck + live map in one frame. The app chat fills `map`, `hud` and `qr`.

import { useEffect } from "react";
import { StageFrame } from "../components/stage/StageFrame";
import { usePresenterKeys } from "../lib/stage/keyboard";
import { stage } from "../lib/stage/store";
import { useStage } from "../lib/stage/store";
import { useLiveData } from "../lib/data/useLiveData";
import { useLiveBlock } from "../lib/data/useLiveBlock";
import { Globe } from "../components/map/Globe";
import { JoinQR } from "../components/stage/JoinQR";
import { StageHud } from "../components/stage/StageHud";
import { applyAppFilters } from "../lib/data/view-model";
import { useStageEffects } from "../lib/data/useStageEffects";
import "../components/stage/app-stage.css";
import { deck } from "./deck/registry";

export default function StagePage() {
  useEffect(() => stage.connect("stage"), []);
  usePresenterKeys();
  const state = useStage((s) => s);
  const data = useLiveData({ ...state.chainFilters, kinds: state.map === "business" ? ["dot", "business"] : state.chainFilters.kinds }, state.session);
  const block = useLiveBlock();
  const notice = useStageEffects(data.adapter, data.source, data.run?.entities ?? []);
  const view = applyAppFilters((data.run?.entities ?? []).filter((entity) => !state.hidden.includes(entity.key)), state.appFilters, state.overlays, block?.timestampMs ?? 0);
  const appSteps = [...view.steps, ...(state.map === "business" ? ["Audience dots: invented business category and rating"] : []), ...(state.hidden.length ? ["Hidden entities · local moderation"] : [])];
  return <StageFrame deck={deck} map={<Globe entities={view.entities} block={block} state={state} />} hud={<><StageHud data={data} block={block} state={state} entities={view.entities} appSteps={appSteps} reviews={[]} />{notice && <p className="presenter-notice" role="status">{notice}</p>}</>} qr={<JoinQR />} />;
}
