/** The church at stop 4 in the round (`tasks/2026-10-25-street-church-plan.md`): its turn, its frame, its light. */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Frustum, Matrix4, PerspectiveCamera, Vector3 } from 'three'
import { islandHeightAt } from '../src/scene/islandShape.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildStreet } from '../src/scene/streetGeometry.ts'
import { CHURCH_LIGHT } from '../src/scene/streetLight.ts'
import { CHURCH, churchFront, laneDistance, STREET, STREET_CHURCH, STREET_HOUSES, STREET_SQUARE, stationPose, vincentPlace, walkPose, type StationPose } from '../src/scene/streetLayout.ts'
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
  assert.ok(Math.abs(face('house-0', 'front').light - CHURCH_LIGHT.ambient) > 0.05, 'a house keeps the street light')
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
  const front = build.report.faces.find((f) => f.owner === 'house-0' && f.name === 'front')!
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
