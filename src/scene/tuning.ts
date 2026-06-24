// Tuning defaults: the bridge between the dev leva panel and the baked, shipped defaults.
//
// `sky-tuning.json` holds the current default for every tunable control. Components read it via
// `tuned(key, factory)` for their leva `value`, so the saved file IS the default the panel opens on
// AND the value the production stub bakes in (leva is aliased to a stub at build time — see
// vite.config.ts). The dev-only "set as default" button POSTs the live panel values to the
// `/__set-tuning` writer (dev server middleware), which rewrites this JSON.
import saved from './sky-tuning.json'

const TUNING = saved as Record<string, number>

/** The saved default for a control, or `factory` if the JSON has no finite value for that key. */
export function tuned(key: string, factory: number): number {
  const v = TUNING[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : factory
}

/**
 * POST the current panel values to the dev-only tuning writer, which rewrites `sky-tuning.json`.
 * Dev-only in practice: it is reached only from the leva "set as default" button, which never renders
 * in production (the panel is absent). The server allowlists + type-checks every field, so the client
 * need not pre-validate. Saving triggers an HMR reload, so the panel snaps to the just-saved defaults.
 */
export function saveDefaults(values: Record<string, unknown>): void {
  void fetch('/__set-tuning', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(() => console.info('[sky-tuning] saved as default →', values))
    .catch((e: unknown) => console.warn('[sky-tuning] save failed', e))
}
