import { Color, SRGBColorSpace, Vector3 } from 'three'
import { makeBrushArrays, moonShade, pushDrapedRibbon, vnoise, type BrushArrays } from './brushForms.ts'
import { CYPRESS_RIBBON_CONFIG, EVERY_TEXEL, ribbonColumns, traceCypressRibbons, type CypressRibbonConfig, type RibbonRows, type TexelAccept } from './cypressStrokes.ts'
import { massConfig, massCount } from './landDomes.ts'
import { LAND_MAP } from './landMapping.ts'
import { GROUND_TEXEL } from './landStrokes.ts'
import { PALETTE } from './palette.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * The street's face strokes (S1 task 3, tasks/2026-10-23-street-s1-plan.md): a wall, a roof or a strip of ground is
 * clad in ribbons traced in the land's flow field over a painted source rectangle of the scan, the crop resampled
 * so its pixels are square on the face, the ribbons clipped to the face's shape and laid on its plane. Every width
 * and length is a fraction of a reference height measured on the scan at 1:1 (task 1), never a screen size.
 */

/** Axis-aligned source rectangles in painting px (1600 × 1267), each inscribed in its `VILLAGE_PATCHES` quad; the field
 * is the painting's clean field strip between the cypress and the front house (task 1: no house, no mass). */
export const STREET_SOURCES = {
  wallA: [757, 1179, 838, 1200],
  wallB: [1261, 1121, 1359, 1147],
  plaster: [885, 1087, 895, 1108],
  roofStriped: [1016, 1186, 1084, 1220],
  roofBlue: [1108, 1045, 1150, 1073],
  roofSienna: [705, 1046, 726, 1066],
  field: [760, 1214, 935, 1262],
} as const

export type StreetSourceName = keyof typeof STREET_SOURCES

export type StreetFace = {
  origin: Vector3
  /** spans the face's width, left to right; its length is the face's width */
  u: Vector3
  /** spans the face's height, bottom to top; its length is the face's height */
  v: Vector3
  normal: Vector3
  /** a triangle's apex is at (0.5, 1) of the face: a gable or a spire's side */
  shape: 'quad' | 'triangle'
  kind: 'wall' | 'roof' | 'ground' | 'path'
  source: StreetSourceName
  /** the height the stroke fractions are of: the wall's eave, the roof's slope, a wall's height for the ground */
  refHeight: number
  seed: number
  mirror: boolean
}

/**
 * Task 1's measurements (scratch/street-s1-2026-10-23/t1/): full stroke widths and lengths as fractions of the
 * reference height, and the axis the strokes lean to in face coordinates (+y up the face), with the blend toward it
 * (0 keeps the field's own direction). The lanes inside a stroke are the stroke body's (E4), not these. Pass 1 (3D):
 * the blend 0.5 → 0.75 (the near walls carried big curled swooshes; the walls' cover 3 → 3.5 to close the gaps
 * the straighter strokes leave), the roofs' cover 3 → 6 (E4's body draws a stroke
 * narrower than its strip, and the roof read sparse), the ground's colour smoothed over ±3 samples (the path broke into
 * blocks close to the camera).
 */
export const SOURCE_STROKES: Record<StreetSourceName, { width: [number, number]; length: [number, number]; axis: [number, number]; blend: number; cover?: number; smoothing?: number }> = {
  wallA: { width: [0.12, 0.2], length: [0.6, 2.0], axis: [1, 0], blend: 0.75, cover: 3.5 },
  wallB: { width: [0.12, 0.2], length: [0.6, 2.0], axis: [1, 0], blend: 0.75, cover: 3.5 },
  plaster: { width: [0.1, 0.15], length: [0.5, 1.0], axis: [0, 1], blend: 0.75, cover: 3.5 },
  roofStriped: { width: [0.15, 0.3], length: [0.6, 1.0], axis: [0, 1], blend: 0.75, cover: 6 },
  roofBlue: { width: [0.15, 0.3], length: [0.6, 1.0], axis: [0, 1], blend: 0.75, cover: 6 },
  roofSienna: { width: [0.15, 0.3], length: [0.6, 1.0], axis: [0, 1], blend: 0.75, cover: 6 },
  field: { width: [0.15, 0.25], length: [1.5, 6.0], axis: [1, 0], blend: 0, smoothing: 3 },
}

/** the outlines' full width as a fraction of the wall (task 1: 0.12–0.18; the painting's are thick) */
export const OUTLINE_FRACTION = 0.14
/** the strokes' lift off the face, the outlines' off the strokes (world units at the street's scale, a house 0.2) */
export const STROKE_LIFT = 0.002
/**
 * Each ribbon of a face rides its own level over `STROKE_LIFT`, so overlapping ribbons have an order: at one shared
 * lift the coplanar ribbons z-fought into rectangular patches close to the camera (the path, passes 3 and 4). Sixteen
 * levels 0.15 mm apart: the depth buffer resolves 0.15 mm out to about 3 units with the near plane at 0.004.
 */
export const LIFT_LEVELS = 16
export const LIFT_STEP = 0.00015
/** above the highest ribbon level */
export const OUTLINE_LIFT = 0.005
/** the moon's share in a face's value: a face to the moon reads lighter, its back darker (the houses' volume) */
export const STREET_MOON_LIFT = 0.25
const COLUMNS = 3
/** cover: the ribbons' summed area over the face's, before the clip */
const COVER = 3
const TAPER = 0.7

const toFlowX = (u: number, flow: ImageData2D) => u * (flow.width - 1)
const toFlowY = (v: number, flow: ImageData2D) => ((v - LAND_MAP.bandV0) / (1 - LAND_MAP.bandV0)) * (flow.height - 1)

function decode(flow: ImageData2D, x: number, y: number): [number, number, number] {
  const xi = Math.min(flow.width - 1, Math.max(0, x))
  const yi = Math.min(flow.height - 1, Math.max(0, y))
  const i = (yi * flow.width + xi) * 4
  return [(flow.data[i] / 255) * 2 - 1, (flow.data[i + 1] / 255) * 2 - 1, flow.data[i + 2]]
}

/** The axial direction at a flow point, bilinear in the doubled angle (an orientation and its opposite agree). */
function axialAt(flow: ImageData2D, x: number, y: number): [number, number] {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  let c = 0
  let s = 0
  for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]] as const) {
    const [ux, uy] = decode(flow, x0 + dx, y0 + dy)
    const m = Math.hypot(ux, uy) || 1
    const a = ux / m
    const b = uy / m
    c += w * (a * a - b * b)
    s += w * 2 * a * b
  }
  const angle = Math.atan2(s, c) / 2
  return [Math.cos(angle), Math.sin(angle)]
}

/** The face's shape in face units (x across, y up), for the clip. */
function facePolygon(face: StreetFace, width: number, height: number): [number, number][] {
  return face.shape === 'triangle' ? [[0, 0], [width, 0], [width / 2, height]] : [[0, 0], [width, 0], [width, height], [0, height]]
}

function insidePolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let sign = 0
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i]
    const [bx, by] = polygon[(i + 1) % polygon.length]
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax)
    if (Math.abs(cross) < 1e-15) continue
    const s = Math.sign(cross)
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

function distanceToPolygon(x: number, y: number, polygon: [number, number][]): number {
  if (insidePolygon(x, y, polygon)) return 0
  let best = Infinity
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i]
    const [bx, by] = polygon[(i + 1) % polygon.length]
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy))
  }
  return best
}

/**
 * The land flow over the face's source rectangle, resampled so a crop pixel is square on the face: `rows` at least
 * `minRows` (and twice the source's flow rows), `cols` from the face's aspect. A source direction is carried through
 * the stretch, blended toward the source's axis, and mirrored with the columns; the pigment's uv box swaps with them.
 * B is 255 inside the face's shape and 0 outside a triangle's: every source is paint (the patches are paint samples,
 * the field a clean strip checked by eye), and the land flow's own support is off over the cypress column, where the
 * field lies (flat panel pass 0: the field face came out two-thirds bare).
 */
export function faceCrop(flow: ImageData2D, face: StreetFace, minRows = 64, painting?: ImageData2D): { crop: ImageData2D; rows: RibbonRows; pigment?: ImageData2D } {
  const width = face.u.length()
  const height = face.v.length()
  const [x0, y0, x1, y1] = STREET_SOURCES[face.source]
  const u0 = x0 / 1600
  const u1 = x1 / 1600
  const v0 = y0 / 1267
  const v1 = y1 / 1267
  const fx0 = toFlowX(u0, flow)
  const fx1 = toFlowX(u1, flow)
  const fy0 = toFlowY(v0, flow)
  const fy1 = toFlowY(v1, flow)
  const rows = Math.max(minRows, Math.ceil((fy1 - fy0) * 2))
  const cols = Math.max(2, Math.round((rows * width) / height))
  const stretchX = (cols - 1) / Math.max(1e-6, fx1 - fx0)
  const stretchY = (rows - 1) / Math.max(1e-6, fy1 - fy0)
  const { axis, blend } = SOURCE_STROKES[face.source]
  // the axis in crop pixels: face +y up is crop -y down
  const axisCrop: [number, number] = [axis[0], -axis[1]]
  const polygon = facePolygon(face, 1, 1)
  const data = new Uint8ClampedArray(cols * rows * 4)
  for (let j = 0; j < rows; j++) {
    const sy = j / (rows - 1)
    const fy = fy0 + sy * (fy1 - fy0)
    for (let i = 0; i < cols; i++) {
      const sx = i / (cols - 1)
      const fx = fx0 + (face.mirror ? 1 - sx : sx) * (fx1 - fx0)
      let [dx, dy] = axialAt(flow, fx, fy)
      dx *= stretchX
      dy *= stretchY
      if (face.mirror) dx = -dx
      let m = Math.hypot(dx, dy) || 1
      dx /= m
      dy /= m
      if (blend > 0) {
        const sign = dx * axisCrop[0] + dy * axisCrop[1] < 0 ? -1 : 1
        dx = (1 - blend) * dx * sign + blend * axisCrop[0]
        dy = (1 - blend) * dy * sign + blend * axisCrop[1]
        m = Math.hypot(dx, dy) || 1
        dx /= m
        dy /= m
      }
      const inShape = face.shape === 'quad' || insidePolygon(sx, 1 - sy, polygon)
      const k = (j * cols + i) * 4
      data[k] = Math.round(((dx + 1) / 2) * 255)
      data[k + 1] = Math.round(((dy + 1) / 2) * 255)
      data[k + 2] = inShape ? 255 : 0
      data[k + 3] = 255
    }
  }
  const cropRows: RibbonRows = { width: cols, height: rows, uv: face.mirror ? [u1, v0, u0, v1] : [u0, v0, u1, v1], spans: [[0, 0, 1], [1, 0, 1]] }
  if (!painting) return { crop: { data, width: cols, height: rows }, rows: cropRows }
  // the pigment at the crop's resolution, bilinear from the painting over the source and mirrored with it: the tracer
  // reads its texel under each sample, and the 1600 painting's ~80 × 21 texels per wall stepped in blocks along the
  // strokes (flat panel pass 1)
  const pigment = new Uint8ClampedArray(cols * rows * 4)
  for (let j = 0; j < rows; j++) {
    const py = (v0 + (j / (rows - 1)) * (v1 - v0)) * painting.height - 0.5
    for (let i = 0; i < cols; i++) {
      const sx = i / (cols - 1)
      const px = (u0 + (face.mirror ? 1 - sx : sx) * (u1 - u0)) * painting.width - 0.5
      const x0p = Math.floor(px)
      const y0p = Math.floor(py)
      const fx = px - x0p
      const fy = py - y0p
      const k = (j * cols + i) * 4
      for (let c = 0; c < 3; c++) {
        let value = 0
        for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]] as const) {
          const x = Math.min(painting.width - 1, Math.max(0, x0p + dx))
          const y = Math.min(painting.height - 1, Math.max(0, y0p + dy))
          value += w * painting.data[(y * painting.width + x) * 4 + c]
        }
        pigment[k + c] = Math.round(value)
      }
      pigment[k + 3] = 255
    }
  }
  return { crop: { data, width: cols, height: rows }, rows: { ...cropRows, uv: [0, 0, 1, 1] }, pigment: { data: pigment, width: cols, height: rows } }
}

/**
 * The tracer's config for a face: task 1's fractions of `refHeight` as crop units. With square crop pixels a
 * half-width of h crop widths is h × the face's width at any heading, so the half-width is 0.5 × f × ref / width; a
 * length of L crop heights is L × the face's height, so the length is L × ref / height. The count covers the face
 * `COVER` times over before the clip.
 */
export function faceConfig(face: StreetFace, count?: number, rows = 64): CypressRibbonConfig {
  const width = face.u.length()
  const height = face.v.length()
  const scale = SOURCE_STROKES[face.source]
  const minHalfWidth = (0.5 * scale.width[0] * face.refHeight) / width
  const maxHalfWidth = (0.5 * scale.width[1] * face.refHeight) / width
  const minLength = (scale.length[0] * face.refHeight) / height
  const maxLength = (scale.length[1] * face.refHeight) / height
  const area = 2 * ((minHalfWidth + maxHalfWidth) / 2) * Math.min(1, Math.sqrt(minLength * maxLength))
  // a triangle keeps the quad's count: the clip takes the strokes past its sloped sides
  const auto = Math.round(Math.min(800, Math.max(16, (scale.cover ?? COVER) / area)))
  return {
    ...CYPRESS_RIBBON_CONFIG,
    frontCount: count ?? auto,
    backShare: 0,
    spireSeedWeight: 1,
    spireHeight: 1,
    spireLengthScale: 1,
    minLength,
    maxLength,
    step: 2 / (rows - 1),
    minHalfWidth,
    maxHalfWidth,
    widthCap: 1,
    overshootSteps: 1,
    taper: TAPER,
    reliefSpread: 0.035,
    colourSmoothing: scale.smoothing ?? 1,
    perSampleColours: true,
    heading: 'continuous',
  }
}

export type FaceStrokes = { arrays: BrushArrays; stroke: number[]; seed: number[]; ribbons: number }

/**
 * The path: the field's own ground texels lifted toward the hills' moonlit crest. Pass 2: a filter to the field's paler
 * 30% (the first build) left most samples to copy their nearest accepted neighbour, and the runs of one colour read as
 * blocks close to the camera.
 */
export const PATH_LIFT = { toward: PALETTE.hillsCrest, share: 0.35 }

function acceptFor(face: StreetFace, painting: ImageData2D): TexelAccept {
  void painting
  if (face.kind === 'ground' || face.kind === 'path') return GROUND_TEXEL
  return EVERY_TEXEL
}

/** The mean of the darkest tenth of the source's texels (sRGB 0..1): the face's underpaint. */
export function sourceUnderpaint(painting: ImageData2D, source: StreetSourceName): [number, number, number] {
  const [x0, y0, x1, y1] = STREET_SOURCES[source]
  const sx = painting.width / 1600
  const sy = painting.height / 1267
  const texels: [number, number, number, number][] = []
  for (let y = Math.floor(y0 * sy); y < Math.ceil(y1 * sy); y++) {
    for (let x = Math.floor(x0 * sx); x < Math.ceil(x1 * sx); x++) {
      const i = (y * painting.width + x) * 4
      const [r, g, b] = [painting.data[i], painting.data[i + 1], painting.data[i + 2]]
      texels.push([0.299 * r + 0.587 * g + 0.114 * b, r, g, b])
    }
  }
  texels.sort((a, b) => a[0] - b[0])
  const dark = texels.slice(0, Math.max(1, Math.round(texels.length / 10)))
  return [0, 1, 2].map((c) => dark.reduce((sum, t) => sum + t[c + 1], 0) / dark.length / 255) as [number, number, number]
}

/**
 * The face's ribbons, traced in its crop and laid on its plane at `origin + px·u + (1 − py)·v + lift·normal`; a step
 * whose column points leave the face's shape (grown by half an outline width) cuts the ribbon, and runs under three
 * steps go. Colours per sample from the source, lit by the moon's share on the face's normal. `options` are the
 * tests' seams: a fixed count, half-width and taper.
 */
export function traceFace(face: StreetFace, flow: ImageData2D, painting: ImageData2D, options: { count?: number; fixedHalfWidth?: number; taper?: number } = {}): FaceStrokes {
  const width = face.u.length()
  const height = face.v.length()
  const { crop, rows, pigment } = faceCrop(flow, face, 64, painting)
  const config = faceConfig(face, options.count, crop.height)
  if (options.fixedHalfWidth !== undefined) {
    config.minHalfWidth = options.fixedHalfWidth
    config.maxHalfWidth = options.fixedHalfWidth
  }
  if (options.taper !== undefined) config.taper = options.taper
  const ribbons = traceCypressRibbons(crop, pigment ?? painting, rows, config.frontCount, face.seed, config, acceptFor(face, painting))
  const polygon = facePolygon(face, width, height)
  const allowance = 0.5 * OUTLINE_FRACTION * face.refHeight + 1e-12
  const shade = 1 + STREET_MOON_LIFT * moonShade(face.normal)
  const arrays = makeBrushArrays()
  const stroke: number[] = []
  const seed: number[] = []
  const colour = new Color()
  const pathTone = new Color(PATH_LIFT.toward)
  let emitted = 0
  const point = (px: number, py: number, lift: number) =>
    face.origin.clone().addScaledVector(face.u, px).addScaledVector(face.v, 1 - py).addScaledVector(face.normal, lift)
  for (const [index, ribbon] of ribbons.entries()) {
    const lift = STROKE_LIFT + (index % LIFT_LEVELS) * LIFT_STEP
    const columns = ribbonColumns(ribbon, crop.width, crop.height, config.taper, COLUMNS)
    const keep = columns.map((step) => step.every(([px, py]) => distanceToPolygon(px * width, (1 - py) * height, polygon) <= allowance))
    let k = 0
    while (k < columns.length) {
      if (!keep[k]) {
        k++
        continue
      }
      let end = k
      while (end + 1 < columns.length && keep[end + 1]) end++
      if (end - k + 1 >= 3) {
        const steps = columns.slice(k, end + 1).map((step) => step.map(([px, py]) => point(px, py, lift)))
        const colours = ribbon.colours.slice(k, end + 1).map(([r, g, b]) => {
          colour.setRGB(r, g, b, SRGBColorSpace)
          if (face.kind === 'path') colour.lerp(pathTone, PATH_LIFT.share)
          return colour.multiplyScalar(ribbon.relief * shade).clone()
        })
        pushDrapedRibbon(arrays, steps, colours)
        for (let s = 0; s < steps.length; s++) {
          for (let j = 0; j < COLUMNS; j++) {
            stroke.push(s / (steps.length - 1), j / (COLUMNS - 1))
            seed.push(ribbon.seed)
          }
        }
        emitted++
      }
      k = end + 1
    }
  }
  return { arrays, stroke, seed, ribbons: emitted }
}

/**
 * The ink along a face's edges: one ribbon per edge, its full width `OUTLINE_FRACTION` × `refHeight` at the middle
 * and 0.6 of it at the ends, wobbling across by at most a quarter of its width, run past each corner by half its
 * width so the corners close, lifted over the strokes.
 */
export function outlineFace(face: StreetFace, edges: readonly (readonly [Vector3, Vector3])[], ink: Color, seed: number): FaceStrokes {
  const arrays = makeBrushArrays()
  const stroke: number[] = []
  const seeds: number[] = []
  const width = OUTLINE_FRACTION * face.refHeight
  let index = 0
  for (const [a, b] of edges) {
    const along = b.clone().sub(a)
    const length = along.length()
    if (length < 1e-9) continue
    along.normalize()
    const across = new Vector3().crossVectors(face.normal, along).normalize()
    const start = a.clone().addScaledVector(along, -width / 2)
    const total = length + width
    // odd, so the middle sample sits at the edge's centre, spaced about half the width apart
    const n = Math.max(5, 2 * Math.ceil(total / width) + 1)
    const edgeSeed = seed * 31 + index * 7
    const tone = 0.92 + 0.16 * vnoise(edgeSeed * 0.37, 1.3)
    const steps: Vector3[][] = []
    const colours: Color[] = []
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1)
      const taper = 1 - 0.4 * Math.abs(2 * t - 1) ** 2
      const wobble = (vnoise(edgeSeed + t * 3.1, 0.7) - 0.5) * 0.5 * width
      const centre = start.clone().addScaledVector(along, t * total).addScaledVector(across, wobble).addScaledVector(face.normal, OUTLINE_LIFT)
      const half = (width * taper) / 2
      steps.push([centre.clone().addScaledVector(across, -half), centre.clone(), centre.clone().addScaledVector(across, half)])
      colours.push(ink.clone().multiplyScalar(tone))
    }
    pushDrapedRibbon(arrays, steps, colours)
    const ribbonSeed = (edgeSeed % 1000) + 0.5
    for (let k = 0; k < n; k++) {
      for (let j = 0; j < COLUMNS; j++) {
        stroke.push(k / (n - 1), j / (COLUMNS - 1))
        seeds.push(ribbonSeed)
      }
    }
    index++
  }
  return { arrays, stroke, seed: seeds, ribbons: index }
}

/**
 * The trees' curls at walking distance: the land's mass config (E2, built for the diorama's distance) with the
 * curls the village's own trees carry at 1:1 (task 1 on `orchard-lower` at 3840: arcs 15–25 px wide and 60–120 px long
 * in a 403 × 240 box, so half-widths 0.02–0.03 of the box's width and lengths 0.25–0.5 of its height), three times
 * the land's count to cover the same area with the narrower strokes (flat panel pass 0: the land's curls read two to
 * three times too fat).
 */
export function streetMassConfig(crop: ImageData2D, pixels: number): CypressRibbonConfig {
  return {
    ...massConfig(crop, Math.min(600, massCount(pixels) * 3)),
    minHalfWidth: 0.02,
    maxHalfWidth: 0.03,
    minLength: 0.25,
    maxLength: 0.5,
  }
}
