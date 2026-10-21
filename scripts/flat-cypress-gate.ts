/*
 * Deterministic flat gate for the cypress ribbons (E1, G4): the painting's crop LEFT, the traced ribbons RIGHT,
 * drawn in 2D at the crop's resolution over the underpaint, each as its tapered polyline in its one colour. This
 * deliberately precedes any 3D judgement: the field, the count, the widths, the lengths and the lean are judged
 * here first, by eye, beside the painting.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { Color, SRGBColorSpace } from 'three'

import { CYPRESS_RIBBON_CONFIG, traceCypressRibbons, type CypressRibbon } from '../src/scene/cypressStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const ROOT = resolve(import.meta.dirname, '..')
const OUTPUT = resolve(ROOT, 'reference/derived/cypress-flat-gate.png')
const SEED = 0xc1f3a11
/** the underpaint's sRGB bytes (#151c1b) */
const UNDERPAINT = [21, 28, 27] as const

const skin = decodePNG(readFileSync(resolve(ROOT, 'reference/derived/cypress-skin-source.png')))
const flowPng = decodePNG(readFileSync(resolve(ROOT, 'public/reference/cypress-flow.png')))
const paintingPng = decodePNG(readFileSync(resolve(ROOT, 'reference/derived/cypress-work-1600.png')))
const rows = JSON.parse(readFileSync(resolve(ROOT, 'public/reference/cypress-rows.json'), 'utf8')) as { uv: [number, number, number, number] }
const imageData = (image: typeof skin): ImageData2D => ({ data: new Uint8ClampedArray(image.rgba), width: image.width, height: image.height })

const flow = imageData(flowPng)
const ribbons = traceCypressRibbons(flow, imageData(paintingPng), rows, CYPRESS_RIBBON_CONFIG.frontCount, SEED)

const width = skin.width
const height = skin.height
const canvas = new Uint8Array(width * height * 4)
for (let i = 0; i < width * height; i++) {
  canvas[i * 4] = UNDERPAINT[0]
  canvas[i * 4 + 1] = UNDERPAINT[1]
  canvas[i * 4 + 2] = UNDERPAINT[2]
  canvas[i * 4 + 3] = 255
}

const colour = new Color()
function displayed(ribbon: CypressRibbon): [number, number, number] {
  colour.setRGB(ribbon.colour[0], ribbon.colour[1], ribbon.colour[2], SRGBColorSpace).multiplyScalar(ribbon.relief).convertLinearToSRGB()
  return [
    Math.round(Math.min(1, Math.max(0, colour.r)) * 255),
    Math.round(Math.min(1, Math.max(0, colour.g)) * 255),
    Math.round(Math.min(1, Math.max(0, colour.b)) * 255),
  ]
}

function segment(ax: number, ay: number, bx: number, by: number, widthA: number, widthB: number, rgb: readonly [number, number, number]) {
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy) || 1
  const normalX = -dy / length
  const normalY = dx / length
  const alongSteps = Math.max(2, Math.ceil(length * 1.5))
  for (let along = 0; along <= alongSteps; along++) {
    const t = along / alongSteps
    const centreX = ax + dx * t
    const centreY = ay + dy * t
    const halfWidth = widthA + (widthB - widthA) * t
    for (let across = -halfWidth; across <= halfWidth; across += 0.45) {
      const x = Math.round(centreX + normalX * across)
      const y = Math.round(centreY + normalY * across)
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      const destination = (y * width + x) * 4
      canvas[destination] = rgb[0]
      canvas[destination + 1] = rgb[1]
      canvas[destination + 2] = rgb[2]
    }
  }
}

let totalSamples = 0
for (const ribbon of ribbons) {
  totalSamples += ribbon.samples.length
  const rgb = displayed(ribbon)
  const last = ribbon.samples.length - 1
  const halfPx = ribbon.halfWidth * (width - 1)
  for (let index = 0; index < last; index++) {
    const a = ribbon.samples[index]
    const b = ribbon.samples[index + 1]
    segment(
      a.px * (width - 1),
      a.py * (height - 1),
      b.px * (width - 1),
      b.py * (height - 1),
      halfPx * (1 + (CYPRESS_RIBBON_CONFIG.taper - 1) * (index / last)),
      halfPx * (1 + (CYPRESS_RIBBON_CONFIG.taper - 1) * ((index + 1) / last)),
      rgb,
    )
  }
}

const gutter = 4
const outputWidth = width * 2 + gutter
const output = new Uint8Array(outputWidth * height * 4)
for (let y = 0; y < height; y++) {
  for (let x = 0; x < outputWidth; x++) {
    const destination = (y * outputWidth + x) * 4
    if (x >= width && x < width + gutter) {
      output[destination] = 238
      output[destination + 1] = 184
      output[destination + 2] = 74
    } else {
      const sourceX = x < width ? x : x - width - gutter
      const source = (y * width + sourceX) * 4
      const pixels = x < width ? skin.rgba : canvas
      output[destination] = pixels[source]
      output[destination + 1] = pixels[source + 1]
      output[destination + 2] = pixels[source + 2]
    }
    output[destination + 3] = 255
  }
}
writeFileSync(OUTPUT, encodePNG(outputWidth, height, output))

const survival = ribbons.length / CYPRESS_RIBBON_CONFIG.frontCount
console.log(
  `flat gate: ${ribbons.length}/${CYPRESS_RIBBON_CONFIG.frontCount} ribbons (${(survival * 100).toFixed(1)}%), ${(totalSamples / Math.max(1, ribbons.length)).toFixed(1)} samples each\n` +
    `wrote ${OUTPUT} — painting LEFT, ribbons RIGHT. LOOK AT IT.`,
)
if (survival < 0.85) process.exitCode = 1
