import { mulberry32, sampleColour } from './brush.ts'
import { rowSpanAt, type RowTable } from './cypressMapping.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The cypress's streamline tracer (E1, tasks/2026-10-21-cypress-e1-plan.md): ribbons grown both ways from a seed
 * inside the tree's mask, following the painting's own orientation field (public/reference/cypress-flow.png: R, G
 * the signed-up direction, B the mask, 0 outside). Every constant is a fraction of the crop, so the asset's
 * resolution can change without a retune.
 */
export const CYPRESS_RIBBON_CONFIG = {
  /**
   * front ribbons; the back takes `backShare` of the count. 520 at the lane width left the underpaint showing where
   * the painting is solid paint (retune 1); at the stroke width 450 cover the same (retune 3, 2026-10-21)
   */
  frontCount: 450,
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
  /**
   * half-widths in crop widths. The painting's strokes are broad bands 30–60 px wide of 453, with bristle lanes
   * 8–14 px wide inside them; retune 1 and 2 built the ribbons at the lane width and the tree read as fur (retune 3)
   */
  minHalfWidth: 0.03,
  maxHalfWidth: 0.06,
  /** a ribbon is at most this share of the half-width of the run its seed sits in, so the spire's strokes fit the spire */
  widthCap: 0.45,
  /** steps a ribbon may run past the mask at either end: the tongues breaking the outline */
  overshootSteps: 4,
  /** the tip's width as a share of the base's: the stroke draws out upward */
  taper: 0.45,
  reliefSpread: 0.035,
  /**
   * how a walk reads the field's sign: `up` takes the texel's direction as baked (the cypress's field is signed up
   * at bake time); `continuous` flips a texel that opposes the walk's last step and stops at a two-step cycle (the
   * land, E2: a horizontal lane's neighbouring texels decode to opposites and trapped the walk, Codex F9)
   */
  heading: 'up' as 'up' | 'continuous',
} as const

export type CypressRibbonConfig = { -readonly [K in keyof typeof CYPRESS_RIBBON_CONFIG]: (typeof CYPRESS_RIBBON_CONFIG)[K] extends number ? number : 'up' | 'continuous' }

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

/** A crop-normalised point as painting-normalised coordinates, through the row table's `uv` box. */
export function paintingUV(rows: { uv: [number, number, number, number] }, px: number, py: number): [number, number] {
  return [rows.uv[0] + px * (rows.uv[2] - rows.uv[0]), rows.uv[1] + py * (rows.uv[3] - rows.uv[1])]
}

/**
 * Streamlines in the cypress's own field, grown both ways from a seed inside the mask. Deterministic in `seed`.
 * The field is signed up (`signedUpDirection` in the bake), so one walk climbs and the other descends; a ribbon
 * is its seed with up to half its length each way, so no ribbon is clipped to a stub by the mask's top. One
 * colour per ribbon (the July 2026 review's "one pigment per ribbon" kept): the texel under the middle sample, or
 * under the seed when the middle has overshot into sky. (Retune 1 took the brightest tree texel within one texel
 * instead, and the render came out 8–14 L lighter than the painting in every third, retune 2, 2026-10-21; the
 * texel's own pigment mix already matches the painting's, green 50%, grey 38%, brown 9%.)
 */
export type RibbonRows = RowTable & { uv: [number, number, number, number]; satellites?: { y: number; x0: number; x1: number }[] }

/**
 * The half-width, in crop widths, of the run under a crop point: a satellite run on its row, else the main span.
 * The point is the rounded texel the mask reads (`sampleCypressImage`), compared inclusively with the run's
 * integer endpoints (Codex, code review F5: the unrounded coordinate missed a satellite's endpoint texel and the
 * seed took the main span's cap, three times in the shipped batch).
 */
export function runHalfWidthAt(rows: RibbonRows, px: number, py: number): number {
  const y = Math.round(py * (rows.height - 1))
  const x = Math.round(px * (rows.width - 1))
  for (const run of rows.satellites ?? []) {
    if (run.y === y && x >= run.x0 && x <= run.x1) return Math.max(0.0035, (run.x1 - run.x0 + 1) / 2 / Math.max(1, rows.width - 1))
  }
  const span = rowSpanAt(py, rows)
  return Math.max(0.0035, (span.right - span.left) / 2)
}

/** Which texels a band's pigment averages: the cypress takes its tree texels (the sky and the moonlit edge out) */
export type TexelAccept = (r: number, g: number, b: number) => boolean
export const TREE_TEXEL: TexelAccept = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b < 118 && b < g + 18
export const EVERY_TEXEL: TexelAccept = () => true

/**
 * A stroke's pigment: the mean of the accepted texels in the window a ribbon covers at its middle sample (± its
 * half-width across, ± one texel along), or the texel under the sample when none in the window is accepted. One
 * texel is one bristle lane's worth and neighbouring ribbons jumped in value where the painting's strokes agree
 * (retune 3); a wide ribbon takes its band's colour. The cypress accepts tree texels; the land (E2) every texel,
 * since the hills are the blue the tree's filter rejects.
 */
export function bandPigment(painting: ImageData2D, u: number, v: number, halfWidthU: number, accept: TexelAccept = TREE_TEXEL): [number, number, number] {
  const cx = Math.min(painting.width - 1, Math.max(0, Math.floor(u * painting.width)))
  const cy = Math.min(painting.height - 1, Math.max(0, Math.floor(v * painting.height)))
  const radius = Math.max(1, Math.round(halfWidthU * painting.width))
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (x < 0 || y < 0 || x >= painting.width || y >= painting.height) continue
      const i = (y * painting.width + x) * 4
      const red = painting.data[i]
      const green = painting.data[i + 1]
      const blue = painting.data[i + 2]
      if (!accept(red, green, blue)) continue
      r += red
      g += green
      b += blue
      n++
    }
  }
  return n ? [r / n / 255, g / n / 255, b / n / 255] : sampleColour(painting, u, v)
}

export function traceCypressRibbons(
  flow: ImageData2D,
  painting: ImageData2D,
  rows: RibbonRows,
  count: number,
  seed: number,
  config: CypressRibbonConfig = CYPRESS_RIBBON_CONFIG,
  accept: TexelAccept = TREE_TEXEL,
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
  const continuous = config.heading === 'continuous'
  const walk = (px: number, py: number, sign: 1 | -1, steps: number): CypressRibbonSample[] => {
    const out: CypressRibbonSample[] = []
    let x = px * widthDenominator
    let y = py * heightDenominator
    let outside = 0
    let hx = 0
    let hy = 0
    for (let k = 0; k < steps; k++) {
      let [dx, dy] = direction(x / widthDenominator, y / heightDenominator)
      if (continuous && k > 0 && dx * hx + dy * hy < 0) {
        dx = -dx
        dy = -dy
      }
      hx = dx
      hy = dy
      const nextX = x + sign * dx * stepPx
      const nextY = y + sign * dy * stepPx
      x = nextX
      y = nextY
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
    const halfWidth = Math.min(
      config.minHalfWidth + random() * (config.maxHalfWidth - config.minHalfWidth),
      config.widthCap * runHalfWidthAt(rows, sx, sy),
    )
    const relief = 1 - config.reliefSpread + random() * config.reliefSpread * 2
    const ribbonSeed = random() * 1000
    const up = walk(sx, sy, 1, half)
    const down = walk(sx, sy, -1, half).reverse()
    const seedSample: CypressRibbonSample = { px: sx, py: sy, inside: true }
    const samples = [...down, seedSample, ...up]
    if (samples.length < 4) continue
    const middle = samples[Math.floor(samples.length / 2)]
    const at = middle.inside ? middle : seedSample
    const colour = bandPigment(painting, ...paintingUV(rows, at.px, at.py), halfWidth * (rows.uv[2] - rows.uv[0]), accept)
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

/**
 * The strip's points across its width per sample, `columns` of them from the left edge to the right (the middle
 * one is the sample itself), in crop-normalised units. Each is lifted on its own, so the triangles between them
 * follow the lobe's curve instead of cutting through it (Codex, code review F1: a flat strip between two lifted
 * edges put a triangle's centroid 0.016 world units inside the solid).
 */
export function ribbonColumns(ribbon: CypressRibbon, width: number, height: number, taper: number, columns: number): [number, number][][] {
  const edges = ribbonEdges(ribbon, width, height, taper)
  return edges.map(({ left, right }) => {
    const out: [number, number][] = []
    for (let j = 0; j < columns; j++) {
      const t = columns > 1 ? j / (columns - 1) : 0.5
      out.push([left[0] + (right[0] - left[0]) * t, left[1] + (right[1] - left[1]) * t])
    }
    return out
  })
}
