/** The cypress's streamline tracer (E1): ribbons grown both ways from a seed inside the mask, in the painting's own field. */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CYPRESS_RIBBON_CONFIG,
  ribbonEdges,
  traceCypressRibbons,
  type CypressRibbon,
} from '../src/scene/cypressStrokes.ts'
import { buildCypressLobePlan, lobeIntervalsAt, type CypressLobeRows } from '../src/scene/cypressLobes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG } from './lib/png.ts'

const WIDTH = 60
const HEIGHT = 200

/** A vertical mask band (x 20–40, rows `top`..`bottom`) with a uniform field leaning `degrees` from vertical. */
function fixtures(degrees = 0, top = 0, bottom = HEIGHT - 1) {
  const flow: ImageData2D = { data: new Uint8ClampedArray(WIDTH * HEIGHT * 4), width: WIDTH, height: HEIGHT }
  const painting: ImageData2D = { data: new Uint8ClampedArray(WIDTH * HEIGHT * 4), width: WIDTH, height: HEIGHT }
  const dx = Math.sin((degrees * Math.PI) / 180)
  const dy = -Math.cos((degrees * Math.PI) / 180)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4
      flow.data[i] = Math.round(((dx + 1) / 2) * 255)
      flow.data[i + 1] = Math.round(((dy + 1) / 2) * 255)
      flow.data[i + 2] = x >= 20 && x <= 40 && y >= top && y <= bottom ? 200 : 0
      flow.data[i + 3] = 255
      // the painting encodes its own position, so a sampled colour says where it was read
      painting.data[i] = Math.round((x / (WIDTH - 1)) * 255)
      painting.data[i + 1] = Math.round((y / (HEIGHT - 1)) * 255)
      painting.data[i + 2] = 200
      painting.data[i + 3] = 255
    }
  }
  return { flow, painting, rows: { uv: [0, 0, 1, 1] as [number, number, number, number] } }
}

/** One fixed length, no spire: an interior ribbon has exactly 2 · round(length / step / 2) + 1 samples. */
const FIXED = { ...CYPRESS_RIBBON_CONFIG, minLength: 0.1, maxLength: 0.1, spireHeight: 2 }
const FIXED_SAMPLES = 2 * Math.round(FIXED.minLength / FIXED.step / 2) + 1

function seedIndex(ribbon: CypressRibbon): number {
  return ribbon.samples.indexOf(ribbon.seedSample)
}

test('the tracer is deterministic in its seed and returns ribbons for a full mask', () => {
  const { flow, painting, rows } = fixtures()
  const a = traceCypressRibbons(flow, painting, rows, 60, 7, FIXED)
  const b = traceCypressRibbons(flow, painting, rows, 60, 7, FIXED)
  assert.deepEqual(a, b)
  assert.ok(a.length >= 55, `${a.length} of 60 ribbons`)
  assert.notDeepEqual(a, traceCypressRibbons(flow, painting, rows, 60, 8, FIXED))
})

test('a ribbon grows both ways from its seed and has the fixed sample count away from the mask\'s ends', () => {
  const { flow, painting, rows } = fixtures()
  const ribbons = traceCypressRibbons(flow, painting, rows, 80, 3, FIXED)
  const margin = (FIXED_SAMPLES * FIXED.step) / 2 + 2 * FIXED.step
  let interior = 0
  for (const ribbon of ribbons) {
    const index = seedIndex(ribbon)
    assert.ok(index >= 0, 'the seed is one of the samples')
    assert.ok(ribbon.seedSample.inside)
    if (ribbon.seedSample.py < margin || ribbon.seedSample.py > 1 - margin) continue
    interior++
    assert.equal(ribbon.samples.length, FIXED_SAMPLES, `an interior ribbon has ${FIXED_SAMPLES} samples`)
    assert.equal(index, (FIXED_SAMPLES - 1) / 2, 'the seed sits in the middle')
  }
  assert.ok(interior >= 40, `${interior} interior ribbons`)
})

test('every sample is inside the mask except at most overshootSteps at either end, and the ends are the only overshoot', () => {
  const { flow, painting, rows } = fixtures(0, 30, 170)
  const ribbons = traceCypressRibbons(flow, painting, rows, 120, 11, FIXED)
  let overshooting = 0
  for (const ribbon of ribbons) {
    let leading = 0
    while (leading < ribbon.samples.length && !ribbon.samples[leading].inside) leading++
    let trailing = 0
    while (trailing < ribbon.samples.length && !ribbon.samples[ribbon.samples.length - 1 - trailing].inside) trailing++
    assert.ok(leading <= FIXED.overshootSteps && trailing <= FIXED.overshootSteps, `overshoot ${leading}/${trailing}`)
    for (let k = leading; k < ribbon.samples.length - trailing; k++) assert.ok(ribbon.samples[k].inside, 'no gap inside a ribbon')
    if (leading + trailing > 0) overshooting++
  }
  assert.ok(overshooting > 0, 'ribbons seeded near the mask\'s ends do overshoot it')
})

test('a 30° field bends the ribbon by 30°, and a vertical one keeps it vertical', () => {
  for (const degrees of [0, 30]) {
    const { flow, painting, rows } = fixtures(degrees)
    const ribbons = traceCypressRibbons(flow, painting, rows, 40, 5, FIXED).filter((r) => r.samples.length === FIXED_SAMPLES)
    assert.ok(ribbons.length > 10)
    for (const ribbon of ribbons) {
      const seed = ribbon.seedSample
      const top = ribbon.samples[ribbon.samples.length - 1]
      const dx = (top.px - seed.px) * (WIDTH - 1)
      const dy = (top.py - seed.py) * (HEIGHT - 1)
      assert.ok(dy < 0, 'the ribbon climbs')
      const angle = (Math.atan2(dx, -dy) * 180) / Math.PI
      assert.ok(Math.abs(angle - degrees) < 2, `${angle.toFixed(1)}° against ${degrees}°`)
    }
  }
})

test('the colour is the painting at the middle sample, or at the seed when the middle has overshot', () => {
  const { flow, painting, rows } = fixtures(0, 30, 170)
  for (const ribbon of traceCypressRibbons(flow, painting, rows, 80, 9, FIXED)) {
    const middle = ribbon.samples[Math.floor(ribbon.samples.length / 2)]
    const at = middle.inside ? middle : ribbon.seedSample
    assert.ok(Math.abs(ribbon.colour[0] - at.px) < 2 / 255 + 1 / (WIDTH - 1), 'red encodes px')
    assert.ok(Math.abs(ribbon.colour[1] - at.py) < 2 / 255 + 1 / (HEIGHT - 1), 'green encodes py')
  }
})

test('ribbonEdges offsets the path by the tapered half-width along its 2D normal', () => {
  const { flow, painting, rows } = fixtures()
  const ribbon = traceCypressRibbons(flow, painting, rows, 20, 2, FIXED).find((r) => r.samples.length === FIXED_SAMPLES)
  assert.ok(ribbon)
  const edges = ribbonEdges(ribbon, WIDTH, HEIGHT, 0.5)
  assert.equal(edges.length, ribbon.samples.length)
  const n = ribbon.samples.length
  for (const [k, scale] of [[0, 1], [n - 1, 0.5]] as const) {
    const halfPx = ribbon.halfWidth * (WIDTH - 1) * scale
    const left = edges[k].left
    const right = edges[k].right
    // a vertical path (the byte-quantised field leans 0.2°): the normal is horizontal, so the edges sit at
    // px ± the half-width and the same py, within a thousandth of a pixel
    assert.ok(Math.abs(Math.abs(left[0] - ribbon.samples[k].px) * (WIDTH - 1) - halfPx) < 1e-3)
    assert.ok(Math.abs(Math.abs(right[0] - ribbon.samples[k].px) * (WIDTH - 1) - halfPx) < 1e-3)
    assert.ok(Math.abs(left[1] - ribbon.samples[k].py) * (HEIGHT - 1) < 1e-2 && Math.abs(right[1] - ribbon.samples[k].py) * (HEIGHT - 1) < 1e-2)
    assert.ok(left[0] !== right[0])
  }
})

test('on the real field the flames are clad: samples inside the satellite runs, every frond covered, and a main-only mask gives none', () => {
  const flowPng = decodePNG(readFileSync(new URL('../public/reference/cypress-flow.png', import.meta.url)))
  const flow: ImageData2D = { data: new Uint8ClampedArray(flowPng.rgba), width: flowPng.width, height: flowPng.height }
  const rows = JSON.parse(readFileSync(new URL('../public/reference/cypress-rows.json', import.meta.url), 'utf8')) as CypressLobeRows & {
    uv: [number, number, number, number]
  }
  const painting: ImageData2D = { data: new Uint8ClampedArray([40, 60, 30, 255]), width: 1, height: 1 }
  const plan = buildCypressLobePlan(rows)
  const fronds = plan.lobes.filter((lobe) => lobe.kind === 'frond')
  assert.ok(fronds.length >= 2)

  const satellitesByRow = new Map<number, { x0: number; x1: number }[]>()
  for (const run of rows.satellites) {
    const row = satellitesByRow.get(run.y)
    if (row) row.push(run)
    else satellitesByRow.set(run.y, [run])
  }
  const count = (ribbons: CypressRibbon[]) => {
    let inside = 0
    let inSatellite = 0
    const perFrond = new Map(fronds.map((lobe) => [lobe.id, 0]))
    for (const ribbon of ribbons) {
      for (const sample of ribbon.samples) {
        if (!sample.inside) continue
        inside++
        const y = Math.round(sample.py * (flow.height - 1))
        const x = sample.px * (flow.width - 1)
        if ((satellitesByRow.get(y) ?? []).some((run) => x >= run.x0 && x <= run.x1)) inSatellite++
        for (const lobe of fronds) {
          // above the frond's bridge only: the bridge sits inside the main column by design
          if (1 - sample.py < lobe.sourceHeightRange[0]) continue
          const interval = lobeIntervalsAt({ ...plan, lobes: [lobe] }, 1 - sample.py)[0]
          if (interval && sample.px >= interval.left && sample.px <= interval.right) perFrond.set(lobe.id, perFrond.get(lobe.id)! + 1)
        }
      }
    }
    return { inside, inSatellite, perFrond }
  }

  const ribbons = traceCypressRibbons(flow, painting, rows, CYPRESS_RIBBON_CONFIG.frontCount, 0xc1f3a11)
  assert.ok(ribbons.length >= 400, `${ribbons.length} ribbons on the real asset`)
  const real = count(ribbons)
  assert.ok(real.inSatellite / real.inside >= 0.03, `satellite coverage ${((100 * real.inSatellite) / real.inside).toFixed(1)}%`)
  for (const [id, n] of real.perFrond) assert.ok(n >= 40, `frond ${id} holds ${n} samples`)

  // the negative control: the same flow with the mask kept on the main spans only
  const mainOnly: ImageData2D = { data: new Uint8ClampedArray(flow.data), width: flow.width, height: flow.height }
  const spanByRow = new Map(rows.spans.map(([py, left, right]) => [Math.round(py * (flow.height - 1)), [left, right] as const]))
  for (let y = 0; y < flow.height; y++) {
    const span = spanByRow.get(y)
    for (let x = 0; x < flow.width; x++) {
      const px = x / (flow.width - 1)
      if (!span || px < span[0] || px > span[1]) mainOnly.data[(y * flow.width + x) * 4 + 2] = 0
    }
  }
  const control = count(traceCypressRibbons(mainOnly, painting, rows, CYPRESS_RIBBON_CONFIG.frontCount, 0xc1f3a11))
  assert.equal(control.inSatellite, 0, `${control.inSatellite} main-only samples inside a satellite run`)
  // a frond's smoothed interval can reach a pixel into the main at its base, so the control allows a trace of the positive count
  for (const [id, n] of control.perFrond) assert.ok(n < real.perFrond.get(id)! * 0.02, `main-only mask: frond ${id} holds ${n} samples against ${real.perFrond.get(id)} with the flames`)
})
