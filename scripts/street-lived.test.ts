/**
 * The village lived in, K3: door paths, signs of life, plaster strokes (tasks/2026-10-27-village-lived-in-plan.md).
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Vector3 } from 'three'

import { FROG, frogPlace, FROGS } from '../src/scene/frog.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildStreet, type LivedPath, type StreetBuild } from '../src/scene/streetGeometry.ts'
import { grassChunks } from '../src/scene/streetGrass.ts'
import {
  doorOf,
  doorStepFoot,
  doorStepFrame,
  laneAt,
  laneParam,
  LIVED_PATH,
  pathClearings,
  pathLegShapes,
  pathTangent,
  stepClearings,
  STREET,
  STREET_HOUSES,
  STREET_PATHS,
  STREET_TRIANGLE_BUDGET,
  streetClearings,
  wallClearings,
} from '../src/scene/streetLayout.ts'
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

function computeBuildHash(b: StreetBuild): string {
  const h = createHash('sha256')
  const add = (a: { positions: number[]; colors: number[]; indices: number[]; cls?: number[]; src?: number[] }) =>
    h.update(JSON.stringify([a.positions, a.colors, a.indices, a.cls ?? [], a.src ?? []]))
  for (const a of [b.underpaint, b.strokes.arrays, b.ground.arrays, b.outlines.arrays, b.windows, b.grassBase, b.trees.solid, b.trees.strokes]) add(a)
  for (const s of [b.strokes, b.ground, b.outlines]) h.update(JSON.stringify([s.stroke, s.seed, s.cls, s.src]))
  return h.digest('hex').slice(0, 16)
}

const cross = (a: [number, number], b: [number, number], p: [number, number]) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])

const inside = (p: [number, number], q: [number, number][]) => {
  const cs = q.map((a, i) => cross(a, q[(i + 1) % q.length], p))
  return cs.every((x) => x >= -1e-12) || cs.every((x) => x <= 1e-12)
}

const insideStrict = (p: [number, number], q: [number, number][]) => {
  const cs = q.map((a, i) => cross(a, q[(i + 1) % q.length], p))
  return cs.every((x) => x > 1e-9) || cs.every((x) => x < -1e-9)
}

const segDist = (p: [number, number], a: [number, number], b: [number, number]): number => {
  const d = [b[0] - a[0], b[1] - a[1]]
  const n = d[0] ** 2 + d[1] ** 2
  const t = n ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / n)) : 0
  return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1])
}

const segHit = (a0: [number, number], a1: [number, number], b0: [number, number], b1: [number, number]) =>
  cross(a0, a1, b0) * cross(a0, a1, b1) < 0 && cross(b0, b1, a0) * cross(b0, b1, a1) < 0

const polyDist = (A: [number, number][], B: [number, number][]): number => {
  if (A.some((p) => inside(p, B)) || B.some((p) => inside(p, A)) || A.some((a, i) => B.some((b, j) => segHit(a, A[(i + 1) % A.length], b, B[(j + 1) % B.length])))) return 0
  return Math.min(...A.map((p, i) => Math.min(...B.map((q, j) => Math.min(segDist(p, q, B[(j + 1) % B.length]), segDist(q, A[i], A[(i + 1) % A.length]))))))
}

const distance = (p: [number, number], q: [number, number][]): number =>
  inside(p, q) ? 0 : Math.min(...q.map((a, i) => segDist(p, a, q[(i + 1) % q.length])))

function legClearance(
  legs: { clip: [number, number][] }[],
  lamps: [number, number][],
  walls: [number, number][][],
  rings: { p: [number, number]; r: number }[],
): number {
  return Math.min(
    ...legs.flatMap(({ clip }) => [
      ...walls.map((w) => polyDist(clip, w)),
      ...lamps.map((q) => distance(q, clip)),
      ...rings.map((r) => distance(r.p, clip) - r.r),
    ]),
  )
}

test('every front door but L5 has a path, at the ends the plan names', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const paths = build.report.lived.paths
  assert.equal(paths.length, 9, '9 paths')
  for (let idx = 0; idx < STREET_PATHS.length; idx++) {
    const spec = STREET_PATHS[idx]
    const p = paths[idx]
    assert.equal(p.house, spec.house, `path ${idx} house is ${spec.house}`)
    if (spec.end === null) {
      assert.equal(p.end, null, `${spec.house} end is null`)
    } else {
      assert.ok(p.end !== null && Math.abs(p.end - spec.end) <= 1e-9, `${spec.house} end ${p.end} matches ${spec.end}`)
    }
    assert.equal(p.points.length, spec.legs === 2 ? 3 : 2, `${spec.house} points length`)
  }
})

test("a path starts at its step's front and ends at the lane's edge", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  for (const p of build.report.lived.paths) {
    const hIdx = STREET_HOUSES.findIndex((h) => h.id === p.house)
    const h = STREET_HOUSES[hIdx]
    const foot = doorStepFoot(h, hIdx)
    const midX = (foot[2][0] + foot[3][0]) / 2
    const midZ = (foot[2][1] + foot[3][1]) / 2
    assert.ok(Math.hypot(p.points[0].x - midX, p.points[0].z - midZ) <= 1e-9, `${p.house} starts at step front centre`)
    assert.ok(Math.abs(p.points[0].y - 0.002) <= 1e-9, `${p.house} start y is 0.002`)

    const last = p.points[p.points.length - 1]
    if (p.house === 'R5') {
      const f = doorStepFrame(h, hIdx)
      const expectedLastX = p.points[0].x + f.nx * 0.056
      const expectedLastZ = p.points[0].z + f.nz * 0.056
      assert.ok(Math.hypot(last.x - expectedLastX, last.z - expectedLastZ) <= 1e-9, 'R5 ends 0.056 along n')
    } else {
      assert.ok(p.end !== null)
      const e = laneAt(p.end, h.side * 0.06)
      assert.ok(Math.hypot(last.x - e.x, last.z - e.z) <= 1e-12, `${p.house} ends at laneAt(end, side * 0.06) to 1e-12`)
    }

    if (p.points.length === 3) {
      const spec = STREET_PATHS.find((sp) => sp.house === p.house)!
      const first = ('first' in spec && spec.first !== undefined ? spec.first : 0.08)
      const f = doorStepFrame(h, hIdx)
      const expectedMidX = p.points[0].x + f.nx * first
      const expectedMidZ = p.points[0].z + f.nz * first
      assert.ok(Math.hypot(p.points[1].x - expectedMidX, p.points[1].z - expectedMidZ) <= 1e-9, `${p.house} mid point`)
    }
  }
})

test("a path's width is its door's and the margin", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  for (const p of build.report.lived.paths) {
    const hIdx = STREET_HOUSES.findIndex((h) => h.id === p.house)
    const h = STREET_HOUSES[hIdx]
    const door = doorOf(h, hIdx)
    const expected = door.w * h.w + (p.house === 'L2' ? 0 : 0.02)
    assert.ok(Math.abs(p.width - expected) <= 1e-9, `${p.house} width ${p.width} vs ${expected}`)
  }
})

test('every leg clears the lamps, the walls and the frogs', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const lamps = build.report.lane.lamps.map((l) => [l.foot.x, l.foot.z] as [number, number])
  const walls = build.report.lane.walls.flatMap((w) => w.segments.map((s) => s.corners.map((c) => [c.x, c.z] as [number, number])))
  const rings = FROGS.map((fr) => {
    const [x, , z] = frogPlace(fr).position
    return { p: [x, z] as [number, number], r: fr.stop === 4 ? FROG.size * fr.scale : 3 * FROG.clear * fr.scale }
  })

  for (const p of build.report.lived.paths) {
    for (const leg of p.legs) {
      const clip2D = leg.clip.map((c) => [c.x, c.z] as [number, number])
      for (const lamp of lamps) {
        const d = distance(lamp, clip2D)
        assert.ok(d >= 0.03 - 1e-9, `${leg.name} clears lamp: ${d} >= 0.03`)
      }
      for (const wall of walls) {
        const d = polyDist(clip2D, wall)
        assert.ok(d >= 0.03 - 1e-9, `${leg.name} clears wall: ${d} >= 0.03`)
      }
      for (const ring of rings) {
        const d = distance(ring.p, clip2D) - ring.r
        assert.ok(d >= 0.03 - 1e-9, `${leg.name} clears frog: ${d} >= 0.03`)
      }
    }
  }
})

test('an end is the nearest that clears', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const lamps = build.report.lane.lamps.map((l) => [l.foot.x, l.foot.z] as [number, number])
  const walls = build.report.lane.walls.flatMap((w) => w.segments.map((s) => s.corners.map((c) => [c.x, c.z] as [number, number])))
  const rings = FROGS.map((fr) => {
    const [x, , z] = frogPlace(fr).position
    return { p: [x, z] as [number, number], r: fr.stop === 4 ? FROG.size * fr.scale : 3 * FROG.clear * fr.scale }
  })

  for (const spec of STREET_PATHS) {
    if (spec.end === null) continue
    const hIdx = STREET_HOUSES.findIndex((h) => h.id === spec.house)
    const h = STREET_HOUSES[hIdx]
    const p = build.report.lived.paths.find((path) => path.house === spec.house)!
    const startPt = [p.points[0].x, p.points[0].z] as [number, number]

    let bestDist = Infinity
    let tNear = 0
    for (let j = 0; j <= 10000; j++) {
      const t = j / 10000
      const e = laneAt(t, h.side * 0.06)
      const d = Math.hypot(e.x - startPt[0], e.z - startPt[1])
      if (d < bestDist) {
        bestDist = d
        tNear = t
      }
    }
    console.log(`${spec.house} tNear: ${tNear.toFixed(4)}`)

    let valid: number | null = null
    const maxSteps = Math.max(Math.round(tNear * 10000), Math.round((1 - tNear) * 10000))
    for (let step = 0; step <= maxSteps; step++) {
      const candidates: number[] = []
      const tLow = Math.round((tNear - step * 0.0001) * 10000) / 10000
      const tHigh = Math.round((tNear + step * 0.0001) * 10000) / 10000
      if (tLow >= 0 && tLow <= 1) candidates.push(tLow)
      if (tHigh >= 0 && tHigh <= 1 && tHigh !== tLow) candidates.push(tHigh)

      for (const tCand of candidates) {
        const candidatePath = {
          house: spec.house,
          index: hIdx,
          width: p.width,
          end: tCand,
          points: spec.legs === 2 ? [startPt, [p.points[1].x, p.points[1].z], [laneAt(tCand, h.side * 0.06).x, laneAt(tCand, h.side * 0.06).z]] as [number, number][] : [startPt, [laneAt(tCand, h.side * 0.06).x, laneAt(tCand, h.side * 0.06).z]] as [number, number][],
        }
        const candidateShapes = pathLegShapes(candidatePath)
        const c = legClearance(candidateShapes, lamps, walls, rings)
        if (c >= 0.03 - 1e-9) {
          valid = tCand
          break
        }
      }
      if (valid !== null) break
    }

    assert.ok(valid !== null, `${spec.house} found valid end`)
    assert.ok(Math.abs(spec.end - valid) <= 0.0006, `${spec.house} end ${spec.end} within 0.0006 of nearest valid ${valid}`)
  }
})

test("a path ends on the lane's edge", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  for (const p of build.report.lived.paths) {
    const lastLeg = p.legs[p.legs.length - 1]
    const c1 = [lastLeg.clip[1].x, lastLeg.clip[1].z] as [number, number]
    const c2 = [lastLeg.clip[2].x, lastLeg.clip[2].z] as [number, number]
    const lastPt = [p.points[p.points.length - 1].x, p.points[p.points.length - 1].z] as [number, number]

    if (p.house === 'R5') {
      const fwd = [STREET.forward[0], STREET.forward[2]] as [number, number]
      const fwdLen = Math.hypot(fwd[0], fwd[1])
      const fwdNorm: [number, number] = [fwd[0] / fwdLen, fwd[1] / fwdLen]
      const err1 = Math.abs(cross(lastPt, [lastPt[0] + fwdNorm[0], lastPt[1] + fwdNorm[1]], c1))
      const err2 = Math.abs(cross(lastPt, [lastPt[0] + fwdNorm[0], lastPt[1] + fwdNorm[1]], c2))
      assert.ok(err1 <= 1e-9, `R5 c1 on forward line: ${err1}`)
      assert.ok(err2 <= 1e-9, `R5 c2 on forward line: ${err2}`)
    } else {
      assert.ok(p.end !== null)
      const [tx, , tz] = pathTangent(p.end)
      const tLen = Math.hypot(tx, tz)
      const tanNorm: [number, number] = [tx / tLen, tz / tLen]
      const err1 = Math.abs(cross(lastPt, [lastPt[0] + tanNorm[0], lastPt[1] + tanNorm[1]], c1))
      const err2 = Math.abs(cross(lastPt, [lastPt[0] + tanNorm[0], lastPt[1] + tanNorm[1]], c2))
      assert.ok(err1 <= 1e-9, `${p.house} c1 on tangent line: ${err1}`)
      assert.ok(err2 <= 1e-9, `${p.house} c2 on tangent line: ${err2}`)

      const lat1 = Math.abs(laneParam(c1[0], c1[1])[1])
      const lat2 = Math.abs(laneParam(c2[0], c2[1])[1])
      assert.ok(Math.abs(lat1 - 0.06) <= 0.003, `${p.house} c1 lateral ${lat1} within 0.003 of 0.06`)
      assert.ok(Math.abs(lat2 - 0.06) <= 0.003, `${p.house} c2 lateral ${lat2} within 0.003 of 0.06`)
    }
  }
})

test("no paint runs past a leg's clip, and a bend paints once", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const pos = build.ground.arrays.positions

  for (const p of build.report.lived.paths) {
    for (const leg of p.legs) {
      const clip2D = leg.clip.map((c) => [c.x, c.z] as [number, number])
      for (let i = leg.ground[0]; i < leg.ground[1]; i++) {
        const x = pos[i * 3]
        const z = pos[i * 3 + 2]
        const d = distance([x, z], clip2D)
        assert.ok(d <= 1e-6, `vertex ${i} of ${leg.name} at (${x}, ${z}) outside clip: ${d}`)
      }
    }

    if (p.legs.length === 2) {
      const l0 = p.legs[0]
      const l1 = p.legs[1]
      assert.ok(l0.clip[1].distanceTo(l1.clip[0]) <= 1e-9, `${p.house} shared mitre corner 1/0`)
      assert.ok(l0.clip[2].distanceTo(l1.clip[3]) <= 1e-9, `${p.house} shared mitre corner 2/3`)

      const c0 = l0.clip.map((c) => [c.x, c.z] as [number, number])
      const c1 = l1.clip.map((c) => [c.x, c.z] as [number, number])
      for (const pt of c0) {
        assert.ok(!insideStrict(pt, c1), `${p.house} l0 vertex inside l1 strictly`)
      }
      for (const pt of c1) {
        assert.ok(!insideStrict(pt, c0), `${p.house} l1 vertex inside l0 strictly`)
      }
    }
  }
})

test('the grass clears the paths', { skip }, () => {
  assert.ok(realPainting)
  const clearings = pathClearings()
  assert.equal(clearings.length, 14, '14 path clearing rectangles')

  const chunks = grassChunks(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const allClips = build.report.lived.paths.flatMap((p) => p.legs.map((l) => l.clip.map((c) => [c.x, c.z] as [number, number])))

  for (const chunk of chunks) {
    for (const b of chunk.blades) {
      for (const clip of allClips) {
        const d = distance([b.x, b.z], clip)
        assert.ok(d >= 0.012 - 1e-6, `blade at (${b.x}, ${b.z}) too close to path clip: ${d} < 0.012`)
      }
    }
  }
})

test("the grass away from the paths is K2's", { skip }, () => {
  assert.ok(realPainting)
  const k2Clearings = [...stepClearings(), ...wallClearings()]
  const k2Chunks = grassChunks(realPainting, undefined, k2Clearings)
  const hash = createHash('sha256').update(JSON.stringify(k2Chunks)).digest('hex').slice(0, 16)
  assert.equal(hash, 'aa265c36150f8105', 'G1 hash matches')

  const defaultChunks = grassChunks(realPainting)
  for (const dc of defaultChunks) {
    const first = dc.blades[0]
    const sc = k2Chunks.find((c) => c.blades.some((b) => b.x === first.x && b.z === first.z && b.seed === first.seed))
    assert.ok(sc, `default chunk found matching k2 chunk`)
    let sIdx = 0
    for (const db of dc.blades) {
      while (sIdx < sc.blades.length && (sc.blades[sIdx].x !== db.x || sc.blades[sIdx].z !== db.z || sc.blades[sIdx].seed !== db.seed)) {
        sIdx++
      }
      assert.ok(sIdx < sc.blades.length, `blade (${db.x}, ${db.z}) found in k2 chunk in order`)
      sIdx++
    }
  }
})

test("a door path takes the lane's paint at its own cover", { skip }, () => {
  assert.ok(realPainting)
  assert.ok(LIVED_PATH.cover >= 0.15 && LIVED_PATH.cover <= 0.3, `cover ${LIVED_PATH.cover} in [0.15, 0.3]`)

  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const doorFaces = build.report.faces.filter((f) => f.owner === 'path' && f.name.startsWith('door '))
  assert.equal(doorFaces.length, 14, '14 door path faces')

  const seg0 = build.report.faces.find((f) => f.owner === 'path' && f.name === 'segment 0')!
  assert.ok(seg0, 'path/segment 0 face exists')

  for (const f of doorFaces) {
    assert.equal(f.source, 'field', 'source field')
    assert.equal(f.density, 1, 'density 1')
    assert.equal(f.cover, LIVED_PATH.cover, 'cover is LIVED_PATH.cover')
    assert.equal(f.light, 1, 'light is 1')
    assert.ok(Math.abs(f.base[0] - seg0.base[0]) <= 1e-9 && Math.abs(f.base[1] - seg0.base[1]) <= 1e-9 && Math.abs(f.base[2] - seg0.base[2]) <= 1e-9, 'base equals segment 0')
    assert.ok(f.ribbons >= 1, `${f.name} has ribbons >= 1`)

    // match to corresponding path leg to verify refHeight and corners
    const path = build.report.lived.paths.find((p) => p.legs.some((l) => l.name === f.name))!
    assert.ok(path, `found path for ${f.name}`)
    const expectedRefHeight = (0.2 * path.width) / 0.12
    assert.ok(Math.abs(f.refHeight - expectedRefHeight) <= 1e-9, `${f.name} refHeight matches`)

    const leg = path.legs.find((l) => l.name === f.name)!
    assert.equal(f.corners.length, leg.clip.length, 'corners length matches clip')
    for (let i = 0; i < leg.clip.length; i++) {
      assert.ok(f.corners[i].distanceTo(leg.clip[i]) <= 1e-9, `${f.name} corner ${i} equals clip`)
    }
  }

  for (const p of build.report.lived.paths) {
    for (const leg of p.legs) {
      assert.ok(leg.ground[1] > leg.ground[0], `${leg.name} ground range non-empty`)
      assert.ok(leg.ground[1] <= build.ground.arrays.positions.length / 3, `${leg.name} ground range within arrays`)
    }
  }
})

test('the paths cost what the plan says', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const legRanges = build.report.lived.paths.flatMap((p) => p.legs.map((l) => l.ground))
  const indices = build.ground.arrays.indices

  let pathTriangles = 0
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i]
    const i1 = indices[i + 1]
    const i2 = indices[i + 2]
    if (legRanges.some(([start, end]) => i0 >= start && i0 < end && i1 >= start && i1 < end && i2 >= start && i2 < end)) {
      pathTriangles++
    }
  }

  const expectedLower = 0.6 * 106700 * LIVED_PATH.cover
  const expectedUpper = 1.3 * 106700 * LIVED_PATH.cover
  assert.ok(
    pathTriangles >= expectedLower && pathTriangles <= expectedUpper,
    `path triangles ${pathTriangles} in [${expectedLower.toFixed(0)}, ${expectedUpper.toFixed(0)}]`,
  )
})

test('the default street fits its budget', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  assert.ok(
    build.counts.triangles <= STREET_TRIANGLE_BUDGET,
    `triangles ${build.counts.triangles} <= ${STREET_TRIANGLE_BUDGET}`,
  )
})

test("K2's street without the lived-in parts", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lived: false })!
  assert.deepEqual(build.report.lived, { paths: [], objects: [] })
  const hash = computeBuildHash(build)
  assert.equal(hash, '5f3ea9c0e97f6e46', 'B1 hash matches')
})
