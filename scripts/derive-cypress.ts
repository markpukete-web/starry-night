/*
 * Bake the cypress's source-locked colour skin, upward orientation field and per-row domain.
 * Dependency-free apart from the repository's existing macOS `sips` JPEG decode path.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  blendToVertical,
  cypressMask,
  lowPassOrientation,
  orientationField,
  satelliteRuns,
  signedUpDirection,
  type Box,
} from './lib/cypress-field.ts'
import { decodePNG, encodePNG } from './lib/png.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REVIEW_DIR = resolve(ROOT, 'reference/derived')
const WORK = resolve(REVIEW_DIR, 'cypress-work.png')
const OUT_SKIN = resolve(ROOT, 'public/reference/cypress-skin.png')
const OUT_FLOW = resolve(ROOT, 'public/reference/cypress-flow.png')
const OUT_ROWS = resolve(ROOT, 'public/reference/cypress-rows.json')
const OUT_SKIN_SOURCE = resolve(REVIEW_DIR, 'cypress-skin-source.png')
const OUT_FIELD_OVERLAY = resolve(REVIEW_DIR, 'cypress-field-overlay.png')
const OUT_MASK_OVERLAY = resolve(REVIEW_DIR, 'cypress-mask-overlay.png')

const REGION = { u0: 0.02, u1: 0.32, v0: 0.04, v1: 1 }
const TENSOR_SIGMA = 4
const LOW_PASS_SIGMA = 3

mkdirSync(REVIEW_DIR, { recursive: true })
execFileSync(
  'sips',
  ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', WORK],
  { stdio: 'ignore' },
)
const painting = decodePNG(readFileSync(WORK))
const { width: paintingWidth, height: paintingHeight } = painting
const box: Box = {
  x0: Math.floor(REGION.u0 * paintingWidth),
  y0: Math.floor(REGION.v0 * paintingHeight),
  x1: Math.ceil(REGION.u1 * paintingWidth),
  y1: Math.ceil(REGION.v1 * paintingHeight),
}

const { mask, spans } = cypressMask(painting, box)
if (spans.length < 100) {
  throw new Error(`cypress mask found only ${spans.length} rows — the region or width gate is wrong`)
}
const satellitesGlobal = satelliteRuns(painting, box, spans)

let cropX0 = paintingWidth
let cropY0 = paintingHeight
let cropX1 = 0
let cropY1 = 0
for (const span of spans) {
  cropX0 = Math.min(cropX0, span.x0)
  cropX1 = Math.max(cropX1, span.x1)
  cropY0 = Math.min(cropY0, span.y)
  cropY1 = Math.max(cropY1, span.y)
}
const cropWidth = cropX1 - cropX0 + 1
const cropHeight = cropY1 - cropY0 + 1

const luminance = {
  width: cropWidth,
  height: cropHeight,
  data: new Float64Array(cropWidth * cropHeight),
}
const cropMask = new Uint8Array(cropWidth * cropHeight)
let maskPixels = 0
for (let y = 0; y < cropHeight; y++) {
  for (let x = 0; x < cropWidth; x++) {
    const sourcePixel = (y + cropY0) * paintingWidth + (x + cropX0)
    const source = sourcePixel * 4
    const destination = y * cropWidth + x
    luminance.data[destination] =
      0.299 * painting.rgba[source] +
      0.587 * painting.rgba[source + 1] +
      0.114 * painting.rgba[source + 2]
    cropMask[destination] = mask[sourcePixel]
    maskPixels += cropMask[destination]
  }
}

const raw = orientationField(luminance, cropMask, TENSOR_SIGMA)
const smoothed = lowPassOrientation(
  raw.cos2,
  raw.sin2,
  cropMask,
  cropWidth,
  cropHeight,
  LOW_PASS_SIGMA,
)
const field = blendToVertical(smoothed.cos2, smoothed.sin2, raw.coherence)

const flowRgba = new Uint8Array(cropWidth * cropHeight * 4)
for (let i = 0; i < cropWidth * cropHeight; i++) {
  const { dx, dy } = signedUpDirection(field.cos2[i], field.sin2[i])
  flowRgba[i * 4] = Math.round(((dx + 1) / 2) * 255)
  flowRgba[i * 4 + 1] = Math.round(((dy + 1) / 2) * 255)
  flowRgba[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, raw.coherence[i])) * 255)
  flowRgba[i * 4 + 3] = 255
}
writeFileSync(OUT_FLOW, encodePNG(cropWidth, cropHeight, flowRgba))

const skinRgba = new Uint8Array(cropWidth * cropHeight * 4)
for (let y = 0; y < cropHeight; y++) {
  for (let x = 0; x < cropWidth; x++) {
    const source = ((y + cropY0) * paintingWidth + (x + cropX0)) * 4
    const destination = (y * cropWidth + x) * 4
    skinRgba[destination] = painting.rgba[source]
    skinRgba[destination + 1] = painting.rgba[source + 1]
    skinRgba[destination + 2] = painting.rgba[source + 2]
    skinRgba[destination + 3] = cropMask[y * cropWidth + x] ? 255 : 0
  }
}
writeFileSync(OUT_SKIN_SOURCE, encodePNG(cropWidth, cropHeight, skinRgba.slice()))

// Nearest-valid colour fill on each row. Alpha remains zero outside the tree, so this protects
// colour interpolation at the rim without changing the integrator's containment contract.
for (let y = 0; y < cropHeight; y++) {
  const nearestLeft = new Int32Array(cropWidth).fill(-1)
  const nearestRight = new Int32Array(cropWidth).fill(-1)
  let last = -1
  for (let x = 0; x < cropWidth; x++) {
    if (skinRgba[(y * cropWidth + x) * 4 + 3] === 255) last = x
    nearestLeft[x] = last
  }
  last = -1
  for (let x = cropWidth - 1; x >= 0; x--) {
    if (skinRgba[(y * cropWidth + x) * 4 + 3] === 255) last = x
    nearestRight[x] = last
  }
  for (let x = 0; x < cropWidth; x++) {
    const destination = (y * cropWidth + x) * 4
    if (skinRgba[destination + 3] === 255) continue
    const left = nearestLeft[x]
    const right = nearestRight[x]
    if (left < 0 && right < 0) continue
    const nearest =
      left < 0 ? right : right < 0 ? left : x - left <= right - x ? left : right
    const source = (y * cropWidth + nearest) * 4
    skinRgba[destination] = skinRgba[source]
    skinRgba[destination + 1] = skinRgba[source + 1]
    skinRgba[destination + 2] = skinRgba[source + 2]
  }
}
writeFileSync(OUT_SKIN, encodePNG(cropWidth, cropHeight, skinRgba))

const rowTable = {
  x0: cropX0,
  y0: cropY0,
  width: cropWidth,
  height: cropHeight,
  spans: spans.map(
    (span) =>
      [
        Number(((span.y - cropY0) / (cropHeight - 1)).toFixed(6)),
        Number(((span.x0 - cropX0) / (cropWidth - 1)).toFixed(6)),
        Number(((span.x1 - cropX0) / (cropWidth - 1)).toFixed(6)),
      ] as [number, number, number],
  ),
  // The extractor returns painting-global pixels; all runtime consumers operate in this crop.
  satellites: satellitesGlobal.map((run) => ({
    y: run.y - cropY0,
    x0: run.x0 - cropX0,
    x1: run.x1 - cropX0,
  })),
}
writeFileSync(OUT_ROWS, `${JSON.stringify(rowTable)}\n`)

const fieldOverlay = new Uint8Array(cropWidth * cropHeight * 4)
const maskOverlay = new Uint8Array(cropWidth * cropHeight * 4)
for (let i = 0; i < cropWidth * cropHeight; i++) {
  const source =
    ((Math.floor(i / cropWidth) + cropY0) * paintingWidth + (i % cropWidth) + cropX0) * 4
  for (const output of [fieldOverlay, maskOverlay]) {
    output[i * 4] = painting.rgba[source]
    output[i * 4 + 1] = painting.rgba[source + 1]
    output[i * 4 + 2] = painting.rgba[source + 2]
    output[i * 4 + 3] = 255
  }
  if (cropMask[i]) {
    maskOverlay[i * 4] = Math.min(255, maskOverlay[i * 4] + 100)
    maskOverlay[i * 4 + 1] = Math.round(maskOverlay[i * 4 + 1] * 0.55)
    maskOverlay[i * 4 + 2] = Math.round(maskOverlay[i * 4 + 2] * 0.55)
  }
}
for (let y = 6; y < cropHeight; y += 12) {
  for (let x = 6; x < cropWidth; x += 12) {
    if (!cropMask[y * cropWidth + x]) continue
    const { dx, dy } = signedUpDirection(
      field.cos2[y * cropWidth + x],
      field.sin2[y * cropWidth + x],
    )
    for (let along = -5; along <= 5; along++) {
      const pixelX = Math.round(x + dx * along)
      const pixelY = Math.round(y + dy * along)
      if (pixelX < 0 || pixelY < 0 || pixelX >= cropWidth || pixelY >= cropHeight) continue
      const destination = (pixelY * cropWidth + pixelX) * 4
      fieldOverlay[destination] = 255
      fieldOverlay[destination + 1] = 90
      fieldOverlay[destination + 2] = 40
    }
  }
}
writeFileSync(OUT_FIELD_OVERLAY, encodePNG(cropWidth, cropHeight, fieldOverlay))
writeFileSync(OUT_MASK_OVERLAY, encodePNG(cropWidth, cropHeight, maskOverlay))

let coherenceSum = 0
let coherenceSamples = 0
for (let i = 0; i < cropMask.length; i++) {
  if (!cropMask[i]) continue
  coherenceSum += raw.coherence[i]
  coherenceSamples++
}
const occupancy = (100 * maskPixels) / (cropWidth * cropHeight)
console.log(
  `cypress: ${maskPixels} px over ${spans.length} rows, crop ${cropWidth}x${cropHeight} at (${cropX0},${cropY0})\n` +
    `mask occupancy ${occupancy.toFixed(1)}%, mean coherence ${(coherenceSum / coherenceSamples).toFixed(3)}, satellites ${satellitesGlobal.length}\n` +
    'NEXT: npm run slim-reference, then npm run flat-cypress-gate',
)
