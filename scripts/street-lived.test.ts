/**
 * The village lived in, K3: door paths, signs of life, plaster strokes (tasks/2026-10-27-village-lived-in-plan.md).
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three'

import { FROG, frogPlace, FROGS } from '../src/scene/frog.ts'
import { bladeVertex, bladeWidth, GRASS_BLADE } from '../src/scene/grassBlade.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildStreet, LIVED_CRAFT, type StreetBuild, WALL_PAINT } from '../src/scene/streetGeometry.ts'
import { grassChunks, grassDrawCount, grassRect, PLANT, plantChunks, plantHit } from '../src/scene/streetGrass.ts'
import {
  doorOf,
  doorStepFoot,
  doorStepFrame,
  houseFrame,
  laneAt,
  laneParam,
  LIVED_PATH,
  objectPlaces,
  pathClearings,
  pathLegShapes,
  pathTangent,
  STATION_T,
  stepClearings,
  STREET,
  STREET_HOUSES,
  STREET_OBJECTS,
  STREET_PATHS,
  STREET_TRIANGLE_BUDGET,
  streetClearings,
  walkPose,
  wallClearings,
} from '../src/scene/streetLayout.ts'
import { faceConfig, OUTLINE_FRACTION, type StreetFace } from '../src/scene/streetStrokes.ts'
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

test('the three objects stand by their doors', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const objs = build.report.lived.objects
  assert.equal(objs.length, 3, '3 objects')
  assert.equal(objs[0].kind, 'bench')
  assert.equal(objs[0].house, 'L2')
  assert.equal(objs[1].kind, 'pot')
  assert.equal(objs[1].house, 'R4')
  assert.equal(objs[2].kind, 'pail')
  assert.equal(objs[2].house, 'L4')

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

  for (const obj of objs) {
    const spec = STREET_OBJECTS.find((o) => o.kind === obj.kind)!
    const hIdx = STREET_HOUSES.findIndex((h) => h.id === obj.house)
    const h = STREET_HOUSES[hIdx]
    const f = doorStepFrame(h, hIdx)
    const door = doorOf(h, hIdx)
    const a = spec.side === -1 ? 2 * door.cu * h.w - spec.a : spec.a
    const expectedCentre = [f.ox + a * f.ux + spec.k * f.nx, f.oz + a * f.uz + spec.k * f.nz]
    assert.ok(Math.hypot(obj.centre.x - expectedCentre[0], obj.centre.z - expectedCentre[1]) <= 1e-9, `${obj.kind} centre`)

    assert.ok(Math.abs(spec.k - obj.box.n / 2 - 0.01) <= 1e-9, `${obj.kind} near edge 0.01 from wall`)

    const pathSpec = STREET_PATHS.find((sp) => sp.house === obj.house)!
    const pathWidth = door.w * h.w + ('margin' in pathSpec && pathSpec.margin !== undefined ? pathSpec.margin : LIVED_PATH.margin)
    const pathU0 = door.cu * h.w - pathWidth / 2
    const pathU1 = door.cu * h.w + pathWidth / 2
    const objU0 = a - obj.box.u / 2
    const objU1 = a + obj.box.u / 2
    const distToPath = Math.min(Math.abs(objU0 - pathU1), Math.abs(pathU0 - objU1))
    assert.ok(distToPath >= 0.01 - 1e-9, `${obj.kind} footprint >= 0.01 from path strip: ${distToPath}`)

    // footprint corners in world coordinates
    const fpCorners: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([su, sn]) => {
      const uOff = a + (su * obj.box.u) / 2
      const nOff = spec.k + (sn * obj.box.n) / 2
      return [f.ox + uOff * f.ux + nOff * f.nx, f.oz + uOff * f.uz + nOff * f.nz]
    })

    const stepCorners = doorStepFoot(h, hIdx)
    assert.ok(polyDist(fpCorners, stepCorners) >= 0.01 - 1e-9, `${obj.kind} outside step rectangle`)

    for (let i = 0; i < houses.length; i++) {
      if (STREET_HOUSES[i].id !== obj.house) {
        const d = polyDist(fpCorners, houses[i])
        assert.ok(d >= 0.03 - 1e-9, `${obj.kind} >= 0.03 from house ${STREET_HOUSES[i].id}: ${d}`)
      }
    }

    if (obj.kind === 'bench') {
      assert.ok(objU0 >= 0.02 - 1e-9 && h.w - objU1 >= 0.02 - 1e-9, 'bench within house width by 0.02')
      assert.ok(0.10 - (spec.k + obj.box.n / 2) >= 0.02 - 1e-9, 'bench k under 0.10 by 0.02')
      for (const post of build.report.lane.rail!.posts) {
        const d = distance([post.x, post.z], fpCorners)
        assert.ok(d >= 0.01 - 1e-9, `bench >= 0.01 from rail post: ${d}`)
      }
    }
  }
})

test('every object is drawn', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const pos = build.underpaint.positions
  const outPos = build.outlines.arrays.positions

  for (const obj of build.report.lived.objects) {
    assert.ok(obj.underpaint[1] > obj.underpaint[0], `${obj.kind} underpaint non-empty`)
    const spec = STREET_OBJECTS.find((o) => o.kind === obj.kind)!
    const hIdx = STREET_HOUSES.findIndex((h) => h.id === obj.house)
    const h = STREET_HOUSES[hIdx]
    const f = doorStepFrame(h, hIdx)
    const door = doorOf(h, hIdx)
    const a = spec.side === -1 ? 2 * door.cu * h.w - spec.a : spec.a

    for (let i = obj.underpaint[0]; i < obj.underpaint[1]; i++) {
      const px = pos[i * 3]
      const py = pos[i * 3 + 1]
      const pz = pos[i * 3 + 2]
      assert.ok(py >= -1e-6 && py <= obj.box.height + 1e-6, `${obj.kind} underpaint vertex ${i} y in box`)
      const dx = px - f.ox
      const dz = pz - f.oz
      const uVal = dx * f.ux + dz * f.uz
      const nVal = dx * f.nx + dz * f.nz
      assert.ok(uVal >= a - obj.box.u / 2 - 1e-6 && uVal <= a + obj.box.u / 2 + 1e-6, `${obj.kind} u in box`)
      assert.ok(nVal >= spec.k - obj.box.n / 2 - 1e-6 && nVal <= spec.k + obj.box.n / 2 + 1e-6, `${obj.kind} n in box`)
    }

    if (obj.kind === 'bench') {
      assert.equal(obj.outlines[0], obj.outlines[1], 'bench outlines empty')
    } else {
      assert.ok(obj.outlines[1] > obj.outlines[0], `${obj.kind} outlines non-empty`)
      const refHeight = obj.kind === 'pot' ? 0.022 : 0.018
      const allowance = LIVED_CRAFT.ink.lift + 1.5 * OUTLINE_FRACTION * refHeight + 1e-6
      for (let i = obj.outlines[0]; i < obj.outlines[1]; i++) {
        const px = outPos[i * 3]
        const py = outPos[i * 3 + 1]
        const pz = outPos[i * 3 + 2]
        assert.ok(py >= -allowance && py <= obj.box.height + allowance, `${obj.kind} ink y in box`)
        const dx = px - f.ox
        const dz = pz - f.oz
        const uVal = dx * f.ux + dz * f.uz
        const nVal = dx * f.nx + dz * f.nz
        assert.ok(uVal >= a - obj.box.u / 2 - allowance && uVal <= a + obj.box.u / 2 + allowance, `${obj.kind} ink u in box`)
        assert.ok(nVal >= spec.k - obj.box.n / 2 - allowance && nVal <= spec.k + obj.box.n / 2 + allowance, `${obj.kind} ink n in box`)
      }
    }
  }
})

test('the rail did not move', { skip }, () => {
  assert.ok(realPainting)
  const buildLived = buildStreet(realPainting, flow, masses, { grass: true, lived: true })!
  const buildFalse = buildStreet(realPainting, flow, masses, { grass: true, lived: false })!
  const rLived = buildLived.report.lane.rail!
  const rFalse = buildFalse.report.lane.rail!
  assert.equal(rLived.underpaint[1] - rLived.underpaint[0], rFalse.underpaint[1] - rFalse.underpaint[0])
  for (let i = rLived.underpaint[0] * 3; i < rLived.underpaint[1] * 3; i++) {
    assert.equal(buildLived.underpaint.positions[i], buildFalse.underpaint.positions[i], `rail pos ${i}`)
    assert.equal(buildLived.underpaint.colors[i], buildFalse.underpaint.colors[i], `rail col ${i}`)
  }
})

test("the pot plant is a clump of the grass's blades on the pot's top", { skip }, () => {
  assert.ok(realPainting)
  assert.ok(PLANT.scale >= 0.6 && PLANT.scale <= 0.8, 'PLANT.scale in [0.6, 0.8]')
  const chunks = plantChunks(realPainting)
  assert.equal(chunks.length, 1, '1 plant chunk')
  const chunk = chunks[0]
  assert.equal(chunk.y, PLANT.y, 'chunk.y is PLANT.y')
  assert.equal(chunk.y, LIVED_CRAFT.pot.height, 'chunk.y is pot height')
  assert.ok(chunk.blades.length >= 5 && chunk.blades.length <= 9, '5 to 9 blades')

  const pot = objectPlaces().find((p) => p.kind === 'pot')!
  for (const b of chunk.blades) {
    assert.ok(Math.hypot(b.x - pot.centre[0], b.z - pot.centre[1]) <= 0.011 + 1e-9, 'root within 0.011 of pot centre')
    assert.ok(b.height >= 0.75 * PLANT.scale * 0.036 - 1e-9 && b.height <= 1.25 * PLANT.scale * 0.036 + 1e-9, 'blade height in range')
    assert.ok(b.halfWidth >= PLANT.scale * 0.0024 - 1e-9 && b.halfWidth <= PLANT.scale * 0.0034 + 1e-9, 'blade halfWidth in range')
    assert.ok(Math.abs(b.curl) >= 0.5 - 1e-9, '|curl| >= 0.5')
  }

  assert.equal(chunk.latIn, 10, 'latIn is 10')
  const count = grassDrawCount(chunk, [pot.centre[0], 0, pot.centre[1] + 2])
  assert.equal(count, chunk.blades.length, 'all blades drawn at distance 2')

  const rect = grassRect(grassChunks(realPainting))
  assert.ok(pot.centre[0] >= rect[0] && pot.centre[0] <= rect[0] + rect[2], 'pot x in grass rect')
  assert.ok(pot.centre[1] >= rect[1] && pot.centre[1] <= rect[1] + rect[3], 'pot z in grass rect')
})

test("the plant's sphere holds every blade", { skip }, () => {
  assert.ok(realPainting)
  const chunks = plantChunks(realPainting)
  const chunk = chunks[0]
  const sphereCentre = new Vector3(...chunk.sphere.centre)
  const sphereRadius = chunk.sphere.radius

  let fixedFails = 0
  const fixedCentre = new Vector3(chunk.sphere.centre[0], 0.02, chunk.sphere.centre[2])

  for (let k = 0; k <= 90; k++) {
    const t = k / 100
    for (const portrait of [false, true]) {
      const pose = walkPose(t, portrait)
      const c = pose.position
      for (const b of chunk.blades) {
        const dx = c[0] - b.x
        const dz = c[2] - b.z
        const h = Math.hypot(dx, dz)
        const right: [number, number] = [dz / h, -dx / h]
        const widen = Math.max(1, Math.hypot(dx, c[1] - PLANT.y, dz) / GRASS_BLADE.widenFrom)
        for (const a of [0, 0.25, 0.5, 0.75, 1]) {
          for (const across of [-bladeWidth(a), bladeWidth(a)]) {
            const v = bladeVertex(b, a, across, right, widen)
            for (let dir = 0; dir < 8; dir++) {
              const angle = (dir * Math.PI) / 4
              const disp = (GRASS_BLADE.push + GRASS_BLADE.wind) * a * a
              // The shader clamps the dropped height at the root (grassShader.ts), not the drop
              const y = Math.max(0, v[1] - 0.7 * disp * a)
              const pt = new Vector3(v[0] + disp * Math.cos(angle), y, v[2] + disp * Math.sin(angle))
              assert.ok(
                pt.distanceTo(sphereCentre) <= sphereRadius + 1e-9,
                `blade point (${pt.x}, ${pt.y}, ${pt.z}) outside sphere`,
              )
              if (pt.distanceTo(fixedCentre) > 0.06) fixedFails++
            }
          }
        }
      }
    }
  }
  assert.ok(fixedFails > 0, 'fixed sphere fails as expected')
})

test('a pointer on a leaf of the pot plant pushes it', { skip }, () => {
  assert.ok(realPainting)
  const chunks = plantChunks(realPainting)
  const chunk = chunks[0]
  const poses: [string, number][] = [
    ...STATION_T.map((t) => ['stop', t] as [string, number]),
    ...[0.3, 0.36, 0.5, 0.55].map((t) => ['walk', t] as [string, number]),
  ]

  let rays = 0
  const counterexample = new Set<string>()
  for (const [view, portrait, aspect] of [
    ['desktop', false, 1600 / 900],
    ['phone', true, 390 / 844],
  ] as const) {
    for (const [kind, t] of poses) {
      const pose = walkPose(t, portrait)
      const cam = new PerspectiveCamera(pose.fov, aspect, pose.near, pose.far)
      cam.position.set(...pose.position)
      cam.lookAt(...pose.target)
      cam.updateMatrixWorld()

      for (const b of chunk.blades) {
        const dx = cam.position.x - b.x
        const dz = cam.position.z - b.z
        const h = Math.hypot(dx, dz)
        const right: [number, number] = [dz / h, -dx / h]
        const widen = Math.max(1, Math.hypot(dx, cam.position.y - PLANT.y, dz) / GRASS_BLADE.widenFrom)
        for (const a of [0.25, 0.5, 0.75, 1]) {
          for (const across of [0, -bladeWidth(a), bladeWidth(a)]) {
            const v = bladeVertex(b, a, across, right, widen)
            const pt = new Vector3(v[0], v[1] + PLANT.y, v[2])
            const ndc = pt.clone().project(cam)
            if (!(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1 && ndc.z > -1)) continue
            const rc = new Raycaster()
            rc.setFromCamera(new Vector2(ndc.x, ndc.y), cam)
            rays++
            if (kind === 'stop' && t === STATION_T[2] && chunk.blades.indexOf(b) === 3 && a === 0.75) counterexample.add(view)
            const hit = plantHit(rc.ray.origin, rc.ray.direction, chunks)
            assert.ok(
              hit !== null,
              `MISS: ${view} ${kind} ${t} blade ${chunk.blades.indexOf(b)} a=${a} across=${across.toFixed(3)} (Codex counterexample: stop 2, blade 3, a 0.75)`,
            )
            const plantCx = (chunk.box.min[0] + chunk.box.max[0]) / 2
            const plantCz = (chunk.box.min[2] + chunk.box.max[2]) / 2
            assert.ok(Math.hypot(hit[0] - plantCx, hit[1] - plantCz) <= 1e-12, 'hit equals plant centre')

            for (const [sx, sz] of [
              [0.1 * right[0], 0.1 * right[1]],
              [-0.1 * right[0], -0.1 * right[1]],
            ]) {
              const q = pt.clone().add(new Vector3(sx, 0, sz))
              const qn = q.clone().project(cam)
              const qr = new Raycaster()
              qr.setFromCamera(new Vector2(qn.x, qn.y), cam)
              const hitSide = plantHit(qr.ray.origin, qr.ray.direction, chunks)
              assert.equal(hitSide, null, 'side point must miss')
            }
          }
        }
      }
    }
  }
  // The count moves with PLANT.scale as leaf points cross the frame's edge (816 at 0.7), so it is not pinned
  assert.ok(rays > 0, 'some leaf points are in frame')
  assert.deepEqual([...counterexample].sort(), ['desktop', 'phone'], "Codex's counterexample is cast on both viewports")
})

test('the grass clears the objects', { skip }, () => {
  assert.ok(realPainting)
  assert.equal(streetClearings().length, 10 + 37 + 14 + 3, '64 clearings')
  const chunks = grassChunks(realPainting)
  const objs = objectPlaces()

  for (const chunk of chunks) {
    for (const b of chunk.blades) {
      for (const obj of objs) {
        const spec = STREET_OBJECTS.find((o) => o.kind === obj.kind)!
        const f = obj.frame
        const h = STREET_HOUSES[obj.index]
        const door = doorOf(h, obj.index)
        const a = spec.side === -1 ? 2 * door.cu * h.w - spec.a : spec.a
        const box = obj.kind === 'bench' ? [0.10, 0.03] : obj.kind === 'pot' ? [0.022, 0.022] : [0.016, 0.016]
        const fpCorners: [number, number][] = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([su, sn]) => {
          const uOff = a + (su * box[0]) / 2
          const nOff = spec.k + (sn * box[1]) / 2
          return [f.ox + uOff * f.ux + nOff * f.nx, f.oz + uOff * f.uz + nOff * f.nz]
        })
        const d = distance([b.x, b.z], fpCorners)
        assert.ok(d >= 0.012 - 1e-6, `blade at (${b.x}, ${b.z}) too close to ${obj.kind}: ${d} < 0.012`)
      }
    }
  }
})

test('the objects cost what the plan says', { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const objs = build.report.lived.objects

  let totalTriangles = 0
  const uIdx = build.underpaint.indices
  for (let i = 0; i < uIdx.length; i += 3) {
    const i0 = uIdx[i], i1 = uIdx[i + 1], i2 = uIdx[i + 2]
    if (objs.some((o) => i0 >= o.underpaint[0] && i0 < o.underpaint[1] && i1 >= o.underpaint[0] && i1 < o.underpaint[1] && i2 >= o.underpaint[0] && i2 < o.underpaint[1])) {
      totalTriangles++
    }
  }

  const oIdx = build.outlines.arrays.indices
  for (let i = 0; i < oIdx.length; i += 3) {
    const i0 = oIdx[i], i1 = oIdx[i + 1], i2 = oIdx[i + 2]
    if (objs.some((o) => i0 >= o.outlines[0] && i0 < o.outlines[1] && i1 >= o.outlines[0] && i1 < o.outlines[1] && i2 >= o.outlines[0] && i2 < o.outlines[1])) {
      totalTriangles++
    }
  }

  assert.ok(totalTriangles >= 700 && totalTriangles <= 1300, `object triangles ${totalTriangles} in [700, 1300]`)
})

test('the plaster houses take the measured shorter row, the church keeps its own', { skip }, () => {
  assert.ok(WALL_PAINT.plasterLength !== undefined && WALL_PAINT.plasterLength >= 0.7 && WALL_PAINT.plasterLength <= 0.75, 'plasterLength in 0.7..0.75')
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const houses = ['house-0', 'house-3', 'house-6', 'house-8']
  const plasterHouseFaces = build.report.faces.filter((f) => f.source === 'plaster' && houses.includes(f.owner))
  assert.ok(plasterHouseFaces.length > 0, 'has plaster house faces')
  for (const f of plasterHouseFaces) {
    assert.equal(f.lengthScale, WALL_PAINT.plasterLength, `${f.owner}/${f.name} lengthScale`)
    assert.ok(
      Math.abs(f.cover - WALL_PAINT.cover * (WALL_PAINT.plasterLength ?? 1)) <= 1e-9,
      `${f.owner}/${f.name} cover`,
    )
  }

  const churchPlasterFaces = build.report.faces.filter((f) => ['church', 'belfry', 'spire'].includes(f.owner))
  assert.ok(churchPlasterFaces.length > 0, 'has church plaster faces')
  for (const f of churchPlasterFaces) {
    assert.equal(f.lengthScale, 1, `${f.owner}/${f.name} lengthScale`)
  }

  const madeFace: StreetFace = {
    origin: new Vector3(0, 0, 0),
    u: new Vector3(0.28, 0, 0),
    v: new Vector3(0, 0.3, 0),
    normal: new Vector3(0, 0, 1),
    shape: 'quad',
    kind: 'wall',
    source: 'plaster',
    refHeight: 0.3,
    seed: 1,
    mirror: false,
  }
  const c1 = faceConfig(madeFace, undefined, 64)
  const c2 = faceConfig(madeFace, undefined, 64, 0.7)
  assert.ok(Math.abs(c2.minLength - 0.7 * c1.minLength) <= 1e-12, 'minLength scaled by 0.7')
  assert.ok(Math.abs(c2.maxLength - 0.7 * c1.maxLength) <= 1e-12, 'maxLength scaled by 0.7')
})

test("the plaster houses' ribbon count holds", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true })!
  const houses = ['house-0', 'house-3', 'house-6', 'house-8']
  const houseRibbons = build.report.faces
    .filter((f) => f.source === 'plaster' && houses.includes(f.owner))
    .reduce((sum, f) => sum + f.ribbons, 0)
  assert.ok(
    houseRibbons >= 392 && houseRibbons <= 480,
    `plaster house ribbons ${houseRibbons} in [392, 480]`,
  )

  const churchPlasterRibbons = build.report.faces
    .filter((f) => f.source === 'plaster' && ['church', 'belfry', 'spire'].includes(f.owner))
    .reduce((sum, f) => sum + f.ribbons, 0)
  assert.equal(churchPlasterRibbons, 729, 'church plaster ribbons 729 exactly')
})

test("K2's walls without the lived-in parts", { skip }, () => {
  assert.ok(realPainting)
  const build = buildStreet(realPainting, flow, masses, { grass: true, lived: false })!
  assert.ok(
    build.report.faces.every((f) => f.lengthScale === 1),
    'every face reports lengthScale 1',
  )
  const hash = computeBuildHash(build)
  assert.equal(hash, '5f3ea9c0e97f6e46', 'B1 hash matches')
})
