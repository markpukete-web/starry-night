// Vincent's wander (2026-10-29, tasks/2026-10-29-vincent-wander-plan.md Task 1): where he may stand, which legs he may
// walk, where the camera sees him, and how he steps. Pure functions, no scene objects.
import assert from 'node:assert/strict'
import test from 'node:test'
import { FROGS, frogPlace } from '../src/scene/frog.ts'
import { GRASS, insideHouse } from '../src/scene/streetGrass.ts'
import {
  doorPathLegs,
  laneAt,
  laneOffset,
  laneParam,
  objectClearings,
  pathClearings,
  pathPoint,
  pathTangent,
  railChains,
  stepClearings,
  STREET_CHURCH,
  STREET_CYPRESS,
  STREET_HOUSES,
  STREET_LAMPS,
  STREET_RAIL,
  STREET_SQUARE,
  STREET_TREES,
  vincentPlace,
  wallClearings,
  walkPose,
  type OrientedBox,
} from '../src/scene/streetLayout.ts'
import { PAUSE, turnPose } from '../src/scene/streetWalk.ts'
import {
  aimAngle,
  clearLeg,
  followT,
  hidden,
  inFrame,
  initialWander,
  legSeen,
  offLanePose,
  onLane,
  standable,
  stepWander,
  tripFrom,
  turnTarget,
  wanderTo,
  WANDER,
  type Here,
  type View,
  type WanderState,
} from '../src/scene/streetWander.ts'

const DEG = Math.PI / 180
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

function hereAt(t: number): Here {
  const p = vincentPlace(t)
  return { x: p.position[0], z: p.position[2], yaw: p.yaw, t }
}

/** the view of a 1440 x 900 camera at the walk's own lens: the horizontal half-field in degrees */
const VIEW: View = { portrait: false, halfFovDeg: Math.atan(Math.tan((walkPose(0, false).fov / 2) * DEG) * (1440 / 900)) / DEG }

function inBox(x: number, z: number, b: OrientedBox): boolean {
  const dx = x - b.ox
  const dz = z - b.oz
  const a = dx * b.ux + dz * b.uz
  const k = dx * b.nx + dz * b.nz
  return a >= b.u0 && a <= b.u1 && k >= b.k0 && k <= b.k1
}

/** distance from a point to an oriented rectangle (0 inside): the church's keep-off, read independently of the module */
function distToRect(x: number, z: number, cx: number, cz: number, yaw: number, w: number, d: number): number {
  const dx = x - cx
  const dz = z - cz
  const u = dx * Math.cos(yaw) + dz * Math.sin(yaw)
  const v = -dx * Math.sin(yaw) + dz * Math.cos(yaw)
  return Math.hypot(Math.max(Math.abs(u) - w / 2, 0), Math.max(Math.abs(v) - d / 2, 0))
}

const nave = STREET_CHURCH.nave
const belfry = STREET_CHURCH.belfry
const churchDist = (x: number, z: number) =>
  Math.min(
    distToRect(x, z, nave.x, nave.z, nave.yaw, nave.w, nave.d),
    distToRect(x, z, belfry.cx, belfry.cz, belfry.yaw, belfry.width, belfry.width),
  )

/** a point the test itself reads as excluded by decision (d), apart from the ground it is on */
function excluded(x: number, z: number): boolean {
  if (Math.abs(laneOffset(x, z)) <= WANDER.laneHalf) return true
  if (insideHouse(x, z, GRASS.house)) return true
  if ([...stepClearings(), ...wallClearings(), ...objectClearings()].some((b) => inBox(x, z, b))) return true
  if (Math.hypot(x - STREET_CYPRESS.x, z - STREET_CYPRESS.z) < GRASS.cypress) return true
  if (churchDist(x, z) < WANDER.margin) return true
  for (const l of STREET_LAMPS) {
    const p = laneAt(l.t, l.lateral)
    if (Math.hypot(x - p.x, z - p.z) < WANDER.post) return true
  }
  for (const f of FROGS) {
    const p = frogPlace(f).position
    if (Math.hypot(x - p[0], z - p[2]) < WANDER.frog) return true
  }
  return STREET_TREES.some((tr) => Math.hypot(x - tr.x, z - tr.z) < WANDER.trunk)
}

test('standable: the door paths, but not where a hard exclusion is', () => {
  let checked = 0
  for (const r of pathClearings()) {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const a = r.u0 + ((r.u1 - r.u0) * (i + 0.5)) / 5
        const k = r.k0 + ((r.k1 - r.k0) * (j + 0.5)) / 5
        const x = r.ox + a * r.ux + k * r.nx
        const z = r.oz + a * r.uz + k * r.nz
        if (excluded(x, z)) continue
        assert.equal(standable(x, z), true, `a path sample at (${x.toFixed(4)}, ${z.toFixed(4)})`)
        checked++
      }
    }
  }
  assert.ok(checked > 100, `checked ${checked}`)
  // Codex F1: the middle of L1's path lies 0.0073 from the cypress
  const [s, e] = doorPathLegs()[0].points
  const mid: [number, number] = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2]
  const away = Math.hypot(mid[0] - STREET_CYPRESS.x, mid[1] - STREET_CYPRESS.z)
  assert.ok(away < GRASS.cypress, `L1's path midpoint is ${away} from the cypress`)
  assert.ok(pathClearings().some((b) => inBox(mid[0], mid[1], b)), 'precondition: the midpoint is on a path')
  assert.equal(standable(mid[0], mid[1]), false)
})

test('standable: the square, the church and the lane strip', () => {
  assert.equal(standable(STREET_SQUARE.x, STREET_SQUARE.z), true)
  let inDisc = 0
  let beyond = 0
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const lx = (sx * nave.w) / 2
      const lz = (sz * nave.d) / 2
      const cx = nave.x + lx * Math.cos(nave.yaw) - lz * Math.sin(nave.yaw)
      const cz = nave.z + lx * Math.sin(nave.yaw) + lz * Math.cos(nave.yaw)
      if (Math.hypot(cx - STREET_SQUARE.x, cz - STREET_SQUARE.z) > STREET_SQUARE.radius) continue
      inDisc++
      const r = Math.hypot(cx - nave.x, cz - nave.z)
      // the corner's own diagonal (centre to corner) and the 45 degree one
      const dirs: [number, number][] = [
        [(cx - nave.x) / r, (cz - nave.z) / r],
        [Math.SQRT1_2 * (cx > nave.x ? 1 : -1), Math.SQRT1_2 * (cz > nave.z ? 1 : -1)],
      ]
      for (const [ux, uz] of dirs) {
        assert.equal(standable(cx + ux * 0.01, cz + uz * 0.01), false, `0.01 outside the corner (${cx.toFixed(3)}, ${cz.toFixed(3)})`)
        const fx = cx + ux * 0.03
        const fz = cz + uz * 0.03
        if (Math.hypot(fx - STREET_SQUARE.x, fz - STREET_SQUARE.z) > STREET_SQUARE.radius || excluded(fx, fz)) continue
        beyond++
        assert.equal(standable(fx, fz), true, `0.03 outside the corner (${cx.toFixed(3)}, ${cz.toFixed(3)})`)
      }
    }
  }
  assert.ok(inDisc > 0, 'a corner of the nave lies in the disc')
  assert.ok(beyond > 0, 'a 0.03 point lies in the disc and clear')
  assert.equal(standable(belfry.cx, belfry.cz), false)
  const [lx, , lz] = pathPoint(0.98)
  assert.equal(onLane(lx, lz), true)
  assert.equal(standable(lx, lz), false)
})

test('standable: lamp posts, frogs and trunks', () => {
  for (const l of STREET_LAMPS) {
    const p = laneAt(l.t, l.lateral)
    assert.equal(standable(p.x, p.z), false, `lamp at ${l.t}`)
    assert.equal(standable(p.x + 0.01, p.z), false, `0.01 from the lamp at ${l.t}`)
  }
  for (const f of FROGS) {
    const [x, , z] = frogPlace(f).position
    assert.equal(standable(x, z), false, `frog of stop ${f.stop}`)
    assert.equal(standable(x + 0.015, z), false, `0.015 from the frog of stop ${f.stop}`)
  }
  for (const tr of STREET_TREES) assert.equal(standable(tr.x, tr.z), false, `tree ${tr.id}`)
  // the spike's: no house, and nothing past the verge
  for (const h of STREET_HOUSES) assert.equal(standable(h.x, h.z), false, `house ${h.id}`)
  const far = laneAt(0.3, 0.7)
  assert.equal(standable(far.x, far.z), false, 'past the verge')
})

/** a point in L2's garden, in the rail's door frame (a along the front, k out toward the lane) */
function gardenPoint(a: number, k: number): [number, number] {
  const { frame: f } = railChains()
  return [f.ox + a * f.ux + k * f.nx, f.oz + a * f.uz + k * f.nz]
}

test('clearLeg: the rail and the frogs', () => {
  const { chains } = railChains()
  assert.equal(chains.length, 4)
  const a0 = chains[1][1][0]
  const a1 = chains[2][0][0]
  assert.ok(a1 > a0, 'the gap is open')
  const mid = (a0 + a1) / 2
  const inside = gardenPoint(a0 - 0.015, 0.075)
  const outside = gardenPoint(a0 - 0.015, STREET_RAIL.depth + 0.04)
  const gap = gardenPoint(mid, STREET_RAIL.depth + 0.04)
  for (const p of [inside, outside, gap]) assert.equal(standable(p[0], p[1]), true, `(${p[0].toFixed(4)}, ${p[1].toFixed(4)})`)
  assert.equal(clearLeg(outside[0], outside[1], inside[0], inside[1]), false, 'across the chain')
  assert.equal(clearLeg(gap[0], gap[1], inside[0], inside[1]), true, 'through the gap')

  let tried = 0
  for (const f of FROGS) {
    const [x, , z] = frogPlace(f).position
    const [tx, , tz] = pathTangent(f.t)
    const n = Math.hypot(tx, tz)
    const a: [number, number] = [x - (tx / n) * 0.04, z - (tz / n) * 0.04]
    const b: [number, number] = [x + (tx / n) * 0.04, z + (tz / n) * 0.04]
    if (!standable(a[0], a[1]) || !standable(b[0], b[1])) continue
    tried++
    assert.equal(clearLeg(a[0], a[1], b[0], b[1]), false, `the leg through the frog of stop ${f.stop}`)
  }
  assert.ok(tried > 0, 'at least one frog has standable neighbours')
})

test('hidden: a ground point behind a house is hidden from the eye; beside it, not', () => {
  const h = STREET_HOUSES[0]
  const c = Math.cos(h.yaw)
  const s = Math.sin(h.yaw)
  const far = h.w / 2 + 0.05
  const a = [h.x - c * far, h.z - s * far] as const
  const b = [h.x + c * far, h.z + s * far] as const
  assert.equal(hidden(a[0], a[1], b[0], b[1]), true)
  const beside = [b[0] + c * 0.05, b[1] + s * 0.05] as const
  assert.equal(hidden(beside[0], beside[1], b[0], b[1]), false)
})

test('hidden: half behind a gable', () => {
  const lineMeets = (ax: number, az: number, bx: number, bz: number, m: number) => {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.0005)
    for (let i = 0; i <= n; i++) {
      if (insideHouse(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n, m)) return true
    }
    return false
  }
  const mutable = WANDER as { eave: number }
  const eave = mutable.eave
  let found: { eye: [number, number]; at: [number, number] } | null = null
  const eye = walkPose(0.1, false).position
  search: for (const h of STREET_HOUSES) {
    for (let i = -120; i <= 120; i++) {
      for (let j = -120; j <= 120; j++) {
        const x = h.x + i * 0.005
        const z = h.z + j * 0.005
        mutable.eave = eave
        if (!hidden(eye[0], eye[2], x, z)) continue
        if (lineMeets(eye[0], eye[2], x, z, eave)) continue
        mutable.eave = 0
        const bare = hidden(eye[0], eye[2], x, z)
        mutable.eave = eave
        if (!bare) {
          found = { eye: [eye[0], eye[2]], at: [x, z] }
          break search
        }
      }
    }
  }
  mutable.eave = eave
  assert.ok(found, 'a sample whose centre line misses the grown footprint, and a side line meets it')
  assert.equal(hidden(found.eye[0], found.eye[1], found.at[0], found.at[1]), true)
  try {
    mutable.eave = 0
    assert.equal(hidden(found.eye[0], found.eye[1], found.at[0], found.at[1]), false)
  } finally {
    mutable.eave = eave
  }
})

test('inFrame: the turned aim field', () => {
  const pose = walkPose(0.23, false)
  const bearing = Math.atan2(pose.target[0] - pose.position[0], pose.target[2] - pose.position[2])
  const at = (deg: number): [number, number] => [
    pose.position[0] + Math.sin(bearing + deg * DEG),
    pose.position[2] + Math.cos(bearing + deg * DEG),
  ]
  for (const sign of [1, -1]) {
    assert.equal(inFrame(pose, ...at(0), 40), true, 'on the aim line')
    assert.equal(inFrame(pose, ...at(sign * 55), 40), true, '55 degrees off')
    assert.equal(inFrame(pose, ...at(sign * 60), 40), false, '60 degrees off')
    assert.equal(inFrame(pose, ...at(sign * 180), 40), false, 'behind')
  }
})

test('aimAngle and turnTarget: turn by exactly maxDeg when the bearing is farther, fully when nearer', () => {
  const pos = [0, 0.09, 0] as const
  const tgt = [0, 0.06, 1] as const
  const bearing = (t: readonly number[]) => (Math.atan2(t[0] - pos[0], t[2] - pos[2]) * 180) / Math.PI
  const aim = (toward: readonly [number, number, number], max: number) => turnTarget(pos, tgt, aimAngle(pos, tgt, toward, max))
  const far = aim([1, 0, 1], 20)
  assert.ok(Math.abs(bearing(far) - 20) < 1e-9)
  assert.equal(far[1], 0.06)
  assert.ok(Math.abs(Math.hypot(far[0], far[2]) - 1) < 1e-9)
  assert.ok(Math.abs(bearing(aim([-1, 0, 1], 20)) + 20) < 1e-9)
  assert.ok(Math.abs(bearing(aim([0.2, 0, 1], 20)) - (Math.atan2(0.2, 1) * 180) / Math.PI) < 1e-9)
  assert.ok(Math.abs(bearing(aim([1, 0, 1], 0))) < 1e-9)
})

/** step a state until `done`, one frame at a time, calling `each` on every frame */
function run(s: WanderState, done: (s: WanderState) => boolean, each?: (s: WanderState) => void, dt = 1 / 60): WanderState {
  for (let i = 0; i < 20000; i++) {
    if (done(s)) return s
    s = stepWander(s, dt, false)
    each?.(s)
  }
  throw new Error('the state never reached its condition')
}

const arrived = (s: WanderState) => s.mode === 'going' && s.arrived > 0
const home = (s: WanderState) => s.mode === 'lane'

/** the nearest verge point to his slot that he may walk to, scanning out from the lane, his own side first */
function vergeNear(slot: Here): [number, number] {
  const t = laneParam(slot.x, slot.z)[0]
  const own = Math.sign(laneOffset(slot.x, slot.z))
  for (let lat = 0.1; lat <= 0.3; lat += 0.02) {
    for (const side of [own, -own]) {
      const p = laneAt(t, side * lat)
      if (standable(p.x, p.z) && clearLeg(slot.x, slot.z, p.x, p.z)) return [p.x, p.z]
    }
  }
  throw new Error(`no verge point near t ${slot.t}`)
}

test('wanderTo: the new leg is checked (Codex F3, F6, F8, N1)', () => {
  // each fixture: the walk's t, the tap, whether the leg is accepted, and where a refused leg is hidden: a middle sample
  // (L3 hides it from sample 34 of 48) or only its last (L3's, then R4's eave, by a side line)
  const fixtures: [number, [number, number], boolean, 'middle' | 'last' | null][] = [
    [0, [-0.46913668405284825, -0.428633501576554], true, null],
    [0.06, [-0.3595866636762092, -1.417455216001235], false, 'middle'],
    [0.23, [-0.2923531248524448, -1.1919155133212136], false, 'last'],
    [0.44, [0.5412437098392479, -1.4405122792319607], false, 'last'],
  ]
  for (const [t, [x, z], accepted, where] of fixtures) {
    const here = hereAt(t)
    assert.ok(standable(x, z), `the tap at t ${t} is standable`)
    assert.ok(onLane(here.x, here.z) || standable(here.x, here.z), `his slot at t ${t} is on the lane`)
    const r = wanderTo(initialWander(), here, x, z, VIEW)
    if (accepted) {
      assert.ok(r, `t ${t}: accepted`)
      assert.equal(r.mode, 'going')
      assert.deepEqual(r.route, [[here.x, here.z]])
      assert.equal(r.t0, t)
    } else {
      assert.equal(r, null, `t ${t}: refused`)
      // the ground allows it, so the camera's sight is the reason
      assert.equal(clearLeg(here.x, here.z, x, z), true, `t ${t}: the ground is clear`)
      assert.equal(wanderTo(initialWander(), here, x, z, null) !== null, true, `t ${t}: only the sight tests refuse`)
      // the leg ending one sight step short: seen when only the last sample was hidden, still refused when a middle one was
      const len = Math.hypot(x - here.x, z - here.z)
      const short = (len - WANDER.sightStep) / len
      const seenShort = legSeen(tripFrom(here), here.x, here.z, here.x + (x - here.x) * short, here.z + (z - here.z) * short, VIEW)
      assert.equal(seenShort, where === 'last', `t ${t}: the leg one step short`)
    }
  }

  // Codex N1: out to A, a second leg to B, then home through A
  const A: [number, number] = fixtures[0][1]
  const B: [number, number] = [-0.39455759959990633, -0.4873421896262576]
  const slot = hereAt(0)
  const out = wanderTo(initialWander(), slot, A[0], A[1], VIEW)!
  const atA = run(out, arrived)
  assert.equal(atA.x, A[0])
  const leg2 = wanderTo(atA, slot, B[0], B[1], VIEW)
  assert.ok(leg2, 'B is accepted from A')
  assert.equal(leg2.mode, 'going')
  assert.deepEqual(leg2.route, [[slot.x, slot.z], A])
  // 60% of the way to B
  const fromA = Math.hypot(B[0] - A[0], B[1] - A[1])
  const mid = run(leg2, (s) => Math.hypot(s.x - A[0], s.z - A[1]) >= 0.6 * fromA)
  const lamp = laneAt(0.24, -0.11)
  let nearA = Infinity
  const seen = (s: WanderState) => {
    assert.ok(standable(s.x, s.z) || onLane(s.x, s.z), `(${s.x.toFixed(4)}, ${s.z.toFixed(4)}) is ground he may stand on`)
    assert.ok(Math.hypot(s.x - lamp.x, s.z - lamp.z) > WANDER.post, 'clear of the lamp at t 0.24')
    nearA = Math.min(nearA, Math.hypot(s.x - A[0], s.z - A[1]))
  }
  const lane = laneAt(0, 0.0)
  const laneTap = wanderTo(mid, slot, lane.x, lane.z, VIEW)
  assert.ok(laneTap)
  assert.equal(laneTap.mode, 'returning')
  run(laneTap, home, seen)
  assert.ok(nearA <= WANDER.arrive, `one frame within ${WANDER.arrive} of A, nearest ${nearA}`)
})

test('wanderTo: the hops cap', () => {
  // a clear run of verge points out from the lane, 0.02 apart
  let run8: [number, number][] | null = null
  let slot: Here | null = null
  for (let t = 0.1; t <= 0.8 && !run8; t += 0.01) {
    for (const side of [1, -1]) {
      const pts: [number, number][] = []
      for (let k = 0; k < 9; k++) {
        const p = laneAt(t, side * (0.1 + 0.02 * k))
        pts.push([p.x, p.z])
      }
      const here = hereAt(t)
      let ok = clearLeg(here.x, here.z, pts[0][0], pts[0][1])
      for (let k = 1; k < pts.length && ok; k++) ok = clearLeg(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1])
      if (ok) {
        run8 = pts
        slot = here
        break
      }
    }
  }
  assert.ok(run8 && slot, 'a clear run of nine verge points')
  let s = initialWander()
  for (let k = 0; k < WANDER.hops; k++) {
    const next = wanderTo(s, slot, run8[k][0], run8[k][1], null)
    assert.ok(next, `tap ${k + 1} of ${WANDER.hops} is accepted`)
    assert.ok(next.route.length <= WANDER.hops)
    s = run(next, arrived)
  }
  assert.equal(s.route.length, WANDER.hops)
  assert.equal(wanderTo(s, slot, run8[WANDER.hops][0], run8[WANDER.hops][1], null), null)
})

test('wanderTo: the lane first, and taps during a trip', () => {
  const stop4 = hereAt(0.9)
  const [lx, , lz] = pathPoint(0.98)
  assert.equal(wanderTo(initialWander(), stop4, lx, lz, VIEW), null, 'a tap on the lane from the lane does nothing')

  // a short trip out to a verge point at stop 1
  const slot = hereAt(0.23)
  const target = vergeNear(slot)
  const going = wanderTo(initialWander(), slot, target[0], target[1], null)!
  assert.equal(going.mode, 'going')
  assert.equal(wanderTo(going, slot, lx, lz, VIEW)?.mode, 'returning', 'going: a lane tap turns him back')

  // returning, part of the way: a standable tap sends him on from where he is
  const partway = run(going, (s) => Math.hypot(s.x - slot.x, s.z - slot.z) > 0.04)
  const back = wanderTo(partway, slot, lx, lz, VIEW)!
  const stepped = run(back, (s) => Math.hypot(s.x - partway.x, s.z - partway.z) > 0.01)
  assert.equal(stepped.mode, 'returning')
  // the half way point out along the leg he first walked is checked and standable
  const q = [(stepped.x + target[0]) / 2, (stepped.z + target[1]) / 2] as const
  assert.ok(standable(q[0], q[1]) && clearLeg(stepped.x, stepped.z, q[0], q[1]))
  const again = wanderTo(stepped, slot, q[0], q[1], null)!
  assert.equal(again.mode, 'going')
  assert.deepEqual([again.tx, again.tz], [q[0], q[1]])
  assert.deepEqual(again.route.at(-1), [stepped.x, stepped.z], 'where he was is pushed')
  assert.deepEqual(again.route[0], stepped.route[0], 'route[0] is unchanged')
  assert.equal(again.route.length, stepped.route.length + 1)
})

test('followT: no jump at the tap, none at stop 4', () => {
  for (const t of [0.23, 0.9]) {
    const s = tripFrom(hereAt(t))
    const [x, z] = s.route[0]
    assert.ok(Math.abs(followT(s, x, z) - t) < 1e-9, `t ${t}`)
    assert.equal(s.t0, t)
  }
  // inside WALK_T: a point far past the lane's end gives no more than 0.9
  const s = tripFrom(hereAt(0.9))
  const past = laneAt(1.0, 0.3)
  assert.ok(followT(s, past.x, past.z) <= 0.9)
})

test('stepWander: arrival, rest, raise and return', () => {
  const dt = 1 / 60
  const slot = hereAt(0.23)
  const [ex, ez] = vergeNear(slot)
  const end = { x: ex, z: ez }
  let s = wanderTo(initialWander(), slot, end.x, end.z, null)!
  const frozen = stepWander(s, dt, true)
  assert.equal(frozen, s, 'a frozen step returns its input')

  // walk there: distance over speed, then the arrival frame has arrived 0
  const length = Math.hypot(end.x - s.x, end.z - s.z)
  let frames = 0
  while (!(s.x === end.x && s.z === end.z) && frames < 5000) {
    s = stepWander(s, dt, false)
    frames++
    assert.equal(s.turn, 0, 'he walks with the lantern down')
  }
  assert.ok(frames * dt <= length / WANDER.speed + 3 * dt, `${frames} frames for ${length}`)
  assert.equal(s.arrived, 0, 'arrived is 0 on the arrival frame')
  assert.ok(Math.abs(s.walked - length) < 1e-9, `walked ${s.walked}`)

  // rest, then raise
  let rested = 0
  while (s.arrived <= PAUSE.rest) {
    s = stepWander(s, dt, false)
    assert.equal(s.turn, 0, `turn stays 0 until arrived passes ${PAUSE.rest}`)
    if (++rested > 1000) throw new Error('arrived never passed the rest')
  }
  let raising = 0
  while (s.turn < 1) {
    s = stepWander(s, dt, false)
    if (++raising > 1000) throw new Error('turn never reached 1')
  }
  assert.ok(raising <= Math.ceil(PAUSE.turnIn / dt) + 2, `${raising} frames to raise`)
  assert.equal(offLanePose(s.turn).body, 0, 'off the lane the body does not turn')
  assert.equal(offLanePose(s.turn).raise, turnPose(1).raise)

  // a new tap from turn 1: he does not move until turn falls under the gate
  const lane = laneAt(0.23, 0)
  s = wanderTo(s, slot, lane.x, lane.z, null)!
  assert.equal(s.mode, 'returning')
  const held = { x: s.x, z: s.z }
  let waited = 0
  while (s.turn >= PAUSE.turnGate) {
    s = stepWander(s, dt, false)
    if (s.turn >= PAUSE.turnGate) assert.deepEqual({ x: s.x, z: s.z }, held, 'he stands while the lantern is up')
    if (++waited > 1000) throw new Error('turn never fell')
  }
  s = run(s, home)
  assert.equal(s.mode, 'lane')
  assert.deepEqual([s.x, s.z], [slot.x, slot.z])
  assert.equal(stepWander(s, dt, false), s, 'a lane state steps to itself')
})

test('stepWander: from a full dwell and back (Codex N2)', () => {
  const slot = hereAt(0.23)
  const [tx, tz] = vergeNear(slot)
  const target = { x: tx, z: tz }
  const lanePause: WanderState = { ...initialWander(), turn: 1 }
  const first = wanderTo(lanePause, slot, target.x, target.z, null)!
  assert.ok(Math.abs(wrap(first.yaw - (slot.yaw + turnPose(1).body))) < 1e-12, 'the trip starts at the drawn yaw')
  assert.equal(first.turn, 1)
  assert.equal(first.syaw, slot.yaw, 'the slot, unturned, is the yaw he comes home to')

  let s = run(first, arrived)
  const lane = laneAt(0.23, 0)
  s = wanderTo(s, slot, lane.x, lane.z, null)!
  let previous = s
  s = run(s, home, (frame) => {
    if (frame.mode !== 'lane') previous = frame
  })
  assert.equal(s.mode, 'lane')
  assert.deepEqual([s.x, s.z], [slot.x, slot.z])
  assert.ok(Math.abs(wrap(s.yaw - slot.yaw)) <= WANDER.yawSnap, 'his yaw is the slot\'s')
  assert.equal(s.turn, 0)
  // the frame before the lane takes him draws the lane's own first frame
  // one frame's turn at most: the lane's first frame follows it as a step of the turn, not a jump
  assert.ok(Math.abs(wrap(previous.yaw - slot.yaw)) <= WANDER.turn / 60 + WANDER.yawSnap, 'the last frame off the lane is within a frame\'s turn of the slot\'s yaw')
  assert.equal(previous.turn, 0)
  assert.deepEqual(offLanePose(previous.turn), turnPose(0))
})
