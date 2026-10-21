/*
 * Displayed cypress colour gate using regional Lab distributions (E1, G7).
 *
 * Each side is masked by one rule, its own treeish component (scripts/lib/silhouette.ts): the painting's at 1600
 * px around the row table's crop, the render's in the design-camera crop. Each tree's regions are thirds of its
 * own height. No projection and no stencil (the old gate mapped the source crop onto a fixed rectangle, which
 * misregistered once the crop held the flames: Codex F9). A region with fewer than MIN_PIXELS on either side, or
 * a non-finite mean, fails the gate (the old gate passed with no tree at all: NaN ≥ 10 is false, Codex F8).
 * The negative control is part of G7: run on a sky-only crop of the same capture, this must exit 1.
 *
 *   node scripts/check-cypress-colour.ts <capture.png> [cropX cropY cropW cropH]
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { decodePNG } from './lib/png.ts'
import { extent, treeComponent, type Mask } from './lib/silhouette.ts'

const ROOT = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const capturePath = resolve(ROOT, args[0] ?? 'output/playwright/e1-measure-2026-10-21/desktop-centre.png')
const [CX, CY, CW, CH] = args.length >= 5 ? args.slice(1, 5).map(Number) : [330, 80, 220, 578]
const MIN_PIXELS = 1000
const MAX_DELTA_E = 10

type Lab = { l: number; a: number; b: number }
type Region = 'base' | 'middle' | 'top'

function srgbToLab(red: number, green: number, blue: number): Lab {
  const linear = (value: number) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  }
  const r = linear(red)
  const g = linear(green)
  const b = linear(blue)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const f = (value: number) => (value > 216 / 24389 ? Math.cbrt(value) : ((24389 / 27) * value) / 116 + 16 / 116)
  const fx = f(x)
  const fy = f(y)
  const fz = f(z)
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

function regionAt(heightFraction: number): Region {
  return heightFraction >= 2 / 3 ? 'top' : heightFraction >= 1 / 3 ? 'middle' : 'base'
}

/** The Lab values of a tree's pixels by region of its own height. */
function regionsOf(rgba: Uint8Array, imageWidth: number, x0: number, y0: number, mask: Mask): Record<Region, Lab[]> {
  const out: Record<Region, Lab[]> = { base: [], middle: [], top: [] }
  const { top, height } = extent(mask)
  if (height <= 0) return out
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (!mask.data[y * mask.width + x]) continue
      const i = ((y + y0) * imageWidth + x + x0) * 4
      out[regionAt(1 - (y - top) / Math.max(1, height - 1))].push(srgbToLab(rgba[i], rgba[i + 1], rgba[i + 2]))
    }
  }
  return out
}

function summary(values: Lab[]) {
  const n = values.length
  const mean = values.reduce((sum, value) => ({ l: sum.l + value.l, a: sum.a + value.a, b: sum.b + value.b }), { l: 0, a: 0, b: 0 })
  mean.l /= n
  mean.a /= n
  mean.b /= n
  const spread = values.reduce(
    (sum, value) => ({ l: sum.l + (value.l - mean.l) ** 2, a: sum.a + (value.a - mean.a) ** 2, b: sum.b + (value.b - mean.b) ** 2 }),
    { l: 0, a: 0, b: 0 },
  )
  return { count: n, mean, spread: { l: Math.sqrt(spread.l / n), a: Math.sqrt(spread.a / n), b: Math.sqrt(spread.b / n) } }
}

// the painting's tree at 1600 around the row table's crop
const rows = JSON.parse(readFileSync(resolve(ROOT, 'public/reference/cypress-rows.json'), 'utf8')) as { uv: number[] }
const work = resolve(ROOT, 'reference/derived/cypress-colour-painting.png')
execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', work], { stdio: 'ignore' })
const painting = decodePNG(readFileSync(work))
const px0 = Math.max(0, Math.round(rows.uv[0] * painting.width) - 40)
const py0 = Math.round(rows.uv[1] * painting.height)
const pw = Math.min(painting.width - px0, Math.round((rows.uv[2] - rows.uv[0]) * painting.width) + 80)
const ph = Math.round((rows.uv[3] - rows.uv[1]) * painting.height)
const sourceRegions = regionsOf(painting.rgba, painting.width, px0, py0, treeComponent(painting.rgba, painting.width, px0, py0, pw, ph, 1))

// the render's tree in the capture's crop
const capture = decodePNG(readFileSync(capturePath))
const renderMask = treeComponent(capture.rgba, capture.width, CX, CY, CW, CH, 1)
const renderedRegions = regionsOf(capture.rgba, capture.width, CX, CY, renderMask)

const deltaE = (one: Lab, two: Lab) => Math.hypot(one.l - two.l, one.a - two.a, one.b - two.b)
let failed = false
for (const region of ['base', 'middle', 'top'] as const) {
  const source = sourceRegions[region]
  const rendered = renderedRegions[region]
  if (source.length < MIN_PIXELS || rendered.length < MIN_PIXELS) {
    console.log(JSON.stringify({ region, failed: 'too few pixels', source: source.length, rendered: rendered.length, minimum: MIN_PIXELS }))
    failed = true
    continue
  }
  const sourceSummary = summary(source)
  const renderedSummary = summary(rendered)
  const difference = deltaE(sourceSummary.mean, renderedSummary.mean)
  const finite = [sourceSummary.mean, renderedSummary.mean].every((mean) => Number.isFinite(mean.l) && Number.isFinite(mean.a) && Number.isFinite(mean.b)) && Number.isFinite(difference)
  console.log(JSON.stringify({ region, deltaEMean: Number(difference.toFixed(2)), source: sourceSummary, rendered: renderedSummary }))
  if (!finite || difference >= MAX_DELTA_E) failed = true
}
console.log(JSON.stringify({ renderTreePixels: extent(renderMask).pixels, comparison: 'regional Lab distribution by thirds of each tree\'s own height, one treeish rule on both sides (not registered per-pixel ΔE)' }))
if (failed) process.exitCode = 1
