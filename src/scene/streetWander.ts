import { FROGS, frogPlace } from './frog.ts'
import { inFootprint, GRASS, insideHouse } from './streetGrass.ts'
import {
  laneAt,
  laneOffset,
  laneParam,
  objectClearings,
  pathClearings,
  railChains,
  stepClearings,
  STREET,
  STREET_CHURCH,
  STREET_CYPRESS,
  STREET_HOUSES,
  STREET_LAMPS,
  STREET_SQUARE,
  STREET_TREES,
  VINCENT_RIG,
  wallClearings,
  walkPose,
  WALK_T,
  type OrientedBox,
  type StationPose,
} from './streetLayout.ts'
import { PAUSE, turnPose, WALK } from './streetWalk.ts'

/**
 * Vincent's wander (tasks/2026-10-29-vincent-wander-plan.md, the spike's `streetWander.ts` grown into the slice's): pure
 * functions, no scene objects. They decide where he may stand, which legs he may walk, where the camera sees him, and
 * they step him and his pose. Decision letters in the comments are the plan's.
 */

export const WANDER = {
  /** world units a second: the spike's wander speed, kept (about 2.4 times the lane's automatic walk, `WALK.auto`) */
  speed: WALK.auto * STREET.pathLength,
  /** the distance at which he counts as there, and snaps */
  arrive: 0.004,
  /** the ground test's sample spacing along a leg (d) */
  step: 0.01,
  /** seconds, the aim's time constant */
  aimEase: 0.4,
  /** half the lane's width for a tap on it, and for the ground test's lane */
  laneHalf: 0.06,
  /** radians a second his body turns toward the heading */
  turn: 9,
  /** degrees, the most the camera's aim turns toward him (b) */
  aimMax: 20,
  /** radians, the aim snaps to its target within this (k) */
  aimSnap: 1e-4,
  /** world units between the sight samples of a leg (f) */
  sightStep: 0.02,
  /** the church's footprint grown by this (d) */
  margin: 0.02,
  /** a lamp post's keep-off radius (d) */
  post: 0.015,
  /** a frog's keep-off radius, about twice its size 0.0108 (d) */
  frog: 0.02,
  /** a street tree's keep-off radius round its centre (d) */
  trunk: 0.03,
  /** the square lamp's ring of flowers keep-off radius: 0.03 + 0.012 + 0.018 */
  ring: 0.06,
  /** a house's footprint grown by this for the sight test, the painting houses' eave (f) */
  eave: 0.03,
  /** degrees inside the horizontal half-field (f) */
  frameMargin: 4,
  /** radians, his yaw within this of `syaw` ends the return (h) */
  yawSnap: 1e-3,
  /** the most entries `route` holds (c) */
  hops: 8,
  /** the mark's glow over the ground: his raised lantern glass's height, measured 0.0232 (look pass 1) */
  markY: 0.023,
} as const

// --- where he may stand (d), (e) ---

type Cache = { steps: OrientedBox[]; walls: OrientedBox[]; objects: OrientedBox[]; paths: OrientedBox[] }
let cache: Cache | null = null
const boxes = (): Cache => (cache ??= { steps: stepClearings(), walls: wallClearings(), objects: objectClearings(), paths: pathClearings() })

function inBox(x: number, z: number, b: OrientedBox): boolean {
  const dx = x - b.ox
  const dz = z - b.oz
  const a = dx * b.ux + dz * b.uz
  const k = dx * b.nx + dz * b.nz
  return a >= b.u0 && a <= b.u1 && k >= b.k0 && k <= b.k1
}

/** the distance from a point to a rectangle centred at (cx, cz), `w` along (cos yaw, sin yaw) and `d` across: 0 inside */
function distToRect(x: number, z: number, cx: number, cz: number, yaw: number, w: number, d: number): number {
  const dx = x - cx
  const dz = z - cz
  const u = dx * Math.cos(yaw) + dz * Math.sin(yaw)
  const v = -dx * Math.sin(yaw) + dz * Math.cos(yaw)
  return Math.hypot(Math.max(Math.abs(u) - w / 2, 0), Math.max(Math.abs(v) - d / 2, 0))
}

/** a tap within the lane's strip (e): the strip is his own lane, and `standable` never includes it */
export function onLane(x: number, z: number): boolean {
  return Math.abs(laneOffset(x, z)) <= WANDER.laneHalf
}

/** a point he may not stand on, whatever ground it is: a house, a step, a wall, an object, the cypress, the church, a post, a frog, a trunk */
function keptOff(x: number, z: number): boolean {
  const c = boxes()
  if (insideHouse(x, z, GRASS.house)) return true
  for (const group of [c.steps, c.walls, c.objects]) {
    for (const b of group) if (inBox(x, z, b)) return true
  }
  if (Math.hypot(x - STREET_CYPRESS.x, z - STREET_CYPRESS.z) < GRASS.cypress) return true
  const { nave, belfry } = STREET_CHURCH
  if (distToRect(x, z, nave.x, nave.z, nave.yaw, nave.w, nave.d) < WANDER.margin) return true
  if (distToRect(x, z, belfry.cx, belfry.cz, belfry.yaw, belfry.width, belfry.width) < WANDER.margin) return true
  for (const l of STREET_LAMPS) {
    const p = laneAt(l.t, l.lateral)
    if (Math.hypot(x - p.x, z - p.z) < WANDER.post) return true
  }
  const sqLamp = laneAt(STREET_LAMPS[6].t, STREET_LAMPS[6].lateral)
  if (Math.hypot(x - sqLamp.x, z - sqLamp.z) < WANDER.ring) return true
  for (const f of FROGS) {
    const [fx, , fz] = frogPlace(f).position
    if (Math.hypot(x - fx, z - fz) < WANDER.frog) return true
  }
  return STREET_TREES.some((tr) => Math.hypot(x - tr.x, z - tr.z) < WANDER.trunk)
}

/**
 * Where he may stand: the verge (the grass's footprint off every clearing), K3's door paths and the square's disc, off the
 * lane's strip and off everything `keptOff` names.
 */
export function standable(x: number, z: number): boolean {
  if (onLane(x, z)) return false
  const c = boxes()
  const ground =
    Math.hypot(x - STREET_SQUARE.x, z - STREET_SQUARE.z) <= STREET_SQUARE.radius ||
    c.paths.some((b) => inBox(x, z, b)) ||
    (inFootprint(x, z) && ![...c.steps, ...c.walls, ...c.objects].some((b) => inBox(x, z, b)))
  return ground && !keptOff(x, z)
}

type Chain = [number, number, number, number]
let chains: Chain[] | null = null
const railWorld = (): Chain[] => {
  if (!chains) {
    const { frame: f, chains: local } = railChains()
    const at = (a: number, k: number): [number, number] => [f.ox + a * f.ux + k * f.nx, f.oz + a * f.uz + k * f.nz]
    chains = local.map(([p, q]) => [...at(p[0], p[1]), ...at(q[0], q[1])] as Chain)
  }
  return chains
}

function crosses(ax: number, az: number, bx: number, bz: number, [cx, cz, dx, dz]: Chain): boolean {
  const cross = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px)
  const d1 = cross(cx, cz, dx, dz, ax, az)
  const d2 = cross(cx, cz, dx, dz, bx, bz)
  const d3 = cross(ax, az, bx, bz, cx, cz)
  const d4 = cross(ax, az, bx, bz, dx, dz)
  return d1 * d2 <= 0 && d3 * d4 <= 0
}

/**
 * A leg passes if every sample every `WANDER.step` along it, the end included and the start not (he already stands
 * there), is standable or on the lane, and it crosses none of the garden rail's four chains (d).
 */
export function clearLeg(ax: number, az: number, bx: number, bz: number): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / WANDER.step))
  for (let k = 1; k <= n; k++) {
    const f = k / n
    const x = ax + (bx - ax) * f
    const z = az + (bz - az) * f
    if (!standable(x, z) && !onLane(x, z)) return false
  }
  return !railWorld().some((c) => crosses(ax, az, bx, bz, c))
}

// --- the trip ---

/** his current place: his lane slot and the walk's `t` and yaw when on the lane, else his wander position */
export type Here = { x: number; z: number; yaw: number; t: number }

export type WanderState = {
  mode: 'lane' | 'going' | 'returning'
  x: number
  z: number
  yaw: number
  tx: number
  tz: number
  /** the points home: `route[0]` is his lane slot when he left, the last entry is where the leg he is on began (c) */
  route: [number, number][]
  /** his lane slot's own yaw at `t0`, unturned: the yaw he comes home to (h) */
  syaw: number
  /** the walk's `t` when he left the lane, and the lane coordinate of `route[0]` (b) */
  t0: number
  lane0: number
  walked: number
  /** 0 while he walks and on the frame he arrives, then grows by the frame time (g) */
  arrived: number
  /** the lantern's turn, as `Pause.turn`: on the lane it is the lane's, off it this module's */
  turn: number
}

/** the state on the lane: the caller keeps `turn` in step with the lane's pause, so a tap can take it with him */
export function initialWander(): WanderState {
  return { mode: 'lane', x: 0, z: 0, yaw: 0, tx: 0, tz: 0, route: [], syaw: 0, t0: 0, lane0: 0, walked: 0, arrived: 0, turn: 0 }
}

/** the trip a tap from the lane starts: `route` [here], `t0` the walk's `t`, `syaw` his slot's yaw */
export function tripFrom(here: Here): WanderState {
  return {
    ...initialWander(),
    mode: 'going',
    x: here.x,
    z: here.z,
    yaw: here.yaw,
    tx: here.x,
    tz: here.z,
    route: [[here.x, here.z]],
    syaw: here.yaw,
    t0: here.t,
    lane0: laneParam(here.x, here.z)[0],
  }
}

/** the camera's `t` while he is off the lane: the walk's `t` at the tap plus the change in his lane coordinate, inside `WALK_T` (b) */
export function followT(s: WanderState, x: number, z: number): number {
  return Math.min(WALK_T.max, Math.max(WALK_T.min, s.t0 + laneParam(x, z)[0] - s.lane0))
}

// --- where the camera sees him (f) ---

export type View = { portrait: boolean; halfFovDeg: number }

/** the exact segment (ax, az) to (bx, bz) against the box centred at (cx, cz), `w` along (cos yaw, sin yaw) and `d` across, grown by `m` */
function meetsBox(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, yaw: number, w: number, d: number, m: number): boolean {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const p = [(ax - cx) * c + (az - cz) * s, -(ax - cx) * s + (az - cz) * c]
  const q = [(bx - cx) * c + (bz - cz) * s, -(bx - cx) * s + (bz - cz) * c]
  const half = [w / 2 + m, d / 2 + m]
  let lo = 0
  let hi = 1
  for (let i = 0; i < 2; i++) {
    const delta = q[i] - p[i]
    if (delta === 0) {
      if (Math.abs(p[i]) > half[i]) return false
      continue
    }
    const t0 = (-half[i] - p[i]) / delta
    const t1 = (half[i] - p[i]) / delta
    lo = Math.max(lo, Math.min(t0, t1))
    hi = Math.min(hi, Math.max(t0, t1))
    if (lo > hi) return false
  }
  return true
}

function lineHidden(ex: number, ez: number, x: number, z: number): boolean {
  for (const h of STREET_HOUSES) {
    if (meetsBox(ex, ez, x, z, h.x, h.z, h.yaw, h.w, h.d, WANDER.eave)) return true
  }
  const { nave, belfry } = STREET_CHURCH
  return (
    meetsBox(ex, ez, x, z, nave.x, nave.z, nave.yaw, nave.w, nave.d, WANDER.margin) ||
    meetsBox(ex, ez, x, z, belfry.cx, belfry.cz, belfry.yaw, belfry.width, belfry.width, WANDER.margin)
  )
}

/**
 * Hidden from the eye: three ground lines go from the eye to the point and to the point either side of it by his half
 * width, across the line of sight. A line that meets a house grown by `WANDER.eave`, or the church grown by
 * `WANDER.margin`, hides him. The eye (0.09) is at or below every eave, so a crossing is an occlusion.
 */
export function hidden(eyeX: number, eyeZ: number, x: number, z: number): boolean {
  const dx = x - eyeX
  const dz = z - eyeZ
  const len = Math.hypot(dx, dz)
  if (len === 0) return false
  const px = (-dz / len) * VINCENT_RIG.halfWidth
  const pz = (dx / len) * VINCENT_RIG.halfWidth
  return lineHidden(eyeX, eyeZ, x, z) || lineHidden(eyeX, eyeZ, x + px, z + pz) || lineHidden(eyeX, eyeZ, x - px, z - pz)
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

/**
 * In frame: from `pose`, its aim turned toward the point by up to `WANDER.aimMax`, the point's bearing is within the
 * horizontal half-field less `WANDER.frameMargin`.
 */
export function inFrame(pose: StationPose, x: number, z: number, halfFovDeg: number): boolean {
  const aim = Math.atan2(pose.target[0] - pose.position[0], pose.target[2] - pose.position[2])
  const want = Math.atan2(x - pose.position[0], z - pose.position[2])
  const off = Math.atan2(Math.sin(want - aim), Math.cos(want - aim))
  const turned = aimAngle(pose.position, pose.target, [x, 0, z], WANDER.aimMax)
  return Math.abs(off - turned) <= ((halfFovDeg - WANDER.frameMargin) * Math.PI) / 180
}

/** every sample every `WANDER.sightStep` along the leg, the end included and the start not, is in frame and not hidden from the follow camera's eye */
export function legSeen(s: WanderState, ax: number, az: number, bx: number, bz: number, view: View): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / WANDER.sightStep))
  for (let k = 1; k <= n; k++) {
    const f = k / n
    const x = ax + (bx - ax) * f
    const z = az + (bz - az) * f
    const pose = walkPose(followT(s, x, z), view.portrait)
    if (hidden(pose.position[0], pose.position[2], x, z) || !inFrame(pose, x, z, view.halfFovDeg)) return false
  }
  return true
}

/**
 * A tap at (x, z). Null when it does nothing. A tap on the lane sends him back if he is off it (e), and so does a tap
 * within `laneHalf` of his slot `route[0]` where the slot is off the strip, as it is from `t` 0.825 (Fable F1). Any other
 * tap is accepted only if its one new leg, from where he stands, is clear and seen (c): the legs home are legs already
 * walked. `view` null skips the sight tests (the capture seam).
 */
export function wanderTo(s: WanderState, here: Here, x: number, z: number, view: View | null): WanderState | null {
  const slot = s.route[0]
  const bySlot = s.mode !== 'lane' && !onLane(slot[0], slot[1]) && Math.hypot(x - slot[0], z - slot[1]) <= WANDER.laneHalf
  const home = onLane(x, z) || bySlot
  if (home) return s.mode === 'going' ? { ...s, mode: 'returning', arrived: 0 } : null
  if (!standable(x, z)) return null
  const fromLane = s.mode === 'lane'
  // from the lane, the trip begins at his slot, in the yaw he is drawn in (a lantern raised turns his body)
  const base = fromLane ? { ...tripFrom(here), yaw: here.yaw + turnPose(s.turn).body, turn: s.turn } : s
  if (!fromLane && base.route.length >= WANDER.hops) return null
  if (!clearLeg(base.x, base.z, x, z)) return null
  if (view && !legSeen(base, base.x, base.z, x, z, view)) return null
  return {
    ...base,
    mode: 'going',
    tx: x,
    tz: z,
    route: fromLane ? base.route : [...base.route, [base.x, base.z]],
    arrived: 0,
  }
}

// --- the step (c), (g), (h), (l) ---

function turnToward(yaw: number, heading: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(heading - yaw), Math.cos(heading - yaw))
  return yaw + Math.max(-maxStep, Math.min(maxStep, d))
}

/** the figure off the lane: the lane's turn pose with the body kept straight, as there is no house front to turn to (g) */
export function offLanePose(turn: number): ReturnType<typeof turnPose> {
  return { ...turnPose(turn), body: 0 }
}

/**
 * One frame. Going, he walks to his tap. Returning, he walks the route back, a leg at a time, to `route[0]`, lowers the
 * lantern and turns to his slot's yaw, and then the lane has him. Once he has rested `PAUSE.rest` at a tap he raises the
 * lantern. He does not move while the lantern is up (`turn` at or over `PAUSE.turnGate`). A frozen step (reduced motion,
 * the still state) returns `s`. With the automatic walk on (`autoOn`), he goes home `PAUSE.endTurn` before a station's
 * dwell would end, so the lantern is down by then (p).
 */
export function stepWander(s: WanderState, dt: number, frozen: boolean, autoOn = false): WanderState {
  if (frozen || s.mode === 'lane') return s
  const returning = s.mode === 'returning'
  const [tx, tz] = returning ? s.route[s.route.length - 1] : [s.tx, s.tz]
  const dist = Math.hypot(tx - s.x, tz - s.z)
  const rested = !returning && dist <= WANDER.arrive && s.arrived > PAUSE.rest
  const want = rested ? 1 : 0
  const rate = want > s.turn ? dt / PAUSE.turnIn : want < s.turn ? -dt / PAUSE.turnOut : 0
  const turn = Math.min(1, Math.max(0, s.turn + rate))

  if (dist <= WANDER.arrive) {
    const landed = s.x !== tx || s.z !== tz
    const snapped = { ...s, x: tx, z: tz, turn, walked: s.walked + dist }
    if (!returning) {
      const arrived = landed ? 0 : s.arrived + dt
      if (autoOn && arrived >= PAUSE.dwell - PAUSE.endTurn) return { ...snapped, mode: 'returning', arrived: 0 }
      return { ...snapped, arrived }
    }
    if (s.route.length > 1) return { ...snapped, route: s.route.slice(0, -1) }
    // at `route[0]`: lantern down, then turn in place to the slot's yaw
    const yaw = turn < PAUSE.turnGate ? turnToward(s.yaw, s.syaw, WANDER.turn * dt) : s.yaw
    if (turn === 0 && Math.abs(Math.atan2(Math.sin(s.syaw - yaw), Math.cos(s.syaw - yaw))) <= WANDER.yawSnap) {
      return { ...snapped, mode: 'lane', yaw: s.syaw, turn: 0, arrived: 0 }
    }
    return { ...snapped, yaw }
  }
  if (turn >= PAUSE.turnGate) return { ...s, turn }
  const move = Math.min(dist, WANDER.speed * dt)
  return {
    ...s,
    x: s.x + ((tx - s.x) / dist) * move,
    z: s.z + ((tz - s.z) / dist) * move,
    yaw: turnToward(s.yaw, Math.atan2(tx - s.x, tz - s.z), WANDER.turn * dt),
    turn,
    walked: s.walked + move,
    arrived: 0,
  }
}
