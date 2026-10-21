import type { AliveTuning } from './skyAlive.ts'
import type { AliveInjection } from './aliveMaterial.ts'

/**
 * Make-it-alive A, second pass (tasks/2026-10-13-alive-a2-plan.md, A4): a flame-like flicker up the cypress.
 *
 * Nothing here changes a stroke, a pigment or the tree. Each fragment of the stroke ribbons (and, fainter, the
 * underpaint solid) takes a brightness factor
 *
 *     L = 1 + knob · depth · w · env(t) · Σᵢ Aᵢ sin(ωᵢ t − kᵢ h)
 *
 * a two-mode wave travelling UP the tree's derived height axis `h` (0 base, 1 tip), weighted per vertex by `w`,
 * which the painting's cypress sets: the tongues (the stroke's lateral position across its lobe) and the tips
 * (the vertex's height within its own lobe) carry it, the core keeps a floor. `env` is 0 at t = 0 exactly and
 * rises over τ, so the t = 0 frame and the paused still are today's and the wave fades in; |Σ Aᵢ sin| ≤ 1, so
 * with the depth the factor at the knob's maximum stays inside [0.4, 1.6]. The time-mean of the wave is 0, so
 * the tree's average brightness is today's. "Up" is a reading of a flame, declared and tunable, as "left to
 * right" was for the sky's gust (first pass, F13).
 *
 * The constants reach the shader as uniforms (`flickerUniformValues`), so the TS twin below and the GLSL share
 * one table (review F17). Plain `.ts` imports only: `scripts/sky-alive.test.ts` runs this under node.
 */
export const CYPRESS_FLICKER = {
  /** seconds; a flame's lick is seconds, not the sky's tens of seconds; incommensurate so it never repeats */
  periods: [1.9, 3.1],
  /** sum 1, so the wave spans ±1 */
  amplitudes: [0.6, 0.4],
  /** cycles of each mode over the tree's height: a bright lick is a few tenths of the tree tall */
  cycles: [1.3, 0.8],
  /** seconds for the envelope to rise: the flame comes alive rather than starting mid-wave */
  tau: 1.5,
  /** the factor's swing at the knob's maximum and full weight: ±60%, so no stroke blacks out or doubles */
  depth: 0.6,
  /** every vertex breathes at least this much of the wave (the dark core) */
  floor: 0.12,
  /** tip weight: smoothstep over the vertex's height within its OWN lobe (so a frond's tip lights like the main flame's) */
  tip: [0.55, 0.9],
  /**
   * tongue weight: smoothstep over the ribbon's mean |lateral| across its lobe. E1's draped ribbons measure 25%
   * 0.32 / 50% 0.51 / 75% 0.72 / 95% 0.93 (2026-10-21, 1,396 front ribbons), so this reads 0.5 at the 75th and 1
   * at the 95th: the outer quarter of ribbons carry the tongues. (The 48 sinuous strokes before E1 measured
   * 0.21 / 0.43 / 0.58 / 0.83 and the band was 0.4–0.75.)
   */
  lick: [0.72, 0.93],
  /** back strokes take this share of the tongue weight: the far side, a flame's near tongues read first */
  backLick: 0.5,
  /** the underpaint solid takes this share of the knob: the body follows faintly, so the strokes are not a decal */
  solidShare: 0.5,
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * A vertex's flicker weight: floor + (1 − floor) · max(tip, lick). `hLobe` is the vertex's height within its lobe's
 * own range (0..1), `lateralAbs` the stroke's mean |lateral| (0 for the solid), `back` halves the tongue term.
 */
export function flickerWeight(hLobe: number, lateralAbs: number, back = false): number {
  const tip = smoothstep(CYPRESS_FLICKER.tip[0], CYPRESS_FLICKER.tip[1], hLobe)
  const lick = smoothstep(CYPRESS_FLICKER.lick[0], CYPRESS_FLICKER.lick[1], lateralAbs) * (back ? CYPRESS_FLICKER.backLick : 1)
  return CYPRESS_FLICKER.floor + (1 - CYPRESS_FLICKER.floor) * Math.max(tip, lick)
}

/** A height's position within a lobe's range, clamped to 0..1. */
export function lobeHeight(h: number, start: number, end: number): number {
  return end > start ? Math.min(1, Math.max(0, (h - start) / (end - start))) : 0
}

const omega = (period: number) => (2 * Math.PI) / period
const wavenumber = (cycles: number) => 2 * Math.PI * cycles

/** TS twin of the shader's envelope: a branch, exactly 0 at t = 0, 1 − e^(−t/τ) after. */
export function flickerEnv(t: number, tau = CYPRESS_FLICKER.tau): number {
  return t > 0 ? 1 - Math.exp(-t / tau) : 0
}

/** TS twin of the shader's wave at height h and time t: env(t) · Σ Aᵢ sin(ωᵢ t − kᵢ h). */
export function flickerF(
  h: number,
  t: number,
  amplitudes = CYPRESS_FLICKER.amplitudes,
  periods = CYPRESS_FLICKER.periods,
  cycles = CYPRESS_FLICKER.cycles,
  tau = CYPRESS_FLICKER.tau,
): number {
  let s = 0
  for (let i = 0; i < amplitudes.length; i++) s += amplitudes[i] * Math.sin(omega(periods[i]) * t - wavenumber(cycles[i]) * h)
  return flickerEnv(t, tau) * s
}

/** The brightness factor at a knob, a weight, a height and a time. */
export function flickerFactor(knob: number, w: number, h: number, t: number): number {
  return 1 + knob * CYPRESS_FLICKER.depth * w * flickerF(h, t)
}

/** The finite-window bound on the wave's mean over T seconds: Σ(Aᵢ Pᵢ) / (π T) (the sky's `meanTempoBound`). */
export function flickerMeanBound(seconds: number, amplitudes = CYPRESS_FLICKER.amplitudes, periods = CYPRESS_FLICKER.periods): number {
  let s = 0
  for (let i = 0; i < amplitudes.length; i++) s += amplitudes[i] * periods[i]
  return s / (Math.PI * seconds)
}

/** The uniforms' values at a tuning; `strength` is the knob × depth (× the solid's share for the body). */
export function flickerUniformValues(tuning: Pick<AliveTuning, 'flicker'>, solid = false) {
  return {
    omega: CYPRESS_FLICKER.periods.map(omega) as [number, number],
    k: CYPRESS_FLICKER.cycles.map(wavenumber) as [number, number],
    amplitudes: [...CYPRESS_FLICKER.amplitudes] as [number, number],
    tau: CYPRESS_FLICKER.tau,
    strength: tuning.flicker * CYPRESS_FLICKER.depth * (solid ? CYPRESS_FLICKER.solidShare : 1),
  }
}

/**
 * The flicker's [w, h] per kept sample of a draped ribbon (E1): the ribbon's mean |lateral| over its kept samples
 * is the tongue term, each sample's height within its lobe's range the tip term.
 */
export function ribbonFlicker(kept: readonly { h: number; lateral: number }[], range: readonly [number, number], back: boolean): [number, number][] {
  const lateral = kept.length ? kept.reduce((sum, sample) => sum + sample.lateral, 0) / kept.length : 0
  return kept.map((sample) => [flickerWeight(lobeHeight(sample.h, range[0], range[1]), lateral, back), sample.h])
}

/** Append one vertex's [w, h] pair to the attribute array. */
export function pushFlicker(out: number[], w: number, h: number): void {
  out.push(w, h)
}

/**
 * The GLSL, per fragment (review F1: a vertex-evaluated factor through an interpolated varying is not exactly 1 at
 * t = 0; per fragment, `env` is exactly 0 there and `L = 1 + x · 0 = 1` whatever the interpolation of w and h).
 * `aFlicker` = [w, h]; plain varyings, since both vary smoothly along a stroke and the lift is meant to.
 */
export const flickerGlsl: Omit<AliveInjection, 'key' | 'uniforms'> = {
  vertexHead: /* glsl */ `
  attribute vec2 aFlicker;
  varying vec2 vFlicker;`,
  vertexBody: /* glsl */ `
  vFlicker = aFlicker;`,
  fragmentHead: /* glsl */ `
  varying vec2 vFlicker;
  uniform float uTime;
  uniform float uFlicker;
  uniform vec2 uFlickerOmega;
  uniform vec2 uFlickerK;
  uniform vec2 uFlickerAmp;
  uniform float uFlickerTau;
  float flickerF(float h, float t) {
    // a uniform branch: exactly 0 at t = 0, no reliance on sin(-x) == -sin(x) or exp(0) == 1 (review F3)
    float env = t > 0.0 ? 1.0 - exp(-t / uFlickerTau) : 0.0;
    vec2 s = uFlickerAmp * sin(uFlickerOmega * t - uFlickerK * h);
    return env * (s.x + s.y);
  }`,
  fragmentBody: /* glsl */ `
  diffuseColor.rgb *= 1.0 + uFlicker * vFlicker.x * flickerF(vFlicker.y, uTime);`,
}
