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
 * POST the current panel values to the dev-only tuning writer, which merges them into `sky-tuning.json`.
 * Dev-only in practice: it is reached only from the "set as default" buttons (the leva panel on the 2D
 * route, the alive tuner on the diorama), which never render in production. The server allowlists +
 * type-checks every field, so the client need not pre-validate. Saving triggers an HMR reload, so a panel
 * snaps to the just-saved defaults. Resolves once the server has written the file and rejects otherwise,
 * so a caller can report success only when it is true (Codex, PR #8); it also logs either way.
 */
export function saveDefaults(values: Record<string, unknown>): Promise<void> {
  return fetch('/__set-tuning', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  })
    .then((r) => (r.ok ? r.text() : r.text().then((detail) => Promise.reject(new Error(`HTTP ${r.status}${detail ? `: ${detail}` : ''}`)))))
    .then(() => console.info('[sky-tuning] saved as default →', values))
    .catch((e: unknown) => {
      console.warn('[sky-tuning] save failed', e)
      throw e
    })
}
