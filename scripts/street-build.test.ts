/** The street's build (S1 task 5, tasks/2026-10-23-street-s1-plan.md): every face clad, few warm windows, the church the knot's. */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { islandHeightAt } from '../src/scene/islandShape.ts'
import type { BakedMass } from '../src/scene/landDomes.ts'
import { Vector3 } from 'three'
import { COTTAGE, ROOF_EDGE, buildStreet, cottageFaces, houseRoofEdges, type StreetShape } from '../src/scene/streetGeometry.ts'
import { STREET_CHURCH, STREET_HOUSES } from '../src/scene/streetLayout.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { VILLAGE_CHURCH } from '../src/scene/villageKnot.ts'
import { decodePNG } from './lib/png.ts'

const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
const masses = JSON.parse(readFileSync(new URL('../public/reference/land-masses.json', import.meta.url), 'utf8')) as BakedMass[]

/** A 1600 × 1267 painting in the village's blues and greens, varied so every filter finds texels. */
function villagePainting(): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = (x * 7 + y * 13) % 4
      data.set([[40, 60, 110, 255], [60, 90, 70, 255], [30, 40, 60, 255], [120, 140, 170, 255]][k], (y * width + x) * 4)
    }
  }
  return { data, width, height }
}

const build = buildStreet(villagePainting(), flow, masses)

test('the street builds all or nothing', () => {
  assert.equal(buildStreet(null, flow, masses), null)
  assert.equal(buildStreet(villagePainting(), null, masses), null)
  assert.equal(buildStreet(villagePainting(), flow, null), null)
  assert.ok(build, 'built with every input')
})

test('every face of a house is clad, and every edge has its outline', () => {
  assert.ok(build)
  for (let house = 0; house < STREET_HOUSES.length; house++) {
    const faces = build.report.faces.filter((f) => f.owner === `house-${house}`)
    // four walls, two gables, two roof planes
    assert.equal(faces.length, 8, `house ${house} has its eight faces`)
    for (const face of faces) assert.ok(face.ribbons >= 12, `house ${house}'s ${face.name} has ${face.ribbons} ribbons`)
    const outlines = build.report.outlines.find((o) => o.owner === `house-${house}`)
    // a painting house: four eaves, four corners, four rakes, the ridge, four along the ground. A cottage (its ridge
    // along the width): four corners, four along the ground, two eaves, four rakes, the ridge
    const edges = STREET_HOUSES[house].type === 'cottage' ? 15 : 17
    assert.equal(outlines?.edges, edges, `house ${house}'s edges are inked`)
  }
})

test('few warm windows: at most one lit per house, at least half the houses dark', () => {
  assert.ok(build)
  const lit = new Map<string, number>()
  for (const w of build.report.windows) lit.set(w.owner, (lit.get(w.owner) ?? 0) + (w.lit ? 1 : 0))
  let dark = 0
  for (let house = 0; house < STREET_HOUSES.length; house++) {
    const n = lit.get(`house-${house}`) ?? 0
    assert.ok(n <= 1, `house ${house} has ${n} lit windows`)
    if (n === 0) dark++
  }
  assert.ok(dark >= STREET_HOUSES.length / 2, `${dark} dark houses of ${STREET_HOUSES.length}`)
})

test('the church is the knot\'s: the belfry\'s width and the spire\'s height above its floor', () => {
  assert.ok(build)
  const { belfry, spireTip } = VILLAGE_CHURCH
  const floor = islandHeightAt(belfry.cx, belfry.cz) - belfry.floorDrop
  assert.ok(Math.abs(build.report.church.belfryWidth - belfry.width) < 1e-9)
  assert.ok(Math.abs(build.report.church.spireHeight - (spireTip.y - floor)) < 1e-9)
  // the belfry's top above the street's ground, as the knot's stands above the island (Fable R4)
  assert.ok(Math.abs(build.report.church.belfryHeight - (belfry.topY - floor)) < 1e-9)
})

test('every vertex of underpaint and strokes has a source class, and the church is plaster', () => {
  assert.ok(build)
  const upCount = build.underpaint.positions.length / 3
  const strCount = build.strokes.arrays.positions.length / 3
  assert.equal(build.underpaint.src?.length, upCount, 'underpaint has src per vertex')
  assert.equal(build.strokes.src?.length, strCount, 'strokes has src per vertex')
  for (const s of build.underpaint.src) {
    assert.ok((s >= 0 && s <= 6) || s === 255, `underpaint src ${s} valid`)
  }
  for (const s of build.strokes.src) {
    assert.ok((s >= 0 && s <= 6) || s === 255, `strokes src ${s} valid`)
  }
  const churchNave = STREET_CHURCH.nave
  const churchBelfry = STREET_CHURCH.belfry
  let churchWallStrokes = 0
  for (let i = 0; i < strCount; i++) {
    const x = build.strokes.arrays.positions[i * 3]
    const z = build.strokes.arrays.positions[i * 3 + 2]
    const cls = build.strokes.cls[i]
    if (cls === 0) {
      const dNave = Math.hypot(x - churchNave.x, z - churchNave.z)
      const dBelfry = Math.hypot(x - churchBelfry.cx, z - churchBelfry.cz)
      if (dNave < 0.35 || dBelfry < 0.35) {
        churchWallStrokes++
        assert.equal(build.strokes.src[i], 2, `church wall stroke vertex ${i} must be plaster (2)`)
      }
    }
  }
  assert.ok(churchWallStrokes > 50, `found church wall strokes: ${churchWallStrokes}`)

  let churchWallUnderpaint = 0
  for (let i = 0; i < upCount; i++) {
    const x = build.underpaint.positions[i * 3]
    const z = build.underpaint.positions[i * 3 + 2]
    const cls = build.underpaint.cls[i]
    if (cls === 0) {
      const dNave = Math.hypot(x - churchNave.x, z - churchNave.z)
      const dBelfry = Math.hypot(x - churchBelfry.cx, z - churchBelfry.cz)
      if (dNave < 0.35 || dBelfry < 0.35) {
        churchWallUnderpaint++
        assert.equal(build.underpaint.src[i], 2, `church wall underpaint vertex ${i} must be plaster (2)`)
      }
    }
  }
  assert.ok(churchWallUnderpaint > 10, `found church wall underpaint vertices: ${churchWallUnderpaint}`)
})

/** A house's frame for the pure builders: centred at the origin, its width along x, its front toward +z. */
const frame = { centre: new Vector3(0, 0, 0), along: new Vector3(1, 0, 0), toPath: new Vector3(0, 0, 1) }
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps
function planeNormal(c: Vector3[]): Vector3 {
  return new Vector3().crossVectors(c[1].clone().sub(c[0]), c[c.length - 1].clone().sub(c[0])).normalize()
}

test('a cottage is a thick thatched roof on low walls', () => {
  const cottages = STREET_HOUSES.filter((h) => h.type === 'cottage')
  assert.equal(cottages.length, 4, 'four cottages in the table')
  for (const h of cottages) {
    const shape: StreetShape = h
    const faces = cottageFaces(shape, frame.centre, frame.along, frame.toPath)
    const of = (kind: string) => faces.filter((f) => f.kind === kind)
    assert.equal(of('wall').length, 6, `${h.id}: four walls and two gables`)
    assert.equal(of('wall').filter((f) => f.corners.length === 3).length, 2, `${h.id}: the gables are triangles`)
    assert.equal(of('roof').length, 2, `${h.id}: two roof planes`)
    assert.equal(of('underside').length, 2, `${h.id}: an underside under each`)
    assert.equal(of('edge').length, 6, `${h.id}: an eave and two rakes on each plane`)
    for (const side of ['front', 'back']) {
      const roof = faces.find((f) => f.name === `${side} roof`)!
      const under = faces.find((f) => f.name === `${side} underside`)!
      const n = planeNormal(roof.corners)
      assert.ok(close(Math.abs(n.dot(planeNormal(under.corners))), 1, 1e-9), `${h.id} ${side}: the underside is parallel to the roof`)
      for (const p of under.corners) assert.ok(close(Math.abs(p.clone().sub(roof.corners[0]).dot(n)), COTTAGE.thickness), `${h.id} ${side}: the slab is ${COTTAGE.thickness} thick`)
      // the eave is the roof's lowest edge, and it stands COTTAGE.overhang beyond its wall
      const eaveZ = roof.corners[0].z
      assert.ok(close(Math.abs(eaveZ), h.d / 2 + COTTAGE.overhang), `${h.id} ${side}: the eave overhangs the wall by ${COTTAGE.overhang}`)
      assert.ok(close(roof.corners[0].y, roof.corners[1].y) && roof.corners[0].y < roof.corners[2].y, `${h.id} ${side}: the eave is level and below the ridge`)
      assert.ok(roof.corners[0].y > 0.04, `${h.id} ${side}: the thatch's edge stands ${roof.corners[0].y.toFixed(3)} above the ground`)
      // each edge face joins its roof's edge to its underside's
      for (const edge of faces.filter((f) => f.kind === 'edge' && f.name.startsWith(side))) {
        assert.equal(edge.corners.length, 4)
        assert.ok(edge.corners.slice(0, 2).every((p) => roof.corners.some((q) => q.distanceTo(p) < 1e-12)), `${h.id} ${edge.name}: its top is the roof's edge`)
        assert.ok(edge.corners.slice(2).every((p) => under.corners.some((q) => q.distanceTo(p) < 1e-12)), `${h.id} ${edge.name}: its foot is the underside's edge`)
      }
    }
  }
})

test("every painting house's roof has an edge", () => {
  const houses = STREET_HOUSES.filter((h) => h.type === 'painting')
  assert.equal(houses.length, 6, 'six painting houses in the table')
  for (const h of houses) {
    const bands = houseRoofEdges(h, frame.centre, frame.along, frame.toPath)
    assert.equal(bands.length, 6, `${h.id}: an eave and two rakes on each of two planes`)
    for (const band of bands) {
      const [a, b, b2, a2] = band.corners
      assert.ok(close(a.distanceTo(a2), ROOF_EDGE) && close(b.distanceTo(b2), ROOF_EDGE), `${h.id} ${band.name}: ${ROOF_EDGE} deep`)
      const drop = a2.clone().sub(a)
      assert.ok(close(drop.dot(b.clone().sub(a)), 0, 1e-12), `${h.id} ${band.name}: hangs square to its edge`)
      assert.ok(drop.y < 0, `${h.id} ${band.name}: hangs below the roof`)
    }
    const eaves = bands.filter((band) => band.name.endsWith('eave'))
    assert.equal(eaves.length, 2)
    for (const band of eaves) assert.ok(close(band.corners[0].y, band.corners[1].y), `${h.id} ${band.name}: level`)
  }
})

