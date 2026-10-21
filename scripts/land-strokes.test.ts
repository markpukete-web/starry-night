/** The ground strokes on the island's top (E2.3): the terrain, the drape, the shipped field's strips, the root kept. */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Vector3 } from 'three'

import { coastR, islandHeightAt, RZ } from '../src/scene/islandShape.ts'
import { flowToPainting, LAND_MAP, paintingUvAt, worldAt } from '../src/scene/landMapping.ts'
import { columnAt, columnShift, columnSource, drapeOnTerrain, HILL_WIDTH, LAND_COLUMNS, LAND_LIFT, LAND_RIBBON_CONFIG, LAND_ROWS, terrainAt, traceLandRibbons, withColumnFill } from '../src/scene/landStrokes.ts'
import type { CypressRibbon } from '../src/scene/cypressStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const inside = (x: number, z: number) => Math.hypot(x, z) <= coastR(Math.atan2(z, x))

test('terrainAt: null beyond the coast, a unit up-facing normal and the island\'s own height inside', () => {
  assert.equal(terrainAt(2.3, 0), null)
  assert.equal(terrainAt(0, 1.6), null)
  for (const [x, z] of [[0, 0], [0.8, -0.9], [-1.2, 0.6], [1.5, 0.3]]) {
    const hit = terrainAt(x, z)
    assert.ok(hit, `(${x}, ${z}) is on the island`)
    assert.ok(Math.abs(hit.normal.length() - 1) < 1e-9 && hit.normal.y > 0.3)
    assert.ok(Math.abs(hit.position.y - islandHeightAt(x, z)) < 1e-9)
  }
})

/** A ribbon whose samples run along the painting's u at one v, as a flow sample list (px = u, py from v). */
function ribbonAlong(us: number[], v: number, seedIndex: number, halfWidth = 0.002): CypressRibbon {
  const py = (v - LAND_MAP.bandV0) / (1 - LAND_MAP.bandV0)
  const samples = us.map((px) => ({ px, py, inside: true }))
  return { samples, seedSample: samples[seedIndex], colour: [0.2, 0.3, 0.2], halfWidth, relief: 1, seed: 1 }
}

test('drapeOnTerrain: a column beyond the coast ends the run above the seed, restarts it below, and a seed beyond it means no run', () => {
  // along the painting at v 0.9 (the apron), from the far left (off the island) across to the right edge
  const [uLeftEdge] = paintingUvAt(-2.6, worldAt(0.5, 0.9)[1])
  const us = Array.from({ length: 30 }, (_, k) => uLeftEdge + (k / 29) * (1.0 - uLeftEdge))
  const seedIndex = 12
  const ribbon = ribbonAlong(us, 0.9, seedIndex)
  const [sx, sz] = worldAt(us[seedIndex], 0.9)
  assert.ok(inside(sx, sz), 'the seed is on the island')
  const draped = drapeOnTerrain(ribbon, LAND_LIFT)
  assert.ok(draped, 'a run')
  for (const step of draped.steps) for (const point of step) assert.ok(inside(point.x, point.z), 'every emitted point on the island')
  assert.ok(draped.steps.length < us.length, 'the run is shorter than the ribbon: the coast cut it')
  // the seed off the island: null
  const off = ribbonAlong(us, 0.9, 0)
  assert.equal(drapeOnTerrain(off, LAND_LIFT), null)
})

test('the shipped field drapes at least 98% of its ribbons, every point at the lift above the terrain and inside the coast', () => {
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/land-flow.png', import.meta.url)))
  const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const painting: ImageData2D = { data: new Uint8ClampedArray([40, 60, 30, 255]), width: 1, height: 1 }
  const ribbons = traceLandRibbons(flow, painting, LAND_RIBBON_CONFIG.frontCount, 0x1a4d)
  assert.ok(ribbons.length >= 0.98 * LAND_RIBBON_CONFIG.frontCount, `${ribbons.length} of ${LAND_RIBBON_CONFIG.frontCount} traced`)
  let draped = 0
  let points = 0
  let worstLow = Infinity
  let worstHigh = -Infinity
  const widths: { horizontal: number[]; vertical: number[] } = { horizontal: [], vertical: [] }
  for (const ribbon of ribbons) {
    const strip = drapeOnTerrain(ribbon, LAND_LIFT)
    if (!strip) continue
    draped++
    for (const step of strip.steps) {
      const outer = step[0].distanceTo(step[step.length - 1])
      assert.ok(outer > 0.004, 'no degenerate strip')
      for (const point of step) {
        points++
        assert.ok(inside(point.x, point.z), `the lifted point (${point.x.toFixed(2)}, ${point.z.toFixed(2)}) is on the island`)
        const ground = terrainAt(point.x, point.z)!
        // the lift's own metric: the normal distance from the terrain under the point
        const clearance = (point.y - ground.position.y) * ground.normal.y
        worstLow = Math.min(worstLow, clearance)
        worstHigh = Math.max(worstHigh, clearance)
      }
    }
    // the width at the middle step, by the ribbon's orientation on the apron
    const middle = strip.steps[Math.floor(strip.steps.length / 2)]
    const first = ribbon.samples[0]
    const last = ribbon.samples[ribbon.samples.length - 1]
    const dx = (last.px - first.px) * flow.width
    const dy = (last.py - first.py) * flow.height
    const [, v] = flowToPainting(ribbon.seedSample.px, ribbon.seedSample.py)
    if (v < LAND_MAP.apron.vBack) continue
    const width = middle[0].distanceTo(middle[middle.length - 1])
    assert.ok(middle.length === LAND_COLUMNS, 'the land\'s own column count')
    if (Math.abs(dx) > 4 * Math.abs(dy)) widths.horizontal.push(width)
    else if (Math.abs(dy) > 4 * Math.abs(dx)) widths.vertical.push(width)
  }
  assert.ok(draped >= 0.98 * ribbons.length, `${draped} of ${ribbons.length} draped`)
  assert.ok(points > 10000)
  assert.ok(HILL_WIDTH > 1)
  assert.ok(worstLow >= 0.5 * LAND_LIFT && worstHigh <= 1.5 * LAND_LIFT, `clearance ${worstLow.toFixed(4)}..${worstHigh.toFixed(4)} against the lift ${LAND_LIFT}`)
  // the width is laid out in world, so a horizontal and a vertical stroke are the same width (the first draft
  // built the width in the crop and a horizontal stroke's followed the map's stretch along z, F8); the apron's
  // widths are measured, the hills' are HILL_WIDTH times them
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const meanHalf = (LAND_RIBBON_CONFIG.minHalfWidth + LAND_RIBBON_CONFIG.maxHalfWidth) / 2
  const midTaper = (1 + LAND_RIBBON_CONFIG.taper) / 2
  const expected = 2 * meanHalf * midTaper * LAND_MAP.worldPerU
  assert.ok(widths.horizontal.length >= 20 && widths.vertical.length >= 5, `${widths.horizontal.length} horizontal, ${widths.vertical.length} vertical ribbons on the apron`)
  for (const [label, values] of [['horizontal', widths.horizontal], ['vertical', widths.vertical]] as const) {
    const ratio = mean(values) / expected
    assert.ok(ratio > 0.6 && ratio < 1.4, `${label} strokes ${mean(values).toFixed(4)} wide against the expected ${expected.toFixed(4)}`)
  }
})

test('the cypress column: inside it the fill reads the band past the tree\'s right edge, outside it nothing changes', () => {
  assert.equal(columnShift(0.1, 0.7), null, 'left of the tree')
  assert.equal(columnShift(0.5, 0.7), null, 'the village')
  const [left, right] = columnAt(0.8)
  assert.ok(left > 0.18 && right < 0.35 && columnShift((left + right) / 2, 0.8)! > right - left, 'inside the tree at v 0.8')
  assert.ok(columnAt(0.6)[1] > 0.4, 'the crown\'s flame tips reach past u 0.4')
  // in the hills band the source lies at the same depth between the fields' top and the crest
  const [su, sv] = columnSource(0.25, 0.7)!
  assert.ok(su > 0.4 && sv > 0.7 && sv < 0.78, `the source at (${su.toFixed(2)}, ${sv.toFixed(3)}) under its own crest`)
  assert.deepEqual(columnSource(0.25, 0.9), [0.25 + columnShift(0.25, 0.9)!, 0.9], 'on the apron the same v')
  assert.ok(columnAt(0.95)[2 - 1] < columnAt(0.6)[1], 'the trunk is narrower than the crown')
  // a flow with a distinct orientation per column: inside the column the fill is the texel to the right
  const width = 100
  const height = 3
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = (y * width + x) * 4; data[i] = x; data[i + 1] = 200; data[i + 2] = 8; data[i + 3] = 255 }
  const filled = withColumnFill({ data, width, height })
  // the middle row (py 0.5) at the texel's own u, as the fill maps it
  const x = Math.round(0.25 * (width - 1))
  const [u, v] = flowToPainting(x / (width - 1), 1 / (height - 1))
  const source = Math.round(columnSource(u, v)![0] * (width - 1))
  assert.equal(filled.data[(1 * width + x) * 4], source, 'the orientation from the source texel')
  assert.equal(filled.data[(1 * width + 90) * 4], 90, 'untouched outside')
})

test('the land rows describe one span over the whole band and the config walks continuously', () => {
  assert.equal(LAND_ROWS.spans.length, 2)
  assert.equal(LAND_RIBBON_CONFIG.heading, 'continuous')
  assert.equal(LAND_RIBBON_CONFIG.backShare, 0)
  assert.equal(LAND_RIBBON_CONFIG.overshootSteps, 0)
  void RZ
  void Vector3
})
