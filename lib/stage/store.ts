"use client";

// Scene engine. Contract owned by the orchestrator.
//
// One store per window. The projector (`/`) is the leader: it applies every command and
// broadcasts the resulting state. `/notes` is a follower: it sends commands and mirrors the
// leader's state over a BroadcastChannel. Side effects that touch the chain or the writer
// (doors, extend, patch, hold) are not done here: the app registers effect handlers with
// `onCommand`, which run on the leader after the reducer.

import { useSyncExternalStore } from "react";
import { SCENES, type CameraCue, type MapMode } from "../../shared/scenes.ts";
import type { AppSideFilters, ChainFilters, Hex } from "../../shared/types.ts";
import { choreograph } from "./choreography.ts";

export type Panel = "filters" | "inspector" | "query" | "controls";

export interface StageState {
  sceneIndex: number;
  /** Reveal step inside the scene, 0-based. */
  step: number;
  doors: "closed" | "open";
  /** Set when D opens the doors: the 3 · 2 · 1 animation runs from this time (ms). */
  doorsCountdownAt: number | null;
  phase: "talk" | "build";
  /** Map layer; follows the scene unless B / O override it inside the scene. */
  map: MapMode;
  /** Ownership finale: false = one owner (santiago), true = each business owns its data. */
  transferred: boolean;
  panels: Record<Panel, boolean>;
  selected: Hex[];
  inspected: Hex | null;
  /** Hidden locally (moderation). They stay on-chain. */
  hidden: Hex[];
  chainFilters: ChainFilters;
  appFilters: AppSideFilters;
  /** App-side overlay attributes Santiago adds on stage, e.g. { [key]: { vegan: "yes" } }. */
  overlays: Record<string, Record<string, string>>;
  replay: boolean;
  camera: { cue: CameraCue; nonce: number };
  /** Talk timer start (ms since epoch), null until the first → from S0 or a manual start. */
  timerStartedAt: number | null;
  session: string | null;
}

export type Command =
  | { type: "next" }
  | { type: "prev" }
  | { type: "goto"; index: number }
  | { type: "doors"; open?: boolean }
  | { type: "phase"; phase: "talk" | "build" }
  | { type: "extend"; scope: "selected" | "all" }
  | { type: "makeBusiness"; key: Hex }
  | { type: "setMap"; map: MapMode }
  | { type: "transfer" }
  | { type: "undoTransfer" }
  | { type: "togglePanel"; panel: Panel; open?: boolean }
  | { type: "select"; keys: Hex[]; mode: "set" | "toggle" | "add" }
  | { type: "inspect"; key: Hex | null }
  | { type: "hideSelected" }
  | { type: "unhideAll" }
  | { type: "setChainFilters"; filters: ChainFilters }
  | { type: "setAppFilters"; filters: AppSideFilters }
  | { type: "setOverlay"; key: Hex; name: string; value: string | null }
  | { type: "resetCamera" }
  | { type: "camera"; cue: CameraCue }
  | { type: "replay"; on?: boolean }
  | { type: "timer"; action: "start" | "reset" }
  | { type: "session"; code: string | null };

export const DEFAULT_CHAIN_FILTERS: ChainFilters = { kinds: ["dot"] };

export function initialState(): StageState {
  const first = SCENES[0]!;
  return {
    sceneIndex: 0,
    step: 0,
    doors: "closed",
    doorsCountdownAt: null,
    phase: "talk",
    map: first.map,
    transferred: false,
    panels: { filters: false, inspector: false, query: false, controls: false },
    selected: [],
    inspected: null,
    hidden: [],
    chainFilters: DEFAULT_CHAIN_FILTERS,
    appFilters: {},
    overlays: {},
    replay: false,
    camera: { cue: first.camera, nonce: 0 },
    timerStartedAt: null,
    session: null,
  };
}

function enterScene(state: StageState, index: number, step = 0): StageState {
  const clamped = Math.max(0, Math.min(SCENES.length - 1, index));
  const scene = SCENES[clamped]!;
  const next: StageState = {
    ...state,
    sceneIndex: clamped,
    step: Math.max(0, Math.min(scene.steps - 1, step)),
    map: scene.map,
    // From L8 on the phones switch to resources.
    phase: scene.qr.label === "Start building" ? "build" : "talk",
  };
  if (scene.camera !== "keep") {
    next.camera = { cue: scene.camera, nonce: state.camera.nonce + 1 };
  }
  return choreograph(next, scene.id, true);
}

export function reduce(state: StageState, cmd: Command, now = Date.now()): StageState {
  const scene = SCENES[state.sceneIndex]!;
  switch (cmd.type) {
    case "next": {
      const started = state.timerStartedAt ?? now;
      if (state.step < scene.steps - 1) return choreograph({ ...state, step: state.step + 1, timerStartedAt: started }, scene.id, false);
      return { ...enterScene(state, state.sceneIndex + 1), timerStartedAt: started };
    }
    case "prev": {
      if (state.step > 0) return choreograph({ ...state, step: state.step - 1 }, scene.id, false);
      const prev = SCENES[state.sceneIndex - 1];
      return prev ? enterScene(state, state.sceneIndex - 1, prev.steps - 1) : state;
    }
    case "goto":
      return enterScene(state, cmd.index);
    case "doors": {
      const open = cmd.open ?? state.doors === "closed";
      return { ...state, doors: open ? "open" : "closed", doorsCountdownAt: open ? now : null };
    }
    case "phase":
      return { ...state, phase: cmd.phase };
    case "setMap":
      return { ...state, map: cmd.map };
    case "transfer":
      return { ...state, map: "owner", transferred: true };
    case "undoTransfer":
      return { ...state, transferred: false };
    case "togglePanel": {
      const open = cmd.open ?? !state.panels[cmd.panel];
      return { ...state, panels: { ...state.panels, [cmd.panel]: open } };
    }
    case "select": {
      if (cmd.mode === "set") return { ...state, selected: cmd.keys };
      if (cmd.mode === "add") return { ...state, selected: [...new Set([...state.selected, ...cmd.keys])] };
      const set = new Set(state.selected);
      for (const k of cmd.keys) {
        if (set.has(k)) set.delete(k);
        else set.add(k);
      }
      return { ...state, selected: [...set] };
    }
    case "inspect":
      return {
        ...state,
        inspected: cmd.key,
        panels: { ...state.panels, inspector: cmd.key !== null },
      };
    case "hideSelected":
      return {
        ...state,
        hidden: [...new Set([...state.hidden, ...state.selected, ...(state.inspected ? [state.inspected] : [])])],
        selected: [],
        inspected: null,
        panels: { ...state.panels, inspector: false },
      };
    case "unhideAll":
      return { ...state, hidden: [] };
    case "setChainFilters":
      return { ...state, chainFilters: cmd.filters };
    case "setAppFilters":
      return { ...state, appFilters: cmd.filters };
    case "setOverlay": {
      const current = { ...(state.overlays[cmd.key] ?? {}) };
      if (cmd.value === null) delete current[cmd.name];
      else current[cmd.name] = cmd.value;
      return { ...state, overlays: { ...state.overlays, [cmd.key]: current } };
    }
    case "resetCamera":
      return { ...state, camera: { cue: scene.camera === "keep" ? "globe" : scene.camera, nonce: state.camera.nonce + 1 } };
    case "camera":
      return { ...state, camera: { cue: cmd.cue, nonce: state.camera.nonce + 1 } };
    case "replay":
      return { ...state, replay: cmd.on ?? !state.replay };
    case "timer":
      return { ...state, timerStartedAt: cmd.action === "start" ? now : null };
    case "session":
      return { ...state, session: cmd.code };
    // Pure side-effect commands: the reducer leaves state alone; handlers do the work.
    case "extend":
    case "makeBusiness":
      return state;
  }
}

// ---------- store + channel ----------

export type Role = "stage" | "notes";

type Message =
  | { kind: "command"; cmd: Command }
  | { kind: "state"; state: StageState }
  | { kind: "hello" };

const CHANNEL = "arkiv-mumbai-stage";

type Listener = () => void;
type CommandHandler = (cmd: Command, state: StageState) => void | Promise<void>;

class StageStore {
  private state: StageState = initialState();
  private listeners = new Set<Listener>();
  private handlers = new Set<CommandHandler>();
  private channel: BroadcastChannel | null = null;
  private role: Role = "stage";
  /** Follower: time of the last state received from the leader. */
  lastLeaderStateAt = 0;

  connect(role: Role): () => void {
    this.role = role;
    if (typeof BroadcastChannel === "undefined") return () => {};
    const channel = new BroadcastChannel(CHANNEL);
    this.channel = channel;
    channel.onmessage = (ev: MessageEvent<Message>) => {
      const msg = ev.data;
      if (this.role === "stage") {
        if (msg.kind === "command") this.dispatch(msg.cmd);
        else if (msg.kind === "hello") channel.postMessage({ kind: "state", state: this.state } satisfies Message);
      } else if (msg.kind === "state") {
        this.lastLeaderStateAt = Date.now();
        this.set(msg.state);
      }
    };
    if (role === "notes") channel.postMessage({ kind: "hello" } satisfies Message);
    else channel.postMessage({ kind: "state", state: this.state } satisfies Message);
    return () => {
      channel.close();
      if (this.channel === channel) this.channel = null;
    };
  }

  getState = (): StageState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Register a side-effect handler (leader only). Returns an unsubscribe function. */
  onCommand(handler: CommandHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  dispatch = (cmd: Command): void => {
    if (this.role === "notes" && this.channel) {
      this.channel.postMessage({ kind: "command", cmd } satisfies Message);
      return;
    }
    const before = this.state;
    this.set(reduce(before, cmd));
    for (const h of this.handlers) {
      try {
        void Promise.resolve(h(cmd, this.state)).catch((err) => console.error("stage handler", cmd.type, err));
      } catch (err) {
        console.error("stage handler", cmd.type, err);
      }
    }
    this.channel?.postMessage({ kind: "state", state: this.state } satisfies Message);
  };

  private set(next: StageState) {
    if (next === this.state) return;
    this.state = next;
    for (const l of this.listeners) l();
  }
}

export const stage = new StageStore();

export function useStage<T>(selector: (s: StageState) => T): T {
  return useSyncExternalStore(
    stage.subscribe,
    () => selector(stage.getState()),
    () => selector(initialState()),
  );
}

export function useScene() {
  const index = useStage((s) => s.sceneIndex);
  const step = useStage((s) => s.step);
  return { scene: SCENES[index]!, index, step };
}
