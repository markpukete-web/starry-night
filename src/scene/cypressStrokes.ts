import { mulberry32, sampleColour } from './brush.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The cypress's streamline tracer (E1, tasks/2026-10-21-cypress-e1-plan.md): ribbons grown both ways from a seed
 * inside the tree's mask, following the painting's own orientation field (public/reference/cypress-flow.png: R, G
 * the signed-up direction, B the mask, 0 outside). Every constant is a fraction of the crop, so the asset's
 * resolution can change without a retune.
 */
export const CYPRESS_RIBBON_CONFIG = {
  /** front ribbons; the back takes `backShare` of the count. 520 left the underpaint showing between the strokes
   * where the painting is solid paint (flat gate, retune 1, 2026-10-21) */
  frontCount: 1400,
  backShare: 0.25,
  /** seeds above `spireHeight` are accepted this many times more often than below: the spire is a sliver of the
   * mask's area and took three strands for the painting's six to eight packed lanes (retune 1) */
  spireSeedWeight: 1.8,
  /** a ribbon's length as a fraction of the crop's height, log-uniform between these; the spire's are longer */
  minLength: 0.07,
  maxLength: 0.3,
  spireHeight: 0.6,
  spireLengthScale: 1.5,
  /** the integration step, a fraction of the crop's height: 3 px at 1578 rows */
  step: 0.0019,
  /** half-widths in crop widths: the painting's lanes are 8–14 px of 453 */
  minHalfWidth: 0.009,
  maxHalfWidth: 0.016,
  /** steps a ribbon may run past the mask at either end: the tongues breaking the outline */
  overshootSteps: 4,
  /** the tip's width as a share of the base's: the stroke draws out upward */
  taper: 0.45,
  reliefSpread: 0.035,
} as const

export type CypressRibbonConfig = { -readonly [K in keyof typeof CYPRESS_RIBBON_CONFIG]: number }

export type CypressRibbonSample = {
  /** crop-normalised */
  px: number
  py: number
  inside: boolean
}

export type CypressRibbon = {
  samples: CypressRibbonSample[]
  /** the seed's sample object (an element of `samples`): the kept run's anchor in the lift */
  seedSample: CypressRibbonSample
  /** source sRGB 0..1 at the middle sample, or the seed's when the middle is a tongue over sky */
  colour: [number, number, number]
  /** crop widths */
  halfWidth: number
  relief: number
  seed: number
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

/** The painting's own cypress pigments: dark, and not bluer than green (the gaps between strokes are blue-black). */
function isTreePigment(r: number, g: number, b: number): boolean {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance < 118 && b < g + 18
}

/**
 * The pigment of the lane under a point: the brightest tree texel within one texel of it, or the texel itself
 * when none around it is tree. At 1600 px a texel averages 2.4 × 2.4 scan pixels, so the texel under a sample
 * mixes a lane with the dark gap beside it and the ribbons read grey-blue (flat gate, retune 1, 2026-10-21).
 */
export function lanePigment(painting: ImageData2D, u: number, v: number): [number, number, number] {
  const cx = Math.min(painting.width - 1, Math.max(0, Math.floor(u * painting.width)))
  const cy = Math.min(painting.height - 1, Math.max(0, Math.floor(v * painting.height)))
  let best: [number, number, number] | null = null
  let bestLuminance = -1
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (x < 0 || y < 0 || x >= painting.width || y >= painting.height) continue
      const i = (y * painting.width + x) * 4
      const r = painting.data[i]
      const g = painting.data[i + 1]
      const b = painting.data[i + 2]
      if (!isTreePigment(r, g, b)) continue
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      if (luminance > bestLuminance) {
        bestLuminance = luminance
        best = [r / 255, g / 255, b / 255]
      }
    }
  }
  return best ?? sampleColour(painting, u, v)
}

/** A crop-normalised point as painting-normalised coordinates, through the row table's `uv` box. */
export function paintingUV(rows: { uv: [number, number, number, number] }, px: number, py: number): [number, number] {
  return [rows.uv[0] + px * (rows.uv[2] - rows.uv[0]), rows.uv[1] + py * (rows.uv[3] - rows.uv[1])]
}

/**
 * Streamlines in the cypress's own field, grown both ways from a seed inside the mask. Deterministic in `seed`.
 * The field is signed up (`signedUpDirection` in the bake), so one walk climbs and the other descends; a ribbon
 * is its seed with up to half its length each way, so no ribbon is clipped to a stub by the mask's top. One
 * colour per ribbon (the July 2026 review's "one pigment per ribbon" kept), at the middle sample, or at the seed
 * when the middle has overshot into sky.
 */
export function traceCypressRibbons(
  flow: ImageData2D,
  painting: ImageData2D,
  rows: { uv: [number, number, number, number] },
  count: number,
  seed: number,
  config: CypressRibbonConfig = CYPRESS_RIBBON_CONFIG,
): CypressRibbon[] {
  const random = mulberry32(seed)
  const inside = (px: number, py: number) => sampleCypressImage(flow, px, py).b > 0
  const direction = (px: number, py: number): [number, number] => {
    const texel = sampleCypressImage(flow, px, py)
    const dx = (texel.r / 255) * 2 - 1
    const dy = (texel.g / 255) * 2 - 1
    const magnitude = Math.hypot(dx, dy) || 1
    return [dx / magnitude, dy / magnitude]
  }
  const widthDenominator = flow.width - 1
  const heightDenominator = flow.height - 1
  const stepPx = config.step * heightDenominator
  const walk = (px: number, py: number, sign: 1 | -1, steps: number): CypressRibbonSample[] => {
    const out: CypressRibbonSample[] = []
    let x = px * widthDenominator
    let y = py * heightDenominator
    let outside = 0
    for (let k = 0; k < steps; k++) {
      const [dx, dy] = direction(x / widthDenominator, y / heightDenominator)
      x += sign * dx * stepPx
      y += sign * dy * stepPx
      if (x < 0 || y < 0 || x > widthDenominator || y > heightDenominator) break
      const sample = { px: x / widthDenominator, py: y / heightDenominator, inside: inside(x / widthDenominator, y / heightDenominator) }
      if (!sample.inside && ++outside > config.overshootSteps) break
      out.push(sample)
    }
    return out
  }

  const output: CypressRibbon[] = []
  for (let index = 0; index < count; index++) {
    let sx = 0
    let sy = 0
    let seeded = false
    for (let attempt = 0; attempt < 200 && !seeded; attempt++) {
      sx = random()
      sy = random()
      seeded = inside(sx, sy) && (1 - sy > config.spireHeight || random() * config.spireSeedWeight < 1)
    }
    if (!seeded) continue
    const spire = 1 - sy > config.spireHeight ? config.spireLengthScale : 1
    const length = Math.exp(Math.log(config.minLength) + random() * (Math.log(config.maxLength) - Math.log(config.minLength))) * spire
    const half = Math.max(2, Math.round(length / config.step / 2))
    const halfWidth = config.minHalfWidth + random() * (config.maxHalfWidth - config.minHalfWidth)
    const relief = 1 - config.reliefSpread + random() * config.reliefSpread * 2
    const ribbonSeed = random() * 1000
    const up = walk(sx, sy, 1, half)
    const down = walk(sx, sy, -1, half).reverse()
    const seedSample: CypressRibbonSample = { px: sx, py: sy, inside: true }
    const samples = [...down, seedSample, ...up]
    if (samples.length < 4) continue
    const middle = samples[Math.floor(samples.length / 2)]
    const at = middle.inside ? middle : seedSample
    const colour = lanePigment(painting, ...paintingUV(rows, at.px, at.py))
    output.push({ samples, seedSample, colour, halfWidth, relief, seed: ribbonSeed })
  }
  return output
}

export type RibbonEdges = { left: [number, number]; right: [number, number] }[]

/**
 * The strip's edges in crop-normalised units: the path's 2D normal (isotropic in pixels) times the tapered
 * half-width. Both edges are lifted on their own (Codex F4: a width built in 3D from the centreline's normal lies
 * in a plane that cuts into the solid at the rim).
 */
export function ribbonEdges(ribbon: CypressRibbon, width: number, height: number, taper: number): RibbonEdges {
  const n = ribbon.samples.length
  const sx = (p: CypressRibbonSample) => p.px * (width - 1)
  const sy = (p: CypressRibbonSample) => p.py * (height - 1)
  const halfPx = ribbon.halfWidth * (width - 1)
  return ribbon.samples.map((p, k) => {
    const a = ribbon.samples[Math.max(0, k - 1)]
    const b = ribbon.samples[Math.min(n - 1, k + 1)]
    const tx = sx(b) - sx(a)
    const ty = sy(b) - sy(a)
    const magnitude = Math.hypot(tx, ty) || 1
    const nx = -ty / magnitude
    const ny = tx / magnitude
    const w = halfPx * (1 + (taper - 1) * (n > 1 ? k / (n - 1) : 0))
    return {
      left: [(sx(p) + nx * w) / (width - 1), (sy(p) + ny * w) / (height - 1)],
      right: [(sx(p) - nx * w) / (width - 1), (sy(p) - ny * w) / (height - 1)],
    }
  })
}
