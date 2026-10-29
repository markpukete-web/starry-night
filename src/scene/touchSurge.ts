import { GUST, gustTime } from './skyAlive.ts'
import { SPAN_H, SPAN_V } from './skyMapping.ts'
import type { SourceRibbonVertex } from './streamlineGeometry.ts'

/**
 * B — touch (tasks/2026-10-13-touch-b-plan.md): a pointer or a finger sends a surge of light along the ribbons
 * near its point; a tap also kicks the tempo there, which rushes, lingers and settles; a tapped star flares.
 *
 * Nothing here changes a path, a colour or the flow field. Two lists reach the shader.
 *
 * The LIFT, per vertex, per live surge k (painting point uvₖ, start t0ₖ, amplitude ampₖ, an optional forced end),
 * in angular-isotropic painting units (v scaled by the sky's aspect):
 *
 *     d      = uv − uvₖ
 *     along  = dot(d, tangent)            signed, downstream positive (the ribbon's own direction)
 *     across = |d − along · tangent|
 *     E      = amp · rise(age) · e^(−age/τ) · W(age) · Wend(t)
 *     S      = e^(−((along − speed·age)/σs)²) · e^(−(across/σa)²)    a pulse running down the ribbon
 *     B      = e^(−(along/σb∥)²) · e^(−(across/σb⊥)²)                 the bloom at the finger, along the stroke
 *     lift   = Σ E · (S + B/2), weighted by the ribbon's gust weight in the shader, clamped at maxLift
 *
 * The KICK, one value per ribbon from its centreline segment (so it can ride the `flat` warped clock without
 * laddering, review F2), per live kick k:
 *
 *     Bseg   = e^(−(dist(uvₖ, segment)/σk)²)
 *     g(age) = (1 − e^(−age/τr)) · e^(−age/τk) · W(age)      rises, lingers, settles to EXACTLY zero
 *     warp   = Σ amp · kick · Bseg · g(age)                   seconds added to the warped clock
 *
 * `W(age) = 1 − smoothstep(windowStart, windowEnd, age)` closes every term at `windowEnd`, and an entry is pruned
 * only once its age has passed it, so nothing ever leaves a list with a value in it and the clock never steps
 * backwards (review F1). A kick is never evicted while live (a fifth tap lifts without kicking); a lift surge can
 * be, with a short fade (`Wend`), which is a brightness fade and harmless. With no live entry both terms are
 * absent, so the touch route with no input is the alive route exactly.
 *
 * The light runs DOWNSTREAM along the stroke the way the great wave runs: the painting's own stroke energy,
 * briefly brighter, not a ring on top; the bloom's shape along the stroke is a reading, declared here. The
 * constants reach the shader as uniforms (`surgeUniformValues`), so the twin below and the GLSL share one table.
 * Plain `.ts` imports only: `scripts/touch-surge.test.ts` runs this under node.
 */
export const TOUCH_SURGE = {
  /** canvas widths per second the pulse runs along a ribbon */
  speed: 0.25,
  /** seconds; the lift's decay */
  tau: 1.6,
  /** seconds; the lift's rise, so a surge never pops in (review F3) */
  rise: 0.08,
  /** the pulse's length along the ribbon and its reach across, canvas widths */
  sigmaS: 0.06,
  sigmaA: 0.025,
  /** the bloom's reach along and across the stroke (review F13) */
  bloomAlong: 0.08,
  bloomAcross: 0.04,
  /** the summed lift's ceiling: A's own (review F3) */
  maxLift: 0.5,
  /** live lift surges; beyond this the oldest fades out over `fadeOut` seconds. Fading ones keep their slot until
   *  their end, and a push is refused once all `surgeSlots` are taken (never a drop with a value in it) */
  maxSurges: 12,
  surgeSlots: 16,
  fadeOut: 0.25,
  /** the kick: seconds of clock a full-amplitude tap adds where it lands, its rise and decay, its reach */
  kick: 0.4,
  kickRise: 0.4,
  kickDecay: 3,
  kickSigma: 0.05,
  /**
   * Every falloff is cut to EXACTLY zero beyond this many sigmas (e^(−9) = 1.2e-4 of the peak, invisible): a
   * Gaussian never reaches zero, and a touch would otherwise move every ribbon in the sky by amounts below
   * sight, which no isolation gate can tell from a defect. Finite support makes the untouched sky byte-identical.
   */
  support: 3,
  /** live kicks the shader takes; a tap beyond it lifts without kicking, never evicting a live one (review F1) */
  maxKicks: 4,
  /** every term closes between these ages and is pruned after the second */
  windowStart: 7,
  windowEnd: 10,
  /** a hover's amplitude (a click or tap sends 1), and how far and how long between two hover surges */
  hoverAmp: 0.5,
  hoverMs: 60,
  hoverU: 0.02,
  /** a tap: pointerdown to pointerup within this time and distance; longer or further is a drag */
  tapMs: 300,
  tapPx: 8,
  /** a tap this close (isotropic painting units) to a star, or the moon, flares it */
  starRadius: 0.04,
  moonRadius: 0.06,
  /** the flare: a quick rise and a slow fall on the halo's colour and scale (opacity clips, review F8) */
  flareColor: 1.2,
  flareScale: 0.5,
  flareRise: 0.12,
  flareFall: 1.4,
  maxFlares: 4,
  flarePrune: 5,
}

/** v's scale against u so distances on the dome are angular-isotropic: (SPAN_V·1.06)/(SPAN_H·1.16). */
export const SKY_ASPECT = (SPAN_V * 1.06) / (SPAN_H * 1.16)

/** A far-off end for a lift surge that has not been evicted. */
export const NO_END = 1e9

export type Surge = { u: number; v: number; t0: number; amp: number; end: number }
export type Kick = { u: number; v: number; t0: number; amp: number }
export type Flare = { index: number; t0: number }
export type TouchStore = { surges: Surge[]; kicks: Kick[]; flares: Flare[]; last: { u: number; v: number } | null }

export function emptyTouchStore(): TouchStore {
  return { surges: [], kicks: [], flares: [], last: null }
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** The closing window on every term: 1 until windowStart, exactly 0 at windowEnd and after. */
export function closingWindow(age: number, T = TOUCH_SURGE): number {
  return 1 - smoothstep(T.windowStart, T.windowEnd, age)
}

/**
 * The forced fade of an evicted lift surge: 1 until `end − fadeOut`, exactly 0 at `end` and after. Written on the
 * time left, so its edges are 0 and fadeOut: at NO_END the shader's float32 `end − fadeOut` rounds to `end`, and
 * GLSL leaves smoothstep undefined when its edges meet (Codex, PR #10 P2).
 */
export function endWindow(t: number, end: number, T = TOUCH_SURGE): number {
  return smoothstep(0, T.fadeOut, end - t)
}

/** TS twin of the shader's lift at a vertex from one surge (uv in painting units, tangent unit in isotropic units). */
export function surgeTerms(uv: readonly [number, number], tangent: readonly [number, number], surge: Surge, t: number, T = TOUCH_SURGE): number {
  const age = t - surge.t0
  if (age <= 0) return 0
  const dx = uv[0] - surge.u
  const dy = (uv[1] - surge.v) * SKY_ASPECT
  const along = dx * tangent[0] + dy * tangent[1]
  const px = dx - along * tangent[0]
  const py = dy - along * tangent[1]
  const across = Math.hypot(px, py)
  const sa = (along - T.speed * age) / T.sigmaS
  const sb = across / T.sigmaA
  const ba = along / T.bloomAlong
  const bb = across / T.bloomAcross
  const cut = T.support * T.support
  const S = sa * sa + sb * sb > cut ? 0 : Math.exp(-(sa * sa)) * Math.exp(-(sb * sb))
  const B = ba * ba + bb * bb > cut ? 0 : Math.exp(-(ba * ba)) * Math.exp(-(bb * bb))
  if (S === 0 && B === 0) return 0
  const E = surge.amp * (1 - Math.exp(-age / T.rise)) * Math.exp(-age / T.tau) * closingWindow(age, T) * endWindow(t, surge.end, T)
  return E * (S + 0.5 * B)
}

/** The summed, weighted and clamped lift of every live surge at a vertex. */
export function liftSum(uv: readonly [number, number], tangent: readonly [number, number], surges: readonly Surge[], t: number, weight = 1, T = TOUCH_SURGE): number {
  let lift = 0
  for (const surge of surges) lift += surgeTerms(uv, tangent, surge, t, T)
  return Math.min(T.maxLift, weight * lift)
}

/** The kick's shape: 0 at age 0, a rise over τr, a decay over τk, closed to exactly 0 by windowEnd. */
export function kickShape(age: number, T = TOUCH_SURGE): number {
  if (age <= 0) return 0
  return (1 - Math.exp(-age / T.kickRise)) * Math.exp(-age / T.kickDecay) * closingWindow(age, T)
}

/** Distance from a point to a segment, all in isotropic units (v already scaled). */
export function segmentDistance(p: readonly [number, number], a: readonly [number, number], b: readonly [number, number]): number {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const apx = p[0] - a[0]
  const apy = p[1] - a[1]
  const len2 = abx * abx + aby * aby
  const h = len2 > 1e-12 ? Math.min(1, Math.max(0, (apx * abx + apy * aby) / len2)) : 0
  return Math.hypot(apx - abx * h, apy - aby * h)
}

/** TS twin of the shader's warp at a ribbon (centreline segment in painting units) from one kick. */
export function kickTerms(segment: readonly [number, number, number, number], kick: Kick, t: number, T = TOUCH_SURGE): number {
  const age = t - kick.t0
  if (age <= 0) return 0
  const p: [number, number] = [kick.u, kick.v * SKY_ASPECT]
  const a: [number, number] = [segment[0], segment[1] * SKY_ASPECT]
  const b: [number, number] = [segment[2], segment[3] * SKY_ASPECT]
  const dist = segmentDistance(p, a, b) / T.kickSigma
  if (dist > T.support) return 0
  const Bseg = Math.exp(-(dist * dist))
  return kick.amp * T.kick * Bseg * kickShape(age, T)
}

/** The summed warp of every live kick at a ribbon. */
export function warpSum(segment: readonly [number, number, number, number], kicks: readonly Kick[], t: number, T = TOUCH_SURGE): number {
  let warp = 0
  for (const kick of kicks) warp += kickTerms(segment, kick, t, T)
  return warp
}

/**
 * TS twin of the shader's kicked clock at a ribbon: the kicks' warp goes into A's gust clock's argument, not on top
 * of it. Added on top, a settling kick (−0.0665 s/s per tap at its steepest) outran the gust's deepest lull (tempo
 * 1 − 0.95 at the shipped knob) and the strokes ran backwards (Codex, PR #10 P2). Composed, the tempo is
 * G′(t + K) · (1 + K′): G′ > 0 while the gust's sum stays under 1, and 1 + K′ > 0.5 with four taps at the
 * knob's maximum (T22b), so the clock never runs backwards at any knob.
 */
export function kickedGustTime(
  t: number,
  weight: number,
  lag: number,
  segment: readonly [number, number, number, number],
  kicks: readonly Kick[],
  amplitudes = GUST.amplitudes,
): number {
  return gustTime(t + warpSum(segment, kicks, t), weight, lag, amplitudes)
}

/** Drop lift surges past their window or their forced end. */
export function pruneSurges(surges: Surge[], now: number, T = TOUCH_SURGE): Surge[] {
  return surges.filter((s) => now - s.t0 < T.windowEnd && now < s.end)
}

/**
 * Push a lift surge. When `maxSurges` are live the oldest live one gets a forced end `fadeOut` out (a brightness
 * fade, never a jump); a fading entry keeps its slot until its end; when every slot is taken the push is refused
 * (a dropped hover surge is harmless, a dropped value is not).
 */
export function pushSurge(surges: Surge[], surge: Omit<Surge, 'end'>, now: number, T = TOUCH_SURGE): Surge[] {
  const live = pruneSurges(surges, now, T)
  if (live.length >= T.surgeSlots) return live
  const steady = live.filter((s) => s.end === NO_END)
  if (steady.length >= T.maxSurges) {
    const oldest = steady.reduce((a, b) => (a.t0 <= b.t0 ? a : b))
    oldest.end = now + T.fadeOut
  }
  live.push({ ...surge, end: NO_END })
  return live
}

/** Drop kicks past their window (they are exactly 0 there). */
export function pruneKicks(kicks: Kick[], now: number, T = TOUCH_SURGE): Kick[] {
  return kicks.filter((k) => now - k.t0 < T.windowEnd)
}

/** Push a kick unless the list is full of live ones: a live kick is never evicted (review F1). */
export function pushKick(kicks: Kick[], kick: Kick, now: number, T = TOUCH_SURGE): { kicks: Kick[]; accepted: boolean } {
  const live = pruneKicks(kicks, now, T)
  if (live.length >= T.maxKicks) return { kicks: live, accepted: false }
  live.push(kick)
  return { kicks: live, accepted: true }
}

export function pruneFlares(flares: Flare[], now: number, T = TOUCH_SURGE): Flare[] {
  return flares.filter((f) => now - f.t0 < T.flarePrune)
}

export function pushFlare(flares: Flare[], flare: Flare, now: number, T = TOUCH_SURGE): Flare[] {
  const live = pruneFlares(flares, now, T)
  live.push(flare)
  while (live.length > T.maxFlares) live.shift()
  return live
}

export type PointerSample = { x: number; y: number; ms: number }

/** A tap is a down and an up within the time and the distance; anything else is a drag (the orbit's). */
export function classifyGesture(down: PointerSample, up: PointerSample, T = TOUCH_SURGE): 'tap' | 'drag' {
  const quick = up.ms - down.ms <= T.tapMs
  const still = Math.hypot(up.x - down.x, up.y - down.y) <= T.tapPx
  return quick && still ? 'tap' : 'drag'
}

/** A press strayed: some sample of a move is further than `tapPx` from the press (a move may carry several, coalesced). */
export function strayed(down: PointerSample, samples: readonly { x: number; y: number }[], T = TOUCH_SURGE): boolean {
  return samples.some((p) => Math.hypot(p.x - down.x, p.y - down.y) > T.tapPx)
}

export type HoverMark = { ms: number; u: number; v: number }

/** Whether a hover surge is due: far enough from the last one and long enough after it. */
export function hoverDue(last: HoverMark | null, now: HoverMark, T = TOUCH_SURGE): boolean {
  if (last === null) return true
  const far = Math.hypot(now.u - last.u, (now.v - last.v) * SKY_ASPECT) >= T.hoverU
  return far && now.ms - last.ms >= T.hoverMs
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

/**
 * The two per-vertex attributes the shaders take with the flag on, from the builder's vertices (side pairs,
 * contiguous per ribbon, a ribbon identified by its (phase, rate) pair as `ribbonGusts` does):
 * `aTouch` = [u, v, tx, ty] the pair's mean point and the ribbon's unit tangent there in the isotropic metric;
 * `aSeg` = [u0, v0, u1, v1] the ribbon's first and last pair means, one value per ribbon.
 */
export function ribbonTouch(vertices: readonly SourceRibbonVertex[]): { aTouch: Float32Array; aSeg: Float32Array } {
  const aTouch = new Float32Array(vertices.length * 4)
  const aSeg = new Float32Array(vertices.length * 4)
  let start = 0
  while (start < vertices.length) {
    const { phase, rate } = vertices[start]
    let end = start
    while (end < vertices.length && vertices[end].phase === phase && vertices[end].rate === rate) end++
    // the pair means along this ribbon (a ribbon has an even count; a stray odd vertex is its own point)
    const means: [number, number][] = []
    for (let i = start; i < end; i += 2) {
      const a = vertices[i]
      const b = i + 1 < end ? vertices[i + 1] : a
      means.push([(a.u + b.u) / 2, (a.v + b.v) / 2])
    }
    const n = means.length
    for (let p = 0; p < n; p++) {
      const before = means[Math.max(0, p - 1)]
      const after = means[Math.min(n - 1, p + 1)]
      let tx = after[0] - before[0]
      let ty = (after[1] - before[1]) * SKY_ASPECT
      const mag = Math.hypot(tx, ty) || 1e-9
      tx /= mag
      ty /= mag
      for (let side = 0; side < 2; side++) {
        const i = start + p * 2 + side
        if (i >= end) break
        aTouch.set([means[p][0], means[p][1], tx, ty], i * 4)
        aSeg.set([means[0][0], means[0][1], means[n - 1][0], means[n - 1][1]], i * 4)
      }
    }
    start = end
  }
  return { aTouch, aSeg }
}

/** The constant uniforms' values. */
export function surgeUniformValues(T = TOUCH_SURGE) {
  return {
    speed: T.speed,
    tau: T.tau,
    rise: T.rise,
    sigmaS: T.sigmaS,
    sigmaA: T.sigmaA,
    bloomAlong: T.bloomAlong,
    bloomAcross: T.bloomAcross,
    maxLift: T.maxLift,
    fadeOut: T.fadeOut,
    kick: T.kick,
    kickRise: T.kickRise,
    kickDecay: T.kickDecay,
    kickSigma: T.kickSigma,
    support: T.support,
    windowStart: T.windowStart,
    windowEnd: T.windowEnd,
    aspect: SKY_ASPECT,
  }
}

/**
 * The GLSL shared by both ribbon VERTEX shaders under the TOUCH define. `touchLift` sums the lift surges at a
 * vertex (unweighted, unclamped: the caller weights by the ribbon's gust weight and clamps); `touchKick` sums the
 * kicks at a ribbon's centreline segment. Both run only under a count guard, so with no input neither executes.
 */
export const touchGlsl = /* glsl */ `
  uniform int uSurgeCount;
  uniform vec4 uSurge[16];
  uniform float uSurgeEnd[16];
  uniform int uKickCount;
  uniform vec4 uKick[4];
  uniform float uTouchSpeed;
  uniform float uTouchTau;
  uniform float uTouchRise;
  uniform float uTouchSigmaS;
  uniform float uTouchSigmaA;
  uniform float uTouchBloomAlong;
  uniform float uTouchBloomAcross;
  uniform float uTouchMaxLift;
  uniform float uTouchFadeOut;
  uniform float uTouchKick;
  uniform float uTouchKickRise;
  uniform float uTouchKickDecay;
  uniform float uTouchKickSigma;
  uniform float uTouchSupport;
  uniform float uTouchWindowStart;
  uniform float uTouchWindowEnd;
  uniform float uTouchAspect;
  float touchWindow(float age) {
    return 1.0 - smoothstep(uTouchWindowStart, uTouchWindowEnd, age);
  }
  // touch.xy is the vertex's painting point, touch.zw the ribbon's unit tangent there (isotropic units)
  float touchLift(vec4 touch, float t) {
    float lift = 0.0;
    for (int k = 0; k < 16; k++) {
      if (k >= uSurgeCount) break;
      vec4 s = uSurge[k];
      float age = t - s.z;
      if (age <= 0.0) continue;
      vec2 d = touch.xy - s.xy;
      d.y *= uTouchAspect;
      float along = dot(d, touch.zw);
      vec2 perp = d - along * touch.zw;
      float across = length(perp);
      float sa = (along - uTouchSpeed * age) / uTouchSigmaS;
      float sb = across / uTouchSigmaA;
      float ba = along / uTouchBloomAlong;
      float bb = across / uTouchBloomAcross;
      float cut = uTouchSupport * uTouchSupport;
      // finite support: exactly 0 beyond the cutoff, so an untouched ribbon is untouched in bytes
      float S = sa * sa + sb * sb > cut ? 0.0 : exp(-sa * sa) * exp(-sb * sb);
      float B = ba * ba + bb * bb > cut ? 0.0 : exp(-ba * ba) * exp(-bb * bb);
      if (S == 0.0 && B == 0.0) continue;
      float E = s.w * (1.0 - exp(-age / uTouchRise)) * exp(-age / uTouchTau) * touchWindow(age)
        * smoothstep(0.0, uTouchFadeOut, uSurgeEnd[k] - t);
      lift += E * (S + 0.5 * B);
    }
    return lift;
  }
  float touchSegDist(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-12), 0.0, 1.0);
    return length(p - a - ab * h);
  }
  // seg.xy and seg.zw are the ribbon's centreline start and end in painting units
  float touchKick(vec4 seg, float t) {
    float warp = 0.0;
    vec2 a = vec2(seg.x, seg.y * uTouchAspect);
    vec2 b = vec2(seg.z, seg.w * uTouchAspect);
    for (int k = 0; k < 4; k++) {
      if (k >= uKickCount) break;
      vec4 s = uKick[k];
      float age = t - s.z;
      if (age <= 0.0) continue;
      float dist = touchSegDist(vec2(s.x, s.y * uTouchAspect), a, b) / uTouchKickSigma;
      if (dist > uTouchSupport) continue;
      float Bseg = exp(-dist * dist);
      float g = (1.0 - exp(-age / uTouchKickRise)) * exp(-age / uTouchKickDecay) * touchWindow(age);
      warp += s.w * uTouchKick * Bseg * g;
    }
    return warp;
  }
`
