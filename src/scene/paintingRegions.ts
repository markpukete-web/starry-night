import type { ImageData2D } from './useImageData.ts'

/** One horizontal slice of the cypress silhouette, in painting UV. */
export type CypressSlice = { v: number; uCentre: number; halfWidth: number }

function lumAt(img: ImageData2D, x: number, y: number): number {
  const i = (y * img.width + x) * 4
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]
}

/**
 * Scan the painting's left band for the cypress: per sampled row, the widest contiguous dark run.
 * Rows return top (tip) → bottom (base), smoothed so the extruded volume doesn't jitter. The
 * silhouette is deliberately approximate-generous — the source matte behind carries the true
 * pixel detail; this only shapes the volume that gives those pixels depth.
 */
export function extractCypressSlices(
  painting: ImageData2D,
  { uMax = 0.26, vMin = 0.01, vMax = 1, rows = 64, lumMax = 62 } = {},
): CypressSlice[] {
  const raw: CypressSlice[] = []
  const xMax = Math.min(painting.width - 1, Math.floor(uMax * painting.width))
  for (let r = 0; r < rows; r++) {
    const v = vMin + ((vMax - vMin) * r) / (rows - 1)
    const y = Math.min(painting.height - 1, Math.floor(v * painting.height))
    let bestStart = -1
    let bestLen = 0
    let start = -1
    for (let x = 0; x <= xMax + 1; x++) {
      const dark = x <= xMax && lumAt(painting, x, y) < lumMax
      if (dark && start < 0) start = x
      if (!dark && start >= 0) {
        const len = x - start
        if (len > bestLen) {
          bestLen = len
          bestStart = start
        }
        start = -1
      }
    }
    if (bestLen < painting.width * 0.006) continue // no cypress on this row
    raw.push({
      v,
      uCentre: (bestStart + bestLen / 2) / painting.width,
      halfWidth: bestLen / 2 / painting.width,
    })
  }
  // moving-average smooth, window 5, so the volume built on these doesn't jitter row to row
  return raw.map((s, i) => {
    let uc = 0
    let hw = 0
    let n = 0
    for (let k = -2; k <= 2; k++) {
      const q = raw[i + k]
      if (!q) continue
      uc += q.uCentre
      hw += q.halfWidth
      n++
    }
    return { v: s.v, uCentre: uc / n, halfWidth: hw / n }
  })
}

/**
 * Per-column skyline from the sky mask: scanning bottom→up, the first sky pixel marks where the
 * ground band ends. Columns the cypress punches through (their skyline would jump toward the top
 * of the frame, or never find sky at all) are clamped to the median skyline of the mid columns,
 * because the terrain behind the cypress is the hills, not the tree.
 */
export function extractSkylineV(mask: ImageData2D, cols = 96): number[] {
  const rawline: number[] = []
  for (let c = 0; c < cols; c++) {
    const u = c / (cols - 1)
    const x = Math.min(mask.width - 1, Math.floor(u * mask.width))
    let skyline = 0.5
    for (let y = mask.height - 1; y >= 0; y--) {
      if (mask.data[(y * mask.width + x) * 4] > 128) {
        skyline = Math.min(1, (y + 1) / mask.height)
        break
      }
    }
    rawline.push(skyline)
  }
  // clamp cypress intrusion: reference = median of columns in u ∈ [0.3, 0.5]
  const refCols = rawline.filter((_, i) => i / (cols - 1) >= 0.3 && i / (cols - 1) <= 0.5)
  const sorted = [...refCols].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0.6
  return rawline.map((s, i) => {
    const u = i / (cols - 1)
    if (u < 0.3 && s < median - 0.1) return median
    return s
  })
}
