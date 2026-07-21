/**
 * Synthetic tests for the cypress derivation maths. The invariants are structural: the mask owns
 * the tree rather than the terrain it touches, the tensor never borrows sky, weak directions fall
 * back to vertical, and the signed field always integrates upward.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  blendToVertical,
  cypressMask,
  lowPassOrientation,
  orientationField,
  satelliteRuns,
  signedUpDirection,
  type Grid,
} from './lib/cypress-field.ts'
import type { DecodedPNG } from './lib/png.ts'

const W = 80
const H = 120
const TREE: [number, number, number] = [40, 46, 30]
const SKY: [number, number, number] = [70, 90, 180]

function png(fn: (x: number, y: number) => [number, number, number]): DecodedPNG {
  const rgba = new Uint8Array(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = fn(x, y)
      const i = (y * W + x) * 4
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = 255
    }
  }
  return { width: W, height: H, rgba }
}

function grid(fn: (x: number, y: number) => number): Grid {
  const data = new Float64Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) data[y * W + x] = fn(x, y)
  }
  return { width: W, height: H, data }
}

function angleOf(cos2: number, sin2: number): number {
  let angle = (0.5 * Math.atan2(sin2, cos2) * 180) / Math.PI
  while (angle < 0) angle += 180
  return angle % 180
}

/** A tapered trunk meeting a much wider dark terrain band: the real failure mode in miniature. */
function treeOnTerrain(): DecodedPNG {
  return png((x, y) => {
    const halfWidth = 2 + (y / H) * 12
    const inTrunk = Math.abs(x - W / 2) < halfWidth
    const inTerrain = y > H - 8
    return inTrunk || inTerrain ? TREE : SKY
  })
}

test('cypressMask keeps the trunk and refuses terrain from either seed direction', () => {
  const { mask, spans } = cypressMask(treeOnTerrain(), { x0: 0, y0: 0, x1: W, y1: H })
  assert.equal(mask[Math.floor(H / 2) * W + W / 2], 1, 'trunk is cypress')
  assert.equal(mask[(H - 2) * W + 3], 0, 'far terrain must not be claimed')
  const widest = Math.max(...spans.map((span) => span.x1 - span.x0 + 1))
  assert.ok(widest < W * 0.6, `mask leaked into terrain: widest ${widest}px of ${W}`)
  assert.ok(spans.length > H * 0.8, `the trunk chain should win, got only ${spans.length} rows`)
})

test('cypressMask returns row spans that track the real silhouette', () => {
  const { spans } = cypressMask(treeOnTerrain(), { x0: 0, y0: 0, x1: W, y1: H })
  const top = spans.find((span) => span.y === Math.floor(H * 0.15))
  const low = spans.find((span) => span.y === Math.floor(H * 0.75))
  assert.ok(top && low, 'spans must cover the tree')
  assert.ok(low.x1 - low.x0 > (top.x1 - top.x0) * 1.8, 'the trunk widens downward')
  assert.ok(Math.abs((top.x0 + top.x1) / 2 - W / 2) < 2, 'span is centred on the trunk')
})

test('satelliteRuns finds detached treeish runs beside the trunk', () => {
  const withFrond = png((x, y) => {
    const inTrunk = Math.abs(x - W / 2) < 2 + (y / H) * 12
    const inFrond = y > 12 && y < 30 && x > W / 2 + 10 && x < W / 2 + 14
    return inTrunk || inFrond ? TREE : SKY
  })
  const box = { x0: 0, y0: 0, x1: W, y1: H }
  const { spans } = cypressMask(withFrond, box)
  const satellites = satelliteRuns(withFrond, box, spans)
  assert.ok(satellites.length > 5, `expected the frond, got ${satellites.length} runs`)
  for (const run of satellites) {
    assert.ok(run.y >= 12 && run.y <= 30, `satellite at y=${run.y} is outside the frond`)
    assert.ok(run.x0 > W / 2 + 5, 'satellite must sit beside the trunk')
  }
})

test('orientationField reads vertical stripes as vertical and zeros off-mask confidence', () => {
  const luminance = grid((x) => (x % 8 < 4 ? 20 : 200))
  const mask = new Uint8Array(W * H).fill(1)
  const field = orientationField(luminance, mask, 3)
  const sample = 60 * W + 40
  assert.ok(Math.abs(angleOf(field.cos2[sample], field.sin2[sample]) - 90) < 8)
  assert.ok(field.coherence[sample] > 0.5)

  const half = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = W / 2; x < W; x++) half[y * W + x] = 1
  }
  const gated = orientationField(luminance, half, 3)
  assert.equal(gated.coherence[60 * W + 10], 0, 'off-mask texels have no coherence')
})

test('lowPassOrientation averages orientations across the wrap point', () => {
  const cos2 = new Float64Array(W * H)
  const sin2 = new Float64Array(W * H)
  const mask = new Uint8Array(W * H).fill(1)
  for (let i = 0; i < W * H; i++) {
    const doubleAngle = (2 * (i % 2 === 0 ? 179 : 1) * Math.PI) / 180
    cos2[i] = Math.cos(doubleAngle)
    sin2[i] = Math.sin(doubleAngle)
  }
  const out = lowPassOrientation(cos2, sin2, mask, W, H, 2)
  const angle = angleOf(out.cos2[60 * W + 40], out.sin2[60 * W + 40])
  assert.ok(Math.min(angle, 180 - angle) < 10, `expected 0/180 degrees, got ${angle}`)
})

test('the field is mask-aware at the tree boundary', () => {
  const luminance = grid((x, y) =>
    x < W / 2 ? (y % 8 < 4 ? 20 : 200) : x % 8 < 4 ? 20 : 200,
  )
  const mask = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W / 2; x++) mask[y * W + x] = 1
  }
  const raw = orientationField(luminance, mask, 3)
  const out = lowPassOrientation(raw.cos2, raw.sin2, mask, W, H, 3)
  const boundary = 60 * W + (W / 2 - 1)
  const angle = angleOf(out.cos2[boundary], out.sin2[boundary])
  assert.ok(Math.min(Math.abs(angle), Math.abs(angle - 180)) < 20, `sky leaked in: ${angle} degrees`)
})

test('blendToVertical keeps confident texels and rescues weak ones', () => {
  const out = blendToVertical(
    new Float64Array([1, 1]),
    new Float64Array([0, 0]),
    new Float64Array([1, 0]),
  )
  assert.ok(Math.abs(angleOf(out.cos2[0], out.sin2[0])) < 5)
  assert.ok(Math.abs(angleOf(out.cos2[1], out.sin2[1]) - 90) < 5)
})

test('signedUpDirection always points up the form', () => {
  for (const degrees of [90, 80, 100, 45, 135]) {
    const doubleAngle = (2 * degrees * Math.PI) / 180
    const direction = signedUpDirection(Math.cos(doubleAngle), Math.sin(doubleAngle))
    assert.ok(direction.dy <= 0, `${degrees} degrees resolved down: ${direction.dy}`)
    assert.ok(Math.abs(Math.hypot(direction.dx, direction.dy) - 1) < 1e-9)
  }
})
