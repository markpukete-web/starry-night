/** Pure cypress-mask and orientation-field derivation, isolated from bake IO. */

import { treeishColour } from './fill-region.ts'
import type { DecodedPNG } from './png.ts'

export type Box = { x0: number; y0: number; x1: number; y1: number }
export type Grid = { width: number; height: number; data: Float64Array }
export type RowSpan = { y: number; x0: number; x1: number }
export type Run = { y: number; x0: number; x1: number }

const VERTICAL_COS2 = -1
const VERTICAL_SIN2 = 0
const MIN_RUN_FRACTION = 0.004
export const CYPRESS_MAX_ROW_RATIO = 1.8

function rowRuns(painting: DecodedPNG, y: number, box: Box, minRun: number): Run[] {
  const runs: Run[] = []
  const left = Math.max(0, Math.floor(box.x0))
  const right = Math.min(painting.width, Math.ceil(box.x1))
  let start = -1
  for (let x = left; x <= right; x++) {
    const i = (y * painting.width + Math.min(x, painting.width - 1)) * 4
    const treeish =
      x < right &&
      treeishColour(
        painting.rgba[i] / 255,
        painting.rgba[i + 1] / 255,
        painting.rgba[i + 2] / 255,
      )
    if (treeish && start < 0) start = x
    if (!treeish && start >= 0) {
      if (x - start >= minRun) runs.push({ y, x0: start, x1: x - 1 })
      start = -1
    }
  }
  return runs
}

/**
 * Extract the vertically coherent cypress column without walking into the terrain it touches.
 * Every run is evaluated as a seed. A symmetric local ratio blocks both trunk-to-terrain widening
 * and terrain-to-trunk narrowing, so search direction cannot change which physical form wins.
 */
export function cypressMask(
  painting: DecodedPNG,
  box: Box,
): { mask: Uint8Array; spans: RowSpan[] } {
  const { width, height } = painting
  const top = Math.max(0, Math.floor(box.y0))
  const bottom = Math.min(height, Math.ceil(box.y1))
  const minRun = Math.max(2, Math.floor(width * MIN_RUN_FRACTION))
  const runsByRow: Run[][] = Array.from({ length: height }, (_, y) =>
    y >= top && y < bottom ? rowRuns(painting, y, box, minRun) : [],
  )

  const chainFrom = (start: Run): Run[] => {
    const chain = [start]
    for (const direction of [-1, 1]) {
      let previous = start
      for (let y = start.y + direction; y >= top && y < bottom; y += direction) {
        let best: Run | null = null
        let bestOverlap = 0
        for (const candidate of runsByRow[y]) {
          const overlap =
            Math.min(candidate.x1, previous.x1) - Math.max(candidate.x0, previous.x0) + 1
          if (overlap > bestOverlap) {
            bestOverlap = overlap
            best = candidate
          }
        }
        if (!best || bestOverlap <= 0) break
        const nextWidth = best.x1 - best.x0 + 1
        const previousWidth = previous.x1 - previous.x0 + 1
        const ratio = Math.max(nextWidth / previousWidth, previousWidth / nextWidth)
        if (ratio > CYPRESS_MAX_ROW_RATIO) break
        if (direction < 0) chain.unshift(best)
        else chain.push(best)
        previous = best
      }
    }
    return chain
  }

  let bestChain: Run[] = []
  for (const runs of runsByRow) {
    for (const run of runs) {
      const chain = chainFrom(run)
      if (chain.length > bestChain.length) bestChain = chain
    }
  }

  const mask = new Uint8Array(width * height)
  if (bestChain.length === 0) return { mask, spans: [] }
  const spans = [...bestChain].sort((a, b) => a.y - b.y)
  for (const span of spans) {
    for (let x = span.x0; x <= span.x1; x++) mask[span.y * width + x] = 1
  }
  return { mask, spans }
}

/** Detached tree-coloured runs beside, but not overlapping, the primary cypress column. */
export function satelliteRuns(painting: DecodedPNG, box: Box, spans: RowSpan[]): Run[] {
  const minRun = Math.max(2, Math.floor(painting.width * MIN_RUN_FRACTION))
  const out: Run[] = []
  for (const primary of spans) {
    for (const run of rowRuns(painting, primary.y, box, minRun)) {
      const overlaps = Math.min(run.x1, primary.x1) >= Math.max(run.x0, primary.x0)
      if (!overlaps) out.push(run)
    }
  }
  return out
}

/** Translate painting-global detached runs into the baked cypress crop's coordinate system. */
export function toCropLocalRuns(
  runs: Run[],
  cropOrigin: Pick<Box, 'x0' | 'y0'>,
): Run[] {
  return runs.map((run) => ({
    y: run.y - cropOrigin.y0,
    x0: run.x0 - cropOrigin.x0,
    x1: run.x1 - cropOrigin.x0,
  }))
}

export function gaussianBlur(
  source: Float64Array,
  width: number,
  height: number,
  sigma: number,
): Float64Array {
  if (sigma <= 0) return new Float64Array(source)
  const radius = Math.max(1, Math.ceil(sigma * 3))
  const kernel = new Float64Array(radius * 2 + 1)
  let kernelSum = 0
  for (let offset = -radius; offset <= radius; offset++) {
    const value = Math.exp(-(offset * offset) / (2 * sigma * sigma))
    kernel[offset + radius] = value
    kernelSum += value
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum

  const intermediate = new Float64Array(width * height)
  const output = new Float64Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let offset = -radius; offset <= radius; offset++) {
        const sampleX = Math.min(width - 1, Math.max(0, x + offset))
        sum += source[y * width + sampleX] * kernel[offset + radius]
      }
      intermediate[y * width + x] = sum
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let offset = -radius; offset <= radius; offset++) {
        const sampleY = Math.min(height - 1, Math.max(0, y + offset))
        sum += intermediate[sampleY * width + x] * kernel[offset + radius]
      }
      output[y * width + x] = sum
    }
  }
  return output
}

/** Normalised convolution over tree pixels only. */
export function maskedBlur(
  source: Float64Array,
  mask: Uint8Array,
  width: number,
  height: number,
  sigma: number,
): Float64Array {
  const weighted = new Float64Array(width * height)
  const weights = new Float64Array(width * height)
  for (let i = 0; i < weighted.length; i++) {
    if (!mask[i]) continue
    weighted[i] = source[i]
    weights[i] = 1
  }
  const numerator = gaussianBlur(weighted, width, height, sigma)
  const denominator = gaussianBlur(weights, width, height, sigma)
  const output = new Float64Array(width * height)
  for (let i = 0; i < output.length; i++) {
    output[i] = denominator[i] > 1e-6 ? numerator[i] / denominator[i] : 0
  }
  return output
}

/** Structure tensor of the direction the paint runs in, not the perpendicular image gradient. */
export function orientationField(
  luminance: Grid,
  mask: Uint8Array,
  sigma: number,
): { cos2: Float64Array; sin2: Float64Array; coherence: Float64Array } {
  const { width, height, data } = luminance
  if (mask.length !== width * height) throw new Error('cypress mask dimensions do not match field')
  const gradientX = new Float64Array(width * height)
  const gradientY = new Float64Array(width * height)
  const sample = (x: number, y: number, centreX: number, centreY: number) => {
    const sampleX = Math.min(width - 1, Math.max(0, x))
    const sampleY = Math.min(height - 1, Math.max(0, y))
    return mask[sampleY * width + sampleX]
      ? data[sampleY * width + sampleX]
      : data[centreY * width + centreX]
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      if (!mask[index]) continue
      gradientX[index] = (sample(x + 1, y, x, y) - sample(x - 1, y, x, y)) * 0.5
      gradientY[index] = (sample(x, y + 1, x, y) - sample(x, y - 1, x, y)) * 0.5
    }
  }

  const jxx = new Float64Array(width * height)
  const jxy = new Float64Array(width * height)
  const jyy = new Float64Array(width * height)
  for (let i = 0; i < jxx.length; i++) {
    jxx[i] = gradientX[i] * gradientX[i]
    jxy[i] = gradientX[i] * gradientY[i]
    jyy[i] = gradientY[i] * gradientY[i]
  }
  const sxx = maskedBlur(jxx, mask, width, height, sigma)
  const sxy = maskedBlur(jxy, mask, width, height, sigma)
  const syy = maskedBlur(jyy, mask, width, height, sigma)

  const cos2 = new Float64Array(width * height)
  const sin2 = new Float64Array(width * height)
  const coherence = new Float64Array(width * height)
  let maxEnergy = 1e-12
  for (let i = 0; i < sxx.length; i++) {
    if (mask[i]) maxEnergy = Math.max(maxEnergy, sxx[i] + syy[i])
  }

  for (let i = 0; i < cos2.length; i++) {
    const difference = sxx[i] - syy[i]
    const offDiagonal = 2 * sxy[i]
    const magnitude = Math.hypot(difference, offDiagonal)
    cos2[i] = magnitude > 1e-12 ? -difference / magnitude : VERTICAL_COS2
    sin2[i] = magnitude > 1e-12 ? -offDiagonal / magnitude : VERTICAL_SIN2
    if (!mask[i]) continue
    const trace = sxx[i] + syy[i]
    const orientationConfidence = trace > 1e-12 ? magnitude / trace : 0
    coherence[i] = orientationConfidence * Math.min(1, trace / (0.15 * maxEnergy))
  }
  return { cos2, sin2, coherence }
}

/** Low-pass orientation in double-angle space, using tree pixels only. */
export function lowPassOrientation(
  cos2: Float64Array,
  sin2: Float64Array,
  mask: Uint8Array,
  width: number,
  height: number,
  sigma: number,
): { cos2: Float64Array; sin2: Float64Array } {
  const outputCos2 = maskedBlur(cos2, mask, width, height, sigma)
  const outputSin2 = maskedBlur(sin2, mask, width, height, sigma)
  for (let i = 0; i < outputCos2.length; i++) {
    const magnitude = Math.hypot(outputCos2[i], outputSin2[i])
    if (magnitude > 1e-12) {
      outputCos2[i] /= magnitude
      outputSin2[i] /= magnitude
    } else {
      outputCos2[i] = VERTICAL_COS2
      outputSin2[i] = VERTICAL_SIN2
    }
  }
  return { cos2: outputCos2, sin2: outputSin2 }
}

/** Fall back to the tree's global vertical wherever the source field is weak. */
export function blendToVertical(
  cos2: Float64Array,
  sin2: Float64Array,
  coherence: Float64Array,
): { cos2: Float64Array; sin2: Float64Array } {
  const outputCos2 = new Float64Array(cos2.length)
  const outputSin2 = new Float64Array(sin2.length)
  for (let i = 0; i < cos2.length; i++) {
    const confidence = Math.min(1, Math.max(0, coherence[i]))
    let c = cos2[i] * confidence + VERTICAL_COS2 * (1 - confidence)
    let s = sin2[i] * confidence + VERTICAL_SIN2 * (1 - confidence)
    const magnitude = Math.hypot(c, s)
    if (magnitude > 1e-12) {
      c /= magnitude
      s /= magnitude
    } else {
      c = VERTICAL_COS2
      s = VERTICAL_SIN2
    }
    outputCos2[i] = c
    outputSin2[i] = s
  }
  return { cos2: outputCos2, sin2: outputSin2 }
}

/** Resolve an undirected orientation into an image-space direction that always points upward. */
export function signedUpDirection(cos2: number, sin2: number): { dx: number; dy: number } {
  const angle = 0.5 * Math.atan2(sin2, cos2)
  let dx = Math.cos(angle)
  let dy = Math.sin(angle)
  if (dy > 0) {
    dx = -dx
    dy = -dy
  }
  return { dx, dy }
}
