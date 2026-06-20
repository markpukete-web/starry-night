import assert from 'node:assert/strict'
import test from 'node:test'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { ANCHOR_UVS, HORIZON, buildVortices, frontUV } from '../src/scene/skyMapping.ts'
import { makeFlowField } from '../src/scene/flowField.ts'
import { buildDabField } from '../src/scene/dabField.ts'

function img(r: number, g: number, b: number, width = 8, height = 8): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255 }
  return { data, width, height }
}
const field = () => makeFlowField({ flow: img(255, 128, 220), vortices: buildVortices(), swirlTightness: 0.45, flowBias: 0.6 })
const onArcCount = (dabs: { dir: import('three').Vector3 }[]) => dabs.filter((d) => frontUV(d.dir).onArc).length

test('buildDabField returns exactly the requested count', () => {
  assert.equal(buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 500 }).length, 500)
})

test('every dab sits on the dome above the horizon with an orthonormal (dir, tangent) frame', () => {
  for (const d of buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 500 })) {
    assert.equal(Math.abs(d.dir.length() - 1) < 1e-5, true)
    assert.equal(d.dir.y >= HORIZON - 1e-6, true)
    assert.equal(Math.abs(d.tangent.length() - 1) < 1e-5, true)
    assert.equal(Math.abs(d.dir.dot(d.tangent)) < 1e-5, true)
    assert.equal(d.phase >= 0 && d.phase < 1, true)
    assert.equal(d.scale > 0 && d.drift > 0, true)
  }
})

test('front-biased seeding puts more dabs on the front arc than uniform seeding', () => {
  const lots = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 800, seed: 7, frontFraction: 1 })
  const none = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 800, seed: 7, frontFraction: 0 })
  assert.equal(onArcCount(lots) > onArcCount(none), true)
})

test('anchor densification clusters more dabs near the painting anchors', () => {
  const nearAnchors = (dabs: { dir: import('three').Vector3 }[]) =>
    dabs.filter((d) => {
      const { u, v, onArc } = frontUV(d.dir)
      return onArc && ANCHOR_UVS.some((a) => Math.hypot(u - a[0], v - a[1]) < 0.1)
    }).length
  const dense = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 800, seed: 5, frontFraction: 1, anchorFraction: 1 })
  const flat = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 800, seed: 5, frontFraction: 1, anchorFraction: 0 })
  assert.equal(nearAnchors(dense) > nearAnchors(flat), true)
})

test('buildDabField is deterministic for a fixed seed', () => {
  const a = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 64, seed: 99 })
  const b = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 64, seed: 99 })
  assert.equal(a[0].dir.equals(b[0].dir), true)
  assert.equal(a[63].phase, b[63].phase)
})
