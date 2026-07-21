/** Maps the cypress surface to its row-normalised painting crop, and back. */

export type RowTable = {
  width: number
  height: number
  spans: [number, number, number][]
  satellites?: { y: number; x0: number; x1: number }[]
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Camera bearing in the cypress's XZ angular convention. */
export function cypressViewBearing(
  cameraPosition: readonly [number, number, number],
  base: readonly [number, number, number],
): number {
  return Math.atan2(cameraPosition[2] - base[2], cameraPosition[0] - base[0])
}

/** Painting u for a surface angle; 0 and 1 are the two design-view silhouette rims. */
export function surfaceToPaintingU(angle: number, bearing: number): number {
  return clamp01((1 - Math.cos(angle - bearing - Math.PI / 2)) / 2)
}

export function isFrontFacing(angle: number, bearing: number): boolean {
  return Math.cos(angle - bearing) > 0
}

/** Inverse surface angle for the requested hemisphere. Front and back share the same painting u. */
export function paintingUToAngle(u: number, bearing: number, frontFacing: boolean): number {
  const relative = Math.acos(1 - 2 * clamp01(u))
  return bearing + Math.PI / 2 + (frontFacing ? -relative : relative)
}

/** Interpolated cypress left/right edge at crop-normalised image y. */
export function rowSpanAt(py: number, rows: RowTable): { left: number; right: number } {
  const spans = rows.spans
  if (spans.length === 0) return { left: 0, right: 1 }
  if (py <= spans[0][0]) return { left: spans[0][1], right: spans[0][2] }
  const last = spans[spans.length - 1]
  if (py >= last[0]) return { left: last[1], right: last[2] }

  let low = 0
  let high = spans.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (spans[middle][0] <= py) low = middle
    else high = middle
  }
  const before = spans[low]
  const after = spans[high]
  const t = after[0] === before[0] ? 0 : (py - before[0]) / (after[0] - before[0])
  return {
    left: before[1] + (after[1] - before[1]) * t,
    right: before[2] + (after[2] - before[2]) * t,
  }
}

/** Crop-normalised source coordinate for a tree-normalised horizontal and vertical position. */
export function paintingUV(
  u: number,
  heightFraction: number,
  rows: RowTable,
): { px: number; py: number } {
  const py = 1 - clamp01(heightFraction)
  const { left, right } = rowSpanAt(py, rows)
  return { px: left + (right - left) * clamp01(u), py }
}

/** Inverse of `paintingUV`, used after each pixel-space integration step. */
export function normalisedFromCrop(
  px: number,
  py: number,
  rows: RowTable,
): { u: number; heightFraction: number } {
  const { left, right } = rowSpanAt(py, rows)
  const width = right - left
  return {
    u: width > 1e-6 ? (px - left) / width : 0.5,
    heightFraction: 1 - py,
  }
}
