// Production stub for `leva`, swapped in by a build-time alias in vite.config.ts (dev keeps the real
// library). The tuning panel is dev-only; in production `useControls` simply returns each control's baked
// default value (the schema's `value`), so the shipped look is identical and leva is left out of the bundle.
type Control = { value: unknown }
type Schema = Record<string, Control>

export function useControls(nameOrSchema: string | Schema, maybeSchema?: Schema): Record<string, unknown> {
  const schema = (typeof nameOrSchema === 'string' ? maybeSchema : nameOrSchema) ?? {}
  const out: Record<string, unknown> = {}
  for (const key in schema) out[key] = schema[key]?.value
  return out
}

// The panel UI renders nothing in production (props are ignored — see vite.config.ts alias note).
export function Leva(): null {
  return null
}

// `button` exists only so the dev-only "set as default" control compiles in the production bundle; it
// is never rendered or clicked there (the panel is absent). Call sites typecheck against the real leva
// (the stub is a build-time alias swap, post-typecheck), so any onClick arg is simply ignored at runtime.
export function button(): { type: 'BUTTON' } {
  return { type: 'BUTTON' }
}
