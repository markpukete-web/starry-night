import { SWIRLS } from './skySwirls.ts'
import type { SourceRibbonVertex } from './streamlineGeometry.ts'

/**
 * Make-it-alive A (tasks/2026-10-13-alive-a-plan.md): the gust clock and the per-ribbon gust weight.
 *
 * Nothing here changes a path, a colour or the flow field. Each stroke keeps reading the one sky clock, but
 * through a warp: T(t) = t + w · (G(t − lag) − G(−lag)), where G is the integral of a zero-mean sum of three sines.
 * The tempo dT/dt = 1 + w · Σ Aᵢ sin(ωᵢ (t − lag)) surges and eases without repeating, averages today's speed,
 * and never reverses while Σ Aᵢ < 1. w is derived from the painting (below); lag makes a gust travel across the
 * canvas left to right. With the flag off (uAlive 0) T is exactly t.
 *
 * Plain `.ts` imports only: `scripts/sky-alive.test.ts` runs this under node.
 */
export const GUST = {
  /** periods in seconds, incommensurate so the tempo never repeats */
  periods: [9.7, 5.9, 16.3],
  /** tempo amplitudes; their sum stays under 1 so the warped clock never runs backwards */
  amplitudes: [0.36, 0.22, 0.12],
  /** seconds a gust takes to cross the canvas, left to right: lag = u × travel */
  travel: 3,
  /** brightness lift at a full surge, scaled by the ribbon's weight; no lag, so it is 0 at t = 0 for every ribbon */
  lift: 0.06,
  /**
   * How much of the warp the light sky's shimmer term takes (the flow term takes all of it). The shimmer runs at
   * 3× the flow's rate and is the knob that tips into boil (lessons 2026-06-22), so a full surge of 1.7× would run
   * it at 5.1×; half the warp caps it at 4×. Decided at the first capture (review F6).
   */
  shimmerShare: 0.5,
  /** the calm floor: every ribbon breathes at least this much of the gust (the deep blue, calmer) */
  floor: 0.15,
  /**
   * Luminance of a ribbon's mean colour, mapped to the band weight. The light sky's 3,145 ribbons on the real
   * assets read lum 5% 0.257 / 25% 0.362 / 50% 0.416 / 75% 0.457 / 95% 0.551 (2026-10-13); these are about the
   * 35th and 90th percentiles, so the pale luminous strokes carry the energy and the cobalt floor stays calm.
   */
  bandLum: [0.38, 0.52],
}

/** The two great swirls: the central whorl and its counter-roll surge and ease as bodies. */
const WHORLS = [SWIRLS[0], SWIRLS[1]]

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Rec. 601 luminance of a 0..1 colour, as the shaders compute it. */
export function luminance([r, g, b]: readonly [number, number, number]): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** 1 inside a great whorl's core, 0 beyond 1.6 of its radius; painting-space u, v. */
export function whorlWeight(u: number, v: number): number {
  let w = 0
  for (const [su, sv, , r] of WHORLS) w = Math.max(w, 1 - smoothstep(0.6 * r, 1.6 * r, Math.hypot(u - su, v - sv)))
  return w
}

/** A ribbon's gust weight from its mean luminance and midpoint: floor + (1 − floor) · max(band, whorl). */
export function gustWeight(lum: number, u: number, v: number): number {
  const band = smoothstep(GUST.bandLum[0], GUST.bandLum[1], lum)
  return GUST.floor + (1 - GUST.floor) * Math.max(band, whorlWeight(u, v))
}

/** Seconds a gust takes to reach a ribbon at painting-space u (the strips run past 0..1 by up to 0.3). */
export function gustLag(u: number): number {
  return Math.min(1.3, Math.max(-0.3, u)) * GUST.travel
}

/**
 * [weight, lag] per vertex, one pair per ribbon. The builder draws `phase` once per ribbon and emits a ribbon's
 * vertices contiguously, so a run of equal phase is a ribbon. The weight uses the ribbon's mean colour
 * (per-vertex for the light sky, one colour for the moving sky) and its mean u, v.
 */
export function ribbonGusts(vertices: readonly SourceRibbonVertex[]): Float32Array {
  const out = new Float32Array(vertices.length * 2)
  let start = 0
  while (start < vertices.length) {
    // the (phase, rate) pair: two adjacent ribbons drawing the same 32-bit phase is ~6e-6 likely and deterministic
    // for the seed, so the pair closes that door (review F7)
    const { phase, rate } = vertices[start]
    let end = start
    let lum = 0
    let u = 0
    let v = 0
    while (end < vertices.length && vertices[end].phase === phase && vertices[end].rate === rate) {
      lum += luminance(vertices[end].color)
      u += vertices[end].u
      v += vertices[end].v
      end++
    }
    const n = end - start
    const w = gustWeight(lum / n, u / n, v / n)
    const lag = gustLag(u / n)
    for (let i = start; i < end; i++) {
      out[i * 2] = w
      out[i * 2 + 1] = lag
    }
    start = end
  }
  return out
}

const omega = (period: number) => (2 * Math.PI) / period

/** TS twin of the shader's G: Σ (Aᵢ / ωᵢ)(1 − cos ωᵢ s). */
export function gustG(s: number, amplitudes = GUST.amplitudes, periods = GUST.periods): number {
  let g = 0
  for (let i = 0; i < 3; i++) g += (amplitudes[i] / omega(periods[i])) * (1 - Math.cos(omega(periods[i]) * s))
  return g
}

/** TS twin of the shader's warped clock, with the flag on. */
export function gustTime(t: number, weight: number, lag: number, amplitudes = GUST.amplitudes, periods = GUST.periods): number {
  return t + weight * (gustG(t - lag, amplitudes, periods) - gustG(-lag, amplitudes, periods))
}

/** TS twin of the shader's pulse: the tempo's zero-mean part, normalised to ±1, with no lag (0 at t = 0). */
export function gustPulse(t: number, amplitudes = GUST.amplitudes, periods = GUST.periods): number {
  let s = 0
  let a = 0
  for (let i = 0; i < 3; i++) {
    s += amplitudes[i] * Math.sin(omega(periods[i]) * t)
    a += amplitudes[i]
  }
  return s / a
}

/** The finite-window error bound on the mean tempo over T seconds: w · Σ(Aᵢ Pᵢ) / (π T) (review F11). */
export function meanTempoBound(seconds: number, weight = 1, amplitudes = GUST.amplitudes, periods = GUST.periods): number {
  let s = 0
  for (let i = 0; i < 3; i++) s += amplitudes[i] * periods[i]
  return (weight * s) / (Math.PI * seconds)
}

/** The uniforms the shaders take for GUST. */
export function gustUniformValues() {
  return {
    omega: GUST.periods.map(omega) as [number, number, number],
    amplitudes: [...GUST.amplitudes] as [number, number, number],
  }
}

/**
 * The GLSL shared by both ribbon VERTEX shaders: the warp is one value per ribbon per frame, so it is computed
 * per vertex and passed down, not nine transcendentals per fragment of a full-viewport mesh (review F3).
 * `uAlive` is 0 or 1, never a strength: above 1 the clock could run backwards. At 0, gustTime(t) = t + 0·x = t,
 * expected exact at the IEEE level and proven by the gate's AE 0 captures, not assumed (review F5).
 */
export const gustGlsl = /* glsl */ `
  uniform float uAlive;
  uniform vec3 uGustOmega;
  uniform vec3 uGustAmp;
  uniform float uGustLift;
  float gustG(float s) {
    vec3 c = (uGustAmp / uGustOmega) * (1.0 - cos(uGustOmega * s));
    return c.x + c.y + c.z;
  }
  // the warped clock: gust.x is the ribbon's weight, gust.y its lag
  float gustTime(float t, vec2 gust) {
    return t + uAlive * gust.x * (gustG(t - gust.y) - gustG(-gust.y));
  }
  // the brightness lift on a surge: weight × the tempo's zero-mean part in -1..1, no lag, so 0 at t = 0
  float gustLift(float t, vec2 gust) {
    vec3 s = uGustAmp * sin(uGustOmega * t);
    return uAlive * uGustLift * gust.x * (s.x + s.y + s.z) / (uGustAmp.x + uGustAmp.y + uGustAmp.z);
  }
`

/**
 * A2: each star halo breathes at its own rate; the moon pulses slower and lower. No phase offsets: every breath
 * is sin(ωt), 0 at t = 0, so the paused still and the t = 0 frame equal today's (review F1, F2); the hashed
 * periods desynchronise the stars within a few seconds.
 */
export const HALO_BREATH = {
  opacity: 0.14,
  scale: 0.05,
  periodMin: 4.5,
  periodMax: 9,
  moonOpacity: 0.08,
  moonPeriod: 13,
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** A star's own breath period in seconds, from its index in the halo list. */
export function haloPeriod(index: number): number {
  return HALO_BREATH.periodMin + (HALO_BREATH.periodMax - HALO_BREATH.periodMin) * hash(index)
}
