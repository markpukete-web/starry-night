import { SPAN_H, SPAN_V } from './skyMapping.ts'

/**
 * B — touch (tasks/2026-10-13-touch-b-plan.md): a pointer or a finger sends a surge of light along the ribbons
 * near its point; the strokes there rush and settle; a tapped star flares.
 *
 * Nothing here changes a path, a colour or the flow field. Each surge k (painting point uvₖ, start t0ₖ,
 * amplitude ampₖ) gives every ribbon vertex, with age = t − t0ₖ ≥ 0, in angular-isotropic painting units:
 *
 *     d      = uv − uvₖ  (v scaled by the sky's aspect)
 *     along  = dot(d, tangent)           signed, downstream positive (the ribbon's own direction)
 *     across = |d − along · tangent|
 *     E      = amp · e^(−age/τ)
 *     S      = e^(−((along − speed·age)/σs)²) · e^(−(across/σa)²)    a pulse running down the ribbon
 *     B      = e^(−|d|²/σ0²)                                        the bloom where the finger is
 *     lift   = E · (S + B/2)                 brightness, summed over surges, clamped at maxLift
 *     warp   = amp · kick · B · (1 − e^(−age/τ))   a local tempo kick added to the warped clock
 *
 * The lift is sent DOWNSTREAM along the stroke the way the great wave runs: the light is the painting's own
 * stroke energy, briefly brighter, not a ring on top. The kick's derivative is amp·kick·B·e^(−age/τ)/τ ≥ 0, so
 * the warped clock stays monotone and the moving sky's stroke slots never pop. With no surge both terms are
 * absent, so the touch route with no input is the alive route exactly.
 *
 * The constants reach the shader as uniforms (`surgeUniformValues`), so the twin below and the GLSL share one
 * table. Plain `.ts` imports only: `scripts/touch-surge.test.ts` runs this under node.
 */
export const TOUCH_SURGE = {
  /** canvas widths per second the pulse runs along a ribbon */
  speed: 0.25,
  /** seconds; the envelope's decay */
  tau: 1.6,
  /** the pulse's length along the ribbon, canvas widths */
  sigmaS: 0.06,
  /** the pulse's reach across the ribbon */
  sigmaA: 0.025,
  /** the bloom's radius at the finger */
  sigma0: 0.08,
  /** seconds of extra clock a full-amplitude surge adds where it lands */
  kick: 1.5,
  /** the summed lift's ceiling */
  maxLift: 1.5,
  /** live surges the shader takes; the oldest is replaced beyond this */
  maxSurges: 8,
  /** a hover's amplitude (a click or tap sends 1) and its throttle in milliseconds */
  hoverAmp: 0.5,
  hoverMs: 60,
  /** a tap: pointerdown to pointerup within this time and distance; longer or further is a drag */
  tapMs: 300,
  tapPx: 8,
  /** a tap this close (painting units) to a star, or the moon, flares it */
  starRadius: 0.04,
  moonRadius: 0.06,
  /** the flare: a quick rise and a slow fall on the halo's opacity and scale */
  flareOpacity: 1.2,
  flareScale: 0.5,
  flareRise: 0.12,
  flareFall: 1.4,
  maxFlares: 4,
  /** seconds after which a surge or flare is pruned (five τ) */
  prune: 8,
}

/** v's scale against u so distances on the dome are angular-isotropic: (SPAN_V·1.06)/(SPAN_H·1.16). */
export const SKY_ASPECT = (SPAN_V * 1.06) / (SPAN_H * 1.16)

export type Surge = { u: number; v: number; t0: number; amp: number }
export type Flare = { index: number; t0: number }

/** TS twin of the shader's per-surge terms at a vertex (uv in painting units, tangent unit in isotropic units). */
export function surgeTerms(
  uv: readonly [number, number],
  tangent: readonly [number, number],
  surge: Surge,
  t: number,
  T = TOUCH_SURGE,
): { lift: number; warp: number } {
  const age = t - surge.t0
  if (age < 0) return { lift: 0, warp: 0 }
  const dx = uv[0] - surge.u
  const dy = (uv[1] - surge.v) * SKY_ASPECT
  const along = dx * tangent[0] + dy * tangent[1]
  const px = dx - along * tangent[0]
  const py = dy - along * tangent[1]
  const across = Math.hypot(px, py)
  const E = surge.amp * Math.exp(-age / T.tau)
  const sa = (along - T.speed * age) / T.sigmaS
  const sb = across / T.sigmaA
  const S = Math.exp(-(sa * sa)) * Math.exp(-(sb * sb))
  const B = Math.exp(-(dx * dx + dy * dy) / (T.sigma0 * T.sigma0))
  return { lift: E * (S + 0.5 * B), warp: surge.amp * T.kick * B * (1 - Math.exp(-age / T.tau)) }
}

/** The summed terms of every live surge at a vertex, the lift clamped. */
export function surgeSum(
  uv: readonly [number, number],
  tangent: readonly [number, number],
  surges: readonly Surge[],
  t: number,
  T = TOUCH_SURGE,
): { lift: number; warp: number } {
  let lift = 0
  let warp = 0
  for (const surge of surges) {
    const terms = surgeTerms(uv, tangent, surge, t, T)
    lift += terms.lift
    warp += terms.warp
  }
  return { lift: Math.min(T.maxLift, lift), warp }
}

/** Push a surge, replacing the oldest beyond the cap, and drop those older than the prune age. */
export function pushSurge(surges: Surge[], surge: Surge, now: number, T = TOUCH_SURGE): Surge[] {
  const live = surges.filter((s) => now - s.t0 < T.prune)
  live.push(surge)
  while (live.length > T.maxSurges) live.shift()
  return live
}

export type PointerSample = { x: number; y: number; ms: number }

/** A tap is a down and an up within the time and the distance; anything else is a drag (the orbit's). */
export function classifyGesture(down: PointerSample, up: PointerSample, T = TOUCH_SURGE): 'tap' | 'drag' {
  const quick = up.ms - down.ms <= T.tapMs
  const still = Math.hypot(up.x - down.x, up.y - down.y) <= T.tapPx
  return quick && still ? 'tap' : 'drag'
}

/** Whether a hover surge is due: at most one per `hoverMs`. */
export function hoverDue(lastMs: number | null, nowMs: number, T = TOUCH_SURGE): boolean {
  return lastMs === null || nowMs - lastMs >= T.hoverMs
}

export type StarPoint = { u: number; v: number; radius: number }

/** The index of the nearest star within its radius (isotropic units), or −1. */
export function nearestStar(u: number, v: number, stars: readonly StarPoint[]): number {
  let best = -1
  let bestDistance = Infinity
  stars.forEach((star, index) => {
    const distance = Math.hypot(u - star.u, (v - star.v) * SKY_ASPECT)
    if (distance <= star.radius && distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

/** The flare's shape at an age: a quick rise and a slow fall, 0 at age 0 and for age < 0. */
export function flareShape(age: number, T = TOUCH_SURGE): number {
  if (age <= 0) return 0
  return (1 - Math.exp(-age / T.flareRise)) * Math.exp(-age / T.flareFall)
}

/** The uniforms' values at a `surge` knob (a multiplier on every amplitude is applied where surges are pushed). */
export function surgeUniformValues(T = TOUCH_SURGE) {
  return {
    speed: T.speed,
    tau: T.tau,
    sigmaS: T.sigmaS,
    sigmaA: T.sigmaA,
    sigma0: T.sigma0,
    kick: T.kick,
    maxLift: T.maxLift,
    aspect: SKY_ASPECT,
  }
}

/** The GLSL shared by both ribbon VERTEX shaders under the TOUCH define: the surge terms at a vertex. */
export const touchGlsl = /* glsl */ `
  uniform int uTouchCount;
  uniform vec2 uTouchUV[8];
  uniform float uTouchT0[8];
  uniform float uTouchAmp[8];
  uniform float uTouchSpeed;
  uniform float uTouchTau;
  uniform float uTouchSigmaS;
  uniform float uTouchSigmaA;
  uniform float uTouchSigma0;
  uniform float uTouchKick;
  uniform float uTouchMaxLift;
  uniform float uTouchAspect;
  // touch.xy is the vertex's painting point, touch.zw the ribbon's unit tangent there (isotropic units)
  void touchTerms(vec4 touch, float t, out float lift, out float warp) {
    lift = 0.0;
    warp = 0.0;
    for (int k = 0; k < 8; k++) {
      if (k >= uTouchCount) break;
      float age = t - uTouchT0[k];
      if (age < 0.0) continue;
      vec2 d = touch.xy - uTouchUV[k];
      d.y *= uTouchAspect;
      float along = dot(d, touch.zw);
      vec2 perp = d - along * touch.zw;
      float across = length(perp);
      float E = uTouchAmp[k] * exp(-age / uTouchTau);
      float sa = (along - uTouchSpeed * age) / uTouchSigmaS;
      float sb = across / uTouchSigmaA;
      float S = exp(-sa * sa) * exp(-sb * sb);
      float B = exp(-dot(d, d) / (uTouchSigma0 * uTouchSigma0));
      lift += E * (S + 0.5 * B);
      warp += uTouchAmp[k] * uTouchKick * B * (1.0 - exp(-age / uTouchTau));
    }
    lift = min(lift, uTouchMaxLift);
  }
`
