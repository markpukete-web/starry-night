import { mulberry32 } from './brush.ts'
import { sampleCypressLobe, type CypressLobe, type CypressLobePlan } from './cypressLobes.ts'

export const CYPRESS_LOBE_STROKE_CONFIG = {
  structuralCount: 48,
  fillCount: 0,
  structuralLength: 0.42,
  fillLength: 0.28,
  structuralSteps: 43,
  fillSteps: 29,
  reliefSpread: 0.035,
  backDensity: 0.18,
} as const

export type CypressLobeStrokeSample = {
  heightFraction: number
  /** -1..1 across the lobe's visible source interval. */
  lateral: number
  /** Baked-crop coordinates. Detached fronds may legitimately sit outside 0..1 horizontally. */
  sourceX: number
  /** Paint sampling coordinate, kept inside detected pigment when geometry is broadened. */
  paintX: number
  sourceY: number
}

export type CypressLobeStroke = {
  lobeId: string
  scale: 'structural' | 'fill'
  relief: number
  samples: CypressLobeStrokeSample[]
}

export type CypressLobeStrokeOptions = {
  seed: number
  structuralCount: number
  fillCount: number
  structuralLength: number
  fillLength: number
  structuralSteps: number
  fillSteps: number
  reliefSpread: number
}

function lobeArea(lobe: CypressLobe): number {
  let area = 0
  for (let index = 0; index < lobe.sections.length - 1; index++) {
    const a = lobe.sections[index]
    const b = lobe.sections[index + 1]
    area +=
      Math.max(0, b.heightFraction - a.heightFraction) *
      (a.sourceHalfWidth + b.sourceHalfWidth)
  }
  return Math.max(area, 0.001)
}

function allocate(total: number, lobes: CypressLobe[]): number[] {
  if (total <= 0 || lobes.length === 0) return lobes.map(() => 0)
  const counts = lobes.map(() => 0)
  let remaining = total
  for (let index = 0; index < lobes.length && remaining > 0; index++) {
    counts[index]++
    remaining--
  }
  if (remaining === 0) return counts
  const weights = lobes.map(lobeArea)
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0)
  const exact = weights.map((weight) => (weight / weightTotal) * remaining)
  for (let index = 0; index < exact.length; index++) {
    const whole = Math.floor(exact[index])
    counts[index] += whole
    remaining -= whole
  }
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (let index = 0; remaining > 0; index++, remaining--) {
    counts[order[index % order.length].index]++
  }
  return counts
}

function strokeRange(lobe: CypressLobe, requestedLength: number, random: () => number) {
  const lobeStart = lobe.sections[0].heightFraction
  const lobeEnd = lobe.sections[lobe.sections.length - 1].heightFraction
  const available = lobeEnd - lobeStart
  const length = Math.min(requestedLength, available)
  const seed = lobeStart + random() * available
  let start = seed - length * 0.5
  let end = seed + length * 0.5
  if (start < lobeStart) {
    end += lobeStart - start
    start = lobeStart
  }
  if (end > lobeEnd) {
    start -= end - lobeEnd
    end = lobeEnd
  }
  return { start: Math.max(lobeStart, start), end: Math.min(lobeEnd, end) }
}

/**
 * Generates two deterministic lobe-owned paint populations. Paths grow in both directions around
 * their seed, avoiding the old all-upward clipped tails. Structural strokes establish the long
 * flame rhythm; fill strokes close the surface without changing topology ownership.
 */
export function generateCypressLobeStrokes(
  plan: CypressLobePlan,
  options: CypressLobeStrokeOptions,
): CypressLobeStroke[] {
  const random = mulberry32(options.seed)
  const output: CypressLobeStroke[] = []

  for (const population of [
    {
      scale: 'structural' as const,
      count: options.structuralCount,
      length: options.structuralLength,
      steps: options.structuralSteps,
    },
    {
      scale: 'fill' as const,
      count: options.fillCount,
      length: options.fillLength,
      steps: options.fillSteps,
    },
  ]) {
    if (population.steps < 3 || population.length <= 0) continue
    const counts = allocate(population.count, plan.lobes)
    for (let lobeIndex = 0; lobeIndex < plan.lobes.length; lobeIndex++) {
      const lobe = plan.lobes[lobeIndex]
      for (let strokeIndex = 0; strokeIndex < counts[lobeIndex]; strokeIndex++) {
        const { start, end } = strokeRange(lobe, population.length, random)
        const baseLateral = random() * 1.72 - 0.86
        const phase = random() * Math.PI * 2
        const relief = 1 - options.reliefSpread + random() * options.reliefSpread * 2
        const samples: CypressLobeStrokeSample[] = []
        for (let sampleIndex = 0; sampleIndex < population.steps; sampleIndex++) {
          const t = sampleIndex / (population.steps - 1)
          const heightFraction = start + (end - start) * t
          const section = sampleCypressLobe(lobe, heightFraction)
          if (!section) continue
          const sinuous =
            Math.sin(phase + t * Math.PI * 1.35) * 0.055 * (1 - Math.abs(baseLateral) * 0.55)
          const lateral = Math.min(0.94, Math.max(-0.94, baseLateral + sinuous))
          samples.push({
            heightFraction,
            lateral,
            sourceX: section.sourceCenter + lateral * section.sourceHalfWidth,
            paintX: section.paintCenter + lateral * section.paintHalfWidth,
            sourceY: 1 - heightFraction,
          })
        }
        if (samples.length >= 3) {
          output.push({ lobeId: lobe.id, scale: population.scale, relief, samples })
        }
      }
    }
  }
  return output
}
