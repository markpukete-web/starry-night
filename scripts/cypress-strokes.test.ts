/** The shared flat/runtime cypress stroke integrator. */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CYPRESS_STROKE_CONFIG,
  generateCypressStrokes,
  type CypressStrokeOptions,
} from '../src/scene/cypressStrokes.ts'

const WIDTH = 60
const HEIGHT = 200

function fixtures(flowDx = 0, width = WIDTH, height = HEIGHT) {
  const skin = { data: new Uint8ClampedArray(width * height * 4), width, height }
  const flow = { data: new Uint8ClampedArray(width * height * 4), width, height }
  for (let i = 0; i < width * height; i++) {
    skin.data[i * 4] = 40
    skin.data[i * 4 + 1] = 60
    skin.data[i * 4 + 2] = 30
    skin.data[i * 4 + 3] = 255
    flow.data[i * 4] = Math.round(((flowDx + 1) / 2) * 255)
    flow.data[i * 4 + 1] = 0
    flow.data[i * 4 + 2] = 200
    flow.data[i * 4 + 3] = 255
  }
  const rows: CypressStrokeOptions['rows'] = {
    width,
    height,
    spans: [
      [0, 0, 1],
      [1, 0, 1],
    ],
  }
  return { skin, flow, rows }
}

const options = (override: Partial<CypressStrokeOptions> = {}): CypressStrokeOptions => ({
  ...fixtures(),
  count: 200,
  steps: CYPRESS_STROKE_CONFIG.steps,
  lengthFraction: CYPRESS_STROKE_CONFIG.lengthFraction,
  seed: 12345,
  ...override,
})

test('the shipping stroke settings are one explicit shared contract', () => {
  assert.deepEqual(CYPRESS_STROKE_CONFIG, {
    frontCount: 2200,
    backDensity: 0.45,
    steps: 9,
    lengthFraction: 0.11,
    reliefSpread: 0.06,
  })
})

test('generateCypressStrokes is deterministic', () => {
  assert.deepEqual(generateCypressStrokes(options()), generateCypressStrokes(options()))
})

test('strokes are long enough to avoid the fur read', () => {
  const lengths = generateCypressStrokes(options())
    .map((stroke) =>
      Math.abs(
        stroke.samples[stroke.samples.length - 1].heightFraction -
          stroke.samples[0].heightFraction,
      ),
    )
    .sort((a, b) => a - b)
  const median = lengths[Math.floor(lengths.length / 2)]
  assert.ok(median > 0.11 * 0.6, `median span ${median.toFixed(3)} is short enough to read as fur`)
})

test('strokes travel upward', () => {
  for (const stroke of generateCypressStrokes(options())) {
    assert.ok(
      stroke.samples[stroke.samples.length - 1].heightFraction >=
        stroke.samples[0].heightFraction,
    )
  }
})

test('strokes stop at invalid skin rather than sampling sky', () => {
  const { skin, flow, rows } = fixtures()
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = WIDTH / 2; x < WIDTH; x++) skin.data[(y * WIDTH + x) * 4 + 3] = 0
  }
  for (const stroke of generateCypressStrokes(options({ skin, flow, rows }))) {
    for (const sample of stroke.samples) {
      assert.ok(Math.round(sample.u * (WIDTH - 1)) < WIDTH / 2)
    }
  }
})

test('relief is a conservative constant between neighbouring strokes', () => {
  const strokes = generateCypressStrokes(options())
  const distinct = new Set(strokes.map((stroke) => stroke.relief.toFixed(4)))
  assert.ok(distinct.size > strokes.length * 0.5)
  for (const stroke of strokes) {
    assert.ok(stroke.relief >= 0.94 && stroke.relief <= 1.06)
  }
})

test('relief can be ablated completely', () => {
  for (const stroke of generateCypressStrokes(options({ reliefSpread: 0 }))) {
    assert.equal(stroke.relief, 1)
  }
})

test('seeds favour the fuller base rather than the tip', () => {
  const strokes = generateCypressStrokes(options({ count: 1000 }))
  const lower = strokes.filter((stroke) => stroke.samples[0].heightFraction < 0.5).length
  assert.ok(lower / strokes.length > 0.55, `${((100 * lower) / strokes.length).toFixed(1)}% low`)
})

test('a tapering row span is applied once and invalid exits are clipped', () => {
  const { skin, flow } = fixtures()
  const rows: CypressStrokeOptions['rows'] = {
    width: WIDTH,
    height: HEIGHT,
    spans: [
      [0, 0.4, 0.6],
      [1, 0.1, 0.9],
    ],
  }
  for (let y = 0; y < HEIGHT; y++) {
    const py = y / (HEIGHT - 1)
    const left = 0.4 + (0.1 - 0.4) * py
    const right = 0.6 + (0.9 - 0.6) * py
    for (let x = 0; x < WIDTH; x++) {
      const px = x / (WIDTH - 1)
      if (px < left || px > right) skin.data[(y * WIDTH + x) * 4 + 3] = 0
    }
  }
  for (const stroke of generateCypressStrokes(options({ skin, flow, rows }))) {
    for (const sample of stroke.samples) {
      assert.ok(sample.u >= -0.02 && sample.u <= 1.02, `u escaped the valid span: ${sample.u}`)
    }
  }
})

test('a non-square crop keeps pixel-space steps isotropic', () => {
  const { skin, flow, rows } = fixtures(0.7071, 200, 50)
  for (let i = 0; i < 200 * 50; i++) {
    flow.data[i * 4 + 1] = Math.round(((-0.7071 + 1) / 2) * 255)
  }
  const strokes = generateCypressStrokes(options({ skin, flow, rows, count: 50 }))
  assert.ok(strokes.length > 0)
  const stroke = strokes.find((candidate) => candidate.samples.length === CYPRESS_STROKE_CONFIG.steps)
  assert.ok(stroke)
  const first = stroke.samples[0]
  const last = stroke.samples[stroke.samples.length - 1]
  const dx = Math.abs(last.u - first.u) * (skin.width - 1)
  const dy = Math.abs(last.heightFraction - first.heightFraction) * (skin.height - 1)
  assert.ok(Math.abs(dx - dy) < 1.5, `45-degree flow travelled ${dx}px by ${dy}px`)
})

test('a sideways field bends strokes', () => {
  const straight = generateCypressStrokes(options())
  const bent = generateCypressStrokes(options({ ...fixtures(0.6) }))
  const drift = (strokes: ReturnType<typeof generateCypressStrokes>) =>
    strokes.reduce(
      (sum, stroke) =>
        sum +
        Math.abs(stroke.samples[stroke.samples.length - 1].u - stroke.samples[0].u),
      0,
    ) / strokes.length
  assert.ok(drift(bent) > drift(straight) * 3)
})
