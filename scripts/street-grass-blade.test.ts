/** The street's grass blade (S3 task 1): the template, the clump and the reach. */

import assert from 'node:assert/strict'
import test from 'node:test'
import { Color, SRGBColorSpace } from 'three'

import { mulberry32 } from '../src/scene/brush.ts'
import { bladeReach, bladeTemplate, bladeVertex, clump, GRASS_BLADE, GRASS_SOURCES, grassTexelUsable } from '../src/scene/grassBlade.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

/** A 1600 × 1267 painting in blues, greens, an olive, a near-white, a canvas beige and a brown, so every rule has texels to refuse. */
function painting(): ImageData2D {
  const width = 1600
  const height = 1267
  const data = new Uint8ClampedArray(width * height * 4)
  const swatches = [[40, 60, 110, 255], [60, 90, 70, 255], [30, 40, 60, 255], [150, 150, 70, 255], [240, 240, 235, 255], [170, 160, 140, 255], [120, 80, 50, 255]]
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(swatches[(x * 7 + y * 13) % swatches.length], (y * width + x) * 4)
  return { data, width, height }
}

test('the template has a row per step, two triangles a segment, and narrows to its tip', () => {
  const t = bladeTemplate()
  const rows = GRASS_BLADE.segments + 1
  assert.equal(t.positions.length, rows * 2 * 3)
  assert.equal(t.indices.length / 3, 2 * GRASS_BLADE.segments)
  assert.equal(t.stroke.length, rows * 2 * 2)
  const half = (j: number) => Math.abs(t.positions[j * 6])
  const widest = Math.max(...Array.from({ length: rows }, (_, j) => half(j)))
  assert.ok(half(rows - 1) < 0.5 * widest, `tip ${half(rows - 1)} against widest ${widest}`)
  // the stroke runs 0.5 → 1 from root to tip, so the body shapes the tip only
  assert.equal(t.stroke[0], 0.5)
  assert.equal(t.stroke[(rows - 1) * 4], 1)
})

test('a clump is the same for the same seed', () => {
  const p = painting()
  assert.deepEqual(clump(mulberry32(7), p, 0.1, 0.2, 0.024), clump(mulberry32(7), p, 0.1, 0.2, 0.024))
  assert.notDeepEqual(clump(mulberry32(7), p, 0.1, 0.2, 0.024), clump(mulberry32(8), p, 0.1, 0.2, 0.024))
})

test('every colour is a texel of a source, never a near-white, the canvas or a brown', () => {
  const p = painting()
  const allowed = new Set<string>()
  const key = (c: readonly number[]) => c.map((v) => v.toFixed(6)).join(',')
  for (const [x0, y0, x1, y1] of Object.values(GRASS_SOURCES)) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * p.width + x) * 4
      if (!grassTexelUsable(p.data[i], p.data[i + 1], p.data[i + 2])) continue
      const c = new Color().setRGB(p.data[i] / 255, p.data[i + 1] / 255, p.data[i + 2] / 255, SRGBColorSpace)
      allowed.add(key([c.r, c.g, c.b]))
    }
  }
  // the three refusals, read independently of the rule
  assert.ok(!grassTexelUsable(240, 240, 235) && !grassTexelUsable(170, 160, 140) && !grassTexelUsable(120, 80, 50))
  assert.ok(grassTexelUsable(40, 60, 110) && grassTexelUsable(150, 150, 70))
  const rand = mulberry32(3)
  for (let k = 0; k < 200; k++) {
    for (const b of clump(rand, p, 0, 0, 0.024)) assert.ok(allowed.has(key(b.colour)), `colour ${b.colour}`)
  }
})

test('a clump fans out: the outer blades lean further and are paler than the inner', () => {
  const p = painting()
  const rand = mulberry32(11)
  let inner = 0, outer = 0, innerL = 0, outerL = 0
  const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  for (let k = 0; k < 300; k++) {
    for (const b of clump(rand, p, 0, 0, 0.024)) {
      if (Math.abs(b.lean) < 0.25 * GRASS_BLADE.fan) { inner++; innerL += lum(b.colour) }
      else if (Math.abs(b.lean) > 0.75 * GRASS_BLADE.fan) { outer++; outerL += lum(b.colour) }
    }
  }
  assert.ok(inner > 0 && outer > 0)
  assert.ok(outerL / outer > 1.3 * (innerL / inner), `outer ${outerL / outer} inner ${innerL / inner}`)
})

test('no blade bends into the ground: its spine stays up and its tip well above the root', () => {
  const p = painting()
  const rand = mulberry32(5)
  for (let k = 0; k < 300; k++) {
    for (const b of clump(rand, p, 0, 0, 0.024)) {
      for (let j = 0; j <= 16; j++) assert.ok(bladeVertex(b, j / 16, 0, [1, 0])[1] >= 0, `spine below the ground at ${j / 16}`)
      const tip = bladeVertex(b, 1, 0, [1, 0])[1]
      assert.ok(tip >= 0.15 * b.height, `tip ${tip} for a blade ${b.height} long`)
    }
  }
})

test('the reach holds every vertex, with the push and the wind, and grows with the distance', () => {
  const p = painting()
  const rand = mulberry32(9)
  const t = bladeTemplate()
  for (let k = 0; k < 100; k++) {
    for (const b of clump(rand, p, 0.3, -0.2, 0.024)) {
      for (const d of [0.1, 0.3, 1.2]) {
        const widen = Math.max(1, d / GRASS_BLADE.widenFrom)
        let far = 0
        for (let v = 0; v < t.positions.length / 3; v++) {
          const [x, , z] = bladeVertex(b, t.positions[v * 3 + 1], t.positions[v * 3], [0.6, 0.8], widen)
          far = Math.max(far, Math.hypot(x - b.x, z - b.z))
        }
        assert.ok(bladeReach(b, d) >= far + GRASS_BLADE.push + GRASS_BLADE.wind - 1e-12, `reach ${bladeReach(b, d)} far ${far}`)
      }
      assert.ok(bladeReach(b, 3) > bladeReach(b, 0.3))
    }
  }
})
