/*
 * Displayed cypress colour gate using regional Lab distributions (E1, G7).
 *
 * Each side is masked by one rule, its own treeish component (scripts/lib/silhouette.ts): the painting's at 1600
 * px around the row table's crop, the render's in the design-camera crop. Each tree's regions are thirds of its
 * own height. No projection and no stencil (the old gate mapped the source crop onto a fixed rectangle, which
 * misregistered once the crop held the flames: Codex F9). A region with fewer than MIN_PIXELS on either side, or
 * a non-finite mean, fails the gate (the old gate passed with no tree at all: NaN ≥ 10 is false, Codex F8).
 * The expected tree area is the painting's mask scaled into the crop box (the tree's known screen box at the
 * design camera, an input the render's colours cannot move), and the share of it the render's treeish component
 * does not cover is bounded: a wrongly coloured stroke leaves the treeish selection and would otherwise vanish from
 * the means (code review F4: 77% of the tree painted cyan still passed; and an expected area fitted to the render's
 * own component shrank with the corruption). Two negative controls are part of G7: a sky-only crop of the same
 * capture must exit 1, and so must a capture whose tree is mostly recoloured.
 *
 *   node scripts/check-cypress-colour.ts <capture.png> [cropX cropY cropW cropH]
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { decodePNG } from './lib/png.ts'
import { expectedInCrop, extent, treeComponent, type Mask } from './lib/silhouette.ts'

const ROOT = resolve(import.meta.dirname, '..')
const control = (process.argv.slice(2).find((a) => a.startsWith('--control=')) ?? '').slice('--control='.length)
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const capturePath = resolve(ROOT, args[0] ?? 'output/playwright/e1-measure-2026-10-21/desktop-centre.png')
const [CX, CY, CW, CH] = args.length >= 5 ? args.slice(1, 5).map(Number) : [330, 80, 220, 578]
const MIN_PIXELS = 1000
const MAX_DELTA_E = 10
/** the share of the expected tree area (the painting's mask scaled into the crop box) that the render's treeish component does not cover; the perspective's residual is about 0.2 */
const MAX_REJECTED = 0.4

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
const paintMask = treeComponent(painting.rgba, painting.width, px0, py0, pw, ph, 1)
const sourceRegions = regionsOf(painting.rgba, painting.width, px0, py0, paintMask)

// the render's tree in the capture's crop, and the area where the painting says it should be
const capture = decodePNG(readFileSync(capturePath))
const renderMask = treeComponent(capture.rgba, capture.width, CX, CY, CW, CH, 1)
// `--control=grey`: the selected tree's pixels made neutral with their luminance contrast stretched, the selection kept;
// the chromatic check must fail it (the plan's F4, the code review's F2: luminance bounds alone passed this)
if (control === 'grey') {
  const lum = (i: number) => 0.299 * capture.rgba[i] + 0.587 * capture.rgba[i + 1] + 0.114 * capture.rgba[i + 2]
  let sum = 0
  let n = 0
  for (let y = 0; y < renderMask.height; y++) for (let x = 0; x < renderMask.width; x++) if (renderMask.data[y * renderMask.width + x]) { sum += lum(((y + CY) * capture.width + x + CX) * 4); n++ }
  const mean = n ? sum / n : 0
  for (let y = 0; y < renderMask.height; y++) for (let x = 0; x < renderMask.width; x++) {
    if (!renderMask.data[y * renderMask.width + x]) continue
    const i = ((y + CY) * capture.width + x + CX) * 4
    const g = Math.max(0, Math.min(255, Math.round(mean + (lum(i) - mean) * 1.6)))
    capture.rgba[i] = g
    capture.rgba[i + 1] = g
    capture.rgba[i + 2] = g
  }
}
const renderedRegions = regionsOf(capture.rgba, capture.width, CX, CY, renderMask)
const renderPixels = extent(renderMask).pixels
const expected = expectedInCrop(paintMask, CW, CH)
let expectedPixels = 0
let covered = 0
for (let i = 0; i < expected.data.length; i++) {
  if (!expected.data[i]) continue
  expectedPixels++
  covered += renderMask.data[i]
}
const rejectedShare = expectedPixels ? 1 - covered / expectedPixels : 1

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
if (rejectedShare > MAX_REJECTED) failed = true

// E3 (the cypress's medium): the luminance spread and the light share of each tree, all regions pooled. E1's
// regional means matched the painting at ΔE 1–3 while the extremes were gone (the ribbons' colours spread 9 L
// against the painting's tree's 18.5, 7% light against 10.6%): a flat olive beside the painting's brown-and-green bands.
const MIN_SPREAD = 15
const MIN_LIGHT = 0.09
const LIGHT_L = 25
/** the chromatic check (plan F4): the browns and ochres (Lab b above this) and the greens (a below this), each share within this of the painting's */
const WARM_B = 8
const GREEN_A = -4
const MAX_SHARE_GAP = 0.06
const pooled = (regions: Record<Region, Lab[]>) => [...regions.base, ...regions.middle, ...regions.top]
const stats = (labs: Lab[]) => {
  const ls = labs.map((v) => v.l).sort((a, b) => a - b)
  const q = (p: number) => ls[Math.floor(p * (ls.length - 1))]
  return {
    count: ls.length,
    p10: q(0.1),
    p50: q(0.5),
    p90: q(0.9),
    spread: q(0.9) - q(0.1),
    light: ls.filter((l) => l > LIGHT_L).length / ls.length,
    warm: labs.filter((v) => v.b > WARM_B).length / labs.length,
    green: labs.filter((v) => v.a < GREEN_A).length / labs.length,
  }
}
const shown = (s: ReturnType<typeof stats>) => ({ count: s.count, p10: Number(s.p10.toFixed(1)), p50: Number(s.p50.toFixed(1)), p90: Number(s.p90.toFixed(1)), spread: Number(s.spread.toFixed(1)), light: Number(s.light.toFixed(3)), warm: Number(s.warm.toFixed(3)), green: Number(s.green.toFixed(3)) })
const sourcePool = pooled(sourceRegions)
const renderedPool = pooled(renderedRegions)
if (sourcePool.length < MIN_PIXELS || renderedPool.length < MIN_PIXELS) {
  // an empty or near-empty tree: the structured failure, not a crash (code review F6)
  console.log(JSON.stringify({ bands: 'FAIL', failed: 'too few pixels for the bands', source: sourcePool.length, rendered: renderedPool.length, minimum: MIN_PIXELS }))
  failed = true
} else {
  const sourceS = stats(sourcePool)
  const renderedS = stats(renderedPool)
  // the bounds on the raw statistics; the JSON rounds for display only (code review F9)
  const bandsPass = renderedS.spread >= MIN_SPREAD && renderedS.light >= MIN_LIGHT
  const warmGap = Math.abs(renderedS.warm - sourceS.warm)
  const greenGap = Math.abs(renderedS.green - sourceS.green)
  const chromaPass = warmGap <= MAX_SHARE_GAP && greenGap <= MAX_SHARE_GAP
  console.log(JSON.stringify({ luminance: { source: shown(sourceS), rendered: shown(renderedS) }, bounds: { minSpread: MIN_SPREAD, minLight: MIN_LIGHT, lightAbove: LIGHT_L, warmAbove: WARM_B, greenBelow: GREEN_A, maxShareGap: MAX_SHARE_GAP }, gaps: { warm: Number(warmGap.toFixed(3)), green: Number(greenGap.toFixed(3)) }, bands: bandsPass ? 'PASS' : 'FAIL', chroma: chromaPass ? 'PASS' : 'FAIL' }))
  if (!bandsPass || !chromaPass) failed = true
}
console.log(JSON.stringify({ renderTreePixels: renderPixels, rejectedShare: Number(rejectedShare.toFixed(4)), maxRejected: MAX_REJECTED, comparison: 'regional Lab distribution by thirds of each tree\'s own height, one treeish rule on both sides, the rejected share against the painting\'s mask scaled into the crop box (not registered per-pixel ΔE)' }))
if (failed) process.exitCode = 1
