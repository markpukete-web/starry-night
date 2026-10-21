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

  // the nearest side wins across a rejected run between two different bands: a ribbon down the sky stripe's rows
  // at the band edge, brown samples left of it, green right of it, sky between (code review F3: always the first
  // accepted sample passed the old fixture)
  const mixed: CypressRibbonSample[] = [
    { px: 0.25, py: 0.1, inside: true }, // brown
    { px: 0.25, py: 0.2, inside: true }, // brown
    { px: 0.3, py: 0.475, inside: true }, // sky
    { px: 0.5, py: 0.5, inside: true }, // sky
    { px: 0.7, py: 0.525, inside: true }, // sky
    { px: 0.75, py: 0.8, inside: true }, // green
    { px: 0.75, py: 0.9, inside: true }, // green
  ]
  const filled = sampleColours(painting, rows, mixed, TREE_TEXEL, legacy, 0)
  const brown = [92 / 255, 60 / 255, 30 / 255]
  const green = [20 / 255, 50 / 255, 30 / 255]
  const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
  assert.ok(same(filled[2], brown), 'the sky sample nearer the brown takes brown')
  assert.ok(same(filled[4], green), 'the sky sample nearer the green takes green')
  assert.ok(same(filled[3], brown), 'at a tie the earlier accepted sample wins')
  // rejected endpoints: filled from the nearest accepted inward
  const ends: CypressRibbonSample[] = [{ px: 0.5, py: 0.5, inside: true }, { px: 0.25, py: 0.1, inside: true }, { px: 0.75, py: 0.9, inside: true }, { px: 0.5, py: 0.5, inside: true }]
  const endsFilled = sampleColours(painting, rows, ends, TREE_TEXEL, legacy, 0)
  assert.ok(same(endsFilled[0], brown) && same(endsFilled[3], green), 'each rejected end takes its neighbour')
  // one accepted sample colours the whole ribbon
  const one: CypressRibbonSample[] = [{ px: 0.5, py: 0.5, inside: true }, { px: 0.75, py: 0.9, inside: true }, { px: 0.5, py: 0.5, inside: true }]
  assert.ok(sampleColours(painting, rows, one, TREE_TEXEL, legacy, 0).every((c) => same(c, green)))
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

  // the exact linear-space mean at the edge (sample 20: three brown, four green in the ±3 window) and at a clipped
  // window (sample 0: four brown); an sRGB-space average differs by more than a thousandth
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const srgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
  const expectedLinear = srgb((3 * lin(92 / 255) + 4 * lin(20 / 255)) / 7)
  const expectedSrgbAverage = (3 * 92 / 255 + 4 * 20 / 255) / 7
  assert.ok(Math.abs(smooth[20][0] - expectedLinear) < 1e-9, `the red channel at the edge is the linear mean (${smooth[20][0].toFixed(5)} vs ${expectedLinear.toFixed(5)})`)
  assert.ok(Math.abs(smooth[20][0] - expectedSrgbAverage) > 1e-3, 'and not the sRGB average')
  assert.ok(Math.abs(smooth[0][0] - 92 / 255) < 1e-9, 'a clipped window inside one band is that band')
  const edgeClipped = sampleColours(painting, rows, across.slice(18, 22), TREE_TEXEL, legacy, 3)
  // four samples: two brown, two green; every window holds all four
  const expectedHalf = srgb((2 * lin(92 / 255) + 2 * lin(20 / 255)) / 4)
  assert.ok(edgeClipped.every((c) => Math.abs(c[0] - expectedHalf) < 1e-9), 'a window clipped at both ends averages what it holds')
})

test('C4 the stroke body factory: the defaults reproduce the land\'s text exactly, and the cypress\'s constants change only the lane, the rake and the coarse lane', async () => {
  const { strokeGlsl, strokeGlslWith, STROKE_BODY_DEFAULTS, CYPRESS_STROKE_BODY } = await import('../src/scene/cypressStrokeShader.ts')
  const defaults = strokeGlslWith(STROKE_BODY_DEFAULTS)
  // E1's four committed fields (399a956), pinned by hash so the land's program text cannot drift (code review F4)
  const { createHash } = await import('node:crypto')
  const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)
  const E1 = { vertexHead: 'ffb4ed4985f6ae92', vertexBody: 'd45ee1fe660fc282', fragmentHead: '44207e80a56eb3e1', fragmentBody: '48240ba5268eba4d' }
  for (const field of ['vertexHead', 'vertexBody', 'fragmentHead', 'fragmentBody'] as const) {
    assert.equal(hash(defaults[field]), E1[field], `${field} is E1's text`)
    assert.equal(hash(strokeGlsl[field]), E1[field], `strokeGlsl.${field} is E1's text`)
  }
  assert.ok(defaults.fragmentBody.includes('mix(0.86, 1.08, streak)') && defaults.fragmentBody.includes('1.0 + 0.35 * lit'), 'E1 and E2 literals')
  assert.ok(!defaults.fragmentBody.includes('lane2'), 'no coarse lane by default')
  const cypress = strokeGlslWith(CYPRESS_STROKE_BODY)
  assert.ok(cypress.fragmentBody.includes('mix(0.78, 1.14, ') && cypress.fragmentBody.includes('1.0 + 0.5 * lit'), 'the lane and the rake')
  assert.ok(cypress.fragmentBody.includes('lane2') && cypress.fragmentBody.includes('mix(streak, lane2.x, 0.33)'), 'the coarse lane')
  assert.ok(cypress.fragmentBody.includes('smoothstep(0.3, 0.7, streak)'), 'the sharpened lane')
  // without the coarse lane and the edge, the two differ only on the lane and the rake lines
  assert.ok(cypress.fragmentBody.includes('mix(vec3(lum), col, 1.1)'), 'the cypress\'s saturation')
  const plain = strokeGlslWith({ ...CYPRESS_STROKE_BODY, coarseShare: 0, laneEdge: null, saturation: 1.3 })
  const a = defaults.fragmentBody.split('\n')
  const b = plain.fragmentBody.split('\n')
  assert.equal(a.length, b.length)
  const differing = a.filter((line, i) => line !== b[i])
  assert.equal(differing.length, 2, `two lines differ: ${differing.join(' | ')}`)
})
