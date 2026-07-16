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

/**
 * S4 side-extension composite: [strip | canvas | strip] with distinctively darker-blue strips,
 * as PaintingFlowSky3D stitches from sky-extend-{left,right}.png. The mask stays canvas-sized.
 */
function sideExtendScene(width = 64, height = 64, pad = 16) {
  const compW = width + 2 * pad
  const composite = image(compW, height, [40, 90, 180, 255])
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < compW; x++) {
      if (x >= pad && x < pad + width) continue
      const p = (y * compW + x) * 4
      composite.data[p] = 10
      composite.data[p + 1] = 40
      composite.data[p + 2] = 120
    }
  }
  const flow = image(compW, height, [255, 128, 255, 255])
  const mask = image(width, height, [255, 255, 255, 255])
  return { composite, flow, mask, uPad: pad / width }
}

test('uPad 0 is byte-identical to the pre-S4 builder', () => {
  const flow = image(16, 16, [255, 128, 255, 255])
  const mask = image(16, 16, [255, 255, 255, 255])
  const painting = image(16, 16, [20, 80, 160, 255])
  const opts = {
    flowData: flow,
    maskData: mask,
    paintingData: painting,
    count: 12,
    strokeWidth: 0.004,
    points: 6,
    stepSize: 0.01,
    seed: 123,
  }
  assert.deepEqual(buildSourceStreamlineRibbons({ ...opts, uPad: 0 }), buildSourceStreamlineRibbons(opts))
})

test('with uPad ribbons seed in the side strips and emit painting-space u', () => {
  const { composite, flow, mask, uPad } = sideExtendScene()
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: composite,
    count: 120,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 42,
    openSkyBandV: 1,
    uPad,
  })
  assert.ok(built.vertices.length > 0)
  const outside = built.vertices.filter((vertex) => vertex.u < -0.03 || vertex.u > 1.03)
  assert.ok(outside.length > 0, 'some ribbons should live in the side strips')
  for (const vertex of built.vertices) {
    assert.ok(vertex.u >= -uPad - 0.02 && vertex.u <= 1 + uPad + 0.02, `paintU out of extended bounds: ${vertex.u}`)
  }
  // strip vertices carry the STRIP's paint (sampled from the composite, not the canvas)
  const deepStrip = built.vertices.filter((vertex) => vertex.u < -0.06)
  assert.ok(deepStrip.length > 0)
  for (const vertex of deepStrip) {
    assert.ok(vertex.color[2] < 0.6, `strip vertex should wear the strip's darker blue, got b=${vertex.color[2]}`)
  }
})

test('with uPad but without openSkyBandV the strips stay unseeded (2D contract)', () => {
  const { composite, flow, mask, uPad } = sideExtendScene()
  const built = buildSourceStreamlineRibbons({
    flowData: flow,
    maskData: mask,
    paintingData: composite,
    count: 120,
    strokeWidth: 0.004,
    points: 8,
    stepSize: 0.01,
    seed: 42,
    uPad,
  })
  const outside = built.vertices.filter((vertex) => vertex.u < -0.03 || vertex.u > 1.03).length
  assert.ok(outside / Math.max(1, built.vertices.length) < 0.1, `only trail drift may exit the canvas, got ${outside}`)
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
