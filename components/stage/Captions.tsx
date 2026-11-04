"use client";

// Live captions on the presenter pages (lib/stage/captions.ts): the C key or the "?" card turns them
// on in this window. The band sits at the bottom center, in stage pixels, above the slides and the
// map; it shows the last two lines, settled words in white and words still being heard dimmer.

import { useEffect } from "react";
import { chooseMicrophone, refreshMicrophones, toggleCaptions, useCaptions } from "../../lib/stage/captions";
import { StageBox } from "./StageFrame";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** The C key toggles captions in this window only. */
export function useCaptionsKey(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || isTyping(event.target)) return;
      if (event.key !== "c" && event.key !== "C") return;
      event.preventDefault();
      toggleCaptions();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function CaptionsBand() {
  useCaptionsKey();
  const captions = useCaptions();
  if (captions.status === "off") return null;
  const words = `${captions.final} ${captions.interim}`.trim();
  const notice = captions.status === "live" ? null : captions.message;
  return (
    <div className="pointer-events-none absolute inset-0 z-[38]">
      <StageBox>
        <div className="captions-band" data-status={captions.status} aria-live="polite" aria-label="Live captions">
          {words ? (
            <div className="captions-text">
              <div className="captions-lines"><p>{captions.final}{captions.final && captions.interim ? " " : ""}<span className="captions-interim">{captions.interim}</span></p></div>
            </div>
          ) : null}
          {notice ? <p className="captions-notice">{notice}</p> : null}
        </div>
      </StageBox>
    </div>
  );
}

/** The captions row in the "?" presenter card: on/off and the microphone. */
export function CaptionsControls() {
  const captions = useCaptions();
  useEffect(() => { refreshMicrophones(); }, []);
  const on = captions.status !== "off" && captions.status !== "error";
  return (
    <div className="captions-controls">
      <h3>Live captions</h3>
      <div className="captions-controls-row">
        <button type="button" aria-pressed={on} onClick={toggleCaptions}>{on ? "Turn off" : "Turn on"} <kbd>C</kbd></button>
        <select aria-label="Microphone" value={captions.deviceId} onChange={(event) => chooseMicrophone(event.target.value)}>
          <option value="">System default microphone</option>
          {captions.devices.map((device) => <option key={device.id} value={device.id}>{device.label}</option>)}
        </select>
      </div>
      <p className="captions-controls-status">
        {captions.status === "live" ? <>Listening · {captions.micLabel}</> : captions.message ?? (on ? "Starting…" : "Off. Deepgram Nova-3 hears this window's microphone.")}
      </p>
    </div>
  );
}
