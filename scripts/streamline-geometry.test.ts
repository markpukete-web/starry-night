import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSourceStreamlineRibbons } from '../src/scene/streamlineGeometry.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

function image(width: number, height: number, rgba: [number, number, number, number]): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i)
  return { width, height, data }
}

/**
 * Pre-FILLED blue-sky painting with a mask hole column on the left (the old 2D cypress
 * cut-out). Since the offline inpaint pipeline (docs/decisions/0003-inpaint-extend.md) the
 * painting handed to the 3D builder already carries real sky in the holes — the runtime's job
 * is only to keep seeding ribbons there. (The old donor/fill-grid heuristics and their tests
 * are replaced by scripts/inpaint.test.ts.)
 */
function holeScene(width = 64, height = 64) {
  const painting = image(width, height, [40, 90, 180, 255])
  const mask = image(width, height, [255, 255, 255, 255])
  const holeW = Math.floor(width / 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= holeW; x++) {
      mask.data[(y * width + x) * 4] = x === holeW ? 80 : 0
    }
  }
  return { painting, mask, holeW }
}

test('source streamline builder is deterministic', () => {
  const flow = image(16, 16, [255, 128, 255, 255])
  const mask = image(16, 16, [255, 255, 255, 255])
  const painting = image(16, 16, [20, 80, 160, 255])
  const a = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 12,
    strokeWidth: 0.004,
    points: 6,
    stepSize: 0.01,
    seed: 123,
  })
  const b = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 12,
    strokeWidth: 0.004,
    points: 6,
    stepSize: 0.01,
    seed: 123,
  })
  assert.deepEqual(a, b)
  assert.ok(a.vertices.length > 0)
  assert.ok(a.indices.length > 0)
})

test('source streamline vertices stay close to image UV bounds', () => {
  const flow = image(16, 16, [255, 128, 255, 255])
  const mask = image(16, 16, [255, 255, 255, 255])
  const painting = image(16, 16, [20, 80, 160, 255])
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 16,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 456,
  })
  for (const vertex of built.vertices) {
    assert.ok(vertex.u >= -0.02 && vertex.u <= 1.02)
    assert.ok(vertex.v >= -0.02 && vertex.v <= 1.02)
  }
})

test('ribbons seed inside mask holes when openSkyBandV is set, wearing the filled painting', () => {
  const { painting, mask, holeW } = holeScene()
  const flow = image(64, 64, [255, 128, 255, 255])
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 60,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 789,
    openSkyBandV: 1,
  })
  assert.ok(built.vertices.length > 0)
  // the hole column must be churned over (the fill is real sky now, not a dead patch)
  const holeU = holeW / 64
  assert.ok(
    built.vertices.some((vertex) => vertex.u < holeU * 0.9),
    'some ribbon vertices should lie inside the old cut-out column',
  )
  for (const vertex of built.vertices) {
    const [r, , b] = vertex.color
    assert.ok(b > r, `ribbon colour should be the painting's sky, got rgb ${vertex.color.join(',')}`)
  }
})

test('without openSkyBandV (2D routes) mask holes stay unseeded', () => {
  const { painting, mask, holeW } = holeScene()
  const flow = image(64, 64, [255, 128, 255, 255])
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 60,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 789,
  })
  assert.ok(built.vertices.length > 0)
  // seeds start outside the hole (trails may drift across; seeding must not START in it) —
  // approximate by requiring the vast majority of vertices to sit outside the column
  const holeU = (holeW / 64) * 0.9
  const inside = built.vertices.filter((vertex) => vertex.u < holeU).length
  assert.ok(inside / built.vertices.length < 0.1, `only trail drift may enter the hole, got ${inside}/${built.vertices.length}`)
})
