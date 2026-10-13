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
  /** brightness lift at a full surge, scaled by the ribbon's weight */
  lift: 0.06,
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
    const phase = vertices[start].phase
    let end = start
    let lum = 0
    let u = 0
    let v = 0
    while (end < vertices.length && vertices[end].phase === phase) {
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

/** TS twin of the shader's pulse: the tempo's zero-mean part, normalised to ±1. */
export function gustPulse(t: number, lag: number, amplitudes = GUST.amplitudes, periods = GUST.periods): number {
  let s = 0
  let a = 0
  for (let i = 0; i < 3; i++) {
    s += amplitudes[i] * Math.sin(omega(periods[i]) * (t - lag))
    a += amplitudes[i]
  }
  return s / a
}

/** The uniforms the shaders take for GUST. */
export function gustUniformValues() {
  return {
    omega: GUST.periods.map(omega) as [number, number, number],
    amplitudes: [...GUST.amplitudes] as [number, number, number],
  }
}

/**
 * The GLSL shared by both ribbon fragment shaders. `uAlive` 0 gives gustTime(t) = t + 0·x = t exactly, so the
 * default sky is unchanged by construction (and measured, gate check 2).
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
  // the tempo's zero-mean part in -1..1, for the brightness lift on a surge
  float gustPulse(float t, vec2 gust) {
    vec3 s = uGustAmp * sin(uGustOmega * (t - gust.y));
    return (s.x + s.y + s.z) / (uGustAmp.x + uGustAmp.y + uGustAmp.z);
  }
`

/** A2: each star halo breathes at its own rate; the moon pulses slower and lower. */
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

/** A star's own breath, from its index in the halo list: period in seconds and phase in radians. */
export function haloBreath(index: number): { period: number; phase: number } {
  return {
    period: HALO_BREATH.periodMin + (HALO_BREATH.periodMax - HALO_BREATH.periodMin) * hash(index),
    phase: 2 * Math.PI * hash(index + 7),
  }
}
