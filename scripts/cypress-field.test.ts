/**
 * Synthetic tests for the cypress derivation maths. The invariants are structural: the seed mask owns the trunk
 * rather than the terrain it touches, the whole-tree component never leaves its domain (E1, Codex F2), the tensor
 * never borrows sky, only texels with no orientation fall back to vertical, and the signed field always
 * integrates upward.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  blendToVertical,
  cypressMask,
  lowPassOrientation,
  orientationField,
  satelliteRuns,
  signedUpDirection,
  toCropLocalRuns,
  treeComponent,
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

/**
 * The trunk with a flame beside it (joined at its base), a one-pixel sky hole inside the flame, a blob one speckle
 * away from the trunk (the star's halo in miniature), a detached blob, terrain below.
 */
function treeWithFlame(): DecodedPNG {
  return png((x, y) => {
    const inTrunk = Math.abs(x - W / 2) < 2 + (y / H) * 12
    const inFlame = y > 12 && y < 60 && x > W / 2 + 10 && x < W / 2 + 15 && !(y === 30 && x === W / 2 + 12)
    const inFlameFoot = y >= 60 && y < 70 && x > W / 2 + 4 && x < W / 2 + 15
    const inBlob = y > 20 && y < 28 && x > 4 && x < 10
    const speckle = y === 50 && x === W / 2 - 2 - Math.floor((50 / H) * 12) - 1
    const nearBlob = y > 44 && y < 56 && x > 8 && x < W / 2 - 2 - Math.floor((50 / H) * 12) - 1
    const inTerrain = y > H - 8
    return inTrunk || inFlame || inFlameFoot || inBlob || speckle || nearBlob || inTerrain ? TREE : SKY
  })
}

test('treeComponent holds the trunk and the joined flame, closes a hole inside, and leaves blobs out, speckle-bridged or not', () => {
  const image = treeWithFlame()
  const { spans } = cypressMask(image, { x0: 0, y0: 0, x1: W, y1: H })
  const domain = { x0: 0, y0: 0, x1: W, y1: H - 8 }
  const { mask, runs, bounds, pixels } = treeComponent(image, domain, spans, 1)
  assert.equal(mask[40 * W + (W / 2 + 12)], 1, 'the flame joined at its foot is tree')
  assert.equal(mask[30 * W + (W / 2 + 12)], 1, 'the 1 px hole inside the flame is closed')
  assert.equal(mask[24 * W + 7], 0, 'a detached blob is not tree')
  assert.equal(mask[50 * W + 12], 0, 'a blob joined to the trunk by one speckle is not tree (the halo case)')
  assert.ok(runs.some((run) => run.y === 40 && run.x0 > W / 2 + 5), 'the flame is a run of its own beside the trunk')
  assert.ok(bounds.y1 <= domain.y1 && bounds.x1 <= domain.x1 && bounds.x0 >= domain.x0, 'bounds inside the domain')
  assert.equal(pixels, mask.reduce((sum, value) => sum + value, 0))
})

test('treeComponent never leaves its domain: a trunk joined to terrain stops at the domain\'s last row (Codex F2)', () => {
  const image = treeOnTerrain()
  const { spans } = cypressMask(image, { x0: 0, y0: 0, x1: W, y1: H })
  const domain = { x0: 0, y0: 0, x1: W, y1: H - 8 }
  const { mask, bounds } = treeComponent(image, domain, spans, 1)
  for (let y = H - 8; y < H; y++) for (let x = 0; x < W; x++) assert.equal(mask[y * W + x], 0, `terrain row ${y} claimed`)
  assert.equal(mask[(H - 9) * W + W / 2], 1, 'the trunk reaches the domain\'s last row')
  assert.equal(mask[(H - 9) * W + 2], 0, 'the terrain band\'s row above the domain edge is sky there')
  assert.ok(bounds.y1 <= H - 8)
})

test('satelliteRuns are the component\'s runs beside the main span, from the runs alone', () => {
  const image = treeWithFlame()
  const { spans } = cypressMask(image, { x0: 0, y0: 0, x1: W, y1: H })
  const { runs } = treeComponent(image, { x0: 0, y0: 0, x1: W, y1: H - 8 }, spans, 1)
  const satellites = satelliteRuns(runs, spans)
  assert.ok(satellites.length > 20, `expected the flame's rows, got ${satellites.length} runs`)
  for (const run of satellites) {
    assert.ok(run.y >= 12 && run.y < 60, `satellite at y=${run.y} is outside the flame`)
    assert.ok(run.x0 > W / 2 + 5, 'satellite must sit beside the trunk')
  }
})

test('satellite coordinates are translated from a non-zero painting crop exactly once', () => {
  assert.deepEqual(
    toCropLocalRuns(
      [
        { y: 105, x0: 230, x1: 245 },
        { y: 130, x0: 180, x1: 190 },
      ],
      { x0: 170, y0: 90 },
    ),
    [
      { y: 15, x0: 60, x1: 75 },
      { y: 40, x0: 10, x1: 20 },
    ],
  )
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

test('the tensor\'s anisotropy is 1 on clean stripes, 0 on a flat field, independent of brightness', () => {
  const mask = new Uint8Array(W * H).fill(1)
  // bright stripes on the left, the same stripes at a tenth of the contrast on the right: the energy term is
  // normalised by the image's own maximum, so the dim half is where the coherence drops and the anisotropy does not
  const split = orientationField(grid((x) => (x < W / 2 ? (x % 8 < 4 ? 20 : 200) : x % 8 < 4 ? 20 : 38)), mask, 3)
  const flat = orientationField(grid(() => 60), mask, 3)
  const bright = 60 * W + 20
  const dim = 60 * W + 60
  assert.ok(split.anisotropy[bright] > 0.9, `bright stripes ${split.anisotropy[bright]}`)
  assert.ok(split.anisotropy[dim] > 0.9, `dim stripes keep their anisotropy: ${split.anisotropy[dim]}`)
  assert.ok(split.coherence[dim] < 0.5, `the energy-weighted coherence is what drops on the dim half: ${split.coherence[dim]}`)
  assert.equal(flat.anisotropy[dim], 0)
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

test('blendToVertical keeps a 30° texel with a clear orientation and rescues only one with none', () => {
  const doubleAngle = (2 * 30 * Math.PI) / 180
  const out = blendToVertical(
    new Float64Array([Math.cos(doubleAngle), Math.cos(doubleAngle), Math.cos(doubleAngle)]),
    new Float64Array([Math.sin(doubleAngle), Math.sin(doubleAngle), Math.sin(doubleAngle)]),
    new Float64Array([1, 0.3, 0]),
  )
  assert.ok(Math.abs(angleOf(out.cos2[0], out.sin2[0]) - 30) < 1, 'anisotropy 1 keeps 30°')
  assert.ok(Math.abs(angleOf(out.cos2[1], out.sin2[1]) - 30) < 1, 'anisotropy 0.3 is above the gate and keeps 30°')
  assert.ok(Math.abs(angleOf(out.cos2[2], out.sin2[2]) - 90) < 1, 'anisotropy 0 is vertical')
})

test('signedUpDirection always points up the form', () => {
  for (const degrees of [90, 80, 100, 45, 135]) {
    const doubleAngle = (2 * degrees * Math.PI) / 180
    const direction = signedUpDirection(Math.cos(doubleAngle), Math.sin(doubleAngle))
    assert.ok(direction.dy <= 0, `${degrees} degrees resolved down: ${direction.dy}`)
    assert.ok(Math.abs(Math.hypot(direction.dx, direction.dy) - 1) < 1e-9)
  }
})

test('the shipped row table records a whole-tree component at the scan\'s resolution within the derive guard', () => {
  const rows = JSON.parse(readFileSync(new URL('../public/reference/cypress-rows.json', import.meta.url), 'utf8')) as {
    uv: [number, number, number, number]
    width: number
    height: number
    spans: [number, number, number][]
    satellites: { y: number; x0: number; x1: number }[]
    component: { bounds: { x0: number; y0: number; x1: number; y1: number }; pixels: number; rows: number }
  }
  assert.equal(rows.uv.length, 4)
  assert.ok(rows.uv[0] < rows.uv[2] && rows.uv[1] < rows.uv[3])
  assert.ok(rows.height >= 1500, `the table is at the scan's resolution: ${rows.height} rows`)
  assert.ok(rows.component.rows >= 0.95 * rows.height, `the component spans the domain's height: ${rows.component.rows} of ${rows.height}`)
  assert.ok(rows.component.pixels >= 250_000 && rows.component.pixels <= 450_000, `the component's size: ${rows.component.pixels}`)
  assert.ok(rows.component.bounds.x1 - rows.component.bounds.x0 <= rows.width)
  assert.ok(rows.spans.length >= 1500, 'the main column has a span on nearly every row')
  assert.ok(rows.satellites.some((run) => run.y > 0.4 * rows.height && run.y < 0.7 * rows.height), 'the left flame is in the satellites')
})
