import { useState } from 'react'
import { ALIVE_KNOB_MAX, ALIVE_KNOBS, aliveSavePayload, type AliveTuning } from './scene/skyAlive'
import { saveDefaults } from './scene/tuning'

/**
 * Mark's tuner for make-it-alive A (`?tune=1`): sliders for the four knobs, live on the sky through uniforms,
 * the way the dev leva panel worked for the 2D sky (Mark, 2026-10-13: "you need to build the tool so that I can
 * tune myself"). Plain React, so it exists on every build, the Vercel preview and a phone included; leva is
 * aliased out of production. On the dev server "set as default" writes the values to sky-tuning.json (the
 * shipped defaults) through the same `/__set-tuning` writer; elsewhere "copy" puts them on the clipboard.
 */
const STEP: AliveTuning = { gust: 0.01, lift: 0.01, shimmer: 0.05, breath: 0.1, flicker: 0.05, glimmer: 0.05, surge: 0.05, bend: 0.05 }
const LABEL: Record<keyof AliveTuning, string> = {
  gust: 'gust (tempo surge)',
  lift: 'lift (brightness on a surge)',
  shimmer: 'shimmer (light sky pulse)',
  breath: 'breath (halos and moon)',
  flicker: 'flicker (cypress flame)',
  glimmer: 'glimmer (village windows)',
  surge: 'surge (touch, B)',
  bend: 'bend (touch on the land, D1)',
}

export function AliveTuner({
  tuning,
  defaults,
  onChange,
  touch = false,
}: {
  tuning: AliveTuning
  defaults: AliveTuning
  onChange: (next: AliveTuning) => void
  /** B's route: shows its `surge` slider and keeps `touch=1` on the share URL (review F11). */
  touch?: boolean
}) {
  const [status, setStatus] = useState('')
  const knobs = touch ? ALIVE_KNOBS : ALIVE_KNOBS.filter((name) => name !== 'surge' && name !== 'bend')

  const summary = knobs.map((name) => `${name}=${tuning[name]}`).join(' ')
  const shareUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('alive', '1')
    if (touch) url.searchParams.set('touch', '1')
    url.searchParams.delete('tune')
    for (const name of knobs) url.searchParams.set(name, String(tuning[name]))
    return url.toString()
  }

  const copy = () => {
    const text = `${summary}\n${shareUrl()}`
    navigator.clipboard
      .writeText(text)
      .then(() => setStatus('copied'))
      .catch(() => setStatus(text))
  }
  const save = () => {
    // success only once the writer has written the file; a rejection or a failed write shows as such
    setStatus('saving…')
    // only the knobs this route shows: a hidden `surge` restored from storage must not overwrite the shipped one
    saveDefaults(aliveSavePayload(tuning, knobs))
      .then(() => setStatus('saved to sky-tuning.json'))
      .catch((error: unknown) => setStatus(`save failed: ${error instanceof Error ? error.message : String(error)}`))
  }

  return (
    <aside className="alive-tuner" aria-label="Sky tuning">
      <h2>Alive tuning</h2>
      {knobs.map((name) => (
        <label key={name}>
          <span>
            {LABEL[name]} <output>{tuning[name].toFixed(2)}</output>
          </span>
          <input
            type="range"
            min={0}
            max={ALIVE_KNOB_MAX[name]}
            step={STEP[name]}
            value={tuning[name]}
            onChange={(event) => {
              setStatus('')
              onChange({ ...tuning, [name]: Number(event.target.value) })
            }}
          />
        </label>
      ))}
      <div className="alive-tuner-actions">
        <button type="button" className="visitor-control" onClick={() => onChange(defaults)}>
          Reset
        </button>
        <button type="button" className="visitor-control" onClick={copy}>
          Copy values
        </button>
        {import.meta.env.DEV && (
          <button type="button" className="visitor-control" onClick={save}>
            Set as default
          </button>
        )}
      </div>
      <p className="alive-tuner-status">{status || summary}</p>
    </aside>
  )
}
