import { smooth, vnoise } from './brushForms.ts'

export type ProfileFactors = {
  /** Painting-derived half-widths ordered base to tip. */
  slices: number[]
  widthScale: number
  useUpperTaper: boolean
  upperTaperStart: number
  upperTaperStrength: number
  useTongue: boolean
  tongueAmount: number
  tongueTipStart: number
  smoothingWindow: number
}

/** One extraction threshold and one factor set for runtime, diagnostic and tests. */
export const CYPRESS_LUM_MAX = 90
export const CYPRESS_PROFILE_CONFIG = {
  widthScale: 4.6,
  // The extracted source already tapers. A second taper caused the visible neck below the tip;
  // the shared ablation improved mean outline error from 0.20726 to 0.20074 when it was removed.
  useUpperTaper: false,
  upperTaperStart: 0.84,
  upperTaperStrength: 0.82,
  useTongue: true,
  tongueAmount: 0.5,
  tongueTipStart: 0.6,
  smoothingWindow: 0,
} as const

export function makeCypressProfile(slices: number[]): ProfileFactors {
  return { slices, ...CYPRESS_PROFILE_CONFIG }
}

/** Coherent angular displacement: a few tall tongues, not high-frequency shrub fuzz. */
export function tongue(angle: number, heightFraction: number, sharpen = 1.35): number {
  const ridge = vnoise(
    Math.cos(angle) * 1.7 + 10,
    Math.sin(angle) * 1.7 + heightFraction * 3.4 + 4,
  )
  const fine = vnoise(
    Math.cos(angle) * 4 + 2,
    Math.sin(angle) * 4 + heightFraction * 6 + 7,
  )
  const displacement = (ridge - 0.5) + (fine - 0.5) * 0.1
  return displacement > 0 ? displacement * sharpen : displacement * 0.45
}

function sliceAt(heightFraction: number, factors: ProfileFactors): number {
  const slices = factors.slices
  if (slices.length === 0) return 0
  const at = (index: number) => {
    if (factors.smoothingWindow <= 0) return slices[index]
    let sum = 0
    let count = 0
    for (
      let offset = -factors.smoothingWindow;
      offset <= factors.smoothingWindow;
      offset++
    ) {
      const sample = index + offset
      if (sample < 0 || sample >= slices.length) continue
      sum += slices[sample]
      count++
    }
    return count > 0 ? sum / count : slices[index]
  }
  const position = Math.min(slices.length - 1, Math.max(0, heightFraction * (slices.length - 1)))
  const before = Math.floor(position)
  const after = Math.min(slices.length - 1, before + 1)
  const t = position - before
  return at(before) * (1 - t) + at(after) * t
}

/** The closed solid's radius at one height and angle. */
export function composedRadius(
  heightFraction: number,
  angle: number,
  factors: ProfileFactors,
): number {
  const height = Math.min(1, Math.max(0, heightFraction))
  let radius = sliceAt(height, factors) * factors.widthScale
  if (factors.useUpperTaper) {
    radius *=
      1 - smooth(factors.upperTaperStart, 1, height) * factors.upperTaperStrength
  }
  if (factors.useTongue) {
    const tipTaper = 0.35 + 0.65 * (1 - smooth(factors.tongueTipStart, 1, height))
    radius *= 1 + tongue(angle, height) * factors.tongueAmount * tipTaper
  }
  return Math.max(0.015, radius)
}

/** Maximum outline extent perpendicular to the view bearing: the rim a viewer actually sees. */
export function projectedHalfWidth(
  heightFraction: number,
  bearing: number,
  factors: ProfileFactors,
  samples = 64,
): number {
  let extent = 0
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2
    const radius = composedRadius(heightFraction, angle, factors)
    extent = Math.max(extent, Math.abs(radius * Math.sin(angle - bearing)))
  }
  return extent
}
