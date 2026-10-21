import { Color, SRGBColorSpace, Vector3 } from 'three'
import { makeBrushArrays, moonShade, pushDrapedRibbon, type BrushArrays } from './brushForms.ts'
import { bandPigment, CYPRESS_RIBBON_CONFIG, traceCypressRibbons, type CypressRibbon, type CypressRibbonConfig, type RibbonRows, type TexelAccept } from './cypressStrokes.ts'
import { coastR, islandHeightAt } from './islandShape.ts'
import { groundTexel } from './landClass.ts'
import { crestAt, flowToPainting, LAND_MAP, worldAt } from './landMapping.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The ground strokes on the island's top (E2.3, tasks/2026-10-21-land-e2-plan.md): E1's streamline tracer run in
 * the painting's land band (public/reference/land-flow.png: R, G the undirected orientation, B the island's
 * support with the anisotropy, 0 where no strip can stand), each ribbon's centreline mapped through the plan-view
 * map (landMapping.ts) and draped on the terrain with its width laid out in world, lifted along the normal. One
 * pigment per ribbon from the painting's own ground (the hills' blue included, which the cypress's filter rejects).
 */
export const LAND_RIBBON_CONFIG: CypressRibbonConfig = {
  ...CYPRESS_RIBBON_CONFIG,
  /** 1,000 covered the top once over and the dark solid showed through everywhere (capture 2); 2,000 at the
   * widths below cover it about three times, as the painting's layered strokes do */
  frontCount: 2000,
  backShare: 0,
  // no spire: every supported texel seeds alike
  spireSeedWeight: 1,
  spireHeight: 1,
  spireLengthScale: 1,
  /** fractions of the band's height (319 at a quarter): 32–96 px, the painting's 130–380 at 3840 */
  minLength: 0.1,
  maxLength: 0.3,
  /** 4 px: the terrain is gentle, so the strip needs fewer steps than the cypress's lobes */
  step: 0.0125,
  /**
   * fractions of the band's width, laid out in world at `worldPerU`: full strokes 0.029–0.057 world units, the
   * painting's 23–46 scan pixels on the fields (F8 measured 15–31; at the home camera the island shows the
   * painting at 0.6 of its pixel size and those drew as 2–4 px lines, capture 2), the hills' ×`HILL_WIDTH`
   */
  minHalfWidth: 0.003,
  maxHalfWidth: 0.006,
  /** the band is one span; no run caps a width */
  widthCap: 1,
  overshootSteps: 0,
  taper: 0.7,
  reliefSpread: 0.035,
  /** the field is undirected: the walk keeps its own heading (F9) */
  heading: 'continuous',
}

/** The band as one span the tracer's width cap never binds on; `uv` maps a crop point to the painting. */
export const LAND_ROWS: RibbonRows = { width: 960, height: 319, uv: [0, LAND_MAP.bandV0, 1, 1], spans: [[0, 0, 1], [1, 0, 1]] }

/** the strip's lift along the terrain's normal: four pixels at the design camera, over the solid's own facets */
export const LAND_LIFT = 0.02
/** the strip's points across its width: the terrain is gentle, three follow it (E1's lobes needed seven) */
export const LAND_COLUMNS = 3
/** the hills' strokes are the painting's broad ones, 40–80 scan pixels against the fields' 15–31 */
export const HILL_WIDTH = 1.7

/** The ground's pigment filter: its own paint, no wall, roof or window. */
export const GROUND_TEXEL: TexelAccept = groundTexel

/**
 * The painting's cypress in the land band, per v: [v, left u, right u], traced from the band 2026-10-21 with a
 * 0.01 margin. Over no ground of its own; the ground's walk under it reads the band translated past the tree's
 * right edge (`columnShift`), orientation and pigment alike, so the fill continues the fields and hills in their
 * own style (confirmation read F6; a horizontal fill with one pigment per row read as planks, flat gate 1). The
 * terrain under the column (x −1.98 to −0.94) is clad like the rest; the masses read their own tensor there.
 */
export const CYPRESS_COLUMN: readonly [number, number, number][] = [
  [0.58, 0.15, 0.42], [0.7, 0.18, 0.41], [0.76, 0.19, 0.36], [0.8, 0.19, 0.34], [0.9, 0.2, 0.31], [0.95, 0.21, 0.3], [1, 0.22, 0.29],
]
const COLUMN_GAP = 0.02

/** The column's [left, right] at a v, piecewise linear. */
export function columnAt(v: number): [number, number] {
  if (v <= CYPRESS_COLUMN[0][0]) return [CYPRESS_COLUMN[0][1], CYPRESS_COLUMN[0][2]]
  for (let k = 1; k < CYPRESS_COLUMN.length; k++) {
    const [v0, l0, r0] = CYPRESS_COLUMN[k - 1]
    const [v1, l1, r1] = CYPRESS_COLUMN[k]
    if (v <= v1) {
      const t = (v - v0) / (v1 - v0)
      return [l0 + (l1 - l0) * t, r0 + (r1 - r0) * t]
    }
  }
  const last = CYPRESS_COLUMN[CYPRESS_COLUMN.length - 1]
  return [last[1], last[2]]
}

/** How far right a column texel's source lies (the column's width plus a gap), or null outside the column. */
export function columnShift(u: number, v: number): number | null {
  const [left, right] = columnAt(v)
  return u >= left && u < right ? right - left + COLUMN_GAP : null
}

/**
 * A column texel's source: shifted right past the tree, and in the hills band at the same depth between the
 * fields' top and the crest at the source's own u (the crest is lower there, so the same v would be sky).
 */
export function columnSource(u: number, v: number): [number, number] | null {
  const shift = columnShift(u, v)
  if (shift === null) return null
  const su = u + shift
  if (v >= LAND_MAP.apron.vBack) return [su, v]
  const t = (v - crestAt(u)) / (LAND_MAP.apron.vBack - crestAt(u))
  return [su, crestAt(su) + t * (LAND_MAP.apron.vBack - crestAt(su))]
}

const MOON_LIFT = 0.04

export type TerrainHit = { position: Vector3; normal: Vector3 }

/** The terrain under a plan-view point: null beyond the coast, else the top's height and its unit normal. */
export function terrainAt(x: number, z: number): TerrainHit | null {
  if (Math.hypot(x, z) > coastR(Math.atan2(z, x))) return null
  const eps = 0.01
  const normal = new Vector3(
    -(islandHeightAt(x + eps, z) - islandHeightAt(x - eps, z)) / (2 * eps),
    1,
    -(islandHeightAt(x, z + eps) - islandHeightAt(x, z - eps)) / (2 * eps),
  ).normalize()
  return { position: new Vector3(x, islandHeightAt(x, z), z), normal }
}

/**
 * The flow with the cypress column filled from the band to its right (a copy): a column texel takes the
 * orientation of its source texel (`columnSource`) and keeps its own support where that texel has support.
 */
export function withColumnFill(flow: ImageData2D): ImageData2D {
  const data = new Uint8ClampedArray(flow.data)
  for (let y = 0; y < flow.height; y++) {
    for (let x = 0; x < flow.width; x++) {
      const [u, v] = flowToPainting(x / (flow.width - 1), y / (flow.height - 1))
      const source = columnSource(u, v)
      if (source === null) continue
      const sx = Math.min(flow.width - 1, Math.round(source[0] * (flow.width - 1)))
      const sy = Math.min(flow.height - 1, Math.max(0, Math.round(((source[1] - LAND_MAP.bandV0) / (1 - LAND_MAP.bandV0)) * (flow.height - 1))))
      const from = (sy * flow.width + sx) * 4
      const to = (y * flow.width + x) * 4
      data[to] = flow.data[from]
      data[to + 1] = flow.data[from + 1]
      data[to + 2] = flow.data[to + 2] > 0 && flow.data[from + 2] > 0 ? flow.data[from + 2] : 0
    }
  }
  return { data, width: flow.width, height: flow.height }
}

/**
 * The ground's ribbons: traced in the filled flow, a column ribbon's pigment from its source. A seed at the
 * support's edge can walk nowhere (no overshoot) and is dropped by the tracer; the deficit is traced again
 * with the next seed, up to three rounds, so the count is the count.
 */
export function traceLandRibbons(flow: ImageData2D, painting: ImageData2D, count: number, seed: number, config = LAND_RIBBON_CONFIG): CypressRibbon[] {
  const filled = withColumnFill(flow)
  const ribbons: CypressRibbon[] = []
  for (let round = 0; round < 3 && ribbons.length < count; round++) {
    ribbons.push(...traceCypressRibbons(filled, painting, LAND_ROWS, count - ribbons.length, seed + round * 7919, config, GROUND_TEXEL))
  }
  for (const ribbon of ribbons) {
    const middle = ribbon.samples[Math.floor(ribbon.samples.length / 2)]
    const [u, v] = flowToPainting(middle.px, middle.py)
    if (v < LAND_MAP.apron.vBack) ribbon.halfWidth *= HILL_WIDTH
    const source = columnSource(u, v)
    if (source !== null) ribbon.colour = bandPigment(painting, source[0], source[1], ribbon.halfWidth, GROUND_TEXEL)
  }
  return ribbons
}

export type DrapedStrip = { steps: Vector3[][] }

/**
 * A ribbon's strip on the terrain: the centreline's samples mapped through the band and the plan-view map, the
 * width laid across the mapped centreline in world (`halfWidth × worldPerU`, tapered toward the tip, isotropic
 * whatever the map's stretch), every column point lifted along the terrain's normal at its own (x, z). The seed
 * anchors the kept run as E1's drape does: a column beyond the coast below the seed restarts the run, one above
 * it ends it, the seed's own step failing means no run. Null when fewer than three steps survive.
 */
export function drapeOnTerrain(ribbon: CypressRibbon, lift: number, taper = LAND_RIBBON_CONFIG.taper, columns = LAND_COLUMNS): DrapedStrip | null {
  const n = ribbon.samples.length
  const seedIndex = ribbon.samples.indexOf(ribbon.seedSample)
  const centres = ribbon.samples.map((s) => worldAt(...flowToPainting(s.px, s.py)))
  const halfWorld = ribbon.halfWidth * LAND_MAP.worldPerU
  const steps: Vector3[][] = []
  for (let k = 0; k < n; k++) {
    const a = centres[Math.max(0, k - 1)]
    const b = centres[Math.min(n - 1, k + 1)]
    const tx = b[0] - a[0]
    const tz = b[1] - a[1]
    const magnitude = Math.hypot(tx, tz) || 1
    const nx = -tz / magnitude
    const nz = tx / magnitude
    const w = halfWorld * (1 + (taper - 1) * (n > 1 ? k / (n - 1) : 0))
    const points: Vector3[] = []
    for (let j = 0; j < columns; j++) {
      const offset = (columns > 1 ? (j / (columns - 1)) * 2 - 1 : 0) * w
      const hit = terrainAt(centres[k][0] + nx * offset, centres[k][1] + nz * offset)
      if (!hit) break
      points.push(hit.position.addScaledVector(hit.normal, lift))
    }
    if (points.length !== columns) {
      if (k === seedIndex) return null
      if (k < seedIndex) {
        steps.length = 0
        continue
      }
      break
    }
    steps.push(points)
  }
  return steps.length >= 3 ? { steps } : null
}

export type LandStrokes = {
  arrays: BrushArrays
  /** per vertex: [along 0..1, across 0..1] for the stroke body, and the ribbon's seed */
  stroke: number[]
  seed: number[]
  ribbons: number
}

/** The ground strokes' buffers: E1's stroke body over the draped strips, the moon's shade from the seed's normal. */
export function buildLandStrokes(flow: ImageData2D, painting: ImageData2D, seed = 0x1a4d, config = LAND_RIBBON_CONFIG): LandStrokes {
  const arrays = makeBrushArrays()
  const stroke: number[] = []
  const seeds: number[] = []
  const colour = new Color()
  let ribbons = 0
  for (const ribbon of traceLandRibbons(flow, painting, config.frontCount, seed, config)) {
    const strip = drapeOnTerrain(ribbon, LAND_LIFT, config.taper)
    if (!strip) continue
    const ground = terrainAt(...worldAt(...flowToPainting(ribbon.seedSample.px, ribbon.seedSample.py)))
    const shade = ground ? 1 + MOON_LIFT * moonShade(ground.normal) : 1
    const tint = colour.setRGB(ribbon.colour[0], ribbon.colour[1], ribbon.colour[2], SRGBColorSpace).multiplyScalar(ribbon.relief * shade).clone()
    pushDrapedRibbon(arrays, strip.steps, strip.steps.map(() => tint))
    for (let k = 0; k < strip.steps.length; k++) {
      for (let j = 0; j < LAND_COLUMNS; j++) {
        stroke.push(k / (strip.steps.length - 1), j / (LAND_COLUMNS - 1))
        seeds.push(ribbon.seed)
      }
    }
    ribbons++
  }
  return { arrays, stroke, seed: seeds, ribbons }
}
