import type { AliveTuning } from './skyAlive.ts'
import type { AliveInjection } from './aliveMaterial.ts'

/**
 * Make-it-alive A, second pass (tasks/2026-10-13-alive-a2-plan.md, A5): the lit village windows glimmer.
 *
 * The windows are the painting's own warm paint (`windowOchre`), one `mark()` of 2·(MARK_STEPS + 1) vertices per
 * lit window in the village `paint` mesh. Each fragment of a lit mark takes
 *
 *     L = 1 + knob · depth · weight · (a₁ sin(ω₁ t) + a₂ sin(ω₂ t))
 *
 * two rates per window, slow and fast, computed here from the window's index and packed as the attribute
 * `aGlow` = [weight, ω₁, ω₂] (never hashed in GLSL: a float32 `fract(sin · 43758)` is not this hash, review F2).
 * `sin` only, so 0 at t = 0 exactly and the paused still is today's; zero time-mean, so a window's average is
 * today's. Everything else in the paint mesh (edges, the dark openings, the door) has weight 0.
 *
 * Plain `.ts` imports only: `scripts/sky-alive.test.ts` runs this under node (`villageGeometry.ts` itself cannot
 * load there, so the packing is a pure function of vertex ranges, review F11).
 */
export const WINDOW_GLOW = {
  /** the slow breath, seconds */
  slow: [2.3, 4.1],
  /** the fast flutter, seconds */
  fast: [0.9, 1.6],
  /** the two modes' shares of the swing */
  amplitudes: [0.7, 0.3],
  /** the swing at the knob's maximum: ±60% of the window's paint, so none goes black */
  depth: 0.6,
}

/** `mark()`'s step count in villageGeometry.ts; a lit window is one mark of `markVertexCount()` vertices. */
export const MARK_STEPS = 4

export function markVertexCount(): number {
  return 2 * (MARK_STEPS + 1)
}

export type LitRange = { start: number; count: number }

function hash(n: number, seed: number): number {
  const x = Math.sin(n * 12.9898 + seed) * 43758.5453
  return x - Math.floor(x)
}

/** A window's two periods in seconds, from its index: slow then fast, each inside its range. */
export function glowPeriods(n: number): [number, number] {
  const slow = WINDOW_GLOW.slow[0] + (WINDOW_GLOW.slow[1] - WINDOW_GLOW.slow[0]) * hash(n, 78.233)
  const fast = WINDOW_GLOW.fast[0] + (WINDOW_GLOW.fast[1] - WINDOW_GLOW.fast[0]) * hash(n, 17.117)
  return [slow, fast]
}

/** The same as angular frequencies, what the attribute carries. */
export function glowOmega(n: number): [number, number] {
  const [slow, fast] = glowPeriods(n)
  return [(2 * Math.PI) / slow, (2 * Math.PI) / fast]
}

/** [weight, ω₁, ω₂] per vertex: weight 1 and the window's rates on each lit range (in order, n = its index), 0 elsewhere. */
export function packGlow(vertexCount: number, ranges: readonly LitRange[]): Float32Array {
  const out = new Float32Array(vertexCount * 3)
  ranges.forEach((range, n) => {
    if (range.start < 0 || range.start + range.count > vertexCount) throw new Error(`lit range ${n} outside the paint mesh`)
    const [slow, fast] = glowOmega(n)
    for (let i = range.start; i < range.start + range.count; i++) {
      out[i * 3] = 1
      out[i * 3 + 1] = slow
      out[i * 3 + 2] = fast
    }
  })
  return out
}

/** TS twin of the shader's factor for window n at a knob and a time. */
export function glowFactor(knob: number, t: number, n: number, amplitudes = WINDOW_GLOW.amplitudes): number {
  const [slow, fast] = glowOmega(n)
  return 1 + knob * WINDOW_GLOW.depth * (amplitudes[0] * Math.sin(slow * t) + amplitudes[1] * Math.sin(fast * t))
}

/** The finite-window bound on the swing's mean over T seconds, at the longest periods: Σ(aᵢ Pᵢ) / (π T). */
export function glowMeanBound(seconds: number): number {
  return (WINDOW_GLOW.amplitudes[0] * WINDOW_GLOW.slow[1] + WINDOW_GLOW.amplitudes[1] * WINDOW_GLOW.fast[1]) / (Math.PI * seconds)
}

/** The uniforms' values at a tuning. */
export function glowUniformValues(tuning: Pick<AliveTuning, 'glimmer'>) {
  return {
    amplitudes: [...WINDOW_GLOW.amplitudes] as [number, number],
    strength: tuning.glimmer * WINDOW_GLOW.depth,
  }
}

/**
 * The GLSL, per fragment. `flat`: each mark's triangles reference only its own vertices, so nothing straddles,
 * and a hashed rate through an interpolated varying would speckle (review F2).
 */
export const glowGlsl: Omit<AliveInjection, 'key' | 'uniforms'> = {
  vertexHead: /* glsl */ `
  attribute vec3 aGlow;
  flat varying vec3 vGlow;`,
  vertexBody: /* glsl */ `
  vGlow = aGlow;`,
  fragmentHead: /* glsl */ `
  flat varying vec3 vGlow;
  uniform float uTime;
  uniform float uGlimmer;
  uniform vec2 uGlowAmp;`,
  fragmentBody: /* glsl */ `
  diffuseColor.rgb *= 1.0 + uGlimmer * vGlow.x * (uGlowAmp.x * sin(vGlow.y * uTime) + uGlowAmp.y * sin(vGlow.z * uTime));`,
}
