"use client";

// Projector stage: deck + live map in one frame. The app chat fills `map`, `hud` and `qr`.

import { useEffect } from "react";
import { StageFrame } from "../components/stage/StageFrame";
import { usePresenterKeys } from "../lib/stage/keyboard";
import { stage } from "../lib/stage/store";
import { deck } from "./deck/registry";

export default function StagePage() {
  useEffect(() => stage.connect("stage"), []);
  usePresenterKeys();
  return <StageFrame deck={deck} map={<div className="h-full w-full bg-[var(--stage-bg)]" />} />;
}
