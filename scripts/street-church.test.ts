/** The church at stop 4 in the round (`tasks/2026-10-25-street-church-plan.md`): its turn, its frame, its light. */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Frustum, Matrix4, PerspectiveCamera, Ray, Triangle, Vector3 } from 'three'
import { islandHeightAt } from '../src/scene/islandShape.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildStreet } from '../src/scene/streetGeometry.ts'
import { CHURCH_LIGHT } from '../src/scene/streetLight.ts'
import { CHURCH, churchFront, laneDistance, STREET, STREET_CHURCH, STREET_HOUSES, STREET_SQUARE, STREET_TREES, stationPose, vincentPlace, walkPose, type StationPose } from '../src/scene/streetLayout.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { VILLAGE_CHURCH } from '../src/scene/villageKnot.ts'
import { decodePNG } from './lib/png.ts'

const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
const masses = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]

// the light does not depend on the paint, so a flat painting serves (as `street-build.test.ts`)
function plainPainting(): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([[40, 60, 110, 255], [120, 140, 170, 255]][i % 2], i * 4)
  return { data, width, height }
}

const build = buildStreet(plainPainting(), flow, masses, { lit: true })!
const churchFaces = build.report.faces.filter((f) => ['church', 'belfry', 'spire'].includes(f.owner))
const { nave, belfry, spireTip } = STREET_CHURCH
const along = new Vector3(Math.cos(nave.yaw), 0, Math.sin(nave.yaw))
const toPath = new Vector3(-Math.sin(nave.yaw), 0, Math.cos(nave.yaw))
const naveAt = (x: number, z: number, y = 0) => new Vector3(nave.x, y, nave.z).addScaledVector(along, x).addScaledVector(toPath, z)
const bAlong = new Vector3(Math.cos(belfry.yaw), 0, Math.sin(belfry.yaw))
const bToPath = new Vector3(-Math.sin(belfry.yaw), 0, Math.cos(belfry.yaw))
const belfryAt = (x: number, z: number, y = 0) => new Vector3(belfry.cx, y, belfry.cz).addScaledVector(bAlong, x).addScaledVector(bToPath, z)
const tip = belfryAt(spireTip.dx, spireTip.dz, spireTip.y - islandHeightAt(VILLAGE_CHURCH.belfry.cx, VILLAGE_CHURCH.belfry.cz))
const ASPECTS = [[1600 / 900, false], [390 / 844, true]] as const

function camera4(aspect: number, portrait: boolean): PerspectiveCamera {
  const p = stationPose(4, portrait)
  const c = new PerspectiveCamera(p.fov, aspect, p.near, p.far)
  c.position.set(...p.position)
  c.lookAt(...p.target)
  c.updateMatrixWorld()
  return c
}

const degreesOff = (normal: Vector3, centre: Vector3, eye: Vector3) =>
  (Math.acos(normal.dot(eye.clone().setY(0).sub(centre.clone().setY(0)).normalize())) * 180) / Math.PI

test('stop 4 sees the gable and the moonlit side', () => {
  for (const [, portrait] of ASPECTS) {
    const eye = new Vector3(...stationPose(4, portrait).position)
    const gable = degreesOff(toPath, churchFront(), eye)
    const side = degreesOff(along, naveAt(nave.w / 2, 0), eye)
    assert.ok(gable >= 30 && gable <= 45, `the gable ${gable.toFixed(1)}° off stop 4, expected 30° to 45°`)
    assert.ok(side >= 55 && side <= 75, `the +along side ${side.toFixed(1)}° off stop 4, expected 55° to 75°`)
  }
})

test("the church's walls take the church's light, its roofs the street's", () => {
  const face = (owner: string, name: string) => {
    const f = build.report.faces.find((x) => x.owner === owner && x.name === name)
    assert.ok(f, `${owner} ${name} is clad`)
    return f
  }
  const gable = face('church', 'front gable').light
  assert.ok(Math.abs(gable - CHURCH_LIGHT.ambient) < 1e-9, `the gable reads ${gable}, the street's ambient is 0.4`)
  // the two walls stop 4 sees keep the moon's step between them: 0.9 × n·moon 0.207
  const side = face('church', 'right').light
  assert.ok(side - gable >= 0.15 && side - gable <= 0.2, `the moonlit side reads ${side.toFixed(3)} against the gable's ${gable}`)
  const roof = face('church', 'right roof').light
  assert.ok(roof >= 0.8 && roof <= 0.95, `the roof stop 4 sees reads ${roof.toFixed(3)}`)
  for (const f of churchFaces) {
    assert.ok(f.light <= 1, `${f.owner} ${f.name} reads ${f.light}, above its paint`)
  }
  assert.ok(Math.abs(face('house-0', 'front left').light - CHURCH_LIGHT.ambient) > 0.05, 'a house keeps the street light')
})

test('stop 4 frames the church: the whole spire on the phone', () => {
  const nearCorners = [naveAt(-nave.w / 2, nave.d / 2), naveAt(nave.w / 2, nave.d / 2), naveAt(nave.w / 2, -nave.d / 2)]
  const peak = churchFront().setY(nave.eave + nave.pitch)
  for (const [aspect, portrait] of ASPECTS) {
    const c = camera4(aspect, portrait)
    const points: [string, Vector3][] = [['the door', churchFront()], ['the gable peak', peak], ...nearCorners.map((p, i) => [`corner ${i}`, p] as [string, Vector3])]
    if (portrait) points.push(['the spire tip', tip])
    for (const [name, p] of points) {
      const n = p.clone().project(c)
      assert.ok(Math.abs(n.x) <= 0.92 && Math.abs(n.y) <= 0.92, `${name} at (${n.x.toFixed(2)}, ${n.y.toFixed(2)}), portrait ${portrait}`)
    }
  }
})

test('the turned church stands clear of the square, the lane, Vincent and the houses', () => {
  const half = belfry.width / 2
  const corners = [
    ...[[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, z]) => naveAt((x * nave.w) / 2, (z * nave.d) / 2)),
    ...[[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, z]) => belfryAt(x * half, z * half)),
  ]
  const [vx, , vz] = vincentPlace(0.9).position
  for (const p of corners) {
    assert.ok(Math.hypot(p.x - STREET_SQUARE.x, p.z - STREET_SQUARE.z) >= 0.23, `a corner ${Math.hypot(p.x - STREET_SQUARE.x, p.z - STREET_SQUARE.z).toFixed(3)} from the square's centre`)
    assert.ok(laneDistance(p.x, p.z) > 0.1, `a corner ${laneDistance(p.x, p.z).toFixed(3)} from the lane`)
    assert.ok(Math.hypot(p.x - vx, p.z - vz) > 0.1, 'a corner by Vincent at stop 4')
    for (const h of STREET_HOUSES) {
      // the corner in the house's frame, against its half extents
      const dx = p.x - h.x
      const dz = p.z - h.z
      const u = Math.abs(dx * Math.cos(h.yaw) + dz * Math.sin(h.yaw)) - h.w / 2
      const v = Math.abs(-dx * Math.sin(h.yaw) + dz * Math.cos(h.yaw)) - h.d / 2
      assert.ok(Math.hypot(Math.max(u, 0), Math.max(v, 0)) > 0.1, `a corner by ${h.id}`)
    }
  }
})

test('stop 0 is aimed as before the setback', () => {
  // the targets at `b06253f`, before the church moved
  const before = { false: [-0.0997487461327955, 0.06, -0.409105624206505], true: [-0.1784293632055391, 0.06, -0.38053376736937117] }
  for (const portrait of [false, true]) {
    stationPose(0, portrait).target.forEach((v, i) => assert.ok(Math.abs(v - before[`${portrait}`][i]) < 1e-12, `stop 0's target moved, portrait ${portrait}`))
  }
})

test("the belfry follows the nave (a guard: it fails if the turn reaches the nave alone)", () => {
  const local = (x: number, z: number, cx: number, cz: number, yaw: number) => {
    const [dx, dz] = [x - cx, z - cz]
    return [dx * Math.cos(yaw) + dz * Math.sin(yaw), -dx * Math.sin(yaw) + dz * Math.cos(yaw)]
  }
  const knot = local(VILLAGE_CHURCH.belfry.cx, VILLAGE_CHURCH.belfry.cz, VILLAGE_CHURCH.nave.x, VILLAGE_CHURCH.nave.z, VILLAGE_CHURCH.nave.yaw)
  const street = local(belfry.cx, belfry.cz, nave.x, nave.z, nave.yaw)
  assert.ok(Math.abs(knot[0] - street[0]) < 1e-9 && Math.abs(knot[1] - street[1]) < 1e-9)
  assert.equal(belfry.yaw, nave.yaw)
})

test("the church's faces take the shorter brush, and the houses keep theirs", () => {
  for (const f of churchFaces) assert.equal(f.refHeight, CHURCH.stroke, `${f.owner} ${f.name}`)
  const h = STREET_HOUSES[0]
  const front = build.report.faces.find((f) => f.owner === 'house-0' && f.name === 'front left')!
  assert.equal(front.refHeight, h.type === 'cottage' ? STREET.wallRef : h.eave)
})

// the poses the walk reaches, sampled: `t` by 0.01 and the five stations, at 1600 × 900 and 390 × 844 (the branch
// review sampled `t` by 0.001 at five more aspects, 21:9 to 32:9 and a tablet in portrait, and found no more)
const PROBE_POSES: [StationPose, number][] = ASPECTS.flatMap(([aspect, portrait]) => [
  ...Array.from({ length: 91 }, (_, k) => [walkPose(k / 100, portrait), aspect] as [StationPose, number]),
  ...([0, 1, 2, 3, 4] as const).map((i) => [stationPose(i, portrait), aspect] as [StationPose, number]),
])
const PROBE = PROBE_POSES.map(([p, aspect]) => {
  const c = new PerspectiveCamera(p.fov, aspect, p.near, p.far)
  c.position.set(...p.position)
  c.lookAt(...p.target)
  c.updateMatrixWorld()
  return { eye: c.position.clone(), frustum: new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse)) }
})

/** The sampled poses a face faces with a point of a 9 × 9 grid over it in frame. No occlusion, so it errs toward seen: a
 * face it calls unseen faces away from every sampled pose or lies outside its frame. */
function posesSeeing(corners: Vector3[], normal: Vector3): number {
  const points: Vector3[] = []
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 8; j++) {
      const [a, b] = [i / 8, j / 8]
      if (corners.length === 3) {
        if (a + b <= 1) points.push(corners[0].clone().multiplyScalar(1 - a - b).addScaledVector(corners[1], a).addScaledVector(corners[2], b))
      } else points.push(corners[0].clone().lerp(corners[1], a).lerp(corners[3].clone().lerp(corners[2], a), b))
    }
  }
  const centre = points.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(points.length)
  return PROBE.filter(({ eye, frustum }) => normal.dot(eye.clone().sub(centre)) > 0 && points.some((p) => frustum.containsPoint(p))).length
}

test('the faces no sampled pose sees are thinned, and only they', () => {
  for (const f of churchFaces) {
    const hidden = (CHURCH.hidden as readonly string[]).includes(`${f.owner}/${f.name}`)
    const seen = posesSeeing(f.corners, f.normal)
    assert.equal(seen === 0, hidden, `${f.owner} ${f.name}: seen by ${seen} poses, hidden ${hidden}`)
    assert.equal(f.density, hidden ? CHURCH.thin : 1, `${f.owner} ${f.name} clad at ${f.density}`)
  }
})

/** Whether a point is a vertex of the drawn windows' buffer: the report's quads are `opening`'s own (code review C1). */
const drawnWindow = (p: Vector3) => {
  const at = build.windows.positions
  for (let i = 0; i < at.length; i += 3) if (Math.abs(at[i] - p.x) < 1e-6 && Math.abs(at[i + 1] - p.y) < 1e-6 && Math.abs(at[i + 2] - p.z) < 1e-6) return true
  return false
}

test('the door is set into the wall', () => {
  const door = build.report.church.door
  assert.ok(door, 'the church reports its door')
  const { origin, normal } = door.plane
  const depth = (p: Vector3) => p.clone().sub(origin).dot(normal)
  for (const p of door.panel) {
    assert.ok(Math.abs(depth(p) + CHURCH.recess) < 1e-9, `the panel at ${depth(p).toFixed(4)}`)
    assert.ok(drawnWindow(p), 'the panel is drawn where the report says')
  }
  for (const quad of [...door.jambs, door.lintel]) {
    const depths = quad.map(depth)
    assert.ok(Math.abs(Math.max(...depths)) < 1e-9 && Math.abs(Math.min(...depths) + CHURCH.recess) < 1e-9, 'a reveal spans the wall to the panel')
  }
  // the hole: no face of the front wall covers the door's centre, and the three faces hold the wall less the door
  const front = churchFaces.filter((f) => f.owner === 'church' && f.name.startsWith('front ') && f.name !== 'front gable')
  assert.equal(front.length, 3)
  const centre = door.panel.reduce((s, p) => s.add(p), new Vector3()).divideScalar(4).addScaledVector(normal, CHURCH.recess)
  const area = (c: Vector3[]) => c[1].clone().sub(c[0]).cross(c[3].clone().sub(c[0])).length()
  for (const f of front) {
    const [a, b, , d] = f.corners
    const [u, v] = [b.clone().sub(a), d.clone().sub(a)]
    const s = centre.clone().sub(a).dot(u) / u.lengthSq()
    const t = centre.clone().sub(a).dot(v) / v.lengthSq()
    assert.ok(!(s > 0 && s < 1 && t > 0 && t < 1), `${f.name} covers the door`)
  }
  const wall = nave.w * nave.eave
  const hole = area(door.panel)
  assert.ok(Math.abs(front.reduce((s, f) => s + area(f.corners), 0) - (wall - hole)) < 1e-9)
})

test("the step stands at the door's foot", () => {
  const door = build.report.church.door!
  const { origin, normal } = door.plane
  const points = door.step.flat()
  const top = Math.max(...points.map((p) => p.y))
  const out = Math.max(...points.map((p) => p.clone().sub(origin).dot(normal)))
  assert.ok(top > 0 && top <= 0.015, `the step's top at ${top}`)
  assert.ok(out >= 0.02 && out <= 0.04, `the step's front ${out} beyond the wall`)
  assert.ok(Math.abs(door.panel[0].distanceTo(door.panel[1]) - door.step[0][0].distanceTo(door.step[0][1])) < 1e-9, "the step is the door's width")
})

test('the long side has three windows', () => {
  const windows = build.report.church.windows
  assert.ok(windows && windows.length === 3)
  // the moonlit side: the nave's +along wall, the one stop 4 sees
  const side = churchFaces.find((f) => f.owner === 'church' && f.name === 'right')
  assert.ok(side, 'the church reports its right wall')
  assert.ok(side.normal.dot(along) > 0.99, 'the right wall faces along the nave')
  const [a, b] = side.corners
  const run = b.clone().sub(a)
  const spans = windows.map((quad, i) => {
    for (const p of quad) {
      assert.ok(Math.abs(p.clone().sub(a).dot(side.normal) - 0.0055) < 1e-9, `window ${i} lies on the right wall`)
      assert.ok(drawnWindow(p), `window ${i} is drawn where the report says`)
    }
    const heights = quad.map((p) => (p.y - a.y) / nave.eave)
    assert.ok(Math.min(...heights) >= 0.25 && Math.max(...heights) <= 0.85, `window ${i} spans ${Math.min(...heights)} to ${Math.max(...heights)} of the eave`)
    const s = quad.map((p) => p.clone().sub(a).dot(run) / run.lengthSq())
    return [Math.min(...s), Math.max(...s)] as const
  }).sort((p, q) => p[0] - q[0])
  for (let i = 0; i < 3; i++) {
    assert.ok(spans[i][0] > 0 && spans[i][1] < 1, `window ${i} is inside the wall`)
    if (i > 0) assert.ok(spans[i - 1][1] < spans[i][0], `windows ${i - 1} and ${i} overlap`)
  }
})

// Slice 1, Task 1 (tasks/2026-10-29-church-square-plan.md): the church's own sources, by name
test("the church's walls are painted by name: the right wall lit, the rest shade", () => {
  const nave = churchFaces.filter((f) => f.owner === 'church' && !f.name.endsWith('roof'))
  const byName = (n: string) => nave.find((f) => f.name === n)!
  assert.equal(byName('right').source, 'churchLit')
  for (const n of ['front gable', 'back', 'left', 'back gable']) assert.equal(byName(n).source, 'churchShade', n)
  for (const f of nave.filter((f) => f.name.startsWith('front ') && f.name !== 'front gable')) assert.equal(f.source, 'churchShade', f.name)
})

test('the belfry takes belfry and the spire takes spire', () => {
  assert.ok(churchFaces.some((f) => f.owner === 'belfry') && churchFaces.some((f) => f.owner === 'spire'))
  for (const f of churchFaces.filter((f) => f.owner === 'belfry')) assert.equal(f.source, 'belfry')
  for (const f of churchFaces.filter((f) => f.owner === 'spire')) assert.equal(f.source, 'spire')
})

test('no house uses a church source', () => {
  /* guard: passes before the code too */
  for (const f of build.report.faces.filter((f) => f.owner.startsWith('house-')))
    assert.ok(!['churchLit', 'churchShade', 'spire', 'belfry'].includes(f.source), `${f.owner} ${f.name}`)
})

test('the tones do not depend on the light flag', () => {
  /* guard: passes before the code too */
  const unlit = buildStreet(plainPainting(), flow, masses, { lit: false })!
  const srcOf = (b: typeof unlit) => b.report.faces.filter((f) => ['church', 'belfry', 'spire'].includes(f.owner)).map((f) => f.source)
  assert.deepEqual(srcOf(unlit), srcOf(build))
})

// Task 3: the two flanking trees stand against the nave (design decision (f)), and the wind cannot cover the openings.
// rectDistance is the flat distance from a point to a yawed rectangle (`scratch/.../probe-design-r0.mjs`).
function rectDistance(x: number, z: number, h: { x: number; z: number; yaw: number; w: number; d: number }): number {
  const dx = x - h.x
  const dz = z - h.z
  const u = dx * Math.cos(h.yaw) + dz * Math.sin(h.yaw)
  const v = -dx * Math.sin(h.yaw) + dz * Math.cos(h.yaw)
  return Math.hypot(Math.max(0, Math.abs(u) - h.w / 2), Math.max(0, Math.abs(v) - h.d / 2))
}
const treeOf = (id: string) => {
  const t = STREET_TREES.find((x) => x.id === id)
  assert.ok(t, `${id} is a street tree`)
  return t
}
const treeBuffers = [build.trees.solid, build.trees.strokes]
/** the largest flat distance of a built vertex from its nearest tree's foot, for that tree */
function reachOf(id: string): number {
  let reach = 0
  for (const a of treeBuffers) {
    for (let i = 0; i < a.positions.length; i += 3) {
      const d = STREET_TREES.map((t) => Math.hypot(a.positions[i] - t.x, a.positions[i + 2] - t.z))
      const k = d.indexOf(Math.min(...d))
      if (STREET_TREES[k].id === id) reach = Math.max(reach, d[k])
    }
  }
  return reach
}

test('the two flanking trees stand close against the nave and clear of it', () => {
  const gaps = ['orchard-lower', 'olive-right'].map((id) => ({ id, gap: rectDistance(treeOf(id).x, treeOf(id).z, nave) - reachOf(id) }))
  for (const { id, gap } of gaps) console.log(`[margin] ${id}'s crown is ${gap.toFixed(4)} from the nave (0.025 to 0.05)`)
  for (const { id, gap } of gaps) assert.ok(gap >= 0.025 && gap <= 0.05, `${id}'s crown is ${gap.toFixed(4)} from the nave`)
})

// Codex F3: a finite set of poses is not a bound on a swaying crown, a distance is. The shader moves a vertex by at most
// 0.06 y² along x and 0.6 of that along z (`streetLife.ts` `swayInjection`): at most 0.06 y² × √(1 + 0.36) in all.
const SWAY = Math.sqrt(1 + 0.36)
const sway = (y: number) => 0.06 * Math.max(y, 0) ** 2 * SWAY
const lerp3 = (a: Vector3, b: Vector3, u: number) => a.clone().lerp(b, u)

/** the least distance between segments p1q1 and p2q2 (Ericson, Real-Time Collision Detection 5.1.9) */
function segmentSegmentDistance(p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3): number {
  const d1 = q1.clone().sub(p1)
  const d2 = q2.clone().sub(p2)
  const r = p1.clone().sub(p2)
  const a = d1.dot(d1)
  const e = d2.dot(d2)
  const f = d2.dot(r)
  let s: number
  let t: number
  if (a <= 1e-18 && e <= 1e-18) return p1.distanceTo(p2)
  if (a <= 1e-18) {
    s = 0
    t = Math.min(1, Math.max(0, f / e))
  } else {
    const c = d1.dot(r)
    if (e <= 1e-18) {
      t = 0
      s = Math.min(1, Math.max(0, -c / a))
    } else {
      const b = d1.dot(d2)
      const denom = a * e - b * b
      s = denom > 1e-18 ? Math.min(1, Math.max(0, (b * f - c * e) / denom)) : 0
      t = (b * s + f) / e
      if (t < 0) {
        t = 0
        s = Math.min(1, Math.max(0, -c / a))
      } else if (t > 1) {
        t = 1
        s = Math.min(1, Math.max(0, (b - c) / a))
      }
    }
  }
  return p1.clone().addScaledVector(d1, s).distanceTo(p2.clone().addScaledVector(d2, t))
}

/** 0 when the segment ep crosses the triangle, else the least of its distances to the three edges and the endpoints' to the face */
function segmentTriangleDistance(e: Vector3, p: Vector3, a: Vector3, b: Vector3, c: Vector3): number {
  const dir = p.clone().sub(e)
  const len = dir.length()
  const hit = new Ray(e, dir.clone().normalize()).intersectTriangle(a, b, c, false, new Vector3())
  if (hit && hit.distanceTo(e) <= len) return 0
  const edges = Math.min(segmentSegmentDistance(e, p, a, b), segmentSegmentDistance(e, p, b, c), segmentSegmentDistance(e, p, c, a))
  const tri = new Triangle(a, b, c)
  // a zero-area triangle (the tree's builder emits some) has no face: three's closest point on it is NaN, and its edges say it all
  if (tri.getArea() < 1e-12) return edges
  const out = new Vector3()
  return Math.min(edges, tri.closestPointToPoint(e, out).distanceTo(e), tri.closestPointToPoint(p, out).distanceTo(p))
}

test('no crown reaches a line of sight to the door, a window or the gable peak from stops 3 and 4, in the wind', () => {
  const started = Date.now()
  // the eyes: stops 3 and 4, landscape and portrait (the portrait eyes coincide, so they are listed once)
  const eyes: Vector3[] = []
  for (const portrait of [false, true]) {
    for (const i of [3, 4] as const) {
      const e = new Vector3(...stationPose(i, portrait).position)
      if (!eyes.some((x) => x.distanceTo(e) < 1e-9)) eyes.push(e)
    }
  }
  // the targets: each quad sampled 5 × 5 (corners included), the peak once
  const targets: Vector3[] = []
  const quad = (q: Vector3[]) => {
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) targets.push(lerp3(lerp3(q[0], q[1], j / 4), lerp3(q[3], q[2], j / 4), i / 4))
  }
  const door = build.report.church.door
  assert.ok(door && build.report.church.windows, 'the church reports its door and windows')
  quad(door.panel)
  for (const w of build.report.church.windows) quad(w)
  targets.push(churchFront().setY(nave.eave + nave.pitch))
  // the crown's triangles, each with its sway bound and its box grown by it
  type Tri = { a: Vector3; b: Vector3; c: Vector3; dT: number; lo: Vector3; hi: Vector3 }
  const triangles: Tri[] = []
  for (const arr of treeBuffers) {
    const v = (k: number) => new Vector3(arr.positions[3 * k], arr.positions[3 * k + 1], arr.positions[3 * k + 2])
    for (let i = 0; i < arr.indices.length; i += 3) {
      const a = v(arr.indices[i])
      const b = v(arr.indices[i + 1])
      const c = v(arr.indices[i + 2])
      const dT = Math.max(sway(a.y), sway(b.y), sway(c.y))
      triangles.push({
        a,
        b,
        c,
        dT,
        lo: new Vector3(Math.min(a.x, b.x, c.x) - dT, Math.min(a.y, b.y, c.y) - dT, Math.min(a.z, b.z, c.z) - dT),
        hi: new Vector3(Math.max(a.x, b.x, c.x) + dT, Math.max(a.y, b.y, c.y) + dT, Math.max(a.z, b.z, c.z) + dT),
      })
    }
  }
  let tested = 0
  let margin = Infinity
  let worst = ''
  for (const e of eyes) {
    for (const p of targets) {
      const lx = Math.min(e.x, p.x)
      const hx = Math.max(e.x, p.x)
      const ly = Math.min(e.y, p.y)
      const hy = Math.max(e.y, p.y)
      const lz = Math.min(e.z, p.z)
      const hz = Math.max(e.z, p.z)
      for (const T of triangles) {
        if (T.hi.x < lx || T.lo.x > hx || T.hi.y < ly || T.lo.y > hy || T.hi.z < lz || T.lo.z > hz) continue
        tested++
        const distance = segmentTriangleDistance(e, p, T.a, T.b, T.c)
        const here = () => `eye ${e.toArray().map((x) => x.toFixed(3))} target ${p.toArray().map((x) => x.toFixed(3))} triangle ${[T.a, T.b, T.c].map((q) => `(${q.toArray().map((x) => x.toFixed(4))})`).join(' ')} distance ${distance.toFixed(5)} dT ${T.dT.toFixed(5)}`
        if (!(distance > T.dT)) assert.fail(`a crown triangle within ${T.dT.toFixed(4)} of a line of sight: ${here()}`)
        if (distance - T.dT < margin) {
          margin = distance - T.dT
          worst = here()
        }
      }
    }
  }
  console.log(`[margin] ${eyes.length} eyes, ${targets.length} targets, ${triangles.length} triangles, ${tested} boxed pairs; the least distance - dT is ${margin.toFixed(5)} (${worst || 'no pair near a line'}); ${((Date.now() - started) / 1000).toFixed(1)} s`)
})
