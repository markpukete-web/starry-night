import assert from 'node:assert/strict'
import test from 'node:test'
import { buildHoleFillGrid, buildSourceStreamlineRibbons } from '../src/scene/streamlineGeometry.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

function image(width: number, height: number, rgba: [number, number, number, number]): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i)
  return { width, height, data }
}

/**
 * Blue-sky painting with a brown "tree" column (mask hole + feathered edge) on the left, plus a
 * detached brown WISP column the mask wrongly claims as solid sky (the real sky-mask misses the
 * cypress's wispy fringes the same way).
 */
function holeScene(width = 64, height = 64) {
  const painting = image(width, height, [40, 90, 180, 255])
  const mask = image(width, height, [255, 255, 255, 255])
  const holeW = Math.floor(width / 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= holeW; x++) {
      const i = (y * width + x) * 4
      painting.data[i] = 120
      painting.data[i + 1] = 80
      painting.data[i + 2] = 30
      // solid hole, with a feathered edge column carrying part-tree colour
      mask.data[i] = x === holeW ? 80 : 0
    }
    for (let x = holeW + 6; x <= holeW + 10; x++) {
      const i = (y * width + x) * 4
      painting.data[i] = 120
      painting.data[i + 1] = 80
      painting.data[i + 2] = 30
      // mask stays 255: a mask-missed warm-olive wisp
    }
    for (let x = holeW + 14; x <= holeW + 18; x++) {
      const i = (y * width + x) * 4
      painting.data[i] = 40
      painting.data[i + 1] = 48
      painting.data[i + 2] = 45
      // mask stays 255: a mask-missed near-neutral dark grey wisp (the tip mass)
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

test('hole fill grid inpaints sky colour across the cut-out, never the tree browns', () => {
  const { painting, mask } = holeScene()
  const grid = buildHoleFillGrid(painting, mask)
  // a cell deep inside the hole must have relaxed to the surrounding blue, not stayed brown/black
  const cx = Math.floor(grid.gw * 0.125)
  const cy = Math.floor(grid.gh / 2)
  const i = (cy * grid.gw + cx) * 4
  assert.ok(grid.rgba[i + 2] > grid.rgba[i], `fill should be blue-dominant, got rgb(${grid.rgba[i]},${grid.rgba[i + 1]},${grid.rgba[i + 2]})`)
  assert.ok(Math.abs(grid.rgba[i + 2] - 180) < 40, `fill blue should approach the sky's 180, got ${grid.rgba[i + 2]}`)
  // and a true-sky cell holds the painting's own colour
  const j = (cy * grid.gw + Math.floor(grid.gw * 0.7)) * 4
  assert.ok(Math.abs(grid.rgba[j + 2] - 180) < 12 && Math.abs(grid.rgba[j] - 40) < 12)
})

test('hole fill alpha flags mask-missed tree wisps for the wash override', () => {
  const { painting, mask } = holeScene()
  const grid = buildHoleFillGrid(painting, mask)
  const cy = Math.floor(grid.gh / 2)
  // cells inside both wisp columns (mask says solid sky, chroma says tree): high alpha + sky fill
  for (const wu of [0.375, 0.5]) {
    const w = (cy * grid.gw + Math.floor(grid.gw * wu)) * 4
    assert.ok(grid.rgba[w + 3] > 200, `wisp cell alpha at u=${wu} should be high, got ${grid.rgba[w + 3]}`)
    assert.ok(grid.rgba[w + 2] > grid.rgba[w], `wisp cell fill colour at u=${wu} should be sky, not tree`)
  }
  // clean sky keeps alpha ~0 so the painting shows untouched
  const s = (cy * grid.gw + Math.floor(grid.gw * 0.7)) * 4
  assert.ok(grid.rgba[s + 3] < 30, `clean-sky alpha should stay ~0, got ${grid.rgba[s + 3]}`)
})

test('ribbon trail points inside a hole wear donor sky colour, not the cut-out tree browns', () => {
  const { painting, mask } = holeScene()
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
  for (const vertex of built.vertices) {
    const [r, g, b] = vertex.color
    assert.ok(b > r && b > g, `every ribbon colour should be sky-blue-dominant, got rgb ${vertex.color.join(',')} at u=${vertex.u.toFixed(3)}`)
  }
})
