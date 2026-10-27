/**
 * The street's grass (S3 task 2, tasks/2026-10-24-street-s3-plan.md):
 * the blades, the chunks, culling, and the clipped ground.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { Frustum, Matrix4, PerspectiveCamera, Vector3 } from 'three'

import { bladeReach, bladeVertex, GRASS_BLADE } from '../src/scene/grassBlade.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { buildFlatPanel, buildStreet } from '../src/scene/streetGeometry.ts'
import {
  GRASS,
  grassChunks,
  grassDrawCount,
  grassRect,
  inFootprint,
} from '../src/scene/streetGrass.ts'
import {
  laneParam,
  pathPoint,
  pathTangent,
  stepClearings,
  STREET,
  STREET_CYPRESS,
  STREET_HOUSES,
  STREET_SQUARE,
  walkPose,
} from '../src/scene/streetLayout.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

// every test here samples the painting, which is derived and not in CI (as street-vincent's paint test): CI skips them,
// and the Lead's gate runs them where the painting is
const workPainting = new URL('../reference/derived/_work-painting.png', import.meta.url)
const skip = !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI)'
const paintingPng = skip ? null : decodePNG(readFileSync(workPainting))
const painting: ImageData2D = paintingPng
  ? { data: new Uint8ClampedArray(paintingPng.rgba), width: paintingPng.width, height: paintingPng.height }
  : { data: new Uint8ClampedArray(4), width: 1, height: 1 }

const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
const flow: ImageData2D = {
  data: new Uint8ClampedArray(flowPng.rgba),
  width: flowPng.width,
  height: flowPng.height,
}

const masses = JSON.parse(
  readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8'),
) as BakedMass[]

const insideHouse = (x: number, z: number, m: number) =>
  STREET_HOUSES.some((h) => {
    const dx = x - h.x
    const dz = z - h.z
    const c = Math.cos(h.yaw)
    const s = Math.sin(h.yaw)
    return Math.abs(dx * c + dz * s) < h.w / 2 + m && Math.abs(-dx * s + dz * c) < h.d / 2 + m
  })

const isExcluded = (x: number, z: number) =>
  insideHouse(x, z, GRASS.house) ||
  Math.hypot(x - STREET_CYPRESS.x, z - STREET_CYPRESS.z) < GRASS.cypress ||
  Math.hypot(x - STREET_SQUARE.x, z - STREET_SQUARE.z) < STREET_SQUARE.radius

const walkCameras: [number, number, number][] = []
for (let k = 0; k <= 900; k++) {
  const t = k / 1000
  walkCameras.push(walkPose(t, false).position)
  walkCameras.push(walkPose(t, true).position)
}

const chunks = skip ? [] : grassChunks(painting)

test('the grass keeps off the houses, the tree, the square and the path', { skip }, () => {
  assert.ok(chunks.length > 0)
  let count = 0
  for (const ch of chunks) {
    for (const b of ch.blades) {
      count++
      const [, lat] = laneParam(b.x, b.z)
      assert.ok(Math.abs(lat) >= 0.052 - 1e-6, `blade lat ${Math.abs(lat)} >= 0.052`)
      assert.ok(!insideHouse(b.x, b.z, GRASS.house - 1e-6), 'blade clears houses')
      assert.ok(
        Math.hypot(b.x - STREET_CYPRESS.x, b.z - STREET_CYPRESS.z) >= GRASS.cypress - 1e-6,
        'blade clears cypress',
      )
      assert.ok(
        Math.hypot(b.x - STREET_SQUARE.x, b.z - STREET_SQUARE.z) >= STREET_SQUARE.radius - 1e-6,
        'blade clears square',
      )
    }
  }
  assert.ok(count > 10000, `found ${count} blades`)
})

test('the density falls with the distance from the lane', { skip }, () => {
  const localChunks = grassChunks(painting, undefined, stepClearings())
  const bandCounts = [0, 0, 0]
  for (const ch of localChunks) {
    for (const b of ch.blades) {
      const [, lat] = laneParam(b.x, b.z)
      const a = Math.abs(lat)
      for (let bi = 0; bi < 3; bi++) {
        if (a >= GRASS.bands[bi] - 1e-6 && a < GRASS.bands[bi + 1] + 1e-6) {
          bandCounts[bi]++
          break
        }
      }
    }
  }

  for (let bi = 0; bi < 3; bi++) {
    const [l0, l1] = [GRASS.bands[bi], GRASS.bands[bi + 1]]
    const totalLength = (GRASS.t[1] - GRASS.t[0]) * STREET.pathLength
    const area = 2 * totalLength * (l1 - l0)

    let meanFactor: number
    if (l1 <= GRASS.r0) {
      meanFactor = 1.0
    } else if (l0 >= GRASS.r0) {
      meanFactor = (GRASS.r0 * GRASS.r0 * (1 / l0 - 1 / l1)) / (l1 - l0)
    } else {
      meanFactor = (GRASS.r0 - l0 + (GRASS.r0 - (GRASS.r0 * GRASS.r0) / l1)) / (l1 - l0)
    }

    // High resolution grid sampling of included area fraction
    let samples = 0
    let excluded = 0
    const tSamples = 100
    const latSamples = 50
    for (let si = 0; si < tSamples; si++) {
      const t = GRASS.t[0] + ((si + 0.5) / tSamples) * (GRASS.t[1] - GRASS.t[0])
      const [px, , pz] = pathPoint(t)
      const [tx, , tz] = pathTangent(t)
      const n = Math.hypot(tx, tz)
      for (let sj = 0; sj < latSamples; sj++) {
        const lat = l0 + ((sj + 0.5) / latSamples) * (l1 - l0)
        for (const side of [-1, 1]) {
          const x = px + side * lat * (-tz / n)
          const z = pz + side * lat * (tx / n)
          samples++
          if (isExcluded(x, z)) excluded++
        }
      }
    }
    const includedFrac = 1 - excluded / samples
    const expected = GRASS.full * GRASS.density * area * meanFactor * includedFrac
    const actual = bandCounts[bi]
    const err = Math.abs(actual - expected) / expected
    assert.ok(
      err <= 0.1,
      `band ${bi} [${l0}, ${l1}]: actual ${actual} against expected ${expected.toFixed(0)} (err ${(err * 100).toFixed(1)}% <= 10%)`,
    )
  }
})

test("a chunk's prefix is an even sample", { skip }, () => {
  let checked = 0
  for (const ch of chunks) {
    if (ch.blades.length < 40) continue
    const lats = ch.blades.map((b) => {
      const [, lat] = laneParam(b.x, b.z)
      return Math.abs(lat)
    })
    const meanAll = lats.reduce((sum, v) => sum + v, 0) / lats.length
    const half = lats.slice(0, Math.floor(lats.length / 2))
    const meanHalf = half.reduce((sum, v) => sum + v, 0) / half.length
    const diff = Math.abs(meanHalf - meanAll) / meanAll
    assert.ok(
      diff <= 0.15,
      `chunk prefix diff ${(diff * 100).toFixed(2)}% <= 15% (all ${meanAll.toFixed(4)}, half ${meanHalf.toFixed(4)})`,
    )
    checked++
  }
  assert.ok(checked > 50, `checked ${checked} chunks with >= 40 blades`)
})

test('the sphere holds every displaced blade', { skip }, () => {
  let negativeExceeded = false
  for (const ch of chunks) {
    for (const b of ch.blades) {
      let maxDist = 0
      for (const cam of walkCameras) {
        const d = Math.hypot(b.x - cam[0], cam[1], b.z - cam[2])
        if (d > maxDist) maxDist = d
      }
      const reach = bladeReach(b, maxDist)
      assert.ok(reach <= ch.reach + 1e-6, `blade reach ${reach} <= chunk reach ${ch.reach}`)

      for (let j = 0; j <= 16; j++) {
        const pt = bladeVertex(b, j / 16, 0, [1, 0])
        assert.ok(pt[1] <= GRASS.top + 1e-4, `blade top ${pt[1]} <= ${GRASS.top}`)
      }

      if (bladeReach(b, 3 * maxDist) > ch.reach) negativeExceeded = true
    }

    const { min, max } = ch.box
    const px0 = min[0] - ch.reach
    const px1 = max[0] + ch.reach
    const pz0 = min[2] - ch.reach
    const pz1 = max[2] + ch.reach
    const py1 = GRASS.top
    const corners = [
      [px0, 0, pz0],
      [px1, 0, pz0],
      [px0, 0, pz1],
      [px1, 0, pz1],
      [px0, py1, pz0],
      [px1, py1, pz0],
      [px0, py1, pz1],
      [px1, py1, pz1],
    ]
    for (const c of corners) {
      const d = Math.hypot(c[0] - ch.sphere.centre[0], c[1] - ch.sphere.centre[1], c[2] - ch.sphere.centre[2])
      assert.ok(d <= ch.sphere.radius + 1e-5, `sphere radius ${ch.sphere.radius} contains grown box corner (dist ${d})`)
    }
  }
  assert.ok(negativeExceeded, 'negative control: at 3x distance bladeReach exceeds reach')
})

// sampled, not every point: the count jumps where a chunk leaves the frustum, so a point between two samples can read
// higher (Codex F05: 35,838 at t 0.31737 against the grid's 35,796). The grid is every 0.001 of t, plus that point.
test('the grass fits its room at sampled points of the walk, refined around the worst, with a 2% margin', () => {
  // the layout no longer depends on the paint (S3b), so any painting gives the street's chunks and this runs in CI
  const chunks = grassChunks(swatchPainting(0))
  const painting = swatchPainting(0)
  const at = (t: number, aspect: number, portrait: boolean, chunkList: typeof chunks) => {
    const p = walkPose(t, portrait)
    const c = new PerspectiveCamera(p.fov, aspect, p.near, p.far)
    c.position.set(...p.position)
    c.lookAt(...p.target)
    c.updateMatrixWorld()
    const f = new Frustum().setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse),
    )
    let drawn = 0
    for (const ch of chunkList) {
      const cam = c.position
      const centre = new Vector3(...ch.sphere.centre)
      if (!f.intersectsSphere({ center: centre, radius: ch.sphere.radius } as unknown as import('three').Sphere)) {
        continue
      }
      drawn += grassDrawCount(ch, [cam.x, cam.y, cam.z])
    }
    return drawn * 2 * GRASS_BLADE.segments
  }

  const aspects = [
    [1600 / 900, false, 'landscape'],
    [390 / 844, true, 'portrait'],
  ] as const
  const points: { tris: number; t: number; aspect: (typeof aspects)[number] }[] = []
  for (const t of [...Array.from({ length: 901 }, (_, k) => k / 1000), 0.31737]) {
    for (const aspect of aspects) points.push({ tris: at(t, aspect[0], aspect[1], chunks), t, aspect })
  }
  // around the five worst points, every 0.0001 over ±0.005 (Codex R6: the sampled walk is not a proof, so keep a margin)
  points.sort((p, q) => q.tris - p.tris)
  let worst = points[0]
  for (const p of points.slice(0, 5)) {
    for (let k = -50; k <= 50; k++) {
      const t = Math.min(0.9, Math.max(0, p.t + k / 10000))
      const tris = at(t, p.aspect[0], p.aspect[1], chunks)
      if (tris > worst.tris) worst = { tris, t, aspect: p.aspect }
    }
  }

  console.log(`[budget test] worst refined point: t=${worst.t.toFixed(5)}, aspect=${worst.aspect[2]}, tris=${worst.tris} (budget ${GRASS.budget}, ${((100 * worst.tris) / GRASS.budget).toFixed(1)}%, density ${GRASS.density})`)
  assert.ok(worst.tris <= 0.98 * GRASS.budget, `worst ${worst.tris} <= 0.98 × budget ${GRASS.budget}`)

  // Negative control: at twice density, budget is exceeded
  const doubleChunks = grassChunks(painting, GRASS.density * 2)
  let doubleWorst = 0
  for (let k = 0; k <= 900; k += 10) {
    const t = k / 1000
    for (const [aspect, portrait] of [
      [1600 / 900, false],
      [390 / 844, true],
    ] as const) {
      const tris = at(t, aspect, portrait, doubleChunks)
      if (tris > doubleWorst) doubleWorst = tris
    }
  }
  assert.ok(doubleWorst > GRASS.budget, `negative control: at 2x density, tris ${doubleWorst} > budget ${GRASS.budget}`)
})

test('a near chunk draws all, a far one a share', { skip }, () => {
  const ch = chunks.find((c) => c.blades.length >= 50)!
  assert.ok(ch)
  const insideCam: [number, number, number] = [
    (ch.box.min[0] + ch.box.max[0]) / 2,
    0.04,
    (ch.box.min[2] + ch.box.max[2]) / 2,
  ]
  assert.equal(grassDrawCount(ch, insideCam), ch.blades.length, 'near chunk draws all blades')

  // Seen from 1.0 away from the box
  const farCam: [number, number, number] = [ch.box.max[0] + 1.0, 0, (ch.box.min[2] + ch.box.max[2]) / 2]
  const expectedFar = Math.ceil(ch.blades.length * (Math.max(GRASS.r0, ch.latIn) / 1.0) ** 2)
  assert.equal(grassDrawCount(ch, farCam), expectedFar, 'seen from 1.0 away draws expected share')
})

test('the map is small', { skip }, () => {
  const [x0, z0, w, d] = grassRect(chunks)
  assert.ok(w > 0 && d > 0)
  assert.ok(w / 0.005 <= 1024, `width in texels ${w / 0.005} <= 1024`)
  assert.ok(d / 0.005 <= 1024, `depth in texels ${d / 0.005} <= 1024`)
  assert.ok(x0 < 2 && z0 < 2)
})

test("the ground without grass is today's", { skip }, () => {
  const bDefault = buildStreet(painting, flow, masses)
  const bExplicit = buildStreet(painting, flow, masses, { lit: true, grass: false })
  assert.deepEqual(bDefault, bExplicit)
})

test('with grass the ground is clipped to the footprint and nothing else', { skip }, () => {
  const bNoGrass = buildStreet(painting, flow, masses, { lit: true, grass: false })!
  const bGrass = buildStreet(painting, flow, masses, { lit: true, grass: true })!
  assert.ok(bNoGrass && bGrass)

  const pos = bNoGrass.ground.arrays.positions
  const idx0 = bNoGrass.ground.arrays.indices
  const cls0 = bNoGrass.ground.cls
  const idxG = bGrass.ground.arrays.indices

  const droppedTris: number[] = []
  let gIdx = 0
  for (let i = 0; i < idx0.length; i += 3) {
    if (gIdx < idxG.length && idx0[i] === idxG[gIdx] && idx0[i + 1] === idxG[gIdx + 1] && idx0[i + 2] === idxG[gIdx + 2]) {
      gIdx += 3
    } else {
      droppedTris.push(i)
    }
  }
  assert.equal(gIdx, idxG.length, 'kept triangles are in the exact same order')

  for (const tri of droppedTris) {
    const v0 = idx0[tri]
    const v1 = idx0[tri + 1]
    const v2 = idx0[tri + 2]
    assert.equal(cls0[v0], 3, 'dropped triangle must be class 3')
    assert.ok(inFootprint(pos[v0 * 3], pos[v0 * 3 + 2]), 'corner 0 in footprint')
    assert.ok(inFootprint(pos[v1 * 3], pos[v1 * 3 + 2]), 'corner 1 in footprint')
    assert.ok(inFootprint(pos[v2 * 3], pos[v2 * 3 + 2]), 'corner 2 in footprint')
  }

  // Probe drop is 32,343
  const drop = droppedTris.length
  console.log(`[clipped triangles] drop = ${drop} (probe: 32343)`)
  assert.ok(Math.abs(drop - 32343) / 32343 <= 0.01, `drop ${drop} within 1% of 32343`)

  // Base triangles, in their own arrays since S3b pass 5, none left in the underpaint
  assert.deepEqual(bGrass.underpaint.indices, bNoGrass.underpaint.indices, 'the underpaint is the same with grass')
  assert.equal(bNoGrass.grassBase.indices.length, 0, 'no base without grass')
  assert.equal(buildFlatPanel(painting, flow, masses, true)!.grassBase.indices.length, 0, 'no base on the flat panel')
  assert.ok(bGrass.grassBase.cls.every((c) => c === 3) && bGrass.grassBase.src.every((c) => c === 255), "the base is the ground's class, source 255 (Codex F2)")
  const upPos = bGrass.grassBase.positions
  const upIdx = bGrass.grassBase.indices
  let baseTriangles = 0
  const baseTris: [number, number, number][] = []
  for (let i = 0; i < upIdx.length; i += 3) {
    const y0 = upPos[upIdx[i] * 3 + 1]
    const y1 = upPos[upIdx[i + 1] * 3 + 1]
    const y2 = upPos[upIdx[i + 2] * 3 + 1]
    if (Math.abs(y0 - GRASS.baseY) < 1e-5 && Math.abs(y1 - GRASS.baseY) < 1e-5 && Math.abs(y2 - GRASS.baseY) < 1e-5) {
      baseTriangles++
      baseTris.push([upIdx[i], upIdx[i + 1], upIdx[i + 2]])
    }
  }

  console.log(`[base triangles] count = ${baseTriangles}`)
  assert.ok(baseTriangles > 0 && baseTriangles <= 2000, `base triangles ${baseTriangles} <= 2000`)

  // Check sampled points across 0.052-0.765 along t -0.06 to 0.97 outside the square
  function ptInTri(px: number, pz: number, i0: number, i1: number, i2: number): boolean {
    const ax = upPos[i0 * 3], az = upPos[i0 * 3 + 2]
    const bx = upPos[i1 * 3], bz = upPos[i1 * 3 + 2]
    const cx = upPos[i2 * 3], cz = upPos[i2 * 3 + 2]
    const v0x = cx - ax, v0z = cz - az
    const v1x = bx - ax, v1z = bz - az
    const v2x = px - ax, v2z = pz - az
    const dot00 = v0x * v0x + v0z * v0z
    const dot01 = v0x * v1x + v0z * v1z
    const dot02 = v0x * v2x + v0z * v2z
    const dot11 = v1x * v1x + v1z * v1z
    const dot12 = v1x * v2x + v1z * v2z
    const inv = 1 / (dot00 * dot11 - dot01 * dot01)
    const u = (dot11 * dot02 - dot01 * dot12) * inv
    const v = (dot00 * dot12 - dot01 * dot02) * inv
    return u >= -1e-3 && v >= -1e-3 && u + v <= 1 + 1e-3
  }

  const tCount = 103
  const dt = (0.97 - -0.06) / tCount
  const latCount = 37
  const dlat = (0.765 - 0.052) / latCount

  for (const side of [-1, 1]) {
    for (let ti = 0; ti < tCount; ti++) {
      const t = -0.06 + (ti + 0.5) * dt
      const [px, , pz] = pathPoint(t)
      const [tx, , tz] = pathTangent(t)
      const n = Math.hypot(tx, tz)
      const nx = -tz / n
      const nz = tx / n

      for (let li = 0; li < latCount; li++) {
        const lat = 0.052 + (li + 0.5) * dlat
        const x = px + side * lat * nx
        const z = pz + side * lat * nz
        if (Math.hypot(x - STREET_SQUARE.x, z - STREET_SQUARE.z) <= STREET_SQUARE.radius) continue

        let hit = false
        for (const [i0, i1, i2] of baseTris) {
          if (ptInTri(x, z, i0, i1, i2)) {
            hit = true
            break
          }
        }
        assert.ok(hit, `grid point (side=${side}, t=${t.toFixed(3)}, lat=${lat.toFixed(3)}) meets a base triangle`)
      }
    }
  }
})

/** A 1600 × 1267 painting of seven grass swatches in a diagonal pattern, `shift` places along: two shifts differ in every texel. */
function swatchPainting(shift: number): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  const swatches = [[40, 60, 110, 255], [60, 90, 70, 255], [30, 40, 60, 255], [150, 150, 70, 255], [90, 120, 80, 255], [160, 170, 165, 255], [70, 100, 130, 255]]
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(swatches[(x * 3 + y * 5 + shift) % swatches.length], (y * width + x) * 4)
  return { data, width, height }
}

test("the layout is the paint's no longer: two paintings that differ in every texel give one layout (S3b, Codex R6)", () => {
  const shape = (chunks: ReturnType<typeof grassChunks>) =>
    chunks.map((c) => c.blades.map((b) => [b.x, b.z, b.height, b.halfWidth, b.lean, b.curl, b.yaw].join(',')).join(';')).join('|')
  const a = grassChunks(swatchPainting(0))
  const b = grassChunks(swatchPainting(3))
  assert.ok(a.length > 0)
  assert.equal(shape(a), shape(b))
  assert.notDeepEqual(a[0].blades.map((x) => x.colour), b[0].blades.map((x) => x.colour))
})

test('no joint turns more than GRASS_BLADE.jointMax: the arch is a curve, not a V (S3b task 2)', () => {
  let worst = 0
  for (const ch of grassChunks(swatchPainting(0))) {
    for (const b of ch.blades) {
      const S = GRASS_BLADE.segments
      const rows = Array.from({ length: S + 1 }, (_, j) => bladeVertex(b, j / S, 0, [1, 0]))
      for (let j = 1; j < S; j++) {
        const u = [rows[j][0] - rows[j - 1][0], rows[j][1] - rows[j - 1][1], rows[j][2] - rows[j - 1][2]]
        const v = [rows[j + 1][0] - rows[j][0], rows[j + 1][1] - rows[j][1], rows[j + 1][2] - rows[j][2]]
        const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v))
        worst = Math.max(worst, Math.acos(Math.min(1, cos)))
      }
    }
  }
  assert.ok(worst <= GRASS_BLADE.jointMax + 1e-9, `a joint turns ${worst.toFixed(4)} rad, over ${GRASS_BLADE.jointMax}`)
})
