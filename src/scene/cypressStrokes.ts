import { mulberry32 } from './brush.ts'
import { normalisedFromCrop, paintingUV, type RowTable } from './cypressMapping.ts'
import type { ImageData2D } from './useImageData.ts'

/** One owner for the flat gate and runtime stroke budget. */
export const CYPRESS_STROKE_CONFIG = {
  frontCount: 2200,
  backDensity: 0.45,
  steps: 9,
  lengthFraction: 0.11,
  reliefSpread: 0.06,
} as const

export type StrokeSample = {
  /** Across the real tree span at this height, not across its rectangular crop. */
  u: number
  heightFraction: number
  /** Source sRGB, 0..1. Consumers convert it into their own working colour space. */
  r: number
  g: number
  b: number
}

export type CypressStroke = {
  samples: StrokeSample[]
  /** Constant for the whole stroke; relief between neighbours, never a lengthwise fade. */
  relief: number
}

export type CypressStrokeOptions = {
  skin: ImageData2D
  flow: ImageData2D
  rows: RowTable
  count: number
  steps: number
  /** Requested length as a fraction of the tree/crop height. */
  lengthFraction: number
  seed: number
  reliefSpread?: number
}

export type CypressTexel = { r: number; g: number; b: number; a: number }

/** Nearest texel at crop-normalised coordinates. Callers perform containment before sampling. */
export function sampleCypressImage(image: ImageData2D, px: number, py: number): CypressTexel {
  const x = Math.min(image.width - 1, Math.max(0, Math.round(px * (image.width - 1))))
  const y = Math.min(image.height - 1, Math.max(0, Math.round(py * (image.height - 1))))
  const index = (y * image.width + x) * 4
  return {
    r: image.data[index],
    g: image.data[index + 1],
    b: image.data[index + 2],
    a: image.data[index + 3],
  }
}

/**
 * Integrate long cypress polylines in the painting crop's pixel space.
 *
 * The flat gate and the 3D runtime call this exact function. Pixel-space integration keeps the
 * field isotropic and avoids applying the changing row-domain warp to its vectors. Tree-normalised
 * u/height are derived only when a valid sample is emitted.
 */
export function generateCypressStrokes(options: CypressStrokeOptions): CypressStroke[] {
  const {
    skin,
    flow,
    rows,
    count,
    steps,
    lengthFraction,
    seed,
    reliefSpread = CYPRESS_STROKE_CONFIG.reliefSpread,
  } = options
  if (skin.width < 2 || skin.height < 2 || flow.width < 2 || flow.height < 2) return []
  if (steps < 3 || count <= 0 || lengthFraction <= 0) return []

  const random = mulberry32(seed)
  const output: CypressStroke[] = []
  const stepPixels = (lengthFraction * (skin.height - 1)) / (steps - 1)

  for (let index = 0; index < count; index++) {
    // The base is height zero. An exponent above one therefore concentrates seeds in the fuller
    // lower half; subtracting from one would invert this and starve the base.
    const seedHeight = Math.pow(random(), 1.4)
    const seedU = random()
    const relief = 1 - reliefSpread + random() * reliefSpread * 2
    const start = paintingUV(seedU, seedHeight, rows)
    let pixelX = start.px * (skin.width - 1)
    let pixelY = start.py * (skin.height - 1)
    const samples: StrokeSample[] = []

    for (let step = 0; step < steps; step++) {
      const px = pixelX / (skin.width - 1)
      const py = pixelY / (skin.height - 1)
      if (px < 0 || px > 1 || py < 0 || py > 1) break

      const skinTexel = sampleCypressImage(skin, px, py)
      if (skinTexel.a === 0) break
      const normalised = normalisedFromCrop(px, py, rows)
      samples.push({
        u: normalised.u,
        heightFraction: normalised.heightFraction,
        r: skinTexel.r / 255,
        g: skinTexel.g / 255,
        b: skinTexel.b / 255,
      })

      const flowTexel = sampleCypressImage(flow, px, py)
      const dx = (flowTexel.r / 255) * 2 - 1
      const dy = (flowTexel.g / 255) * 2 - 1
      const magnitude = Math.hypot(dx, dy)
      if (magnitude < 1e-6) break
      pixelX += (dx / magnitude) * stepPixels
      pixelY += (dy / magnitude) * stepPixels
    }

    if (samples.length >= 3) output.push({ samples, relief })
  }
  return output
}
