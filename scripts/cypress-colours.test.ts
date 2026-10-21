/** E3 — the cypress's medium: colour along the stroke (tasks/2026-10-22-cypress-e3-plan.md, E3.1, Codex F2 and F7). */

import assert from 'node:assert/strict'
import test from 'node:test'

import { sampleColours, TREE_TEXEL, type CypressRibbonSample } from '../src/scene/cypressStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

const W = 40
const H = 40
/** a painting: a brown band on the left half, a dark green band on the right, a sky stripe (rejected) across the middle rows */
const painting: ImageData2D = { data: new Uint8ClampedArray(W * H * 4), width: W, height: H }
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    const sky = y >= 18 && y < 22
    const [r, g, b] = sky ? [90, 130, 220] : x < W / 2 ? [92, 60, 30] : [20, 50, 30]
    painting.data[i] = r
    painting.data[i + 1] = g
    painting.data[i + 2] = b
    painting.data[i + 3] = 255
  }
}
const rows = { uv: [0, 0, 1, 1] as [number, number, number, number] }
/** a vertical ribbon down the left band, crossing the sky stripe */
const vertical = (x: number): CypressRibbonSample[] => Array.from({ length: 40 }, (_, k) => ({ px: x, py: (k + 0.5) / 40, inside: true }))
const legacy: [number, number, number] = [0.5, 0.5, 0.5]

test('C1 per-sample colours: each sample takes the accepted texel under it; a sample over the sky takes the nearest accepted along the ribbon; a ribbon with no accepted sample takes the legacy colour', () => {
  const colours = sampleColours(painting, rows, vertical(0.25), TREE_TEXEL, legacy, 0)
  assert.equal(colours.length, 40)
  for (let k = 0; k < 40; k++) {
    assert.ok(Math.abs(colours[k][0] - 92 / 255) < 1e-9 && Math.abs(colours[k][1] - 60 / 255) < 1e-9, `sample ${k} carries the brown band, sky samples filled from their neighbours`)
  }
  // a horizontal ribbon crossing from brown to green at the middle row: the colour steps at the band's edge
  const across: CypressRibbonSample[] = Array.from({ length: 40 }, (_, k) => ({ px: (k + 0.5) / 40, py: 0.25, inside: true }))
  const stepped = sampleColours(painting, rows, across, TREE_TEXEL, legacy, 0)
  assert.ok(Math.abs(stepped[10][0] - 92 / 255) < 1e-9, 'brown on the left')
  assert.ok(Math.abs(stepped[30][1] - 50 / 255) < 1e-9, 'green on the right')
  // entirely over the sky: the legacy colour throughout
  const skyOnly: CypressRibbonSample[] = Array.from({ length: 10 }, (_, k) => ({ px: (k + 0.5) / 10, py: 0.5, inside: true }))
  assert.deepEqual(sampleColours(painting, rows, skyOnly, TREE_TEXEL, legacy, 0), Array.from({ length: 10 }, () => legacy))
})

test('C2 the smoothing: a box of ±k samples in linear RGB blends only at a band edge, leaves a uniform band untouched, and keeps the fill-before-smoothing order', () => {
  const across: CypressRibbonSample[] = Array.from({ length: 40 }, (_, k) => ({ px: (k + 0.5) / 40, py: 0.25, inside: true }))
  const sharp = sampleColours(painting, rows, across, TREE_TEXEL, legacy, 0)
  const smooth = sampleColours(painting, rows, across, TREE_TEXEL, legacy, 3)
  const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
  assert.ok(same(smooth[5], sharp[5]), 'inside the brown band: untouched')
  assert.ok(same(smooth[34], sharp[34]), 'inside the green band: untouched')
  const edge = smooth[20]
  assert.ok(edge[0] < sharp[19][0] && edge[0] > sharp[20][0], 'at the edge the red channel lies between the two bands')
  // monotone across the edge: no overshoot
  for (let k = 15; k < 25; k++) assert.ok(smooth[k][0] >= smooth[k + 1][0] - 1e-9, `red falls monotonically across the edge at ${k}`)
  // fill before smoothing: a sky sample inside the brown band is brown after smoothing, not a blend with blue
  const down = sampleColours(painting, rows, vertical(0.25), TREE_TEXEL, legacy, 3)
  for (let k = 17; k < 23; k++) assert.ok(Math.abs(down[k][2] - 30 / 255) < 1e-9, `no sky blue leaks into the band at ${k}`)
})
