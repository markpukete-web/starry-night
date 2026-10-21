import type { AliveInjection } from './aliveMaterial.ts'

/**
 * D1 — touch the land (tasks/2026-10-20-touch-land-d1-plan.md, D1.1, with Codex F1, F5, F7, F10 and the rebase's
 * R1 folded): a land touch is a point on the cypress or a tree in world units, with an amplitude in time. Held, its
 * amplitude ramps over `rise` from the value it had to its target and stays; released, it swings back as a damped
 * cosine from the amplitude it had and closes to exactly zero by `windowEnd` after the release. The push in the
 * shader is the amplitude times two falloffs with finite support around the point, times the vertex's bend weight
 * (0 at the ground or the tree's base, 1 at a crest or the tip): away from the point in the ground plane with a
 * field that vanishes at the point (a smooth vector field, F1), and a dip under the hand with the hat. Amplitudes
 * in the store are normalised (a hover `hoverAmp`, a press or a tap 1); the `bend` knob multiplies once, in the
 * material's `uLandParams.y` (F7). Pure: `scripts/land-touch.test.ts` runs it under node.
 */
export const LAND_TOUCH = {
  /** world units: the push's reach from the touch point in the ground plane; the tree is 2.7 tall and about 0.5 wide */
  radius: 0.55,
  /** world units a full-bend vertex moves at amplitude 1 where the lateral field peaks: about 5% of the tree's height */
  push: 0.14,
  /** the trees' and bushes' push: the domes are 0.13–0.30 tall */
  foliagePush: 0.035,
  /** the share of the push that presses down under the hand: a bent blade dips */
  down: 0.35,
  /** seconds: a held touch's ramp, so nothing pops */
  rise: 0.12,
  /** seconds: the spring-back's decay and its swing's period (a damped cosine) */
  tau: 0.9,
  period: 1.3,
  /** the swing closes to exactly zero between these seconds after the release, and is pruned after the second */
  windowStart: 4,
  windowEnd: 5,
  /** live touches the shaders take; a fifth is refused (never an eviction mid-swing) */
  maxTouches: 4,
  /** a hover's amplitude; a tap's and a held finger's is 1 */
  hoverAmp: 0.6,
  /** a hand on the tree moves the tree and does not surge the sky behind it (B's open item); Mark's choice, 2026-10-21 */
  landMasksSky: true,
}

export const NO_RELEASE = 1e9

/** the lateral field x(1 − x²)² peaks at x = 1/√5; divided by this it peaks at exactly 1 */
const LATERAL_PEAK = (1 / Math.sqrt(5)) * (4 / 5) ** 2

export type LandTouch = {
  x: number
  y: number
  z: number
  /** when the current ramp began: the touch's start, or its last retarget (F5) */
  t0: number
  /** the target amplitude, normalised */
  amp: number
  /** the amplitude at t0, which the ramp starts from (0 for a new touch) */
  from: number
  /** the release time, NO_RELEASE while held */
  release: number
}
export type LandStore = { touches: LandTouch[]; heldIndex: number }

export function emptyLandStore(): LandStore {
  return { touches: [], heldIndex: -1 }
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** 1 − smoothstep over the closing window: exactly 0 from `windowEnd` on. */
export function closing(sinceRelease: number, T = LAND_TOUCH): number {
  return 1 - smoothstep(T.windowStart, T.windowEnd, sinceRelease)
}

/** A touch still counts against admission and the shader's list until its swing has closed (F10). */
export function isLive(touch: LandTouch, now: number, T = LAND_TOUCH): boolean {
  return now < touch.release + T.windowEnd
}

/** The amplitude at time t: the ramp while held; from the release, a damped cosine from the amplitude it had, closed. */
export function landAmplitude(touch: LandTouch, t: number, T = LAND_TOUCH): number {
  const held = touch.from + (touch.amp - touch.from) * smoothstep(0, T.rise, Math.min(t, touch.release) - touch.t0)
  if (t <= touch.release) return held
  const since = t - touch.release
  const close = closing(since, T)
  if (close === 0) return 0
  const omega = (2 * Math.PI) / T.period
  return held * Math.exp(-since / T.tau) * Math.cos(omega * since) * close
}

/** The hat in the ground plane: a quartic, 1 at the point, exactly 0 at and beyond `radius` (finite support). */
export function landFalloff(distance: number, T = LAND_TOUCH): number {
  const x = distance / T.radius
  if (x >= 1) return 0
  const s = 1 - x * x
  return s * s
}

/** The lateral field's magnitude: x(1 − x²)² normalised to peak at 1, zero at the point and beyond `radius`. */
export function landLateral(distance: number, T = LAND_TOUCH): number {
  const x = distance / T.radius
  if (x >= 1) return 0
  return (x * landFalloff(distance, T)) / LATERAL_PEAK
}

/** TS twin of the shader's displacement for one vertex at `p` (local units, the same frame as the touches). */
export function landDisplacement(p: readonly [number, number, number], bend: number, touches: readonly { x: number; y: number; z: number; amp: number }[], push: number, T = LAND_TOUCH): [number, number, number] {
  let dx = 0
  let dy = 0
  let dz = 0
  for (const k of touches) {
    const ax = p[0] - k.x
    const az = p[2] - k.z
    const hat = landFalloff(Math.hypot(ax, az), T)
    if (hat === 0 || k.amp === 0) continue
    const m = k.amp * push * bend
    // the lateral push is m · hat · away / (radius · peak): zero at the point, smooth through it (F1)
    dx += (m * hat * ax) / (T.radius * LATERAL_PEAK)
    dz += (m * hat * az) / (T.radius * LATERAL_PEAK)
    dy -= m * hat * T.down
  }
  return [dx, dy, dz]
}

/** Drop every touch whose swing has closed. The held one is never dropped. */
export function pruneLand(store: LandStore, now: number, T = LAND_TOUCH): LandStore {
  const keep = store.touches.filter((k, i) => i === store.heldIndex || isLive(k, now, T))
  const heldIndex = store.heldIndex >= 0 ? keep.indexOf(store.touches[store.heldIndex]) : -1
  return { touches: keep, heldIndex }
}

/**
 * Release the held touch at `now` (its swing begins from the amplitude it has). A tap (`completeRamp`) lets the
 * ramp finish first, so a short press still bends fully and swings from its target, as the seam's tap does
 * (Codex D1 review F4: a down and an up in one frame left a touch at amplitude zero for ever).
 */
export function releaseHeld(store: LandStore, now: number, completeRamp = false, T = LAND_TOUCH): LandStore {
  if (store.heldIndex < 0) return store
  const touches = store.touches.map((k, i) => (i === store.heldIndex ? { ...k, release: completeRamp ? Math.max(now, k.t0 + T.rise) : now } : k))
  return { touches, heldIndex: -1 }
}

function liveCount(touches: readonly LandTouch[], now: number, T: typeof LAND_TOUCH): number {
  return touches.filter((k) => isLive(k, now, T)).length
}

/** Begin a held touch at a point, releasing any held one; refused when `maxTouches` are live at `now` (F10). */
export function beginHeld(store: LandStore, point: readonly [number, number, number], amp: number, now: number, T = LAND_TOUCH): LandStore {
  const released = releaseHeld(store, now)
  if (liveCount(released.touches, now, T) >= T.maxTouches) return released
  const touch: LandTouch = { x: point[0], y: point[1], z: point[2], t0: now, amp, from: 0, release: NO_RELEASE }
  return { touches: [...released.touches, touch], heldIndex: released.touches.length }
}

/**
 * The held touch follows the pointer: the field moves with the hand and the strokes it leaves stand up again at
 * once, the way grass does behind a hand. A new amplitude (a hover becoming a press) ramps from the amplitude the
 * touch has, never replaces it (F5). With nothing held, a hold begins. The swing comes on the release.
 */
export function followHeld(store: LandStore, point: readonly [number, number, number], amp: number, now: number, T = LAND_TOUCH): LandStore {
  if (store.heldIndex < 0) return beginHeld(store, point, amp, now, T)
  const touches = store.touches.map((k, i) => {
    if (i !== store.heldIndex) return k
    const moved = { ...k, x: point[0], y: point[1], z: point[2] }
    return amp === k.amp ? moved : { ...moved, from: landAmplitude(k, now, T), amp, t0: now }
  })
  return { touches, heldIndex: store.heldIndex }
}

/** A tap: a touch held for `rise`, then released. Releases any held one; refused when `maxTouches` are live. */
export function pushTap(store: LandStore, point: readonly [number, number, number], amp: number, now: number, T = LAND_TOUCH): LandStore {
  const released = releaseHeld(store, now)
  if (liveCount(released.touches, now, T) >= T.maxTouches) return released
  const touch: LandTouch = { x: point[0], y: point[1], z: point[2], t0: now, amp, from: 0, release: now + T.rise }
  return { ...released, touches: [...released.touches, touch] }
}

/**
 * The uniforms' values for one material at time t: `[x, y, z, amp]` per live touch in the material's local frame
 * (`offset` is the mesh's group position), and the count, never more than `maxTouches`. A touch whose amplitude is
 * 0 is left out, so a touch's first frame (t = t0, the ramp at 0) packs nothing: the t0 frame is the no-input frame
 * by construction. The caller writes `entries` into the `Float32Array` uniform (`uLand`), as B's `uSurge` is.
 */
export function landUniformValues(store: LandStore, t: number, offset: readonly [number, number, number] = [0, 0, 0], T = LAND_TOUCH): { entries: number[]; count: number } {
  const entries: number[] = []
  let count = 0
  for (const k of store.touches) {
    if (count === T.maxTouches) break
    const amp = landAmplitude(k, t, T)
    if (amp === 0) continue
    entries.push(k.x - offset[0], k.y - offset[1], k.z - offset[2], amp)
    count++
  }
  return { entries, count }
}

/**
 * The bend injection for one material (its own uniform objects): the touch list, the parameters and the push,
 * injected after `<begin_vertex>` on `transformed`. `weight` is the GLSL expression for the vertex's bend, 0 at
 * the base and 1 at the top: `aBend` on the island's trees (declared when `attribute` names it), the vertex's own
 * local height on the cypress (`clamp(transformed.y / HEIGHT, 0.0, 1.0)`, the same field on the ribbons and the
 * solid by construction, R1). The lateral field and the dip are the TS twin's, term for term.
 */
export function bendInjection({ weight, attribute }: { weight: string; attribute?: string }, T = LAND_TOUCH): Omit<AliveInjection, 'key'> {
  return {
    uniforms: {
      uLandCount: { value: 0 },
      uLand: { value: new Float32Array(4 * T.maxTouches) },
      uLandParams: { value: new Float32Array([T.radius, T.push, T.down]) },
    },
    vertexHead: /* glsl */ `
  ${attribute ? `attribute float ${attribute};` : ''}
  uniform int uLandCount;
  uniform vec4 uLand[${T.maxTouches}];
  uniform vec3 uLandParams; // radius, push × the bend knob, down
  vec3 landBend(vec3 p, float bend) {
    vec3 d = vec3(0.0);
    for (int i = 0; i < ${T.maxTouches}; i++) {
      if (i >= uLandCount) break;
      vec2 away = p.xz - uLand[i].xz;
      float x = length(away) / uLandParams.x;
      if (x >= 1.0) continue;
      float s = 1.0 - x * x;
      float hat = s * s;
      float m = uLand[i].w * uLandParams.y * bend;
      d.xz += m * hat * away / (uLandParams.x * ${LATERAL_PEAK.toFixed(6)});
      d.y -= m * hat * uLandParams.z;
    }
    return d;
  }`,
    vertexBody: '',
    fragmentHead: '',
    fragmentBody: '',
    vertexTransform: /* glsl */ `
  transformed += landBend(transformed, ${weight});`,
  }
}

/**
 * The picking policy (Codex F4, the rebase's R2): the pointer's ray is cast at the land's opaque bodies (the
 * cypress's solid, the trees' domes) together with the opaque occluders in front of them (the island's solid, the
 * village's three meshes); the hit counts only when the nearest body is land. The strips and the ground's ribbons
 * are never in the set: their alpha-cut fragments would block a bush through paint the shader discards.
 */
export function landPick(hits: readonly { object: unknown; point: { x: number; y: number; z: number } }[], land: readonly unknown[]): [number, number, number] | null {
  const first = hits[0]
  if (!first || !land.includes(first.object)) return null
  return [first.point.x, first.point.y, first.point.z]
}

/** The meshes a land touch lands on, and the opaque bodies that occlude them, by the names the components give. */
export const LAND_MESHES = ['cypress-solid', 'land-trees-solid'] as const
export const LAND_OCCLUDERS = ['island-solid', 'village-solid', 'village-skin', 'village-paint'] as const
