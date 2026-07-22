import { mulberry32 } from './brush.ts'
import {
  normalisedFromCrop,
  paintingUV,
  rowSpanAt,
  type RowTable,
} from './cypressMapping.ts'
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

export type TendrilPoint = {
  heightFraction: number
  side: 'left' | 'right'
  /** Distance beyond that row's primary rim, in units of its half-width. */
  rimDistance: number
}

export type TendrilTrack = {
  /** Ordered root/base to tip so the ribbon taper narrows outward. */
  points: TendrilPoint[]
  side: 'left' | 'right'
}

type SatelliteRun = { y: number; x0: number; x1: number }
type TrackOptions = {
  minRows: number
  maxTracks: number
  crop: { width: number; height: number }
  rows: RowTable
  maxRowGap?: number
  horizontalTolerancePx?: number
}

/**
 * Connect detached source runs into a few coherent top-to-bottom fronds. A row-by-row fringe would
 * recreate the fur trap, so tracks must persist over many rows and only the longest few survive.
 */
export function buildTendrilTracks(
  runs: SatelliteRun[],
  options: TrackOptions,
): TendrilTrack[] {
  const maxRowGap = options.maxRowGap ?? 2
  const horizontalTolerance = options.horizontalTolerancePx ?? 4
  const tagged = runs.map((run, id) => ({ ...run, id }))
  const byRow = new Map<number, typeof tagged>()
  for (const run of tagged) {
    const row = byRow.get(run.y)
    if (row) row.push(run)
    else byRow.set(run.y, [run])
  }
  const used = new Set<number>()
  const chains: (SatelliteRun & { id: number })[][] = []
  const rowNumbers = [...byRow.keys()].sort((a, b) => a - b)

  const sideOf = (run: SatelliteRun): 'left' | 'right' => {
    const py = run.y / Math.max(1, options.crop.height - 1)
    const centre = (run.x0 + run.x1) / 2 / Math.max(1, options.crop.width - 1)
    const span = rowSpanAt(py, options.rows)
    return centre < (span.left + span.right) / 2 ? 'left' : 'right'
  }
  const separation = (a: SatelliteRun, b: SatelliteRun) => {
    if (b.x0 > a.x1) return b.x0 - a.x1
    if (a.x0 > b.x1) return a.x0 - b.x1
    return 0
  }

  for (const y of rowNumbers) {
    for (const seed of byRow.get(y) ?? []) {
      if (used.has(seed.id)) continue
      const chain = [seed]
      used.add(seed.id)
      let current = seed
      const side = sideOf(seed)

      while (true) {
        let best: (SatelliteRun & { id: number }) | undefined
        let bestScore = Number.POSITIVE_INFINITY
        for (let gap = 1; gap <= maxRowGap; gap++) {
          for (const candidate of byRow.get(current.y + gap) ?? []) {
            if (used.has(candidate.id) || sideOf(candidate) !== side) continue
            const apart = separation(current, candidate)
            if (apart > horizontalTolerance * gap) continue
            const centreA = (current.x0 + current.x1) / 2
            const centreB = (candidate.x0 + candidate.x1) / 2
            const score = apart * 4 + Math.abs(centreA - centreB) + (gap - 1) * 2
            if (score < bestScore) {
              best = candidate
              bestScore = score
            }
          }
          if (best) break
        }
        if (!best) break
        used.add(best.id)
        chain.push(best)
        current = best
      }
      if (chain.length >= options.minRows) chains.push(chain)
    }
  }

  return chains
    .sort((a, b) => b.length - a.length)
    .slice(0, options.maxTracks)
    .map((chain) => {
      const mapped = chain.map((run) => {
        const py = run.y / Math.max(1, options.crop.height - 1)
        const centre = (run.x0 + run.x1) / 2 / Math.max(1, options.crop.width - 1)
        const { left, right } = rowSpanAt(py, options.rows)
        const halfWidth = Math.max(1e-6, (right - left) / 2)
        const side: 'left' | 'right' = centre < (left + right) / 2 ? 'left' : 'right'
        const rimDistance = Math.max(
          0,
          (side === 'left' ? left - centre : centre - right) / halfWidth,
        )
        return { heightFraction: 1 - py, side, rimDistance }
      })
      const leftCount = mapped.filter((point) => point.side === 'left').length
      const side = leftCount * 2 >= mapped.length ? 'left' : 'right'
      return { points: mapped.reverse(), side }
    })
}
