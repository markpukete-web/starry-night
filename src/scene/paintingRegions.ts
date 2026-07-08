import type { ImageData2D } from './useImageData.ts'

/** One horizontal slice of the cypress silhouette, in painting UV. */
export type CypressSlice = { v: number; uCentre: number; halfWidth: number }

/** Cypress paint is dark green/brown; the night sky is dark BLUE. Gate on both value and chroma. */
function isCypressDark(img: ImageData2D, x: number, y: number, lumMax: number): boolean {
  const i = (y * img.width + x) * 4
  const g = img.data[i + 1]
  const b = img.data[i + 2]
  const lum = 0.299 * img.data[i] + 0.587 * g + 0.114 * b
  return lum < lumMax && b < g + 12
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
  const xMin = Math.max(1, Math.floor(0.015 * painting.width)) // skip the scan's canvas border
  const xMax = Math.min(painting.width - 1, Math.floor(uMax * painting.width))
  type Run = { start: number; end: number }
  const runsPerRow: Run[][] = []
  const vAt: number[] = []
  for (let r = 0; r < rows; r++) {
    const v = vMin + ((vMax - vMin) * r) / (rows - 1)
    const y = Math.min(painting.height - 1, Math.floor(v * painting.height))
    const runs: Run[] = []
    let start = -1
    for (let x = xMin; x <= xMax + 1; x++) {
      const dark = x <= xMax && isCypressDark(painting, x, y, lumMax)
      if (dark && start < 0) start = x
      if (!dark && start >= 0) {
        if (x - start >= painting.width * 0.006) runs.push({ start, end: x })
        start = -1
      }
    }
    runsPerRow.push(runs)
    vAt.push(v)
  }

  // connectivity: seed at the row with the widest run (the flame's bulk), then walk up and down
  // keeping only runs that overlap the previous kept run — the cypress is one connected column,
  // so detached dark blobs (shadowed hills, bushes) never join the silhouette
  let seedRow = -1
  let seedRun: Run | null = null
  runsPerRow.forEach((runs, r) => {
    for (const run of runs) {
      if (!seedRun || run.end - run.start > seedRun.end - seedRun.start) {
        seedRun = run
        seedRow = r
      }
    }
  })
  if (seedRow < 0 || !seedRun) return []

  const kept: (Run | null)[] = new Array(rows).fill(null)
  kept[seedRow] = seedRun
  for (const dir of [-1, 1]) {
    let prev: Run = seedRun
    for (let r = seedRow + dir; r >= 0 && r < rows; r += dir) {
      const overlapping = runsPerRow[r].filter((run) => run.start < prev.end && run.end > prev.start)
      if (overlapping.length === 0) break
      const widest = overlapping.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a))
      kept[r] = widest
      prev = widest
    }
  }

  const raw: CypressSlice[] = []
  kept.forEach((run, r) => {
    if (!run) return
    raw.push({
      v: vAt[r],
      uCentre: (run.start + (run.end - run.start) / 2) / painting.width,
      halfWidth: (run.end - run.start) / 2 / painting.width,
    })
  })
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
