import { inFootprint, isExcluded } from './streetGrass.ts'
import { laneOffset, streetClearings, STREET, type OrientedBox } from './streetLayout.ts'
import { WALK } from './streetWalk.ts'

/**
 * Vincent's wander, a throwaway spike (tasks/2026-10-28-vincent-wander-spike.md): pure functions, no scene objects.
 * He walks a straight line from the lane to a verge point, and back to his lane slot. No path finding.
 */

export const WANDER = {
  /** world units a second: the automatic walk's own pace */
  speed: WALK.auto * STREET.pathLength,
  /** the distance at which he counts as there, and snaps */
  arrive: 0.004,
  /** the line test's sample spacing */
  step: 0.01,
  /** seconds, the aim's time constant */
  aimEase: 0.4,
  /** half the lane's width for a tap on it, and for the line test's lane */
  laneHalf: 0.06,
  /** radians a second his body turns toward the heading (not in the draft: a turn rate so the yaw never snaps) */
  turn: 9,
} as const

let clearings: readonly OrientedBox[] | null = null

function insideClearing(x: number, z: number): boolean {
  clearings ??= streetClearings()
  for (const { ox, oz, ux, uz, nx, nz, u0, u1, k0, k1 } of clearings) {
    const dx = x - ox
    const dz = z - oz
    const a = dx * ux + dz * uz
    const k = dx * nx + dz * nz
    if (a >= u0 && a <= u1 && k >= k0 && k <= k1) return true
  }
  return false
}

/** the verge where the grass grows: inside the footprint, off every clearing, house (grown by the grass's margin), the cypress and the square */
export function walkable(x: number, z: number): boolean {
  return inFootprint(x, z) && !insideClearing(x, z) && !isExcluded(x, z)
}

export function passable(x: number, z: number): boolean {
  return walkable(x, z) || Math.abs(laneOffset(x, z)) <= WANDER.laneHalf
}

/** every sample every `WANDER.step` along the segment is passable, the end included and the start not (he already stands there) */
export function clearLine(ax: number, az: number, bx: number, bz: number): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / WANDER.step))
  for (let k = 1; k <= n; k++) {
    const f = k / n
    if (!passable(ax + (bx - ax) * f, az + (bz - az) * f)) return false
  }
  return true
}

export type WanderState = {
  mode: 'lane' | 'going' | 'returning'
  x: number
  z: number
  tx: number
  tz: number
  yaw: number
  walked: number
}

type Slot = { x: number; z: number; yaw: number }

function turnToward(yaw: number, heading: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(heading - yaw), Math.cos(heading - yaw))
  return yaw + Math.max(-maxStep, Math.min(maxStep, d))
}

export function stepWander(s: WanderState, dt: number, slot: Slot): WanderState {
  if (s.mode === 'lane') return s
  const returning = s.mode === 'returning'
  const tx = returning ? slot.x : s.tx
  const tz = returning ? slot.z : s.tz
  const dx = tx - s.x
  const dz = tz - s.z
  const dist = Math.hypot(dx, dz)
  if (dist <= WANDER.arrive) {
    const snapped = { ...s, x: tx, z: tz, tx, tz, walked: s.walked + dist }
    return returning ? { ...snapped, mode: 'lane', yaw: slot.yaw } : snapped
  }
  const move = Math.min(dist, WANDER.speed * dt)
  return {
    ...s,
    x: s.x + (dx / dist) * move,
    z: s.z + (dz / dist) * move,
    tx,
    tz,
    yaw: turnToward(s.yaw, Math.atan2(dx, dz), WANDER.turn * dt),
    walked: s.walked + move,
  }
}

/** the yaw, in radians, to turn `target` about `position` toward the bearing of `toward`: signed, at most `maxDeg` */
export function aimAngle(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  toward: readonly [number, number, number],
  maxDeg: number,
): number {
  const aim = Math.atan2(target[0] - position[0], target[2] - position[2])
  const want = Math.atan2(toward[0] - position[0], toward[2] - position[2])
  const d = Math.atan2(Math.sin(want - aim), Math.cos(want - aim))
  const max = (maxDeg * Math.PI) / 180
  return Math.max(-max, Math.min(max, d))
}

/** `target` turned about `position` by `angle` radians, in yaw only, its height and distance kept */
export function turnTarget(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  angle: number,
): [number, number, number] {
  const dx = target[0] - position[0]
  const dz = target[2] - position[2]
  const r = Math.hypot(dx, dz)
  const a = Math.atan2(dx, dz) + angle
  return [position[0] + r * Math.sin(a), target[1], position[2] + r * Math.cos(a)]
}

export function aimToward(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  toward: readonly [number, number, number],
  maxDeg: number,
): [number, number, number] {
  return turnTarget(position, target, aimAngle(position, target, toward, maxDeg))
}
