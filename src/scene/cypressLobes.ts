import { rowSpanAt, type RowTable } from './cypressMapping.ts'

export type CypressLobeRows = RowTable & {
  satellites: { y: number; x0: number; x1: number }[]
}

export type CypressLobeSection = {
  heightFraction: number
  /** Horizontal source coordinate in the baked crop; it may sit beyond 0..1 for detached paint. */
  sourceCenter: number
  sourceHalfWidth: number
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
  const sections = rows.spans
    .map(([py, left, right]) => ({
      heightFraction: 1 - py,
      sourceCenter: (left + right) / 2,
      sourceHalfWidth: Math.max(0.004, (right - left) / 2),
    }))
    .sort((a, b) => a.heightFraction - b.heightFraction)
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
  const source = chainTopToBottom
    .map((run) => ({
      heightFraction: 1 - run.y / heightDenominator,
      sourceCenter: (run.x0 + run.x1) / 2 / widthDenominator,
      sourceHalfWidth: Math.max(0.004, (run.x1 - run.x0 + 1) / 2 / widthDenominator),
    }))
    .reverse()
  const sourceBase = source[0]
  const sourceTip = source[source.length - 1]
  const primaryAtBase = rowSpanAt(1 - sourceBase.heightFraction, rows)
  const side =
    sourceBase.sourceCenter < (primaryAtBase.left + primaryAtBase.right) / 2
      ? 'left'
      : 'right'
  const sign = side === 'left' ? -1 : 1
  const rootHeight = 0
  const primaryAtRoot = rowSpanAt(1 - rootHeight, rows)
  const primaryCentre = (primaryAtRoot.left + primaryAtRoot.right) / 2
  const primaryHalfWidth = (primaryAtRoot.right - primaryAtRoot.left) / 2
  // These source tips detach from the main silhouette only after rising out of the lower mass.
  // Root them near their own column and bend toward the main by a bounded amount; an unconstrained
  // interpolation creates diagonal branches, which the painting does not contain.
  const maximumRootShift = sourceBase.heightFraction * 0.35
  const rootShift = Math.min(
    maximumRootShift,
    Math.max(-maximumRootShift, primaryCentre - sourceBase.sourceCenter),
  )
  const root: CypressLobeSection = {
    heightFraction: rootHeight,
    sourceCenter: sourceBase.sourceCenter + rootShift,
    sourceHalfWidth: Math.max(sourceBase.sourceHalfWidth * 1.15, primaryHalfWidth * 0.2),
  }
  const bridge: CypressLobeSection[] = []
  const bridgeSteps = 4
  for (let step = 1; step < bridgeSteps; step++) {
    const t = step / bridgeSteps
    bridge.push({
      heightFraction: root.heightFraction + (sourceBase.heightFraction - root.heightFraction) * t,
      sourceCenter: root.sourceCenter + (sourceBase.sourceCenter - root.sourceCenter) * t,
      sourceHalfWidth:
        root.sourceHalfWidth +
        (Math.max(sourceBase.sourceHalfWidth, root.sourceHalfWidth * 0.7) - root.sourceHalfWidth) * t,
    })
  }
  const tipExtension = Math.max(0.018, (sourceTip.heightFraction - sourceBase.heightFraction) * 0.14)
  const tip: CypressLobeSection = {
    heightFraction: Math.min(0.995, sourceTip.heightFraction + tipExtension),
    sourceCenter: sourceTip.sourceCenter + sign * Math.min(0.018, tipExtension * 0.15),
    sourceHalfWidth: 0.0035,
  }
  return {
    id: `frond-${index + 1}`,
    kind: 'frond',
    side,
    sections: [root, ...bridge, ...source, tip].sort(
      (a, b) => a.heightFraction - b.heightFraction,
    ),
    sourceHeightRange: [sourceBase.heightFraction, sourceTip.heightFraction],
    sourceMaxRimDistance: maxRimDistance(chainTopToBottom, rows),
  }
}

export function buildCypressLobePlan(
  rows: CypressLobeRows,
  options: CypressLobePlanOptions = {},
): CypressLobePlan {
  const minTrackRows = options.minTrackRows ?? 16
  const maxFronds = options.maxFronds ?? 5
  const maximumRimDistance = options.maxRimDistance ?? 3
  const chains = trackSatelliteRuns(rows, {
    maxRowGap: options.maxRowGap ?? 2,
    horizontalTolerancePx: options.horizontalTolerancePx ?? 4,
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
