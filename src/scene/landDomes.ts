import { Color, SRGBColorSpace, Vector3 } from 'three'
import { makeBrushArrays, type BrushArrays, pushDrapedRibbon } from './brushForms.ts'
import { STRIP_COLUMNS } from './cypressLobeGeometry.ts'
import { CYPRESS_RIBBON_CONFIG, ribbonColumns, traceCypressRibbons, type CypressRibbon, type CypressRibbonConfig, type RibbonRows, type TexelAccept } from './cypressStrokes.ts'
import { islandHeightAt } from './islandShape.ts'
import { FOLIAGE, landClass } from './landClass.ts'
import { flowToPainting } from './landMapping.ts'
import { LAND_MASSES, type LandMass } from './landMasses.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The trees and bushes (E2.4, tasks/2026-10-21-land-e2-plan.md): each authored mass (landMasses.ts) is a row of
 * ellipsoid domes along its base, standing on the terrain, under an underpaint solid; its box's curls are traced
 * in the land flow's crop (B on the mass's own foliage pixels, land-masses.json) and draped on the domes' union,
 * the frontmost dome per source column, the strips lifted along the facing axis (continuous where the union
 * switches domes; a lift along the winning dome's normal jumped 0.0096 there, confirmation read F4).
 */

/** world units per painting pixel: the houses' scale (villageGeometry's front row), so a mass stands house-high */
export const HOUSE_SCALE = 0.0038
/**
 * no dome taller than a house's eave: a box is a cluster's extent, not one crown's (the orchard's 152 px gave
 * 0.58-high domes, two houses tall, reading as balls; the bushes' 160 px a 0.61 olive mound, capture 3)
 */
export const DOME_HEIGHT_CAP = 0.3
/** the strips' lift along the facing axis */
export const DOME_LIFT = 0.012
/** no emitted point below the ground by less than this (F5) */
export const CONTACT = 0.005
/** beyond every dome, the nearest rim's plane carries a strip to this many radii out */
export const RIM_REACH = 0.6

export type Placed = LandMass & { height: number }
export type Dome = { centre: Vector3; rx: number; ry: number; rz: number }

export function placeMass(mass: LandMass): Placed {
  return { ...mass, height: Math.min(DOME_HEIGHT_CAP, (mass.box[3] - mass.box[1]) * HOUSE_SCALE) }
}

/** The mass's domes: evenly along the base, each with its lowest point on the terrain under its own centre. */
export function domesOf(mass: Placed, groundAt: (x: number, z: number) => number = islandHeightAt): Dome[] {
  const ry = mass.height / 2
  const count = Math.max(1, Math.round(mass.width / (ry * 1.4)))
  const rx = (0.75 * mass.width) / count
  const rz = Math.min(rx, ry) * 0.5
  const domes: Dome[] = []
  for (let i = 0; i < count; i++) {
    const cx = mass.x - mass.width / 2 + ((i + 0.5) * mass.width) / count
    domes.push({ centre: new Vector3(cx, groundAt(cx, mass.z) + ry, mass.z), rx, ry, rz })
  }
  return domes
}

export type DomeLift = { position: Vector3; lateral: number; dome: Dome }

/**
 * A source point (s across the box, t down it) on the domes' union: x along the base, y up the mass's height from
 * the terrain under x, as the domes stand (from the mass centre's base alone, a dome on a slope stood 0.74 heights
 * above the strips' frame and its top was bare, capture 4); the deepest dome containing (x, y) wins, else the nearest
 * rim's plane within RIM_REACH radii, else null. The position is continuous across dome boundaries (a maximum of
 * continuous depths).
 */
export function liftToDomes(domes: Dome[], mass: Placed, s: number, t: number, front: boolean, groundAt: (x: number, z: number) => number = islandHeightAt): DomeLift | null {
  const x = mass.x - mass.width / 2 + s * mass.width
  const y = groundAt(x, mass.z) + (1 - t) * mass.height
  return liftAt(domes, x, y, front ? 1 : -1)
}

/** The lift at a world point on the mass's plane, facing +z (front) or -z (back). */
function liftAt(domes: Dome[], x: number, y: number, facing: 1 | -1): DomeLift | null {
  let best: DomeLift | null = null
  let bestDepth = -Infinity
  let nearest: { dome: Dome; r: number } | null = null
  for (const dome of domes) {
    const ax = (x - dome.centre.x) / dome.rx
    const ay = (y - dome.centre.y) / dome.ry
    const r = Math.hypot(ax, ay)
    if (r <= 1) {
      const depth = Math.sqrt(1 - r * r) * dome.rz
      if (depth > bestDepth) {
        bestDepth = depth
        best = { position: new Vector3(x, y, dome.centre.z + facing * depth), lateral: r, dome }
      }
    } else if (!nearest || r < nearest.r) nearest = { dome, r }
  }
  if (best) return best
  if (!nearest || nearest.r - 1 > RIM_REACH) return null
  return { position: new Vector3(x, y, nearest.dome.centre.z), lateral: nearest.r, dome: nearest.dome }
}

/**
 * The lifted point at the lowest height above `yLow` that clears the terrain's contact floor: raising a point moves
 * it where the dome is deeper and the terrain under that z differs in turn, so the height is found by bisection.
 * Beyond the union's reach the point rides the mass's plane at `planeZ` (outside every dome, as the plain clamp
 * left it). The upper bound sits above every dome and above the plane's floor, so it clears by construction;
 * every candidate is verified against both constraints.
 */
function settleOnTerrain(domes: Dome[], x: number, yLow: number, facing: 1 | -1, lift: number, planeZ: number, groundAt: (x: number, z: number) => number = islandHeightAt): Vector3 | null {
  const clears = (y: number): Vector3 | null => {
    const hit = liftAt(domes, x, y, facing)
    const p = hit ? hit.position : new Vector3(x, y, planeZ)
    p.z += facing * lift
    return p.y >= groundAt(p.x, p.z) + CONTACT ? p : null
  }
  let hi = Math.max(yLow, groundAt(x, planeZ + facing * lift) + CONTACT)
  for (const d of domes) hi = Math.max(hi, d.centre.y + d.ry)
  let best = clears(hi)
  if (!best) return null
  let lo = yLow
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const p = clears(mid)
    if (p) {
      hi = mid
      best = p
    } else lo = mid
  }
  return best
}

export type DrapedStrip = { steps: Vector3[][] }

/**
 * A ribbon's strip on the domes: every column point lifted on its own, offset along the facing axis, raised to
 * the contact height where it would enter the ground. The seed anchors the kept run as E1's drape does. Null
 * when fewer than three steps survive.
 */
export function drapeOnDomes(ribbon: CypressRibbon, columns: [number, number][][], domes: Dome[], mass: Placed, front: boolean, lift = DOME_LIFT, groundAt: (x: number, z: number) => number = islandHeightAt): DrapedStrip | null {
  const seedIndex = ribbon.samples.indexOf(ribbon.seedSample)
  const count = columns[0]?.length ?? 0
  const facing = front ? 1 : -1
  const steps: Vector3[][] = []
  for (let k = 0; k < ribbon.samples.length; k++) {
    const points: Vector3[] = []
    for (const [s, t] of columns[k]) {
      const hit = liftToDomes(domes, mass, s, t, front, groundAt)
      if (!hit) break
      const point = hit.position
      point.z += facing * lift
      if (point.y < groundAt(point.x, point.z) + CONTACT) {
        // the contact clamp: raised in y alone, a rim point kept the rim's shallow z and sat 0.033 inside the solid
        // (Codex E2 F2); settle it where the union's surface meets the terrain's floor instead
        const settled = settleOnTerrain(domes, point.x, point.y, facing, lift, mass.z, groundAt)
        if (!settled) break
        point.copy(settled)
      }
      points.push(point)
    }
    if (points.length !== count || count === 0) {
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

/** A baked mass (public/reference/land-masses.json): its box at the flow's resolution and its foliage runs. */
export type BakedMass = { id: string; x0: number; y0: number; width: number; height: number; runs: { y: number; x0: number; x1: number }[] }

/** The flow's crop over the mass's box, B 255 on the mass's own foliage pixels and 0 elsewhere. */
export function massCrop(flow: ImageData2D, baked: BakedMass): { crop: ImageData2D; rows: RibbonRows; pixels: number } {
  const { x0, y0, width, height } = baked
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = ((y0 + y) * flow.width + x0 + x) * 4
      const to = (y * width + x) * 4
      data[to] = flow.data[from]
      data[to + 1] = flow.data[from + 1]
      data[to + 3] = 255
    }
  }
  let pixels = 0
  for (const run of baked.runs) {
    for (let x = run.x0; x <= run.x1; x++) {
      data[(run.y * width + x) * 4 + 2] = 255
      pixels++
    }
  }
  const [u0, v0] = flowToPainting(x0 / (flow.width - 1), y0 / (flow.height - 1))
  const [u1, v1] = flowToPainting((x0 + width - 1) / (flow.width - 1), (y0 + height - 1) / (flow.height - 1))
  return { crop: { data, width, height }, rows: { width, height, uv: [u0, v0, u1, v1], spans: [[0, 0, 1], [1, 0, 1]] }, pixels }
}

/** The pigment filter: the mass's own foliage texels (teal or olive) */
export const FOLIAGE_TEXEL: TexelAccept = (r, g, b) => FOLIAGE.includes(landClass(r, g, b))

/** The strips per mass: by its foliage area at the quarter resolution, 24 to 180 (confirmation read F16). */
export function massCount(pixels: number): number {
  return Math.min(180, Math.max(24, Math.round(pixels / 40)))
}

/** The curls' config, fractions of the mass's crop: the arcs 15–30 px wide of a 150–250 px mass. */
export function massConfig(crop: ImageData2D, count: number): CypressRibbonConfig {
  return {
    ...CYPRESS_RIBBON_CONFIG,
    perSampleColours: false,
    frontCount: count,
    backShare: 0.4,
    spireSeedWeight: 1,
    spireHeight: 1,
    spireLengthScale: 1,
    minLength: 0.2,
    maxLength: 0.5,
    step: 2 / Math.max(1, crop.height - 1),
    minHalfWidth: 0.04,
    maxHalfWidth: 0.08,
    widthCap: 1,
    overshootSteps: 3,
    taper: 0.5,
    reliefSpread: 0.035,
    heading: 'continuous',
  }
}

/** The underpaint's colour: the mean of the darkest tenth of the mass's foliage texels in its box (sRGB 0..1). */
export function underpaintColour(painting: ImageData2D, mass: LandMass): [number, number, number] {
  const texels: [number, number, number, number][] = []
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  for (let y = Math.floor(mass.box[1] * sy); y < Math.ceil(mass.box[3] * sy); y++) {
    for (let x = Math.floor(mass.box[0] * sx); x < Math.ceil(mass.box[2] * sx); x++) {
      const i = (y * painting.width + x) * 4
      const [r, g, b] = [painting.data[i], painting.data[i + 1], painting.data[i + 2]]
      if (FOLIAGE_TEXEL(r, g, b)) texels.push([0.299 * r + 0.587 * g + 0.114 * b, r, g, b])
    }
  }
  if (!texels.length) return [0.1, 0.15, 0.12]
  texels.sort((a, b) => a[0] - b[0])
  const n = Math.max(1, Math.floor(texels.length / 10))
  let r = 0
  let g = 0
  let b = 0
  for (let k = 0; k < n; k++) {
    r += texels[k][1]
    g += texels[k][2]
    b += texels[k][3]
  }
  return [r / n / 255, g / n / 255, b / n / 255]
}

/** An ellipsoid's closed surface, 8 around by 6 up, wound outward (a front-side material shows the near shell; it was
 * wound inward and the far shell showed, Codex E2 F1), appended as a solid. */
export function pushDome(arr: BrushArrays, dome: Dome, colour: Color, around = 8, up = 6): void {
  const base = arr.positions.length / 3
  for (let j = 0; j <= up; j++) {
    const phi = (j / up) * Math.PI
    for (let i = 0; i <= around; i++) {
      const theta = (i / around) * Math.PI * 2
      arr.positions.push(
        dome.centre.x + dome.rx * Math.sin(phi) * Math.cos(theta),
        dome.centre.y + dome.ry * Math.cos(phi),
        dome.centre.z + dome.rz * Math.sin(phi) * Math.sin(theta),
      )
      arr.colors.push(colour.r, colour.g, colour.b)
    }
  }
  const cols = around + 1
  for (let j = 0; j < up; j++) {
    for (let i = 0; i < around; i++) {
      const a = base + j * cols + i
      const b = a + 1
      const c = a + cols
      const d = c + 1
      arr.indices.push(a, b, c, b, d, c)
    }
  }
}

export type LandTrees = {
  solid: BrushArrays
  strokes: BrushArrays
  /** per stroke vertex: [along, across] and the ribbon's seed */
  stroke: number[]
  seed: number[]
  /** per mass: the strips draped, front and back */
  counts: Record<string, { front: number; back: number }>
  /** D1: per strip vertex and per dome vertex, the bend weight: its height above the terrain under it over the mass's height, in [0, 1] */
  bend: number[]
  solidBend: number[]
}

/** Every mass's domes and strips, as buffers. Deterministic in `seed`. */
export function buildLandTrees(
  flow: ImageData2D,
  painting: ImageData2D,
  baked: BakedMass[],
  seed = 0x7ee5,
  masses: readonly LandMass[] = LAND_MASSES,
  groundAt: (x: number, z: number) => number = islandHeightAt,
  /** the curls' config per mass: the diorama's by default, the street's narrower curls at walking distance (S1) */
  configFor: (crop: ImageData2D, pixels: number) => CypressRibbonConfig = (crop, pixels) => massConfig(crop, massCount(pixels)),
): LandTrees {
  const solid = makeBrushArrays()
  const strokes = makeBrushArrays()
  const stroke: number[] = []
  const seeds: number[] = []
  const counts: LandTrees['counts'] = {}
  const bend: number[] = []
  const solidBend: number[] = []
  // the bend weight of the vertices appended since `from`: height over the terrain under each, over the mass's height
  const weigh = (arr: BrushArrays, from: number, into: number[], height: number) => {
    for (let i = from; i < arr.positions.length; i += 3) {
      const above = arr.positions[i + 1] - groundAt(arr.positions[i], arr.positions[i + 2])
      into.push(Math.min(1, Math.max(0, above / height)))
    }
  }
  const colour = new Color()
  masses.forEach((mass, index) => {
    const entry = baked.find((m) => m.id === mass.id)
    if (!entry) throw new Error(`land mass ${mass.id} is not baked`)
    const placed = placeMass(mass)
    const domes = domesOf(placed, groundAt)
    const under = underpaintColour(painting, mass)
    colour.setRGB(under[0], under[1], under[2], SRGBColorSpace)
    for (const dome of domes) {
      const from = solid.positions.length
      pushDome(solid, dome, colour)
      weigh(solid, from, solidBend, placed.height)
    }
    const { crop, rows, pixels } = massCrop(flow, entry)
    const config = configFor(crop, pixels)
    counts[mass.id] = { front: 0, back: 0 }
    for (const front of [true, false]) {
      const count = front ? config.frontCount : Math.round(config.frontCount * config.backShare)
      const ribbons = traceCypressRibbons(crop, painting, rows, count, seed + index * 2 + (front ? 0 : 1), config, FOLIAGE_TEXEL)
      for (const ribbon of ribbons) {
        const columns = ribbonColumns(ribbon, crop.width, crop.height, config.taper, STRIP_COLUMNS)
        const strip = drapeOnDomes(ribbon, columns, domes, placed, front, DOME_LIFT, groundAt)
        if (!strip) continue
        const tint = colour.setRGB(ribbon.colour[0], ribbon.colour[1], ribbon.colour[2], SRGBColorSpace).multiplyScalar(ribbon.relief).clone()
        const from = strokes.positions.length
        pushDrapedRibbon(strokes, strip.steps, strip.steps.map(() => tint))
        weigh(strokes, from, bend, placed.height)
        for (let k = 0; k < strip.steps.length; k++) {
          for (let j = 0; j < STRIP_COLUMNS; j++) {
            stroke.push(k / (strip.steps.length - 1), j / (STRIP_COLUMNS - 1))
            seeds.push(ribbon.seed)
          }
        }
        counts[mass.id][front ? 'front' : 'back']++
      }
    }
  })
  return { solid, strokes, stroke, seed: seeds, counts, bend, solidBend }
}
