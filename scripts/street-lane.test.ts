/**
 * The lane's walls, rail and lamps (K2 plan, tasks/2026-10-26-village-craft-k2-plan.md).
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { PerspectiveCamera, Vector3 } from 'three'

import { buildFrog, FROG, frogPlace, FROGS, SQUARE_TOP } from '../src/scene/frog.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildStreet, LANE_CRAFT } from '../src/scene/streetGeometry.ts'
import { grassChunks, inFootprint } from '../src/scene/streetGrass.ts'
import {
  doorOf,
  doorStepFoot,
  doorStepFrame,
  houseFrame,
  laneAt,
  laneDistance,
  pathPoint,
  pathTangent,
  stationPose,
  stepClearings,
  STREET_CHURCH,
  STREET_CYPRESS,
  STREET_HOUSES,
  STREET_LAMPS,
  STREET_WALL,
  vincentBoxCorners,
  walkPose,
} from '../src/scene/streetLayout.ts'
import { LAMP_LIGHT, lampHaloScale, LIFE, litWindows } from '../src/scene/streetLife.ts'
import { SOURCE_STROKES, STROKE_LIFT } from '../src/scene/streetStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const root = new URL('../', import.meta.url)
const flowPng = decodePNG(readFileSync(new URL('public/reference/land-flow.png', root)))
const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
const masses = JSON.parse(readFileSync(new URL('public/reference/land-masses.json', root), 'utf8')) as BakedMass[]

const workPainting = new URL('reference/derived/_work-painting.png', root)
const skip = !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI)'
const paintingPng = skip ? null : decodePNG(readFileSync(workPainting))
const realPainting: ImageData2D | null = paintingPng
  ? { data: new Uint8ClampedArray(paintingPng.rgba), width: paintingPng.width, height: paintingPng.height }
  : null

test('laneAt is the map the frogs use', () => {
  for (let i = 0; i < 20; i++) {
    const t = i / 19
    for (const lat of [-0.1, 0, 0.1]) {
      const [px, , pz] = pathPoint(t)
      const [tx, , tz] = pathTangent(t)
      const n = Math.hypot(tx, tz)
      const [nx, nz] = [-tz / n, tx / n]
      const expectedX = px + lat * nx
      const expectedZ = pz + lat * nz
      const res = laneAt(t, lat)
      assert.ok(Math.abs(res.x - expectedX) <= 1e-12, `x at t=${t}, lat=${lat}`)
      assert.ok(Math.abs(res.z - expectedZ) <= 1e-12, `z at t=${t}, lat=${lat}`)
      assert.ok(Math.abs(res.nx - nx) <= 1e-12, `nx at t=${t}, lat=${lat}`)
      assert.ok(Math.abs(res.nz - nz) <= 1e-12, `nz at t=${t}, lat=${lat}`)
    }
  }
})

test('the walls stand on the verges the plan names', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const walls = build.report.lane.walls
  assert.equal(walls.length, 3)
  const expectedSpecs = [
    { side: -1, t0: 0.06, t1: 0.22 },
    { side: 1, t0: 0.14, t1: 0.47 },
    { side: -1, t0: 0.54, t1: 0.84 },
  ]
  walls.forEach((w, idx) => {
    const exp = expectedSpecs[idx]
    assert.equal(w.side, exp.side)
    assert.ok(Math.abs(w.t0 - exp.t0) < 1e-9)
    assert.ok(Math.abs(w.t1 - exp.t1) < 1e-9)
    const segs = Math.ceil((exp.t1 - exp.t0) / STREET_WALL.segment)
    assert.equal(w.segments.length, segs)
    const dt = (exp.t1 - exp.t0) / segs
    w.segments.forEach((seg, sIdx) => {
      const t0 = exp.t0 + sIdx * dt
      const t1 = exp.t0 + (sIdx + 1) * dt
      assert.ok(Math.abs(seg.t0 - t0) < 1e-9)
      assert.ok(Math.abs(seg.t1 - t1) < 1e-9)
      assert.equal(seg.corners.length, 4)
      for (const c of seg.corners) {
        assert.equal(c.y, 0)
      }
      const q0 = laneAt(t0, w.side * STREET_WALL.inner)
      const q1 = laneAt(t1, w.side * STREET_WALL.inner)
      const q2 = laneAt(t1, w.side * (STREET_WALL.inner + STREET_WALL.thickness))
      const q3 = laneAt(t0, w.side * (STREET_WALL.inner + STREET_WALL.thickness))
      assert.ok(Math.hypot(seg.corners[0].x - q0.x, seg.corners[0].z - q0.z) < 1e-9)
      assert.ok(Math.hypot(seg.corners[1].x - q1.x, seg.corners[1].z - q1.z) < 1e-9)
      assert.ok(Math.hypot(seg.corners[2].x - q2.x, seg.corners[2].z - q2.z) < 1e-9)
      assert.ok(Math.hypot(seg.corners[3].x - q3.x, seg.corners[3].z - q3.z) < 1e-9)
    })
  })
})

test('every wall is drawn', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const H = STREET_WALL.height
  const pos = build.underpaint.positions
  for (const w of build.report.lane.walls) {
    const [u0, u1] = w.underpaint
    const [s0, s1] = w.strokes
    assert.ok(u1 > u0, 'underpaint range non-empty')
    assert.ok(u1 <= pos.length / 3, 'underpaint range within bounds')
    assert.ok(s1 > s0, 'strokes range non-empty')
    assert.ok(s1 <= build.strokes.arrays.positions.length / 3, 'strokes range within bounds')
    assert.equal(s1 - s0, 9 * w.dabs.length, 'strokes range length is 9 * dab count')

    for (let i = u0; i < u1; i++) {
      const vx = pos[i * 3]
      const vy = pos[i * 3 + 1]
      const vz = pos[i * 3 + 2]
      assert.ok(vy >= -1e-9 && vy <= H + 1e-9, `underpaint vertex y ${vy} in [0, ${H}]`)

      let insideAny = false
      for (const seg of w.segments) {
        const q0 = seg.corners[0]
        const q1 = seg.corners[1]
        const q3 = seg.corners[3]
        const dx = q1.x - q0.x
        const dz = q1.z - q0.z
        const len = Math.hypot(dx, dz)
        const ux = dx / len
        const uz = dz / len
        let nx = -uz
        let nz = ux
        if (nx * (q3.x - q0.x) + nz * (q3.z - q0.z) < 0) {
          nx = -nx
          nz = -nz
        }
        const cornersUV = seg.corners.map((c) => {
          const rx = c.x - q0.x
          const rz = c.z - q0.z
          return [rx * ux + rz * uz, rx * nx + rz * nz]
        })
        const minU = Math.min(...cornersUV.map((p) => p[0]))
        const maxU = Math.max(...cornersUV.map((p) => p[0]))
        const minK = Math.min(...cornersUV.map((p) => p[1]))
        const maxK = Math.max(...cornersUV.map((p) => p[1]))

        const rx = vx - q0.x
        const rz = vz - q0.z
        const pu = rx * ux + rz * uz
        const pk = rx * nx + rz * nz
        if (pu >= minU - 1e-6 && pu <= maxU + 1e-6 && pk >= minK - 1e-6 && pk <= maxK + 1e-6) {
          insideAny = true
          break
        }
      }
      assert.ok(insideAny, `vertex (${vx}, ${vy}, ${vz}) inside a segment frame`)
    }
  }
})

test("no wall touches a house, a step, the lane, Vincent, the cypress or a frog's ring", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const segDist = (p: [number, number], a: [number, number], b: [number, number]): number => {
    const d = [b[0] - a[0], b[1] - a[1]]
    const n = d[0] ** 2 + d[1] ** 2
    const t = n ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / n)) : 0
    return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1])
  }
  const cross = (a: [number, number], b: [number, number], p: [number, number]) =>
    (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const inside = (p: [number, number], q: [number, number][]) => {
    const cs = q.map((a, i) => cross(a, q[(i + 1) % q.length], p))
    return cs.every((x) => x >= -1e-12) || cs.every((x) => x <= 1e-12)
  }
  const ptDist = (p: [number, number], q: [number, number][]) =>
    inside(p, q) ? 0 : Math.min(...q.map((a, i) => segDist(p, a, q[(i + 1) % q.length])))
  const polyDist = (a: [number, number][], b: [number, number][]): number => {
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        const a0 = a[i], a1 = a[(i + 1) % a.length]
        const b0 = b[j], b1 = b[(j + 1) % b.length]
        if (cross(a0, a1, b0) * cross(a0, a1, b1) < 0 && cross(b0, b1, a0) * cross(b0, b1, a1) < 0) return 0
      }
    }
    return Math.min(...a.map((p) => ptDist(p, b)), ...b.map((p) => ptDist(p, a)))
  }

  const houses = STREET_HOUSES.map((h) => {
    const { along, toPath } = houseFrame(h)
    const p: [number, number] = [h.x, h.z]
    const a: [number, number] = [along.x, along.z]
    const n: [number, number] = [toPath.x, toPath.z]
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, k]) => [
      p[0] + (a[0] * s * h.w) / 2 + (n[0] * k * h.d) / 2,
      p[1] + (a[1] * s * h.w) / 2 + (n[1] * k * h.d) / 2,
    ] as [number, number])
  })
  const steps = STREET_HOUSES.map((h, i) => doorStepFoot(h, i))
  const vincentBoxes = Array.from({ length: 901 }, (_, k) => {
    const c = vincentBoxCorners(k / 1000).filter((p) => p[1] === 0)
    return [c[0], c[1], c[3], c[2]].map((p) => [p[0], p[2]] as [number, number])
  })

  for (const w of build.report.lane.walls) {
    for (const seg of w.segments) {
      const foot = seg.corners.map((c) => [c.x, c.z] as [number, number])
      for (let i = 0; i < houses.length; i++) {
        const d = polyDist(foot, houses[i])
        assert.ok(d >= 0.03 - 1e-6, `wall to house ${STREET_HOUSES[i].id}: ${d} >= 0.03`)
        const sd = polyDist(foot, steps[i])
        assert.ok(sd >= 0.03 - 1e-6, `wall to step ${STREET_HOUSES[i].id}: ${sd} >= 0.03`)
      }
      for (let k = 0; k < vincentBoxes.length; k++) {
        const vd = polyDist(foot, vincentBoxes[k])
        assert.ok(vd >= 0.03 - 1e-6, `wall to Vincent at ${k / 1000}: ${vd} >= 0.03`)
      }
      for (const p of foot) {
        const cd = Math.hypot(p[0] - STREET_CYPRESS.x, p[1] - STREET_CYPRESS.z)
        assert.ok(cd >= 0.07 - 1e-6, `wall to cypress: ${cd} >= 0.07`)
      }

      // lane face past lateral 0.06 + 0.03 = 0.09
      assert.ok(STREET_WALL.inner >= 0.06 + 0.03 - 1e-9)

      for (const f of FROGS.filter((fr) => fr.stop < 4)) {
        const [fx, , fz] = frogPlace(f).position
        const d = ptDist([fx, fz], foot)
        const gap = d - 0.012 - 3 * FROG.clear * f.scale
        assert.ok(gap >= 0.0015 - 1e-6, `wall to frog ${f.stop} ring gap: ${gap} >= 0.0015`)
      }
    }
  }
})

test('a stone is a dab of the measured size', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const H = STREET_WALL.height
  const strokePos = build.strokes.arrays.positions
  const [lenMin, lenMax] = LANE_CRAFT.wall.length
  const expWidth = LANE_CRAFT.wall.width * H
  const srcStroke = SOURCE_STROKES[LANE_CRAFT.wall.source]

  for (const w of build.report.lane.walls) {
    const [s0] = w.strokes
    w.dabs.forEach((dab, i) => {
      assert.ok(dab.length >= lenMin * H - 1e-9 && dab.length <= lenMax * H + 1e-9, `dab length ${dab.length}`)
      assert.ok(Math.abs(dab.width - expWidth) < 1e-9, `dab width ${dab.width}`)

      const vBase = (s0 + 9 * i) * 3
      const verts: Vector3[] = []
      for (let k = 0; k < 9; k++) {
        verts.push(new Vector3(strokePos[vBase + k * 3], strokePos[vBase + k * 3 + 1], strokePos[vBase + k * 3 + 2]))
      }

      const wMid = verts[5].distanceTo(verts[3])
      assert.ok(Math.abs(wMid - dab.width) < 1e-9, `|v5 - v3| ${wMid} == width ${dab.width}`)

      const pt = laneAt(dab.t, dab.lateral)
      const tangent = new Vector3(pt.nz, 0, -pt.nx)
      const vLen = Math.abs(verts[7].clone().sub(verts[1]).dot(tangent))
      assert.ok(vLen >= lenMin * H - 1e-4 && vLen <= lenMax * H + 1e-4, `vLen ${vLen} in [${lenMin}, ${lenMax}] * H`)
      assert.ok(Math.abs(vLen - dab.length) < 1e-4, `vLen ${vLen} within 1e-4 of dab.length ${dab.length}`)
      assert.ok(vLen >= srcStroke.length[0] * H - 1e-4 && vLen <= srcStroke.length[1] * H + 1e-4, `vLen within source measured length`)
      assert.ok(wMid >= srcStroke.width[0] * H - 1e-4 && wMid <= srcStroke.width[1] * H + 1e-4, `wMid within source measured width`)

      if (dab.face === 'lane') {
        assert.ok(Math.hypot(verts[4].x - pt.x, verts[4].z - pt.z) < 1e-9, `lane dab v4 (x, z)`)
        assert.ok(Math.abs(verts[4].y - dab.y) <= dab.width / 4 + 1e-9, `lane dab v4 y`)
      } else {
        assert.ok(Math.abs(verts[4].y - (H + STROKE_LIFT)) < 1e-9, `top dab v4 y`)
        assert.ok(Math.hypot(verts[4].x - pt.x, verts[4].z - pt.z) <= dab.width / 4 + 1e-9, `top dab v4 (x, z)`)
      }
    })
  }
})

test('the grass clears the walls', { skip }, () => {
  assert.ok(realPainting)
  const chunks = grassChunks(realPainting)
  const wallFootprints: [number, number][][] = []
  for (const [side, t0, t1] of [[-1, 0.06, 0.22], [1, 0.14, 0.47], [-1, 0.54, 0.84]] as const) {
    const n = Math.ceil((t1 - t0) / STREET_WALL.segment)
    const dt = (t1 - t0) / n
    for (let i = 0; i < n; i++) {
      const ta = t0 + i * dt
      const tb = t0 + (i + 1) * dt
      wallFootprints.push([
        [laneAt(ta, side * STREET_WALL.inner).x, laneAt(ta, side * STREET_WALL.inner).z],
        [laneAt(tb, side * STREET_WALL.inner).x, laneAt(tb, side * STREET_WALL.inner).z],
        [laneAt(tb, side * (STREET_WALL.inner + STREET_WALL.thickness)).x, laneAt(tb, side * (STREET_WALL.inner + STREET_WALL.thickness)).z],
        [laneAt(ta, side * (STREET_WALL.inner + STREET_WALL.thickness)).x, laneAt(ta, side * (STREET_WALL.inner + STREET_WALL.thickness)).z],
      ])
    }
  }

  const segDist = (p: [number, number], a: [number, number], b: [number, number]): number => {
    const d = [b[0] - a[0], b[1] - a[1]]
    const n = d[0] ** 2 + d[1] ** 2
    const t = n ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / n)) : 0
    return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1])
  }
  const cross = (a: [number, number], b: [number, number], p: [number, number]) =>
    (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const inside = (p: [number, number], q: [number, number][]) => {
    const cs = q.map((a, i) => cross(a, q[(i + 1) % q.length], p))
    return cs.every((x) => x >= -1e-12) || cs.every((x) => x <= 1e-12)
  }
  const ptDist = (p: [number, number], q: [number, number][]) =>
    inside(p, q) ? 0 : Math.min(...q.map((a, i) => segDist(p, a, q[(i + 1) % q.length])))

  for (const chunk of chunks) {
    for (const b of chunk.blades) {
      for (const foot of wallFootprints) {
        const d = ptDist([b.x, b.z], foot)
        assert.ok(d >= 0.012 - 1e-6, `blade at (${b.x}, ${b.z}) too close to wall: ${d} < 0.012`)
      }
    }
  }
})

test("the grass away from the walls is K1's", { skip }, () => {
  assert.ok(realPainting)
  const stepsChunks = grassChunks(realPainting, undefined, stepClearings())
  const hash = createHash('sha256').update(JSON.stringify(stepsChunks)).digest('hex').slice(0, 16)
  assert.equal(hash, 'def5470cc15817ba')

  const defaultChunks = grassChunks(realPainting)
  assert.equal(defaultChunks.length, stepsChunks.length)
  for (let i = 0; i < defaultChunks.length; i++) {
    const dc = defaultChunks[i]
    const sc = stepsChunks[i]
    let sIdx = 0
    for (const db of dc.blades) {
      while (sIdx < sc.blades.length && (sc.blades[sIdx].x !== db.x || sc.blades[sIdx].z !== db.z || sc.blades[sIdx].seed !== db.seed)) {
        sIdx++
      }
      assert.ok(sIdx < sc.blades.length, `blade (${db.x}, ${db.z}) found in steps-only chunk in order`)
      sIdx++
    }
  }
})

test('the walls cost what the plan says', { skip }, () => {
  assert.ok(realPainting)
  const buildWith = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const buildWithout = buildStreet(realPainting, flow, masses, { grass: true, lane: false })
  const delta = buildWith.counts.triangles - buildWithout.counts.triangles
  assert.ok(delta >= 1000 && delta <= 4000, `wall triangle delta ${delta} in [1000, 4000]`)
})

test('the rail closes the front garden, open at the door', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const rail = build.report.lane.rail
  assert.ok(rail, 'rail exists in report')
  assert.equal(rail.house, 'L2')

  const l2Index = STREET_HOUSES.findIndex((h) => h.id === 'L2')
  const h = STREET_HOUSES[l2Index]
  const f = doorStepFrame(h, l2Index)
  const door = doorOf(h, l2Index)
  const W = h.w
  const g = door.w * W + 0.02
  const a0 = door.cu * W - g / 2
  const a1 = door.cu * W + g / 2

  const point = (a: number, k: number): Vector3 =>
    new Vector3(f.ox + a * f.ux + k * f.nx, 0, f.oz + a * f.uz + k * f.nz)

  const chains: [number, number][][] = [
    [[-0.02, 0.03], [-0.02, 0.12]],
    [[-0.02, 0.12], [a0, 0.12]],
    [[a1, 0.12], [W + 0.02, 0.12]],
    [[W + 0.02, 0.12], [W + 0.02, 0.03]],
  ]

  const expectedPosts: Vector3[] = []
  for (const [start, end] of chains) {
    const len = Math.hypot(end[0] - start[0], end[1] - start[1])
    const spans = Math.ceil(len / 0.12)
    for (let i = 0; i <= spans; i++) {
      const a = start[0] + ((end[0] - start[0]) * i) / spans
      const k = start[1] + ((end[1] - start[1]) * i) / spans
      const p = point(a, k)
      if (!expectedPosts.some((q) => q.distanceTo(p) < 1e-9)) {
        expectedPosts.push(p)
      }
    }
  }

  assert.equal(expectedPosts.length, 7, 'Decision (c) gives 7 posts')
  assert.equal(rail.posts.length, 7, 'rail reports 7 posts')

  for (const exp of expectedPosts) {
    assert.ok(
      rail.posts.some((p) => p.distanceTo(exp) < 1e-9),
      `expected post at (${exp.x.toFixed(4)}, ${exp.z.toFixed(4)}) found`,
    )
  }

  // Neighbours along each chain are 0.12 or less apart
  for (const [start, end] of chains) {
    const len = Math.hypot(end[0] - start[0], end[1] - start[1])
    const spans = Math.ceil(len / 0.12)
    for (let i = 0; i < spans; i++) {
      const pA = point(start[0] + ((end[0] - start[0]) * i) / spans, start[1] + ((end[1] - start[1]) * i) / spans)
      const pB = point(start[0] + ((end[0] - start[0]) * (i + 1)) / spans, start[1] + ((end[1] - start[1]) * (i + 1)) / spans)
      assert.ok(pA.distanceTo(pB) <= 0.12 + 1e-9, `neighbours distance ${pA.distanceTo(pB)} <= 0.12`)
    }
  }

  // Gateposts are g apart and midpoint at a = door.cu * W, k = 0.12
  const [gp0, gp1] = rail.opening
  const expGp0 = point(a0, 0.12)
  const expGp1 = point(a1, 0.12)
  assert.ok(
    (gp0.distanceTo(expGp0) < 1e-9 && gp1.distanceTo(expGp1) < 1e-9) ||
    (gp0.distanceTo(expGp1) < 1e-9 && gp1.distanceTo(expGp0) < 1e-9),
    'opening gateposts match (a0, 0.12) and (a1, 0.12)',
  )
  assert.ok(Math.abs(gp0.distanceTo(gp1) - g) < 1e-9, `gateposts distance ${gp0.distanceTo(gp1)} == ${g}`)
  const mid = gp0.clone().add(gp1).multiplyScalar(0.5)
  const expMid = point(door.cu * W, 0.12)
  assert.ok(mid.distanceTo(expMid) < 1e-9, 'gateposts midpoint at door.cu * W, 0.12')
})

test('the rail stands in the grass, clear of everything', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const rail = build.report.lane.rail
  assert.ok(rail)

  const houses = STREET_HOUSES.map((h) => {
    const { along, toPath } = houseFrame(h)
    const p: [number, number] = [h.x, h.z]
    const a: [number, number] = [along.x, along.z]
    const n: [number, number] = [toPath.x, toPath.z]
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, k]) => [
      p[0] + a[0] * (s * h.w) / 2 + n[0] * (k * h.d) / 2,
      p[1] + a[1] * (s * h.w) / 2 + n[1] * (k * h.d) / 2,
    ] as [number, number])
  })
  const steps = STREET_HOUSES.map((h) => doorStepFoot(h, STREET_HOUSES.indexOf(h)))

  const segDist = (p: [number, number], a: [number, number], b: [number, number]): number => {
    const d = [b[0] - a[0], b[1] - a[1]]
    const n = d[0] ** 2 + d[1] ** 2
    const t = n ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / n)) : 0
    return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1])
  }
  const cross = (a: [number, number], b: [number, number], p: [number, number]) =>
    (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const inside = (p: [number, number], q: [number, number][]) => {
    const cs = q.map((a, i) => cross(a, q[(i + 1) % q.length], p))
    return cs.every((x) => x >= -1e-12) || cs.every((x) => x <= 1e-12)
  }
  const ptDist = (p: [number, number], q: [number, number][]) =>
    inside(p, q) ? 0 : Math.min(...q.map((a, i) => segDist(p, a, q[(i + 1) % q.length])))

  const wallFootprints: [number, number][][] = []
  for (const w of build.report.lane.walls) {
    for (const seg of w.segments) {
      wallFootprints.push(seg.corners.map((c) => [c.x, c.z] as [number, number]))
    }
  }

  for (const post of rail.posts) {
    assert.ok(inFootprint(post.x, post.z), `post at (${post.x}, ${post.z}) in grass footprint`)

    const pt: [number, number] = [post.x, post.z]
    for (let i = 0; i < houses.length; i++) {
      const d = ptDist(pt, houses[i])
      assert.ok(d >= 0.03 - 1e-6, `post to house ${STREET_HOUSES[i].id} ${d} >= 0.03`)
      const sd = ptDist(pt, steps[i])
      assert.ok(sd >= 0.03 - 1e-6, `post to step ${STREET_HOUSES[i].id} ${sd} >= 0.03`)
    }

    for (const wFoot of wallFootprints) {
      const d = ptDist(pt, wFoot)
      assert.ok(d >= 0.03 - 1e-6, `post to wall ${d} >= 0.03`)
    }

    const laneDist = laneDistance(post.x, post.z)
    assert.ok(laneDist - 0.06 >= 0.03 - 1e-6, `laneDistance - 0.06 = ${laneDist - 0.06} >= 0.03`)
  }
})

test('the rail is drawn and has no ink', { skip }, () => {
  assert.ok(realPainting)
  const buildWith = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const buildWithout = buildStreet(realPainting, flow, masses, { grass: true, lane: false })
  const rail = buildWith.report.lane.rail
  assert.ok(rail)

  const [u0, u1] = rail.underpaint
  assert.ok(u1 > u0, 'underpaint range non-empty')

  const l2Index = STREET_HOUSES.findIndex((h) => h.id === 'L2')
  const h = STREET_HOUSES[l2Index]
  const f = doorStepFrame(h, l2Index)
  const door = doorOf(h, l2Index)
  const W = h.w
  const g = door.w * W + 0.02
  const a0 = door.cu * W - g / 2
  const a1 = door.cu * W + g / 2

  const point = (a: number, k: number): Vector3 =>
    new Vector3(f.ox + a * f.ux + k * f.nx, 0, f.oz + a * f.uz + k * f.nz)

  const chains: [number, number][][] = [
    [[-0.02, 0.03], [-0.02, 0.12]],
    [[-0.02, 0.12], [a0, 0.12]],
    [[a1, 0.12], [W + 0.02, 0.12]],
    [[W + 0.02, 0.12], [W + 0.02, 0.03]],
  ]

  const spans: [Vector3, Vector3][] = []
  for (const [start, end] of chains) {
    const len = Math.hypot(end[0] - start[0], end[1] - start[1])
    const num = Math.ceil(len / 0.12)
    for (let i = 0; i < num; i++) {
      const pA = point(start[0] + ((end[0] - start[0]) * i) / num, start[1] + ((end[1] - start[1]) * i) / num)
      const pB = point(start[0] + ((end[0] - start[0]) * (i + 1)) / num, start[1] + ((end[1] - start[1]) * (i + 1)) / num)
      spans.push([pA, pB])
    }
  }

  const segDist = (p: [number, number], a: [number, number], b: [number, number]): number => {
    const d = [b[0] - a[0], b[1] - a[1]]
    const n = d[0] ** 2 + d[1] ** 2
    const t = n ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / n)) : 0
    return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1])
  }

  const upPositions = buildWith.underpaint.positions
  for (let vi = u0; vi < u1; vi++) {
    const vx = upPositions[vi * 3]
    const vy = upPositions[vi * 3 + 1]
    const vz = upPositions[vi * 3 + 2]

    assert.ok(vy >= -1e-9 && vy <= 0.05 + 1e-9, `vertex y ${vy} in [0, 0.05]`)

    // horizontally within 0.0035 of a post's foot or of a span's line
    let minDist = Infinity
    for (const post of rail.posts) {
      minDist = Math.min(minDist, Math.hypot(vx - post.x, vz - post.z))
    }
    for (const [sA, sB] of spans) {
      minDist = Math.min(minDist, segDist([vx, vz], [sA.x, sA.z], [sB.x, sB.z]))
    }
    assert.ok(minDist <= 0.00355, `vertex (${vx}, ${vz}) minDist ${minDist} <= 0.0035`)
  }

  // no ink: outlines vertex count equals lane: false build's
  assert.equal(
    buildWith.outlines.arrays.positions.length,
    buildWithout.outlines.arrays.positions.length,
    'rail adds no outlines ink',
  )
})

test('seven lamps alternate sides', () => {
  const table = [
    { t: 0.10, lateral: 0.11 },
    { t: 0.24, lateral: -0.11 },
    { t: 0.38, lateral: 0.11 },
    { t: 0.55, lateral: -0.11 },
    { t: 0.65, lateral: 0.11 },
    { t: 0.79, lateral: -0.11 },
    { t: 1.00, lateral: 0.20 },
  ]
  assert.equal(STREET_LAMPS.length, 7)
  for (let i = 0; i < 7; i++) {
    assert.equal(STREET_LAMPS[i].t, table[i].t)
    assert.equal(STREET_LAMPS[i].lateral, table[i].lateral)
    if (i > 0) {
      assert.ok(Math.sign(STREET_LAMPS[i].lateral) !== Math.sign(STREET_LAMPS[i - 1].lateral), 'signs alternate')
    }
  }
})

test("no lantern fills a stop's frame", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  assert.ok(build)
  const lamps = build.report.lane.lamps
  assert.equal(lamps.length, 7)

  const aspects: [string, number, boolean][] = [
    ['16:9', 16 / 9, false],
    ['16:10', 1.6, false],
    ['phone', 390 / 844, true],
  ]

  for (const lamp of lamps) {
    const p = lamp.lantern
    for (let stop = 0; stop < 5; stop++) {
      for (const [, aspect, portrait] of aspects) {
        const pose = stationPose(stop, portrait)
        const cam = new PerspectiveCamera(pose.fov, aspect, pose.near, pose.far)
        cam.position.set(...pose.position)
        cam.lookAt(new Vector3(...pose.target))
        cam.updateMatrixWorld()
        cam.updateProjectionMatrix()

        const q = p.clone().project(cam)
        const d = p.distanceTo(cam.position)
        if (q.z >= -1 && q.z < 1 && Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1) {
          assert.ok(d >= 0.35, `lantern at stop ${stop} distance ${d} >= 0.35`)
        }
      }
    }
  }
})

test('no halo fills the screen on the walk', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  assert.ok(build)
  const lamps = build.report.lane.lamps
  assert.equal(lamps.length, 7)

  const aspects: [string, number, boolean][] = [
    ['16:9', 16 / 9, false],
    ['16:10', 1.6, false],
    ['phone', 390 / 844, true],
  ]

  let maxExceeded = false

  for (const lamp of lamps) {
    const lantern = lamp.lantern
    for (const [, aspect, portrait] of aspects) {
      const poses: ReturnType<typeof walkPose>[] = []
      for (let s = 0; s < 5; s++) poses.push(stationPose(s, portrait))
      for (let k = 0; k <= 900; k++) poses.push(walkPose(k / 1000, portrait))

      for (const pose of poses) {
        const cam = new PerspectiveCamera(pose.fov, aspect, pose.near, pose.far)
        cam.position.set(...pose.position)
        cam.lookAt(new Vector3(...pose.target))
        cam.updateMatrixWorld()
        cam.updateProjectionMatrix()

        const c = lantern.clone().applyMatrix4(cam.matrixWorldInverse)
        if (-c.z <= pose.near) continue

        const s = lampHaloScale(-c.z, pose.fov, aspect)
        const c0 = new Vector3(c.x - s / 2, c.y - s / 2, c.z).applyMatrix4(cam.projectionMatrix)
        const c1 = new Vector3(c.x + s / 2, c.y + s / 2, c.z).applyMatrix4(cam.projectionMatrix)

        const heightFrac = Math.abs(c1.y - c0.y) / 2
        const widthFrac = Math.abs(c1.x - c0.x) / 2
        const larger = Math.max(heightFrac, widthFrac)

        assert.ok(larger <= LAMP_LIGHT.haloView + 1e-9, `larger fraction ${larger} <= ${LAMP_LIGHT.haloView}`)

        // Check if unscaled halo exceeds 1
        const sUnscaled = LAMP_LIGHT.halo
        const u0 = new Vector3(c.x - sUnscaled / 2, c.y - sUnscaled / 2, c.z).applyMatrix4(cam.projectionMatrix)
        const u1 = new Vector3(c.x + sUnscaled / 2, c.y + sUnscaled / 2, c.z).applyMatrix4(cam.projectionMatrix)
        const unscaledLarger = Math.max(Math.abs(u1.y - u0.y) / 2, Math.abs(u1.x - u0.x) / 2)
        if (unscaledLarger > 1) maxExceeded = true
      }
    }
  }

  assert.ok(maxExceeded, 'unscaled halo exceeds 1 at some pose (non-vacuous assertion)')
})

test('no pool lies over a frog', { skip }, () => {
  assert.ok(realPainting)
  const body = buildFrog(realPainting).body
  const poolY = LAMP_LIGHT.poolY
  const R = LIFE.pool[0]
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  assert.ok(build)
  const lamps = build.report.lane.lamps
  assert.equal(lamps.length, 7)

  const aspects: [string, number, boolean][] = [
    ['16:9', 16 / 9, false],
    ['16:10', 1.6, false],
    ['phone', 390 / 844, true],
  ]

  let hits = 0
  for (const spec of FROGS) {
    const place = frogPlace(spec)
    const c = Math.cos(place.yaw)
    const s = Math.sin(place.yaw)
    const verts: Vector3[] = []
    for (const a of [body.underpaint, body.strokes.arrays]) {
      for (let i = 0; i < a.positions.length; i += 3) {
        const [lx, ly, lz] = [a.positions[i] * spec.scale, a.positions[i + 1] * spec.scale, a.positions[i + 2] * spec.scale]
        verts.push(new Vector3(place.position[0] + c * lx + s * lz, place.position[1] + ly, place.position[2] - s * lx + c * lz))
      }
    }

    for (const [, aspect, portrait] of aspects) {
      const pose = stationPose(spec.stop, portrait)
      const cam = new PerspectiveCamera(pose.fov, aspect, pose.near, pose.far)
      cam.position.set(...pose.position)
      cam.lookAt(new Vector3(...pose.target))
      cam.updateMatrixWorld()
      cam.updateProjectionMatrix()

      for (const v of verts) {
        if (v.y >= poolY) continue
        const q = v.clone().project(cam)
        if (!(q.z >= -1 && q.z < 1 && Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1)) continue
        const f = (poolY - cam.position.y) / (v.y - cam.position.y)
        if (!(f > 0 && f < 1)) continue
        const hx = cam.position.x + f * (v.x - cam.position.x)
        const hz = cam.position.z + f * (v.z - cam.position.z)

        for (const lamp of lamps) {
          const r = Math.hypot(hx - lamp.foot.x, hz - lamp.foot.z)
          if (r < R) hits++
        }
      }
    }
  }

  assert.equal(hits, 0, 'no rays from frog stop to frog vertices cross a pool')
})

test('no lamp touches Vincent, a frog, a house, a wall or the rail', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  assert.ok(build)
  const lamps = build.report.lane.lamps
  assert.equal(lamps.length, 7)

  const houses = STREET_HOUSES.map((h) => {
    const { along, toPath } = houseFrame(h)
    const p: [number, number] = [h.x, h.z]
    const a: [number, number] = [along.x, along.z]
    const n: [number, number] = [toPath.x, toPath.z]
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, k]) => [
      p[0] + a[0] * (s * h.w) / 2 + n[0] * (k * h.d) / 2,
      p[1] + a[1] * (s * h.w) / 2 + n[1] * (k * h.d) / 2,
    ] as [number, number])
  })
  const steps = STREET_HOUSES.map((h) => doorStepFoot(h, STREET_HOUSES.indexOf(h)))

  const nave = STREET_CHURCH.nave
  const belfry = STREET_CHURCH.belfry
  const churchBoxes = [
    { x: nave.x, z: nave.z, w: nave.w, d: nave.d, yaw: nave.yaw },
    { x: belfry.cx, z: belfry.cz, w: belfry.width, d: belfry.width, yaw: belfry.yaw },
  ].map((h) =>
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, k]) => [
      h.x + (Math.cos(h.yaw) * (s * h.w)) / 2 - (Math.sin(h.yaw) * (k * h.d)) / 2,
      h.z + (Math.sin(h.yaw) * (s * h.w)) / 2 + (Math.cos(h.yaw) * (k * h.d)) / 2,
    ] as [number, number]),
  )

  const segDist = (p: [number, number], a: [number, number], b: [number, number]): number => {
    const d = [b[0] - a[0], b[1] - a[1]]
    const n = d[0] ** 2 + d[1] ** 2
    const t = n ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / n)) : 0
    return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1])
  }
  const cross = (a: [number, number], b: [number, number], p: [number, number]) =>
    (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const inside = (p: [number, number], q: [number, number][]) => {
    const cs = q.map((a, i) => cross(a, q[(i + 1) % q.length], p))
    return cs.every((x) => x >= -1e-12) || cs.every((x) => x <= 1e-12)
  }
  const ptDist = (p: [number, number], q: [number, number][]) =>
    inside(p, q) ? 0 : Math.min(...q.map((a, i) => segDist(p, a, q[(i + 1) % q.length])))

  const vincentBoxes = Array.from({ length: 901 }, (_, k) => {
    const c = vincentBoxCorners(k / 1000).filter((p) => p[1] === 0)
    return [c[0], c[1], c[3], c[2]].map((p) => [p[0], p[2]] as [number, number])
  })

  const wallFootprints: [number, number][][] = []
  for (const w of build.report.lane.walls) {
    for (const s of w.segments) {
      wallFootprints.push(s.corners.map((c) => [c.x, c.z] as [number, number]))
    }
  }

  const rail = build.report.lane.rail!
  const l2Index = STREET_HOUSES.findIndex((h) => h.id === 'L2')
  const l2H = STREET_HOUSES[l2Index]
  const l2F = doorStepFrame(l2H, l2Index)
  const l2Door = doorOf(l2H, l2Index)
  const l2W = l2H.w
  const l2G = l2Door.w * l2W + 0.02
  const l2A0 = l2Door.cu * l2W - l2G / 2
  const l2A1 = l2Door.cu * l2W + l2G / 2
  const l2Point = (a: number, k: number): [number, number] => [
    l2F.ox + a * l2F.ux + k * l2F.nx,
    l2F.oz + a * l2F.uz + k * l2F.nz,
  ]
  const railSpans: [[number, number], [number, number]][] = [
    [l2Point(-0.02, 0.03), l2Point(-0.02, 0.12)],
    [l2Point(-0.02, 0.12), l2Point(l2A0, 0.12)],
    [l2Point(l2A1, 0.12), l2Point(l2W + 0.02, 0.12)],
    [l2Point(l2W + 0.02, 0.12), l2Point(l2W + 0.02, 0.03)],
  ]

  for (const lamp of lamps) {
    const p: [number, number] = [lamp.foot.x, lamp.foot.z]

    // 0.03 or more from Vincent's box over 901 samples
    for (let k = 0; k < vincentBoxes.length; k++) {
      const d = ptDist(p, vincentBoxes[k])
      assert.ok(d >= 0.03 - 1e-6, `lamp to Vincent at ${k / 1000} ${d} >= 0.03`)
    }

    // 0.06 or more from each frog
    for (const f of FROGS) {
      const [fx, , fz] = frogPlace(f).position
      const fd = Math.hypot(p[0] - fx, p[1] - fz)
      assert.ok(fd >= 0.06 - 1e-6, `lamp to frog ${f.stop} ${fd} >= 0.06`)
    }

    // 0.03 or more outside every house, step, church nave and belfry
    for (let i = 0; i < houses.length; i++) {
      const hd = ptDist(p, houses[i])
      assert.ok(hd >= 0.03 - 1e-6, `lamp to house ${STREET_HOUSES[i].id} ${hd} >= 0.03`)
      const sd = ptDist(p, steps[i])
      assert.ok(sd >= 0.03 - 1e-6, `lamp to step ${STREET_HOUSES[i].id} ${sd} >= 0.03`)
    }
    for (const cb of churchBoxes) {
      const cd = ptDist(p, cb)
      assert.ok(cd >= 0.03 - 1e-6, `lamp to church box ${cd} >= 0.03`)
    }

    // 0.03 or more outside rail's posts and span lines
    for (const rp of rail.posts) {
      const rd = Math.hypot(p[0] - rp.x, p[1] - rp.z)
      assert.ok(rd >= 0.03 - 1e-6, `lamp to rail post ${rd} >= 0.03`)
    }
    for (const [sA, sB] of railSpans) {
      const rd = segDist(p, sA, sB)
      assert.ok(rd >= 0.03 - 1e-6, `lamp to rail span ${rd} >= 0.03`)
    }

    // Its edge (centre distance - 0.002) 0.02 or more from every wall segment's footprint
    for (const wf of wallFootprints) {
      const wd = ptDist(p, wf)
      assert.ok(wd - 0.002 >= 0.02 - 1e-6, `lamp edge to wall ${wd - 0.002} >= 0.02`)
    }
  }
})

test('a lantern is not a lit window', { skip }, () => {
  assert.ok(realPainting)
  const buildWith = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const buildWithout = buildStreet(realPainting, flow, masses, { grass: true, lane: false })
  assert.ok(buildWith && buildWithout)

  assert.equal(
    litWindows(buildWith.windows).length,
    litWindows(buildWithout.windows).length,
    'lanterns add no lit windows',
  )

  const lamps = buildWith.report.lane.lamps
  assert.equal(lamps.length, 7)

  const upCls = buildWith.underpaint.cls
  for (const lamp of lamps) {
    const [u0, u1] = lamp.underpaint
    assert.ok(u1 > u0, 'lamp underpaint range non-empty')
    const lanternCls2: number[] = []
    const otherCls0: number[] = []
    for (let vi = u0; vi < u1; vi++) {
      if (upCls[vi] === 2) lanternCls2.push(vi)
      else if (upCls[vi] === 0) otherCls0.push(vi)
      else assert.fail(`unexpected class ${upCls[vi]} on lamp vertex ${vi}`)
    }
    // 4 side quads = 16 vertices of class 2
    assert.equal(lanternCls2.length, 16, 'lantern four side quads are class 2 (16 vertices)')
    assert.ok(otherCls0.length > 0, 'other vertices are class 0')
  }
})

test("a lamp's pool lies over the lane's strokes", () => {
  assert.ok(LAMP_LIGHT.poolY > SQUARE_TOP, `poolY ${LAMP_LIGHT.poolY} > SQUARE_TOP ${SQUARE_TOP}`)
})

test("the lantern's cap faces up", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lane: true })
  const pos = build.underpaint.positions
  const capBaseY = LANE_CRAFT.lamp.height + LANE_CRAFT.lamp.lantern[1]

  for (const lamp of build.report.lane.lamps) {
    const [, u1] = lamp.underpaint
    const capBaseCenter = new Vector3(lamp.foot.x, capBaseY, lamp.foot.z)

    for (let t = 0; t < 4; t++) {
      const v0Idx = (u1 - 12 + t * 3) * 3
      const v1Idx = (u1 - 12 + t * 3 + 1) * 3
      const v2Idx = (u1 - 12 + t * 3 + 2) * 3

      const v0 = new Vector3(pos[v0Idx], pos[v0Idx + 1], pos[v0Idx + 2])
      const v1 = new Vector3(pos[v1Idx], pos[v1Idx + 1], pos[v1Idx + 2])
      const v2 = new Vector3(pos[v2Idx], pos[v2Idx + 1], pos[v2Idx + 2])

      const cross = v1.clone().sub(v0).cross(v2.clone().sub(v0))
      assert.ok(cross.y > 0, `triangle ${t} cross product y ${cross.y} > 0`)

      const centroid = v0.clone().add(v1).add(v2).divideScalar(3)
      const toCentroid = centroid.clone().sub(capBaseCenter)
      assert.ok(cross.dot(toCentroid) > 0, `triangle ${t} dot with vector from cap base centre > 0`)
    }
  }
})
