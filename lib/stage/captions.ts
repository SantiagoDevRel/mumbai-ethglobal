"use client";

// Live captions (Santiago, November 4: his voice was weak after Devcon, so the room reads what he
// says). The window where the presenter turns them on (C key, or the "?" card) streams its
// microphone to Deepgram's Nova-3 and shows the words at the bottom of the screen. Each window runs
// its own captions and nothing goes through the stage store, so a split screen never opens two
// streams by accident. The writer hands out a short-lived token (GET /api/presenter/captions); the
// Deepgram API key never reaches the browser.

import { useSyncExternalStore } from "react";
import { presenterRequest } from "../data/presenter-auth";
import { CaptionsToken, WRITER_ROUTES } from "../../shared/writer-api";
import { correctTerms, deepgramListenUrl, readResult, tailWords } from "./captions-text";

/** Clear the band after this much silence, so old words don't sit under the next slide. */
const SILENCE_CLEAR_MS = 6_000;
const DEVICE_KEY = "arkiv-captions-mic";
const FILTER_KEY = "arkiv-captions-filter";
/** The audio sent to Deepgram stays in this window for "Save the audio", up to this size. */
const KEEP_AUDIO_BYTES = 40_000_000;

export type CaptionsStatus = "off" | "starting" | "live" | "reconnecting" | "error";
export interface CaptionsState {
  status: CaptionsStatus;
  /** Why captions stopped or wait, in English for the presenter. */
  message: string | null;
  /** Words Deepgram has settled, newest last (trimmed to the last few lines). */
  final: string;
  /** Words still being heard: they may change. */
  interim: string;
  /** The chosen microphone, "" for the system default. */
  deviceId: string;
  devices: { id: string; label: string }[];
  /** The microphone in use, as the browser names it. */
  micLabel: string | null;
  /** Chrome's noise suppression and echo cancellation on the microphone. Off by default (November 4:
   * a quiet, hoarse voice came out garbled; Deepgram's models are trained on unfiltered audio). The
   * automatic gain stays on either way, so a quiet voice still reaches Deepgram loud enough. */
  filter: boolean;
  /** Seconds of audio this window has kept for "Save the audio". */
  savedSeconds: number;
  /** The band is hidden while captions keep listening (a click on the words, or Shift+C). */
  hidden: boolean;
}

function stored(key: string): string {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}

let state: CaptionsState = { status: "off", message: null, final: "", interim: "", deviceId: "", devices: [], micLabel: null, filter: false, savedSeconds: 0, hidden: false };
let hydrated = false;
const listeners = new Set<() => void>();
function set(patch: Partial<CaptionsState>) { state = { ...state, ...patch }; for (const listener of listeners) listener(); }

let wanted = false;
let stream: MediaStream | null = null;
let socket: WebSocket | null = null;
let recorder: MediaRecorder | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let silenceTimer: ReturnType<typeof setTimeout> | undefined;
let attempt = 0;
let run = 0;
/** What the current recorder sent, header first, so the saved file plays (one file per connection). */
let kept: Blob[] = [];
let keptBytes = 0;
let keptType = "audio/webm";
let keptSince = 0;
/** The microphone's loudness, 0 to 1, for the meter in the "?" card. Its own listeners: it changes
 * ten times a second and the band doesn't need to hear it. */
let level = 0;
const levelListeners = new Set<() => void>();
let meter: { context: AudioContext; timer: ReturnType<typeof setInterval> } | null = null;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = { ...state, deviceId: stored(DEVICE_KEY), filter: stored(FILTER_KEY) === "on" };
}

function setLevel(value: number) {
  if (value === level) return;
  level = value;
  for (const listener of levelListeners) listener();
}

/** Peak loudness of the microphone every 100 ms, as the meter shows it (-60 dBFS empty, 0 full). */
function startMeter(source: MediaStream) {
  stopMeter();
  try {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(source).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
      const db = peak > 0 ? 20 * Math.log10(peak) : -100;
      setLevel(Math.round(Math.min(1, Math.max(0, (db + 60) / 60)) * 50) / 50);
    }, 100);
    meter = { context, timer };
  } catch { /* No meter; the captions still run. */ }
}
function stopMeter() {
  if (!meter) return;
  clearInterval(meter.timer);
  void meter.context.close().catch(() => undefined);
  meter = null;
  setLevel(0);
}

async function listDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    set({ devices: all.filter((d) => d.kind === "audioinput" && d.deviceId && d.deviceId !== "default" && d.deviceId !== "communications").map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` })) });
  } catch { /* The list stays as it was. */ }
}

function stopRecorder() {
  if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch { /* Already stopped. */ } }
  recorder = null;
}
function closeSocket() {
  const old = socket;
  socket = null;
  if (!old) return;
  old.onclose = null; old.onerror = null; old.onmessage = null; old.onopen = null;
  try { if (old.readyState === WebSocket.OPEN) old.send(JSON.stringify({ type: "CloseStream" })); } catch { /* Closing anyway. */ }
  try { old.close(); } catch { /* Already closed. */ }
}
function releaseMic() {
  stopMeter();
  for (const track of stream?.getTracks() ?? []) track.stop();
  stream = null;
}

function onWords(text: string, isFinal: boolean) {
  if (!text && !isFinal) return;
  // Corrected again on the joined text: a term can arrive split across two final segments.
  if (isFinal) set({ final: tailWords(correctTerms(`${state.final} ${text}`)), interim: "" });
  else set({ interim: text });
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => set({ final: "", interim: "" }), SILENCE_CLEAR_MS);
}

function scheduleRetry(mine: number, reason: string) {
  if (!wanted || mine !== run) return;
  stopRecorder();
  closeSocket();
  attempt += 1;
  const delay = Math.min(1_000 * attempt, 5_000);
  set({ status: "reconnecting", message: reason });
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { void connect(mine); }, delay);
}

async function connect(mine: number) {
  if (!wanted || mine !== run || !stream) return;
  let token: CaptionsToken;
  try {
    token = CaptionsToken.parse(await presenterRequest(WRITER_ROUTES.presenter.captions));
  } catch (error) {
    if (mine !== run) return;
    const message = error instanceof Error ? error.message : "The captions token failed.";
    // A missing key or a lost login won't fix itself: stop and say why.
    if (/not configured|presenter password/i.test(message)) { stopCaptions(message); return; }
    scheduleRetry(mine, message);
    return;
  }
  if (!wanted || mine !== run || !stream) return;
  const ws = new WebSocket(deepgramListenUrl(), ["bearer", token.accessToken]);
  socket = ws;
  ws.onopen = () => {
    if (mine !== run || !stream) return;
    attempt = 0;
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder = rec;
    kept = []; keptBytes = 0; keptType = rec.mimeType || mimeType || "audio/webm"; keptSince = Date.now();
    rec.ondataavailable = (event) => {
      if (event.data.size === 0 || ws.readyState !== WebSocket.OPEN) return;
      ws.send(event.data);
      if (keptBytes + event.data.size > KEEP_AUDIO_BYTES) return;
      kept.push(event.data);
      keptBytes += event.data.size;
      const seconds = Math.floor((Date.now() - keptSince) / 1000);
      if (seconds !== state.savedSeconds) set({ savedSeconds: seconds });
    };
    rec.start(250);
    set({ status: "live", message: null });
  };
  ws.onmessage = (event) => {
    const result = readResult(event.data);
    if (result) onWords(result.text, result.isFinal);
  };
  ws.onerror = () => { /* onclose follows and decides. */ };
  ws.onclose = (event) => {
    if (socket !== ws) return;
    scheduleRetry(mine, event.code === 1008 || event.code === 4001 ? "Deepgram refused the token. Retrying…" : "Captions connection lost. Reconnecting…");
  };
}

export async function startCaptions(): Promise<void> {
  hydrate();
  if (wanted) return;
  wanted = true;
  const mine = ++run;
  attempt = 0;
  set({ status: "starting", message: "Asking for the microphone…", final: "", interim: "" });
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { stopCaptions("This browser can't record the microphone."); return; }
  const audio: MediaTrackConstraints = { echoCancellation: state.filter, noiseSuppression: state.filter, autoGainControl: true, channelCount: 1 };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: state.deviceId ? { ...audio, deviceId: { exact: state.deviceId } } : audio });
  } catch (error) {
    // A remembered microphone that is gone: fall back to the default once.
    if (state.deviceId && (error as { name?: string } | null)?.name === "OverconstrainedError") {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio }); set({ deviceId: "" }); } catch { /* Reported below. */ }
    }
    if (!stream) {
      const name = (error as { name?: string } | null)?.name;
      stopCaptions(name === "NotAllowedError" ? "The microphone is blocked: allow it in the address bar, then press C again." : "No microphone found.");
      return;
    }
  }
  if (mine !== run) { releaseMic(); return; }
  set({ micLabel: stream.getAudioTracks()[0]?.label || "Default microphone", message: "Connecting to Deepgram…" });
  startMeter(stream);
  void listDevices();
  stream.getAudioTracks()[0]?.addEventListener("ended", () => { if (mine === run) stopCaptions("The microphone was disconnected."); });
  await connect(mine);
}

export function stopCaptions(message: string | null = null): void {
  wanted = false;
  run += 1;
  clearTimeout(retryTimer);
  clearTimeout(silenceTimer);
  stopRecorder();
  closeSocket();
  releaseMic();
  set({ status: message ? "error" : "off", message, final: "", interim: "", micLabel: null, hidden: false });
}

export function toggleCaptions(): void {
  if (wanted) stopCaptions();
  else void startCaptions();
}

/** Hides or shows the band; captions keep listening either way. Does nothing while they are off. */
export function toggleCaptionsHidden(): void {
  if (state.status === "off") return;
  set({ hidden: !state.hidden });
}

/** Choose the microphone; a running stream restarts on it. */
export function chooseMicrophone(deviceId: string): void {
  hydrate();
  try { if (deviceId) localStorage.setItem(DEVICE_KEY, deviceId); else localStorage.removeItem(DEVICE_KEY); } catch { /* Only this run remembers it. */ }
  set({ deviceId });
  if (wanted) { stopCaptions(); void startCaptions(); }
}

/** Chrome's noise filter on or off; a running stream restarts with it. */
export function chooseFilter(on: boolean): void {
  hydrate();
  try { if (on) localStorage.setItem(FILTER_KEY, "on"); else localStorage.removeItem(FILTER_KEY); } catch { /* Only this run remembers it. */ }
  set({ filter: on });
  if (wanted) { stopCaptions(); void startCaptions(); }
}

/** Downloads what this window sent Deepgram since the last connection, to check a bad transcript
 * against the real audio. It never leaves the presenter's computer otherwise. */
export function saveAudio(): void {
  if (!kept.length) return;
  const url = URL.createObjectURL(new Blob(kept, { type: keptType }));
  const stamp = new Date(keptSince).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const link = Object.assign(document.createElement("a"), { href: url, download: `captions-audio-${stamp}.${keptType.includes("ogg") ? "ogg" : "webm"}` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Fills the microphone list (labels appear once the browser has microphone permission). */
export function refreshMicrophones(): void { hydrate(); void listDevices(); }

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const OFF = state;
export function useCaptions(): CaptionsState {
  return useSyncExternalStore(subscribe, () => { hydrate(); return state; }, () => OFF);
}

const subscribeLevel = (listener: () => void) => { levelListeners.add(listener); return () => { levelListeners.delete(listener); }; };
/** The microphone's loudness, 0 to 1, while captions run. */
export function useMicLevel(): number {
  return useSyncExternalStore(subscribeLevel, () => level, () => 0);
}
