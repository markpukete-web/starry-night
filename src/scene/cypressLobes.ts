import { rowSpanAt, type RowTable } from './cypressMapping.ts'

export type CypressLobeRows = RowTable & {
  satellites: { y: number; x0: number; x1: number }[]
}

export type CypressLobeSection = {
  heightFraction: number
  /** Horizontal source coordinate in the baked crop; it may sit beyond 0..1 for detached paint. */
  sourceCenter: number
  sourceHalfWidth: number
  /** Source-paint domain. This stays on detected pigment when the geometric envelope broadens. */
  paintCenter: number
  paintHalfWidth: number
}

export type CypressLobe = {
  id: string
  kind: 'main' | 'frond'
  side: 'centre' | 'left' | 'right'
  sections: CypressLobeSection[]
  /** Unextended source evidence, base to tip. */
  sourceHeightRange: readonly [number, number]
  /** Furthest source evidence from the primary rim, in primary half-widths. */
  sourceMaxRimDistance: number
}

export type CypressLobePlan = {
  width: number
  height: number
  lobes: CypressLobe[]
}

export type CypressLobePlanOptions = {
  minTrackRows?: number
  maxFronds?: number
  maxRowGap?: number
  horizontalTolerancePx?: number
  maxRimDistance?: number
}

type TaggedRun = { y: number; x0: number; x1: number; id: number }

/** tree heights a frond's root sits below its chain's base, inside the main column: the volume closes there */
const ROOT_DEPTH = 0.05

function smoothSourceSections(
  sections: CypressLobeSection[],
  radius: number,
): CypressLobeSection[] {
  if (radius <= 0) return sections
  return sections.map((section, index) => {
    let centre = 0
    let halfWidth = 0
    let paintCentre = 0
    let paintHalfWidth = 0
    let count = 0
    for (let offset = -radius; offset <= radius; offset++) {
      const sample = sections[index + offset]
      if (!sample) continue
      centre += sample.sourceCenter
      halfWidth += sample.sourceHalfWidth
      paintCentre += sample.paintCenter
      paintHalfWidth += sample.paintHalfWidth
      count++
    }
    return {
      ...section,
      sourceCenter: centre / count,
      sourceHalfWidth: halfWidth / count,
      paintCenter: paintCentre / count,
      paintHalfWidth: paintHalfWidth / count,
    }
  })
}

function sampleSections(
  sections: CypressLobeSection[],
  heightFraction: number,
): CypressLobeSection | null {
  if (sections.length === 0) return null
  if (
    heightFraction < sections[0].heightFraction ||
    heightFraction > sections[sections.length - 1].heightFraction
  ) {
    return null
  }
  let low = 0
  let high = sections.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (sections[middle].heightFraction <= heightFraction) low = middle
    else high = middle
  }
  const before = sections[low]
  const after = sections[high]
  const span = after.heightFraction - before.heightFraction
  const t = span > 1e-9 ? (heightFraction - before.heightFraction) / span : 0
  return {
    heightFraction,
    sourceCenter: before.sourceCenter + (after.sourceCenter - before.sourceCenter) * t,
    sourceHalfWidth:
      before.sourceHalfWidth + (after.sourceHalfWidth - before.sourceHalfWidth) * t,
    paintCenter: before.paintCenter + (after.paintCenter - before.paintCenter) * t,
    paintHalfWidth:
      before.paintHalfWidth + (after.paintHalfWidth - before.paintHalfWidth) * t,
  }
}

export function sampleCypressLobe(
  lobe: CypressLobe,
  heightFraction: number,
): CypressLobeSection | null {
  return sampleSections(lobe.sections, heightFraction)
}

export function lobeIntervalsAt(
  plan: CypressLobePlan,
  heightFraction: number,
): { lobeId: string; left: number; right: number }[] {
  return plan.lobes.flatMap((lobe) => {
    const section = sampleSections(lobe.sections, heightFraction)
    if (!section) return []
    return [
      {
        lobeId: lobe.id,
        left: section.sourceCenter - section.sourceHalfWidth,
        right: section.sourceCenter + section.sourceHalfWidth,
      },
    ]
  })
}

function trackSatelliteRuns(
  rows: CypressLobeRows,
  options: Required<Pick<CypressLobePlanOptions, 'maxRowGap' | 'horizontalTolerancePx'>>,
): TaggedRun[][] {
  const tagged = rows.satellites.map((run, id) => ({ ...run, id }))
  const byRow = new Map<number, TaggedRun[]>()
  for (const run of tagged) {
    const row = byRow.get(run.y)
    if (row) row.push(run)
    else byRow.set(run.y, [run])
  }
  const used = new Set<number>()
  const chains: TaggedRun[][] = []
  const rowNumbers = [...byRow.keys()].sort((a, b) => a - b)
  const separation = (a: TaggedRun, b: TaggedRun) => {
    if (b.x0 > a.x1) return b.x0 - a.x1
    if (a.x0 > b.x1) return a.x0 - b.x1
    return 0
  }
  const sideOf = (run: TaggedRun) => {
    const py = run.y / Math.max(1, rows.height - 1)
    const sourceCenter = (run.x0 + run.x1) / 2 / Math.max(1, rows.width - 1)
    const primary = rowSpanAt(py, rows)
    return sourceCenter < (primary.left + primary.right) / 2 ? 'left' : 'right'
  }

  for (const y of rowNumbers) {
    for (const seed of byRow.get(y) ?? []) {
      if (used.has(seed.id)) continue
      const chain = [seed]
      const side = sideOf(seed)
      used.add(seed.id)
      let current = seed
      while (true) {
        let best: TaggedRun | undefined
        let bestScore = Number.POSITIVE_INFINITY
        for (let gap = 1; gap <= options.maxRowGap; gap++) {
          for (const candidate of byRow.get(current.y + gap) ?? []) {
            if (used.has(candidate.id) || sideOf(candidate) !== side) continue
            const apart = separation(current, candidate)
            if (apart > options.horizontalTolerancePx * gap) continue
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
      chains.push(chain)
    }
  }
  return chains
}

function mainLobe(rows: CypressLobeRows): CypressLobe {
  const raw = rows.spans
    .map(([py, left, right]) => {
      const sourceCenter = (left + right) / 2
      const sourceHalfWidth = Math.max(0.0035, (right - left) / 2)
      return {
        heightFraction: 1 - py,
        sourceCenter,
        sourceHalfWidth,
        paintCenter: sourceCenter,
        paintHalfWidth: sourceHalfWidth,
      }
    })
    .sort((a, b) => a.heightFraction - b.heightFraction)
  // the spans' own widths, lightly smoothed (3 rows of 1578). No taper above 0.9: the painting's tip is a hooked
  // club 36 px wide at 0.95 of the height (1600 px units), and the old taper made a 22 px needle of it (E1).
  const sections = smoothSourceSections(raw, 3)
  return {
    id: 'main',
    kind: 'main',
    side: 'centre',
    sections,
    sourceHeightRange: [sections[0]?.heightFraction ?? 0, sections.at(-1)?.heightFraction ?? 1],
    sourceMaxRimDistance: 0,
  }
}

function maxRimDistance(chain: TaggedRun[], rows: CypressLobeRows): number {
  let maximum = 0
  for (const run of chain) {
    const py = run.y / Math.max(1, rows.height - 1)
    const sourceCenter = (run.x0 + run.x1) / 2 / Math.max(1, rows.width - 1)
    const sourceHalfWidth = (run.x1 - run.x0 + 1) / 2 / Math.max(1, rows.width - 1)
    const primary = rowSpanAt(py, rows)
    const primaryCentre = (primary.left + primary.right) / 2
    const primaryHalfWidth = Math.max(1e-6, (primary.right - primary.left) / 2)
    const gap =
      sourceCenter < primaryCentre
        ? primary.left - (sourceCenter + sourceHalfWidth)
        : sourceCenter - sourceHalfWidth - primary.right
    maximum = Math.max(maximum, Math.max(0, gap) / primaryHalfWidth)
  }
  return maximum
}

function frondLobe(
  chainTopToBottom: TaggedRun[],
  index: number,
  rows: CypressLobeRows,
): CypressLobe {
  const widthDenominator = Math.max(1, rows.width - 1)
  const heightDenominator = Math.max(1, rows.height - 1)
  const source = smoothSourceSections(chainTopToBottom
    .map((run) => {
      const sourceCenter = (run.x0 + run.x1) / 2 / widthDenominator
      const sourceHalfWidth = Math.max(
        0.004,
        (run.x1 - run.x0 + 1) / 2 / widthDenominator,
      )
      return {
        heightFraction: 1 - run.y / heightDenominator,
        sourceCenter,
        sourceHalfWidth,
        paintCenter: sourceCenter,
        paintHalfWidth: sourceHalfWidth,
      }
    })
    .reverse(), 3)
  // The frond is the painting's runs and nothing more (E1): the old flame envelope (a half-width of at least 0.1
  // crop widths, 35 px of 176) put a wedge 13–18 px outside the painting between 0.30 and 0.45 of the height,
  // and the old root at height 0 ran that wedge down the whole trunk. The root sits just below the chain's base,
  // inside the main column, and the tip is the chain's own top run drawn to a point.
  const sourceBase = source[0]
  const sourceTip = source[source.length - 1]
  const primaryAtBase = rowSpanAt(1 - sourceBase.heightFraction, rows)
  const side =
    sourceBase.sourceCenter < (primaryAtBase.left + primaryAtBase.right) / 2
      ? 'left'
      : 'right'
  const rootHeight = Math.max(0, sourceBase.heightFraction - ROOT_DEPTH)
  const primaryAtRoot = rowSpanAt(1 - rootHeight, rows)
  const primaryCentre = (primaryAtRoot.left + primaryAtRoot.right) / 2
  const primaryHalfWidth = Math.max(0.0035, (primaryAtRoot.right - primaryAtRoot.left) / 2)
  // the root is the chain's base moved the least that puts its interval inside the main column's, so the short
  // bridge closes the volume inside the main and never grows a diagonal branch out of it (a root at the main's
  // centre drew the bridge as a diagonal tail across the main's rim in the flat gate, 2026-10-21)
  const rootCentre =
    primaryHalfWidth > sourceBase.sourceHalfWidth
      ? Math.min(
          primaryAtRoot.right - sourceBase.sourceHalfWidth,
          Math.max(primaryAtRoot.left + sourceBase.sourceHalfWidth, sourceBase.sourceCenter),
        )
      : primaryCentre
  const root: CypressLobeSection = {
    heightFraction: rootHeight,
    sourceCenter: rootCentre,
    sourceHalfWidth: sourceBase.sourceHalfWidth,
    paintCenter: primaryCentre,
    paintHalfWidth: primaryHalfWidth,
  }
  const bridge: CypressLobeSection[] = []
  const bridgeSteps = 4
  for (let step = 1; step < bridgeSteps; step++) {
    const t = step / bridgeSteps
    const heightFraction =
      root.heightFraction + (sourceBase.heightFraction - root.heightFraction) * t
    const primary = rowSpanAt(1 - heightFraction, rows)
    bridge.push({
      heightFraction,
      sourceCenter: root.sourceCenter + (sourceBase.sourceCenter - root.sourceCenter) * t,
      sourceHalfWidth: sourceBase.sourceHalfWidth,
      paintCenter: (primary.left + primary.right) / 2,
      paintHalfWidth: Math.max(0.0035, (primary.right - primary.left) / 2),
    })
  }
  const tip: CypressLobeSection = {
    heightFraction: Math.min(0.999, sourceTip.heightFraction + 1e-4),
    sourceCenter: sourceTip.sourceCenter,
    sourceHalfWidth: Math.max(0.0035, sourceTip.sourceHalfWidth * 0.5),
    paintCenter: sourceTip.paintCenter,
    paintHalfWidth: Math.max(0.0035, sourceTip.paintHalfWidth * 0.5),
  }
  const sections = [root, ...bridge, ...source, tip].sort((a, b) => a.heightFraction - b.heightFraction)
  return {
    id: `frond-${index + 1}`,
    kind: 'frond',
    side,
    sections,
    sourceHeightRange: [sourceBase.heightFraction, sourceTip.heightFraction],
    sourceMaxRimDistance: maxRimDistance(chainTopToBottom, rows),
  }
}

export function buildCypressLobePlan(
  rows: CypressLobeRows,
  options: CypressLobePlanOptions = {},
): CypressLobePlan {
  // the row thresholds scale with the table's resolution: 28 rows and 4 px at the 662-row table, 66 and 9 at
  // the 1578-row one (E1: the table is baked from the 3840 px scan)
  const minTrackRows = options.minTrackRows ?? Math.round(0.042 * rows.height)
  const maxFronds = options.maxFronds ?? 5
  const maximumRimDistance = options.maxRimDistance ?? 3
  const chains = trackSatelliteRuns(rows, {
    maxRowGap: options.maxRowGap ?? 2,
    horizontalTolerancePx: options.horizontalTolerancePx ?? Math.round(0.006 * rows.height),
  })
    .filter((chain) => chain.length >= minTrackRows)
    .filter((chain) => {
      const heights = chain.map((run) => 1 - run.y / Math.max(1, rows.height - 1))
      return Math.max(...heights) > 0.12 && Math.max(...heights) - Math.min(...heights) >= 0.02
    })
    .filter((chain) => maxRimDistance(chain, rows) <= maximumRimDistance)
    .sort((a, b) => b.length - a.length)
    .slice(0, maxFronds)

  return {
    width: rows.width,
    height: rows.height,
    lobes: [mainLobe(rows), ...chains.map((chain, index) => frondLobe(chain, index, rows))],
  }
}
