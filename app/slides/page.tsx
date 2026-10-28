"use client";

// /slides: the deck, for the other half of a split screen. It follows /map's scene, and its keys
// drive both windows; with no /map open it runs on its own.

import { useEffect } from "react";
import { SlidesFrame, StageBox } from "../../components/stage/StageFrame";
import { PresenterBar, PresenterGate } from "../../components/stage/Presenter";
import { JoinQR } from "../../components/stage/JoinQR";
import { usePresenterKeys } from "../../lib/stage/keyboard";
import { stage } from "../../lib/stage/store";
import "../../components/stage/app-stage.css";
import { useDeckPreload } from "../deck/preload";
import { deck } from "../deck/registry";
import { LiveCard } from "../deck/scenes/LiveCard";

export default function SlidesPage() {
  return <PresenterGate><SlidesStage /></PresenterGate>;
}

function SlidesStage() {
  useEffect(() => stage.connect("follower"), []);
  usePresenterKeys();
  useDeckPreload();
  return <SlidesFrame deck={deck} liveCard={LiveCard} qr={<StageBox><JoinQR screen="slides" /></StageBox>} bar={<PresenterBar />} />;
}
