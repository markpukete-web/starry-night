import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSourceStreamlineRibbons } from '../src/scene/streamlineGeometry.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

function image(width: number, height: number, rgba: [number, number, number, number]): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i)
  return { width, height, data }
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
