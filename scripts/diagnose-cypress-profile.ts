/*
 * Leave-one-factor-out cypress silhouette diagnostic. Every candidate is scored against the
 * painting's row-wise outline through the same profile functions and configuration as runtime.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { cypressViewBearing } from '../src/scene/cypressMapping.ts'
import {
  CYPRESS_LUM_MAX,
  makeCypressProfile,
  projectedHalfWidth,
  type ProfileFactors,
} from '../src/scene/cypressProfile.ts'
import { DIORAMA_CAMERAS } from '../src/scene/dioramaContract.ts'
import { extractCypressSlices } from '../src/scene/paintingRegions.ts'
import { cypressMask, type Box } from './lib/cypress-field.ts'
import { decodePNG } from './lib/png.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = resolve(ROOT, 'reference/derived/cypress-profile-work.png')
mkdirSync(dirname(WORK), { recursive: true })
execFileSync(
  'sips',
  ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', WORK],
  { stdio: 'ignore' },
)
const png = decodePNG(readFileSync(WORK))
const painting = {
  data: new Uint8ClampedArray(png.rgba),
  width: png.width,
  height: png.height,
}
const box: Box = {
  x0: Math.floor(0.02 * png.width),
  y0: Math.floor(0.04 * png.height),
  x1: Math.ceil(0.32 * png.width),
  y1: png.height,
}
const { spans } = cypressMask(png, box)
if (spans.length < 100) throw new Error(`profile truth has only ${spans.length} rows`)
const top = spans[0].y
const bottom = spans[spans.length - 1].y

function truthWidth(heightFraction: number): number {
  const y = Math.round(bottom - heightFraction * (bottom - top))
  const span = spans.reduce((best, candidate) =>
    Math.abs(candidate.y - y) < Math.abs(best.y - y) ? candidate : best,
  )
  return (span.x1 - span.x0 + 1) / 2
}

const bearing = cypressViewBearing(DIORAMA_CAMERAS.design.position, [-1.5, 0.02, 0.72])
const heights = Array.from({ length: 41 }, (_, index) => index / 40)
const truth = heights.map(truthWidth)
const truthMaximum = Math.max(...truth)
const truthNormalised = truth.map((width) => width / truthMaximum)

function slicesFor(luminanceMaximum: number): number[] {
  return [...extractCypressSlices(painting, { lumMax: luminanceMaximum })]
    .reverse()
    .map((slice) => slice.halfWidth)
}

type Result = { label: string; error: number; peak: number; factors: ProfileFactors }
function score(label: string, factors: ProfileFactors): Result {
  const widths = heights.map((height) => projectedHalfWidth(height, bearing, factors, 96))
  const maximum = Math.max(...widths)
  const normalised = widths.map((width) => width / maximum)
  const error =
    normalised.reduce(
      (sum, width, index) => sum + Math.abs(width - truthNormalised[index]),
      0,
    ) / normalised.length
  const peak = heights[normalised.indexOf(Math.max(...normalised))]
  console.log(`${label.padEnd(32)} peak@${peak.toFixed(3)}  meanAbsError=${error.toFixed(5)}`)
  return { label, error, peak, factors }
}

const baseline = makeCypressProfile(slicesFor(CYPRESS_LUM_MAX))
console.log('--- shared runtime baseline ---')
const baselineResult = score('baseline', baseline)
console.log('\n--- single-factor alternatives ---')
const alternatives: [string, ProfileFactors][] = [
  ['without continuous taper', { ...baseline, useContinuousTaper: false }],
  ['without upper taper', { ...baseline, useUpperTaper: false }],
  ['without tongue', { ...baseline, useTongue: false }],
  ['smoothing window 1', { ...baseline, smoothingWindow: 1 }],
  ['smoothing window 3', { ...baseline, smoothingWindow: 3 }],
  ['smoothing window 7', { ...baseline, smoothingWindow: 7 }],
  ['luminance maximum 62', makeCypressProfile(slicesFor(62))],
  ['luminance maximum 75', makeCypressProfile(slicesFor(75))],
  ['luminance maximum 105', makeCypressProfile(slicesFor(105))],
]
const ranked = alternatives
  .map(([label, factors]) => score(label, factors))
  .map((result) => ({ ...result, improvement: baselineResult.error - result.error }))
  .sort((a, b) => b.improvement - a.improvement)

console.log('\n--- ranking (positive improves the painting match) ---')
for (const result of ranked) {
  console.log(`${result.label.padEnd(32)} improvement=${result.improvement.toFixed(5)}`)
}
