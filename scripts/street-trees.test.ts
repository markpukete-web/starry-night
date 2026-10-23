/** The street's trees (pass 6, the design's "trees take Simon's structure"): a trunk, clumps above the eaves, lit from the moon. */

import assert from 'node:assert/strict'
import test from 'node:test'

import { STREET_HOUSES, STREET_TREES } from '../src/scene/streetLayout.ts'
import { buildStreetTrees } from '../src/scene/streetTrees.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

/** A 1600 × 1267 painting in the village's blues and greens, varied so the foliage filter finds texels. */
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

const painting = villagePainting()
const trees = buildStreetTrees(painting, STREET_TREES)

test('the trees build the same twice, every vertex finite, one stroke pair and seed per stroke vertex', () => {
  assert.deepEqual(buildStreetTrees(painting, STREET_TREES), trees)
  assert.ok(trees.solid.positions.every(Number.isFinite) && trees.strokes.positions.every(Number.isFinite))
  const vertices = trees.strokes.positions.length / 3
  assert.equal(trees.stroke.length, vertices * 2)
  assert.equal(trees.seed.length, vertices)
  for (const tree of STREET_TREES) assert.ok(trees.counts[tree.id].front > 0, `${tree.id} has dabs`)
})

test('each tree stands on the ground and its crown rises above the eaves', () => {
  const eave = Math.max(...STREET_HOUSES.map((h) => h.eave / h.storeys))
  const p = trees.solid.positions
  for (const tree of STREET_TREES) {
    let low = Infinity
    let high = -Infinity
    for (let i = 0; i < p.length; i += 3) {
      if (Math.hypot(p[i] - tree.x, p[i + 2] - tree.z) > 0.4) continue
      low = Math.min(low, p[i + 1])
      high = Math.max(high, p[i + 1])
    }
    assert.ok(Math.abs(low) < 0.002, `${tree.id} stands on the ground (lowest ${low})`)
    assert.ok(high > eave + 0.05, `${tree.id} rises above the eaves (${high} against ${eave})`)
  }
})

test('the crown is paler on its upper, moonward side than below', () => {
  const p = trees.strokes.positions
  const c = trees.strokes.colors
  const ys = []
  for (let i = 1; i < p.length; i += 3) ys.push(p[i])
  const mid = [...ys].sort((a, b) => a - b)[Math.floor(ys.length / 2)]
  let up = 0
  let nUp = 0
  let down = 0
  let nDown = 0
  for (let i = 0; i < p.length; i += 3) {
    const lum = 0.2126 * c[i] + 0.7152 * c[i + 1] + 0.0722 * c[i + 2]
    if (p[i + 1] > mid) { up += lum; nUp++ } else { down += lum; nDown++ }
  }
  assert.ok(up / nUp > 1.2 * (down / nDown), `upper ${up / nUp} against lower ${down / nDown}`)
})
