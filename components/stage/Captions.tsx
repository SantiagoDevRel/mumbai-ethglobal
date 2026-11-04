"use client";

// Live captions on the presenter pages (lib/stage/captions.ts): the C key or the "?" card turns them
// on in this window. The band sits at the bottom center, in stage pixels, above the slides and the
// map; it shows the last two lines, settled words in white and words still being heard dimmer.

import { useEffect, type MouseEvent } from "react";
import { chooseFilter, chooseMicrophone, refreshMicrophones, saveAudio, toggleCaptions, toggleCaptionsHidden, useCaptions, useMicLevel } from "../../lib/stage/captions";
import { StageBox } from "./StageFrame";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** C turns captions on or off in this window; Shift+C hides or shows the band while they keep
 * listening (Santiago, November 4: the words sometimes cover what he wants to show). */
export function useCaptionsKey(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || isTyping(event.target)) return;
      if (event.key !== "c" && event.key !== "C") return;
      event.preventDefault();
      if (event.shiftKey) toggleCaptionsHidden();
      else toggleCaptions();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** A click on the band keeps the keyboard where it was, so Space and the arrows still move the talk. */
const keepFocus = (event: MouseEvent) => event.preventDefault();

export function CaptionsBand() {
  useCaptionsKey();
  const captions = useCaptions();
  if (captions.status === "off") return null;
  const words = `${captions.final} ${captions.interim}`.trim();
  const notice = captions.status === "live" ? null : captions.message;
  return (
    <div className="pointer-events-none absolute inset-0 z-[38]">
      <StageBox>
        {captions.hidden ? (
          // Still listening: a small CC button brings the band back.
          <button type="button" className="captions-show" onMouseDown={keepFocus} onClick={toggleCaptionsHidden} aria-label="Show captions" title="Show captions (Shift+C)">
            CC
          </button>
        ) : (
          <div className="captions-band" data-status={captions.status} aria-live="polite" aria-label="Live captions">
            {words ? (
              // A click on the words hides them; the CC button brings them back.
              <button type="button" className="captions-text" onMouseDown={keepFocus} onClick={toggleCaptionsHidden} title="Hide captions (Shift+C)">
                <span className="captions-lines"><span className="captions-para">{captions.final}{captions.final && captions.interim ? " " : ""}<span className="captions-interim">{captions.interim}</span></span></span>
              </button>
            ) : null}
            {notice ? <p className="captions-notice">{notice}</p> : null}
          </div>
        )}
      </StageBox>
    </div>
  );
}

/** The captions row in the "?" presenter card: on/off, the microphone and its level, Chrome's noise
 * filter, and the audio Deepgram got, to check a bad transcript against it. */
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
      {on ? <MicLevel /> : null}
      <div className="captions-controls-row">
        <label className="captions-filter"><input type="checkbox" checked={captions.filter} onChange={(event) => chooseFilter(event.target.checked)} /> Chrome noise filter</label>
        <button type="button" disabled={captions.savedSeconds < 1} onClick={saveAudio}>Save the audio{captions.savedSeconds ? ` (${captions.savedSeconds} s)` : ""}</button>
      </div>
      <p className="captions-controls-status">
        {captions.status === "live" ? <>Listening · {captions.micLabel}</> : captions.message ?? (on ? "Starting…" : "Off. Deepgram Nova-3 hears this window's microphone.")}
      </p>
    </div>
  );
}

/** The microphone's loudness while captions run: speaking should fill most of the bar. */
function MicLevel() {
  const level = useMicLevel();
  return (
    <div className="captions-level" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
      <span style={{ width: `${Math.round(level * 100)}%` }} data-low={level < 0.45 ? "true" : undefined} />
    </div>
  );
}
