/*
 * Displayed cypress colour gate using regional Lab distributions.
 *
 * This is deliberately NOT described as a registered per-pixel comparison: the source crop is
 * wrapped onto a displaced 3D solid, so screen pixels do not have a cheap one-to-one inverse. We
 * compare mean Lab and channel spread over tree-masked top/middle/base regions and report ΔE76
 * between their means. Run after the deterministic design capture.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { treeishColour } from './lib/fill-region.ts'
import { decodePNG } from './lib/png.ts'

const ROOT = resolve(import.meta.dirname, '..')
const capturePath = resolve(
  ROOT,
  process.argv[2] ?? 'output/playwright/cypress-pass2-retune3-2026-07-22/desktop-centre.png',
)
const sourcePath = resolve(ROOT, 'reference/derived/cypress-skin-source.png')
const source = decodePNG(readFileSync(sourcePath))
const capture = decodePNG(readFileSync(capturePath))

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
  const f = (value: number) =>
    value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27) * value / 116 + 16 / 116
  const fx = f(x)
  const fy = f(y)
  const fz = f(z)
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

function regionAt(heightFraction: number): Region {
  return heightFraction >= 2 / 3 ? 'top' : heightFraction >= 1 / 3 ? 'middle' : 'base'
}

const sourceRegions: Record<Region, Lab[]> = { base: [], middle: [], top: [] }
for (let y = 0; y < source.height; y++) {
  for (let x = 0; x < source.width; x++) {
    const index = (y * source.width + x) * 4
    if (source.rgba[index + 3] === 0) continue
    sourceRegions[regionAt(1 - y / (source.height - 1))].push(
      srgbToLab(source.rgba[index], source.rgba[index + 1], source.rgba[index + 2]),
    )
  }
}

// Deterministic 1600x900 design-camera bounds, padded inside the tree's silhouette. Chroma gates
// reject the blue sky behind it; restricting x/y rejects the dark island and village below.
const renderedRegions: Record<Region, Lab[]> = { base: [], middle: [], top: [] }
const bounds = { left: 400, right: 548, top: 96, bottom: 670 }
for (let y = bounds.top; y <= bounds.bottom; y++) {
  for (let x = bounds.left; x <= bounds.right; x++) {
    const index = (y * capture.width + x) * 4
    const red = capture.rgba[index]
    const green = capture.rgba[index + 1]
    const blue = capture.rgba[index + 2]
    if (!treeishColour(red / 255, green / 255, blue / 255)) continue
    const heightFraction = (bounds.bottom - y) / (bounds.bottom - bounds.top)
    renderedRegions[regionAt(heightFraction)].push(srgbToLab(red, green, blue))
  }
}

function summary(values: Lab[]) {
  const mean = values.reduce(
    (sum, value) => ({ l: sum.l + value.l, a: sum.a + value.a, b: sum.b + value.b }),
    { l: 0, a: 0, b: 0 },
  )
  mean.l /= values.length
  mean.a /= values.length
  mean.b /= values.length
  const spread = values.reduce(
    (sum, value) => ({
      l: sum.l + Math.pow(value.l - mean.l, 2),
      a: sum.a + Math.pow(value.a - mean.a, 2),
      b: sum.b + Math.pow(value.b - mean.b, 2),
    }),
    { l: 0, a: 0, b: 0 },
  )
  spread.l = Math.sqrt(spread.l / values.length)
  spread.a = Math.sqrt(spread.a / values.length)
  spread.b = Math.sqrt(spread.b / values.length)
  return { count: values.length, mean, spread }
}

const deltaE = (one: Lab, two: Lab) =>
  Math.hypot(one.l - two.l, one.a - two.a, one.b - two.b)
let failed = false
for (const region of ['base', 'middle', 'top'] as const) {
  const sourceSummary = summary(sourceRegions[region])
  const renderedSummary = summary(renderedRegions[region])
  const difference = deltaE(sourceSummary.mean, renderedSummary.mean)
  console.log(
    JSON.stringify({
      region,
      deltaEMean: Number(difference.toFixed(2)),
      source: sourceSummary,
      rendered: renderedSummary,
    }),
  )
  if (difference >= 10) failed = true
}
console.log('comparison=regional Lab distribution (not registered per-pixel ΔE)')
if (failed) process.exitCode = 1
