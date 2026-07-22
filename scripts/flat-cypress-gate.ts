/*
 * Deterministic flat gate for the real cypress stroke integrator. Painting crop is left; the
 * source-coloured, tapered stroke field is right. This deliberately precedes any 3D judgement.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { Color, SRGBColorSpace } from 'three'

import {
  CYPRESS_STROKE_CONFIG,
  generateCypressStrokes,
  type StrokeSample,
} from '../src/scene/cypressStrokes.ts'
import { paintingUV, type RowTable } from '../src/scene/cypressMapping.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const ROOT = resolve(import.meta.dirname, '..')
const OUTPUT = resolve(ROOT, 'reference/derived/cypress-flat-gate.png')
const HALF_WIDTH_PIXELS = 2.2
const TAPER = 0.45
const SEED = 0x0cabba9e

const skin = decodePNG(readFileSync(resolve(ROOT, 'reference/derived/cypress-skin-source.png')))
const flow = decodePNG(readFileSync(resolve(ROOT, 'public/reference/cypress-flow.png')))
const rows = JSON.parse(
  readFileSync(resolve(ROOT, 'public/reference/cypress-rows.json'), 'utf8'),
) as RowTable
const imageData = (image: typeof skin) => ({
  data: new Uint8ClampedArray(image.rgba),
  width: image.width,
  height: image.height,
})

const strokes = generateCypressStrokes({
  skin: imageData(skin),
  flow: imageData(flow),
  rows,
  count: CYPRESS_STROKE_CONFIG.frontCount,
  steps: CYPRESS_STROKE_CONFIG.steps,
  lengthFraction: CYPRESS_STROKE_CONFIG.lengthFraction,
  reliefSpread: CYPRESS_STROKE_CONFIG.reliefSpread,
  seed: SEED,
})

const width = skin.width
const height = skin.height
const canvas = new Uint8Array(width * height * 4)
for (let i = 0; i < width * height; i++) {
  canvas[i * 4] = 12
  canvas[i * 4 + 1] = 14
  canvas[i * 4 + 2] = 22
  canvas[i * 4 + 3] = 255
}

const colour = new Color()
function displayed(sample: StrokeSample, relief: number): [number, number, number] {
  colour
    .setRGB(sample.r, sample.g, sample.b, SRGBColorSpace)
    .multiplyScalar(relief)
    .convertLinearToSRGB()
  return [
    Math.round(Math.min(1, Math.max(0, colour.r)) * 255),
    Math.round(Math.min(1, Math.max(0, colour.g)) * 255),
    Math.round(Math.min(1, Math.max(0, colour.b)) * 255),
  ]
}

function ribbonSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  widthA: number,
  widthB: number,
  sampleA: StrokeSample,
  sampleB: StrokeSample,
  relief: number,
) {
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy) || 1
  const normalX = -dy / length
  const normalY = dx / length
  const alongSteps = Math.max(2, Math.ceil(length * 1.5))
  const colourA = displayed(sampleA, relief)
  const colourB = displayed(sampleB, relief)
  for (let along = 0; along <= alongSteps; along++) {
    const t = along / alongSteps
    const centreX = ax + dx * t
    const centreY = ay + dy * t
    const halfWidth = widthA + (widthB - widthA) * t
    const red = Math.round(colourA[0] + (colourB[0] - colourA[0]) * t)
    const green = Math.round(colourA[1] + (colourB[1] - colourA[1]) * t)
    const blue = Math.round(colourA[2] + (colourB[2] - colourA[2]) * t)
    for (let across = -halfWidth; across <= halfWidth; across += 0.45) {
      const x = Math.round(centreX + normalX * across)
      const y = Math.round(centreY + normalY * across)
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      const destination = (y * width + x) * 4
      canvas[destination] = red
      canvas[destination + 1] = green
      canvas[destination + 2] = blue
    }
  }
}

let totalSamples = 0
for (const stroke of strokes) {
  totalSamples += stroke.samples.length
  const last = stroke.samples.length - 1
  for (let index = 0; index < last; index++) {
    const sampleA = stroke.samples[index]
    const sampleB = stroke.samples[index + 1]
    const pointA = paintingUV(sampleA.u, sampleA.heightFraction, rows)
    const pointB = paintingUV(sampleB.u, sampleB.heightFraction, rows)
    const widthA = HALF_WIDTH_PIXELS * (1 + (TAPER - 1) * (index / last))
    const widthB = HALF_WIDTH_PIXELS * (1 + (TAPER - 1) * ((index + 1) / last))
    ribbonSegment(
      pointA.px * (width - 1),
      pointA.py * (height - 1),
      pointB.px * (width - 1),
      pointB.py * (height - 1),
      widthA,
      widthB,
      sampleA,
      sampleB,
      stroke.relief,
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

const survival = strokes.length / CYPRESS_STROKE_CONFIG.frontCount
console.log(
  `flat gate: ${strokes.length}/${CYPRESS_STROKE_CONFIG.frontCount} strokes survived (${(
    survival * 100
  ).toFixed(1)}%), ${(totalSamples / Math.max(1, strokes.length)).toFixed(1)} samples each\n` +
    `wrote ${OUTPUT} — painting LEFT, strokes RIGHT. LOOK AT IT.`,
)
if (survival < 0.85) process.exitCode = 1
